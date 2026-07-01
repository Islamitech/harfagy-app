import React, { useState, useEffect, useRef } from 'react';
import { MapSimulator } from '../../components/maps/MapSimulator.jsx';
import { InvoiceGenerator } from '../../components/billing/InvoiceGenerator.jsx';
import { useChat } from '../../context/ChatContext.jsx';
import { useUser } from '../../context/UserContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { db } from '../../services/db.js';
import { Button } from '../../components/common/Button.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { ComplaintsDesk } from './ComplaintsDesk.jsx';
import { sanitizeInput } from '../../utils/sanitizer.js';

/**
 * تتبع الطلبات والدردشة النشطة للعميل
 */
export const JobTracking = () => {
  const { currentUser } = useUser();
  const { language, showToast } = useApp();
  const { activeChatJobId, setActiveChatJobId, messages, sendMessage } = useChat();

  const [jobs, setJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [callRemainingMinutes, setCallRemainingMinutes] = useState(30);
  const [callAvailable, setCallAvailable] = useState(false);
  
  // تذاكر ونوافذ الشكاوى والفواتير والتقييمات
  const [showInvoiceJob, setShowInvoiceJob] = useState(null);
  const [showComplaintJob, setShowComplaintJob] = useState(null);
  const [ratingJob, setRatingJob] = useState(null);
  const [chatInputText, setChatInputText] = useState('');
  
  const chatBottomRef = useRef(null);

  // حساب مهلة الـ 15 دقيقة المتبقية للإلغاء المجاني وقفل الـ 30 دقيقة للمكالمات الهاتفية
  useEffect(() => {
    if (!activeJob || activeJob.status === 'pending' || !activeJob.acceptedAt) {
      setRemainingSeconds(0);
      setCallRemainingMinutes(30);
      setCallAvailable(false);
      return;
    }

    const calculateRemaining = () => {
      // عداد الإلغاء
      const elapsedSeconds = Math.floor((new Date() - new Date(activeJob.acceptedAt)) / 1000);
      const remCancel = Math.max(0, 15 * 60 - elapsedSeconds);
      setRemainingSeconds(remCancel);

      // عداد قفل المكالمات (30 دقيقة)
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);
      const remCall = Math.max(0, 30 - elapsedMinutes);
      setCallRemainingMinutes(remCall);
      setCallAvailable(remCall <= 0);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [activeJob]);

  // إلغاء طلب الصيانة وتطبيق رسوم الغرامة (50 ج.م) إذا تجاوز 15 دقيقة
  const handleCancelJob = async (job) => {
    let hasPenalty = false;
    if (job.acceptedAt) {
      const elapsedSeconds = Math.floor((new Date() - new Date(job.acceptedAt)) / 1000);
      if (elapsedSeconds >= 15 * 60) {
        hasPenalty = true;
      }
    }

    const confirmMsg = hasPenalty
      ? (language === 'ar' 
        ? "⚠️ لقد مر أكثر من 15 دقيقة على قبول وتحرك الفني. إلغاء الطلب الآن سيخصم غرامة بقيمة 50 ج.م لتعويض الفني عن الانتقال والوقود. هل أنت متأكد من الإلغاء؟" 
        : "⚠️ More than 15 minutes have passed since acceptance. Cancelling now will deduct a 50 EGP fee to compensate the technician. Are you sure?")
      : (language === 'ar' 
        ? "هل أنت متأكد من إلغاء طلب الصيانة الحالي؟ الإلغاء مجاني تماماً خلال مهلة الـ 15 دقيقة." 
        : "Are you sure you want to cancel? Cancellation is free within the 15-minute grace period.");

    if (!confirm(confirmMsg)) return;

    try {
      if (hasPenalty) {
        // 1. الخصم من محفظة العميل
        const usersList = await db.users.getAll();
        const clientAcc = usersList.find(u => u.id === currentUser.id);
        if (clientAcc) {
          const nextWallet = Math.max(0, (clientAcc.wallet || 0) - 50);
          await db.users.update(clientAcc.id, { wallet: nextWallet });
        }

        // 2. تعويض الحرفي بإيداع المبلغ بمحفظته
        if (job.artisanId) {
          const artisanProfile = await db.artisans.get(job.artisanId);
          if (artisanProfile) {
            await db.artisans.update(artisanProfile.id, { wallet: (artisanProfile.wallet || 0) + 50 });
          }
        }
      }

      // 3. تحديث حالة الطلب إلى ملغي
      await db.jobs.update(job.id, { 
        status: 'cancelled',
        description: `${job.description} (تم إلغاء الطلب من العميل ${hasPenalty ? 'بغرامة 50 ج.م' : 'مكفول بالمهلة'})`
      });

      // 4. تسجيل العملية في سجل الأمان
      await db.addDocument('audit_logs', {
        adminId: 'system',
        adminRole: 'system',
        action: 'cancel_job',
        targetUserId: job.id,
        targetUserName: `العميل ${job.customerName}`,
        ip: '127.0.0.1',
        details: `✕ قام العميل ${job.customerName} بإلغاء الطلب #${job.id.substring(0, 6)}. تطبيق الغرامة: ${hasPenalty ? '50 ج.م' : 'مجانى (ضمن المهلة)'}.`,
        timestamp: new Date().toISOString()
      });

      showToast(
        language === 'ar' 
          ? `✕ تم إلغاء الطلب بنجاح. ${hasPenalty ? 'تم خصم 50 ج.م لتعويض الفني عن التحرك.' : ''}` 
          : 'Job cancelled successfully.', 
        'info'
      );
      setActiveJob(null);
    } catch (err) {
      console.error(err);
      showToast(language === 'ar' ? 'فشل إلغاء الطلب.' : 'Error cancelling job.', 'error');
    }
  };

  // جلب الطلبات النشطة للعميل
  useEffect(() => {
    if (!currentUser) return;
    const fetchJobs = async () => {
      const list = await db.jobs.query(j => j.customerId === currentUser.id);
      // ترتيب تنازلي حسب الأحدث، مع استبعاد الطلبات الملغية والمنتهية من التتبع المباشر إذا لم تكن نشطة
      setJobs(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      
      if (activeJob) {
        const refreshed = list.find(j => j.id === activeJob.id);
        if (refreshed) setActiveJob(refreshed);
      }
    };
    fetchJobs();

    const unsub = db.subscribe(() => {
      fetchJobs();
    });
    return () => unsub();
  }, [currentUser, activeJob]);

  // تمرير صندوق المحادثة للأسفل عند استلام رسائل جديدة
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // تعيين التذكرة الحالية وتنشيط الدردشة النشطة
  const handleSelectJob = (job) => {
    setActiveJob(job);
    setActiveChatJobId(job.id);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!chatInputText.trim() || !activeJob) return;
    
    // معرف الحرفي المستلم
    const usersList = await db.getCollection("users");
    const artisanUserId = usersList.find(u => u.name === activeJob.artisanName)?.id || "art-1-user";
    
    sendMessage(sanitizeInput(chatInputText), artisanUserId);
    setChatInputText('');
  };

  // تسجيل تقييم الخدمة المنجزة
  const submitRating = async (ratingVal) => {
    if (!ratingJob) return;
    try {
      // 1. تحديث الطلب ليصبح مقيماً
      await db.jobs.update(ratingJob.id, { isRated: true });
      
      // 2. تحديث التقييم العام للفني بخصائص إحصائية
      const artisan = await db.artisans.get(ratingJob.artisanId);
      if (artisan) {
        const newRating = ((artisan.rating * artisan.completedJobs) + ratingVal) / (artisan.completedJobs + 1);
        await db.artisans.update(artisan.id, {
          rating: Number(newRating.toFixed(1)),
          completedJobs: artisan.completedJobs + 1
        });
      }
      
      showToast(language === 'ar' ? '🎉 شكرًا لك على تقييم الخدمة!' : 'Thank you for your feedback!', 'success');
      setRatingJob(null);
    } catch (err) {
      console.error(err);
    }
  };

  const getJobStatusMapStep = (status) => {
    if (status === 'pending') return 1;
    if (['accepted', 'onway'].includes(status)) return 2;
    if (status === 'arrived') return 3;
    if (status === 'completed') return 4;
    return 1;
  };

  const getJobStatusColor = (status) => {
    const colors = { pending: 'text-brand-amber bg-amber-500/10 border-amber-200', accepted: 'text-blue-600 bg-blue-500/10 border-blue-200', onway: 'text-purple-600 bg-purple-500/10 border-purple-200', arrived: 'text-brand-orange bg-orange-500/10 border-orange-200', completed: 'text-brand-emerald bg-emerald-500/10 border-emerald-200', disputed: 'text-brand-rose bg-rose-500/10 border-rose-200' };
    return colors[status] || 'text-slate-400 bg-slate-500/10';
  };

  const getJobStatusName = (status) => {
    const names = { 
      pending: 'بث قيد القبول 📡', 
      accepted: 'تم القبول والتحرك 🏎️', 
      onway: 'في الطريق 🛵', 
      arrived: 'قيد الصيانة 🛠️', 
      completed: 'تم الإنجاز 🎉', 
      disputed: 'نزاع نشط ⚖️',
      cancelled: 'تم الإلغاء ✕'
    };
    return names[status] || status;
  };

  return (
    <div className="flex flex-col md:flex-row gap-5 p-4 text-right font-cairo" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      {/* القسم الأيمن: قائمة تذاكر الحجز والطلبات */}
      <div className="flex-1 flex flex-col gap-3">
        <h3 className="text-xs font-extrabold text-brand-navy dark:text-brand-light">📋 سجل طلبات الصيانة ({jobs.length})</h3>
        
        <div className="flex flex-col gap-3 max-h-[80vh] overflow-y-auto pr-1">
          {jobs.length > 0 ? (
            jobs.map(job => (
              <div 
                key={job.id}
                onClick={() => handleSelectJob(job)}
                className={`
                  p-4 rounded-3xl border text-xs cursor-pointer transition-all duration-200 relative
                  ${activeJob?.id === job.id 
                    ? 'border-brand-orange bg-orange-500/5 shadow-md shadow-orange-500/5' 
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-brand-slate'}
                `}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-extrabold text-brand-navy dark:text-brand-light">طلب #{job.id.substring(0, 6)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${getJobStatusColor(job.status)}`}>
                    {getJobStatusName(job.status)}
                  </span>
                </div>
                
                <p className="font-bold text-slate-600 dark:text-slate-300">
                  {job.artisanName || `بث عام قريب (${job.category === 'plumber' ? 'سباكة' : job.category === 'electrician' ? 'كهرباء' : job.category === 'hvac' ? 'تكييفات' : 'نجارة'}) 📡`} - {job.description.substring(0, 35)}...
                </p>
                <span className="text-[10px] text-slate-400 mt-1 block">📅 حالة الطلب: {job.preferredDate}</span>
                
                {/* أزرار الإجراءات الفورية */}
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                  {job.status === 'completed' && !job.isRated && (
                    <Button size="sm" className="text-[9px]" onClick={() => setRatingJob(job)}>⭐ تقييم الخدمة</Button>
                  )}
                  {job.status === 'completed' && (
                    <Button size="sm" variant="outline" className="text-[9px]" onClick={() => setShowInvoiceJob(job)}>🧾 فاتورة الكشف</Button>
                  )}
                  {['accepted', 'onway', 'arrived'].includes(job.status) && (
                    <Button size="sm" variant="danger" className="text-[9px]" onClick={() => setShowComplaintJob(job)}>🚨 نزاع / شكوى</Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-3xl">
              <span className="text-3xl block mb-2">🗒️</span>
              <p className="text-xs font-bold text-slate-400">ليس لديك أي طلبات صيانة حالية أو سابقة.</p>
            </div>
          )}
        </div>
      </div>

      {/* القسم الأيسر: شاشة التتبع والدردشة النشطة */}
      <div className="flex-1 flex flex-col gap-4">
        {activeJob ? (
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-extrabold text-brand-navy dark:text-brand-light">
              {activeJob.status === 'pending' 
                ? `📍 بانتظار قبول طلبك من فنيي ${activeJob.district} القريبين` 
                : `📍 تتبع ومحادثة الأسطى ${activeJob.artisanName}`}
            </h3>
            
            {/* خريطة تتبع الزيارة الحية */}
            <MapSimulator 
              step={getJobStatusMapStep(activeJob.status)} 
              artisanName={activeJob.artisanName || 'فني قريب'}
            />

            {/* بطاقة معلومات الفني والتحرك والعد التنازلي لإلغاء الحجز */}
            {activeJob.status !== 'pending' ? (
              <div className="bg-white dark:bg-[#111827] border border-slate-200/60 dark:border-slate-800 p-4.5 rounded-3xl shadow-sm flex flex-col gap-3.5 text-right">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <strong className="text-[10px] text-slate-800 dark:text-brand-light font-black">👷‍♂️ بيانات الأسطى والتحرك الفوري:</strong>
                  <span className="text-[9px] text-brand-orange bg-orange-500/10 border border-orange-200/50 px-2.5 py-0.5 rounded-md font-black">
                    وقت الوصول المتوقع: {activeJob.eta || '30 دقيقة'} ⏱️
                  </span>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-orange-500/10 text-xl flex items-center justify-center border border-orange-500/20">
                    👷‍♂️
                  </div>
                  <div className="flex-1 text-right">
                    <strong className="text-xs text-brand-navy dark:text-brand-light block">{activeJob.artisanName}</strong>
                    <span className="text-[9px] text-slate-450 mt-0.5 block font-bold">تقييم الفني: ⭐ 5.0 • فني معتمد بالدليل</span>
                  </div>
                  
                  {/* أزرار الاتصال والمحادثة الهاتفية الموقوتة */}
                  <div className="flex flex-col items-end gap-1.5">
                    {activeJob.artisanPhone && (
                      callAvailable ? (
                        <a 
                          href={`tel:${activeJob.artisanPhone}`}
                          className="bg-brand-emerald text-white text-[9px] font-black py-2 px-3.5 rounded-xl hover:bg-emerald-600 transition-colors shadow-sm text-center no-underline whitespace-nowrap cursor-pointer"
                        >
                          📞 اتصال هاتفي ({activeJob.artisanPhone})
                        </a>
                      ) : (
                        <button 
                          disabled
                          className="bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[8.5px] font-black py-2 px-3 rounded-xl cursor-not-allowed border-none flex items-center gap-1"
                        >
                          🔒 الهاتف متاح بعد {callRemainingMinutes} د
                        </button>
                      )
                    )}
                  </div>
                </div>

                {!callAvailable && (
                  <span className="text-[8.5px] text-slate-400 block -mt-1.5 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                    🛡️ لحماية خصوصية الطرفين، يظهر رقم الهاتف والاتصال المباشر بعد مرور 30 دقيقة من قبول الفني للطلب. يرجى استخدام الدردشة الكتابية أدناه للتنسيق الفوري.
                  </span>
                )}

                {/* العد التنازلي للإلغاء المجاني */}
                <div className="bg-slate-50 dark:bg-slate-950/20 p-3 rounded-2xl border border-slate-150/40 dark:border-slate-850/50 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div className="text-right flex-1">
                    <strong className="text-[9px] text-slate-500 dark:text-slate-400 block font-black">⏳ مهلة مراجعة الملف وإلغاء الطلب:</strong>
                    <span className="text-[9px] text-slate-450 block mt-0.5">تمنح المنصة العميل 15 دقيقة لمراجعة الملف وإلغاء الطلب مجاناً، ويتم تطبيق رسوم 50 ج.م كتعويض للفني في حال الإلغاء بعد ذلك.</span>
                  </div>
                  
                  <div className="flex flex-col items-center gap-1.5 whitespace-nowrap">
                    <span className={`text-[9.5px] font-black ${remainingSeconds > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {remainingSeconds > 0 
                        ? `⏳ متبقي ${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}` 
                        : '⚠️ انتهت مهلة الإلغاء المجاني'}
                    </span>
                    <Button 
                      size="sm"
                      variant="danger" 
                      onClick={() => handleCancelJob(activeJob)}
                      className="text-[9px] py-1 px-4 rounded-xl font-bold"
                    >
                      إلغاء الطلب {remainingSeconds <= 0 && ' (غرامة 50 ج.م)'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* في حال كان الطلب لا يزال في مرحلة البث العام ولم يقبله أحد بعد */
              <div className="bg-gradient-to-l from-orange-500/5 to-amber-500/5 border-2 border-dashed border-orange-500/15 p-5 rounded-3xl text-center flex flex-col items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center text-xl animate-pulse">
                  📡
                </div>
                <strong className="text-xs text-orange-600 font-extrabold block">📡 جارٍ بث طلبك لكافة فنيي {activeJob.category} القريبين بـ {activeJob.district}...</strong>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                  بمجرد قبول الطلب من قبل أحد الفنيين، ستظهر لك هويته وتقييمه فوراً، وستبدأ مهلة الـ 15 دقيقة لمراجعة جودة ملفه الشخصي مجاناً.
                </p>
                <Button 
                  size="sm"
                  variant="outline" 
                  onClick={() => handleCancelJob(activeJob)}
                  className="text-[10px] mt-1 border-rose-500/30 text-rose-500 hover:bg-rose-500/5 hover:text-rose-600"
                >
                  ✕ إلغاء الطلب الآن (مجاني)
                </Button>
              </div>
            )}

            {activeJob.status !== 'pending' && (
              /* واجهة الدردشة اللحظية */
              <div className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col h-80">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                  <strong className="text-xs text-brand-navy dark:text-brand-light flex items-center gap-1.5 justify-end">
                    <span>دردشة حية سحابية 💬</span>
                    <span className="w-2 h-2 rounded-full bg-brand-emerald animate-pulse"></span>
                  </strong>
                </div>

                {/* الرسائل المتداولة */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-1">
                  {messages.map(msg => {
                    const isSender = msg.senderId === currentUser.id;
                    return (
                      <div 
                        key={msg.id}
                        className={`
                          max-w-[75%] rounded-2xl px-3 py-2 text-xs font-bold leading-relaxed
                          ${isSender 
                            ? 'bg-brand-orange text-white self-end rounded-tr-none' 
                            : 'bg-slate-100 dark:bg-slate-800 text-brand-navy dark:text-brand-light self-start rounded-tl-none'}
                        `}
                      >
                        <p>{msg.text}</p>
                        <span className="text-[8px] opacity-75 mt-0.5 block text-left">
                          {new Date(msg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>

                {/* حقل كتابة الرسالة */}
                <form onSubmit={handleSend} className="mt-3 flex gap-2">
                  <input 
                    type="text"
                    required
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    placeholder="اكتب رسالتك للأسطى هنا..."
                    className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-brand-navy dark:text-brand-light border border-slate-200 dark:border-slate-700 outline-none focus:border-brand-orange"
                  />
                  <Button type="submit" size="sm" className="px-4">إرسال</Button>
                </form>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center h-full py-20 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
            <span className="text-4xl block mb-2">🛵</span>
            <p className="text-xs font-bold">يرجى تحديد طلب صيانة من القائمة لبدء تتبع موقعه والدردشة.</p>
          </div>
        )}
      </div>

      {/* نافذة الفاتورة المعتمدة Modal */}
      {showInvoiceJob && (
        <Modal
          isOpen={!!showInvoiceJob}
          onClose={() => setShowInvoiceJob(null)}
          title="الفاتورة الضريبية الرسمية"
          size="md"
        >
          <InvoiceGenerator job={showInvoiceJob} />
        </Modal>
      )}

      {/* نافذة التقييم الفوري */}
      {ratingJob && (
        <Modal
          isOpen={!!ratingJob}
          onClose={() => setRatingJob(null)}
          title="تقييم خدمة الأسطى"
          size="sm"
        >
          <div className="text-center font-cairo flex flex-col gap-4">
            <p className="text-xs font-bold text-brand-navy dark:text-brand-light">كيف تقيم جودة عمل وأمانة الأسطى {ratingJob.artisanName}؟</p>
            <div className="flex justify-center gap-2">
              {[5, 4, 3, 2, 1].map(star => (
                <button 
                  key={star}
                  onClick={() => submitRating(star)}
                  className="text-2xl hover:scale-125 transition-transform active:scale-95"
                  title={`${star} نجوم`}
                >
                  ⭐
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-400 block">رأيك يساعدنا في الحفاظ على أمن وجودة الفنيين بحدائق الأهرام.</span>
          </div>
        </Modal>
      )}

      {/* نموذج تقديم شكوى الشكاوى */}
      {showComplaintJob && (
        <ComplaintsDesk
          job={showComplaintJob}
          isOpen={!!showComplaintJob}
          onClose={() => setShowComplaintJob(null)}
        />
      )}

    </div>
  );
};
