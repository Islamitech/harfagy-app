import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { db } from '../../services/db.js';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { sanitizeInput } from '../../utils/sanitizer.js';

/**
 * صفحة الملف الشخصي الشاملة والعملية للحرفي (Artisan Comprehensive Profile)
 * تم تصميمها لتتطابق هيكلياً وبصرياً مع صفحة العميل، مع مراعاة خصائص وأنشطة العمل للحرفي.
 */
export const ArtisanProfile = () => {
  const { currentUser, logout } = useUser();
  const { language, showToast } = useApp();

  const [artisan, setArtisan] = useState(null);
  const [dnd, setDnd] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const [complaints, setComplaints] = useState([]);

  // حقول السحب المالي
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('Vodafone Cash');
  const [withdrawDetails, setWithdrawDetails] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // حقول الرد على الشكاوى
  const [activeCompId, setActiveCompId] = useState(null);
  const [appealText, setAppealText] = useState('');
  const [appealLoading, setAppealLoading] = useState(false);

  // تبويبات الصفحة الشخصية الداخلية (بياناتي 👤 • أرباحي 💵 • التظلمات ⚖️)
  const [subTab, setSubTab] = useState('info');

  // حالات رفع المستندات الرسمية للتوثيق
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [nationalIdNum, setNationalIdNum] = useState('');
  const [idFile, setIdFile] = useState(null);
  const [feeshFile, setFeeshFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const [associatedUser, setAssociatedUser] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    const fetchAllArtisanData = async () => {
      const artisansList = await db.getCollection("artisans");
      const isArtisan = currentUser.role === 'artisan';
      let artProfile = artisansList.find(a => a.userId === (isArtisan ? currentUser.id : 'art-1-user'));
      
      if (!artProfile) {
        if (!isArtisan) {
          artProfile = {
            id: 'art-1',
            userId: 'art-1-user',
            name: 'شريف رفعت',
            category: 'hvac',
            custom_id: 'AT-0202',
            bio: 'خبرة 15 عاماً في صيانة شبكات التكييف والتبريد بحدائق الأهرام وحل مشاكل الفريون.',
            rating: 4.8,
            completedJobs: 142,
            wallet: 3200,
            commissionDue: 480,
            isOnline: true,
            verified: true,
            rank: 'golden'
          };
        } else {
          const catAbbr = currentUser.category === 'plumber' ? 'AS' 
                        : currentUser.category === 'electrician' ? 'AK' 
                        : currentUser.category === 'hvac' ? 'AT' 
                        : currentUser.category === 'carpenter' ? 'AN' 
                        : currentUser.category === 'painter' ? 'AD' 
                        : 'AH';
          artProfile = {
            id: `art-${currentUser.id}`,
            userId: currentUser.id,
            name: currentUser.name,
            category: currentUser.category || 'plumber',
            custom_id: currentUser.custom_id || `${catAbbr}-0001`,
            bio: 'عضو مسجل جديد في دليل حدائق الأهرام صيانة وتسريبات.',
            rating: 5.0,
            completedJobs: 0,
            wallet: 0,
            commissionDue: 0,
            isOnline: true,
            verified: false,
            rank: 'bronze'
          };
        }
        await db.addDocument("artisans", artProfile);
      }

      if (artProfile) {
        setArtisan(artProfile);

        // جلب حساب المستخدم المرتبط بالفني لعرض الهاتف والحي الجغرافي الصحيح للفني المعروض
        const usersList = await db.getCollection("users");
        const usr = usersList.find(u => u.id === artProfile.userId);
        if (usr) setAssociatedUser(usr);

        // جلب السحبيات السابقة
        const allWd = await db.withdrawals.getAll();
        setWithdrawals(allWd.filter(w => w.artisanId === artProfile.id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));

        // جلب الشكاوى المسجلة ضده
        const allComplaints = await db.complaints.getAll();
        setComplaints(allComplaints.filter(c => c.artisanId === artProfile.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }
    };

    fetchAllArtisanData();

    const unsub = db.subscribe(() => {
      fetchAllArtisanData();
    });
    return () => unsub();
  }, [currentUser]);

  // تبديل التواجد
  const togglePresence = async (e) => {
    if (!artisan) return;
    const isOnline = e.target.checked;
    await db.artisans.update(artisan.id, { isOnline });
  };

  // إرسال طلب السحب
  const handleWithdrawRequest = async (e) => {
    e.preventDefault();
    if (!artisan) return;

    const val = Number(withdrawAmount);
    if (val < 50) {
      alert("الحد الأدنى لطلب سحب الأرباح هو 50 ج.م.");
      return;
    }
    if (val > artisan.wallet) {
      alert("عذراً، رصيدك المتاح أقل من المبلغ المطلوب.");
      return;
    }

    setWithdrawLoading(true);

    const payload = {
      artisanId: artisan.id,
      amount: val,
      method: withdrawMethod,
      details: sanitizeInput(withdrawDetails),
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    try {
      await db.withdrawals.create(payload);
      await db.artisans.update(artisan.id, { wallet: artisan.wallet - val });

      showToast(
        language === 'ar' ? '⏳ تم إرسال طلب السحب للمشرف المالي للاعتماد.' : 'Withdrawal request submitted!',
        'success'
      );
      setWithdrawAmount('');
      setWithdrawDetails('');
    } catch (err) {
      console.error(err);
    } finally {
      setWithdrawLoading(false);
    }
  };

  // إرسال الرد على شكوى العميل
  const handleSendAppeal = async (e, compId) => {
    e.preventDefault();
    if (!appealText.trim()) return;

    setAppealLoading(true);

    try {
      await db.complaints.update(compId, {
        resolution: sanitizeInput(appealText),
        status: 'appealed'
      });

      // تسجيل العملية في الـ logs
      await db.addDocument('audit_logs', {
        adminId: 'system',
        adminRole: 'artisan',
        action: 'artisan_appeal',
        targetUserId: compId,
        targetUserName: `Appeal for complaint ${compId}`,
        ip: '192.168.1.1',
        details: `قام الفني بتقديم اعتراض مكتوب على الشكوى: ${appealText}`,
        timestamp: new Date().toISOString()
      });

      showToast(
        language === 'ar' ? '⚖️ تم تسجيل ردك بنجاح وجاري مراجعته بواسطة المشرف الأمني.' : 'Appeal submitted!',
        'success'
      );
      setAppealText('');
      setActiveCompId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setAppealLoading(false);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (nationalIdNum.length < 10) {
      alert("يرجى إدخال رقم قومي صحيح مكون من 14 رقم (أو 10 أرقام على الأقل للتجربة).");
      return;
    }
    setUploadLoading(true);

    try {
      await db.artisans.update(artisan.id, {
        verificationStatus: 'submitted',
        nationalIdNumber: nationalIdNum,
        nationalIdImage: idFile ? idFile.name : 'id_card_copy.jpg',
        criminalRecordImage: feeshFile ? feeshFile.name : 'clean_feesh.jpg',
        submittedAt: new Date().toISOString()
      });

      showToast(
        language === 'ar' ? '🎉 تم رفع المستندات وإرسالها للمشرف الأمني للاعتماد!' : 'Documents submitted!',
        'success'
      );
      setShowUploadForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadLoading(false);
    }
  };

  if (!artisan) {
    return <div className="text-center py-12 font-cairo text-xs text-slate-400">تحميل بيانات الملف الشخصي الحرفي...</div>;
  }

  const showVerificationAlert = !artisan.verified;

  return (
    <div className="flex flex-col gap-5 p-4 text-right font-cairo bg-slate-50 dark:bg-[#0b0f19]" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      {/* 1. ترويسة الصفحة */}
      <div>
        <h2 className="text-sm font-extrabold text-slate-800 dark:text-brand-light">الملف الشخصي للحرفي 👤</h2>
        <p className="text-[10px] text-slate-400 mt-1">إدارة حالة التواجد والنشاط والعمليات والشكاوى وأرباح محفظتك</p>
      </div>

      {/* 2. تحذير توثيق الهوية والفيش الجنائي (مطابق لشريط تنبيه العميل) */}
      {showVerificationAlert && (
        <div className="flex flex-col gap-3">
          {artisan.verificationStatus === 'submitted' ? (
            <div className="bg-sky-500/5 border border-sky-400/25 p-4 rounded-2xl text-right flex items-start gap-3.5 shadow-sm transition-all hover:scale-[1.01]">
              <div className="text-2xl p-2 bg-sky-500/10 rounded-xl text-sky-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <strong className="text-[11px] text-sky-600 dark:text-sky-400 font-black block">⏳ المستندات قيد المراجعة الأمنية</strong>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                  تم إرسال بطاقة الرقم القومي والفيش وجاري تدقيق البيانات من قبل المشرف الأمني للمنصة لتفعيل حسابك بالكامل.
                </p>
              </div>
            </div>
          ) : artisan.verificationStatus === 'rejected' ? (
            <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-2xl text-right flex items-start gap-3.5 shadow-sm transition-all hover:scale-[1.01]">
              <div className="text-2xl p-2 bg-rose-500/10 rounded-xl text-rose-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <strong className="text-[11px] text-rose-600 dark:text-rose-455 font-black block">❌ تم رفض مستنداتك السابقة</strong>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                  يرجى إعادة رفع صورة بطاقة الرقم القومي وصحيفة الحالة الجنائية بشكل صحيح ومقروء للمطابقة.
                </p>
                <button 
                  onClick={() => setShowUploadForm(true)}
                  className="text-[9px] font-black text-rose-500 hover:text-rose-600 mt-2 block underline cursor-pointer"
                >
                  إعادة تقديم المستندات الآن 📁
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl text-right flex items-start gap-3.5 shadow-sm transition-all hover:scale-[1.01]">
              <div className="text-2xl p-2 bg-amber-500/10 rounded-xl text-amber-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <strong className="text-[11px] text-amber-600 dark:text-amber-500 font-black block">🛡️ توثيق الهوية والفيش معلق!</strong>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                  يرجى تقديم صور أوراق بطاقة الرقم القومي وصحيفة الحالة الجنائية لتنشيط حسابك بالدليل العام للعملاء.
                </p>
                <button 
                  onClick={() => setShowUploadForm(true)}
                  className="text-[9px] font-black text-amber-600 hover:text-amber-700 mt-2 block underline cursor-pointer"
                >
                  رفع المستندات الرسمية الآن 📁
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* نموذج رفع المستندات المطور */}
      {showUploadForm && (
        <form onSubmit={handleUploadSubmit} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm flex flex-col gap-3 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <strong className="text-slate-800 dark:text-brand-light">📁 رفع المستندات الرسمية للاعتماد</strong>
            <button type="button" onClick={() => setShowUploadForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          
          <Input 
            label="رقم بطاقة الرقم القومي (14 رقم)"
            type="text"
            required
            maxLength="14"
            placeholder="29401010101234"
            value={nationalIdNum}
            onChange={(e) => setNationalIdNum(e.target.value.replace(/\D/g, ''))}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] text-slate-400 block font-bold mb-1">صورة بطاقة الرقم القومي</label>
              <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-center bg-slate-50 dark:bg-slate-850 relative cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                <span className="text-[9px] text-slate-450 block truncate">{idFile ? idFile.name : 'اختر صورة البطاقة'}</span>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setIdFile(e.target.files[0] || { name: 'id_card_copy.jpg' })}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] text-slate-400 block font-bold mb-1">صحيفة الحالة الجنائية (الفيش)</label>
              <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-center bg-slate-50 dark:bg-slate-850 relative cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                <span className="text-[9px] text-slate-450 block truncate">{feeshFile ? feeshFile.name : 'اختر صورة الفيش'}</span>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setFeeshFile(e.target.files[0] || { name: 'clean_feesh.jpg' })}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <Button type="submit" loading={uploadLoading} className="w-full bg-orange-500 border-orange-500 mt-1 border-none">
            إرسال المستندات للمشرف الأمني ➡️
          </Button>
        </form>
      )}

      {/* 3. كارت الملف الشخصي الرئيسي (صورة شخصية دائرية أعلى الكارت) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-3xl shadow-sm text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 border-2 border-orange-500 flex items-center justify-center text-3xl mb-3 shadow-inner relative">
          👷‍♂️
          <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${artisan.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
        </div>
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-brand-light">{artisan.name}</h3>
        <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 block mt-1">الهوية الرقمية: {artisan.custom_id}</span>
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-1.5 inline-block ${artisan.verified ? 'text-emerald-500 bg-emerald-500/10' : 'text-amber-500 bg-amber-500/10'}`}>
          {artisan.verified ? 'فني معتمد بالدليل 🛡️' : 'بانتظار مراجعة الأوراق ⏳'}
        </span>
      </div>

      {/* 4. أزرار التبويبات الداخلية */}
      <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-1.5 rounded-2xl">
        <button 
          onClick={() => setSubTab('info')}
          className={`py-2 rounded-xl text-[10px] font-black transition-all ${subTab === 'info' ? 'bg-slate-900 text-white shadow-sm font-bold' : 'text-slate-400 dark:text-slate-500'}`}
        >
          👤 بياناتي
        </button>
        <button 
          onClick={() => setSubTab('wallet')}
          className={`py-2 rounded-xl text-[10px] font-black transition-all ${subTab === 'wallet' ? 'bg-slate-900 text-white shadow-sm font-bold' : 'text-slate-400 dark:text-slate-500'}`}
        >
          💵 أرباحي
        </button>
        <button 
          onClick={() => setSubTab('disputes')}
          className={`py-2 rounded-xl text-[10px] font-black transition-all ${subTab === 'disputes' ? 'bg-slate-900 text-white shadow-sm font-bold' : 'text-slate-400 dark:text-slate-500'}`}
        >
          ⚖️ الشكاوى {complaints.length > 0 && `(${complaints.length})`}
        </button>
      </div>

      {/* 5. رندر التبويب النشط */}
      
      {/* تبويب البيانات */}
      {subTab === 'info' && (
        <div className="flex flex-col gap-4">
          
          {/* كروت الإحصاءات العامة والأداء التشغيلي */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
              <span className="text-[9px] text-slate-400 font-bold block mb-1">التقييم العام للخدمات</span>
              <strong className="text-sm font-black text-amber-500">⭐ {artisan.rating} / 5.0</strong>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
              <span className="text-[9px] text-slate-400 font-bold block mb-1">العمليات المنجزة بالكامل</span>
              <strong className="text-sm font-black text-slate-800 dark:text-brand-light">{artisan.completedJobs} عملية صيانة</strong>
            </div>
          </div>

          {/* تفاصيل الحساب الشخصي (مطابق لكروت تفاصيل العميل) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-3xl shadow-sm flex flex-col gap-3 text-xs">
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <span className="text-slate-450 font-bold">التخصص المهني</span>
              <strong className="text-slate-800 dark:text-brand-light">
                {artisan.category === 'plumber' ? 'سباكة (AS)' 
                  : artisan.category === 'electrician' ? 'كهرباء (AK)' 
                  : artisan.category === 'hvac' ? 'تكييف وتبريد (AT)' 
                  : artisan.category === 'carpenter' ? 'نجارة (AN)' 
                  : artisan.category === 'painter' ? 'دهانات (AD)' 
                  : 'أجهزة منزلية (AH)'}
              </strong>
            </div>
            <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <span className="text-slate-450 font-bold">رقم الهاتف الجاري</span>
              <strong className="text-slate-800 dark:text-brand-light">{associatedUser ? associatedUser.phone : currentUser.phone}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-455 font-bold">النطاق والحي الجغرافي</span>
              <strong className="text-slate-800 dark:text-brand-light">
                {associatedUser ? `${associatedUser.governorate} - ${associatedUser.district}` : `${currentUser.governorate} - ${currentUser.district}`}
              </strong>
            </div>
          </div>

          {/* خيارات حالة النشاط وعدم الإزعاج المدمجة */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-3xl shadow-sm flex flex-col gap-4 text-xs">
            {/* التواجد بالدليل */}
            <div className="flex justify-between items-center">
              <div className="text-right">
                <strong className="text-slate-850 dark:text-brand-light block font-extrabold">الحالة بالدليل المهني 🟢</strong>
                <span className="text-[9px] text-slate-400">تنشيط ظهورك للعملاء لتلقي اتصالات الحجز.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={artisan.isOnline}
                  onChange={togglePresence}
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-slate-250 dark:bg-slate-800 rounded-full peer peer-checked:after:-translate-x-4 after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all duration-300 peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* وضع عدم الإزعاج */}
            <div className="flex justify-between items-center">
              <div className="text-right">
                <strong className="text-slate-850 dark:text-brand-light block font-extrabold">وضع عدم الإزعاج (DND) 💤</strong>
                <span className="text-[9px] text-slate-400">تجميد استقبال أي اتصالات أو طلبات صيانة مؤقتاً.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={dnd}
                  onChange={(e) => setDnd(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-slate-250 dark:bg-slate-800 rounded-full peer peer-checked:after:-translate-x-4 after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all duration-300 peer-checked:bg-orange-500"></div>
              </label>
            </div>
          </div>

          {/* النبذة المهنية */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-3xl shadow-sm text-xs">
            <strong className="text-slate-850 dark:text-brand-light block mb-1">نبذة عن خبرتي المهنية:</strong>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{artisan.bio}</p>
          </div>

        </div>
      )}

      {/* تبويب المحفظة المالي (مطابق لمحفظة العميل الداكنة) */}
      {subTab === 'wallet' && (
        <div className="flex flex-col gap-4">
          
          {/* كارت المحفظة الداكن التوأم لكارت العميل */}
          <div className="bg-slate-900 text-white p-5 rounded-3xl text-center shadow-lg relative overflow-hidden">
            <span className="text-[10px] tracking-wider opacity-85 block uppercase font-bold">رصيد الأرباح المتاح للسحب</span>
            <h2 className="text-2xl font-black text-orange-500 my-2">{formatCurrency(artisan.wallet)}</h2>
            <p className="text-[9px] opacity-70">عمولة الشركة المستحقة المعلقة: {formatCurrency(artisan.commissionDue)}</p>
          </div>

          {/* نموذج طلب السحب */}
          <form onSubmit={handleWithdrawRequest} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-3xl shadow-sm flex flex-col gap-3 text-xs">
            <h3 className="font-extrabold text-slate-850 dark:text-brand-light mb-0.5">💸 تقديم طلب سحب أرباح</h3>
            
            <Input 
              label="المبلغ المطلوب سحبه (ج.م)"
              type="number"
              required
              min="50"
              max={artisan.wallet}
              placeholder="الحد الأدنى 50 ج.م"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 block font-bold mb-1">طريقة السحب المتاحة</label>
                <select 
                  value={withdrawMethod}
                  onChange={(e) => setWithdrawMethod(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 outline-none"
                >
                  <option value="Vodafone Cash">فودافون كاش 📱</option>
                  <option value="InstaPay">إنستاباي (InstaPay) ⚡</option>
                </select>
              </div>
              <Input 
                label="رقم المحفظة / العنوان المرجعي"
                type="text"
                required
                placeholder={withdrawMethod === 'InstaPay' ? 'username@instapay' : '01001234567'}
                value={withdrawDetails}
                onChange={(e) => setWithdrawDetails(e.target.value)}
              />
            </div>

            <Button type="submit" loading={withdrawLoading} className="w-full bg-orange-500 border-orange-500">
              تأكيد سحب الأرباح فورياً ➡️
            </Button>
          </form>

          {/* سجل السحبيات */}
          <div className="flex flex-col gap-2">
            <strong className="text-xs text-slate-400 font-extrabold">📋 السجل التاريخي لحركات السحب:</strong>
            {withdrawals.length > 0 ? (
              withdrawals.map(wd => (
                <div key={wd.id} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-3 rounded-2xl flex justify-between items-center text-[10px] shadow-sm">
                  <div>
                    <strong className="text-slate-850 dark:text-brand-light block text-xs">{formatCurrency(wd.amount)}</strong>
                    <span className="text-[9px] text-slate-400 mt-0.5 block">{wd.method} • {wd.details}</span>
                  </div>
                  <div className="text-left">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black border ${wd.status === 'completed' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-200' : 'text-amber-500 bg-amber-500/10 border-amber-200'}`}>
                      {wd.status === 'completed' ? 'تم التحويل' : 'معلق للموافقة'}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-1">{formatDate(wd.timestamp)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-slate-400 text-xs">لا يوجد أي سحبيات مسجلة حالياً.</p>
            )}
          </div>

        </div>
      )}

      {/* تبويب الشكاوى */}
      {subTab === 'disputes' && (
        <div className="flex flex-col gap-4">
          <div className="bg-rose-500/5 border border-rose-500/20 p-3.5 rounded-2xl text-[10px] text-rose-600 dark:text-rose-400 leading-relaxed font-bold">
            ⚖️ تنبيه: يرجى تقديم ردود تفصيلية معللة على أي نزاع لتسويته بواسطة المشرف الأمني دون الحاجة لتجميد أو تقييد محفظتك.
          </div>

          <div className="flex flex-col gap-3">
            {complaints.length > 0 ? (
              complaints.map(comp => (
                <div key={comp.id} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl shadow-sm text-xs flex flex-col gap-2.5">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                    <strong className="text-slate-800 dark:text-brand-light">تذكرة نزاع: #{comp.custom_complaint_id || comp.id.substring(0,6)}</strong>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${comp.status === 'resolved' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-200' : 'text-rose-500 bg-rose-500/10 border-rose-200'}`}>
                      {comp.status === 'resolved' ? 'تمت التسوية' : 'بانتظار ردك'}
                    </span>
                  </div>

                  <div className="text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-950/30 p-3.5 rounded-xl">
                    <div><strong>العميل الشاكي:</strong> {comp.customerName}</div>
                    <div><strong>نوع الشكوى:</strong> {comp.type}</div>
                    <div className="mt-1"><strong>تفاصيل البلاغ:</strong> "{comp.details}"</div>
                  </div>

                  {comp.status !== 'resolved' && (
                    <>
                      {activeCompId === comp.id ? (
                        <form onSubmit={(e) => handleSendAppeal(e, comp.id)} className="flex flex-col gap-2 mt-1">
                          <label className="text-[10px] text-slate-450 block font-bold">كتابة دفاعك أو إفادتك للادارة:</label>
                          <textarea
                            required
                            value={appealText}
                            onChange={(e) => setAppealText(e.target.value)}
                            placeholder="مثال: تم إنجاز الصيانة المتفق عليها كاملة..."
                            className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-brand-light border border-slate-200 dark:border-slate-700 outline-none focus:border-orange-500 h-20"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" onClick={() => setActiveCompId(null)}>إلغاء</Button>
                            <Button size="sm" type="submit" loading={appealLoading} className="bg-rose-500 border-rose-500">إرسال الرد</Button>
                          </div>
                        </form>
                      ) : (
                        <Button size="sm" variant="outline" className="text-rose-500 border-rose-500 mt-1 w-full text-[10px]" onClick={() => setActiveCompId(comp.id)}>
                          ⚖️ تقديم رد أو استئناف رسمي
                        </Button>
                      )}
                    </>
                  )}

                  {comp.resolution && (
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 text-orange-500 text-[10px] font-bold">
                      📝 ردك المسجل: "{comp.resolution}"
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-slate-400 text-xs">سجل شكواك نظيف تماماً! لا يوجد أي نزاعات فنية مفتوحة.</p>
            )}
          </div>
        </div>
      )}

      {/* 6. زر تسجيل الخروج للملف الشخصي للحرفي */}
      <Button variant="danger" onClick={logout} className="w-full mt-2 py-2.5 text-xs font-bold rounded-2xl border-none">
        🚪 تسجيل الخروج من الحساب
      </Button>

    </div>
  );
};
