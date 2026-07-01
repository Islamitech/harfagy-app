import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { db } from '../../services/db.js';
import { Button } from '../../components/common/Button.jsx';

/**
 * لوحة استقبال الطلبات الواردة للحرفي مع نظام الصوت التنبيهي للمحاكاة والتحرك الفوري
 */
export const IncomingLeads = ({ onAcceptSuccess }) => {
  const { currentUser } = useUser();
  const { language, showToast } = useApp();

  const [artisan, setArtisan] = useState(null);
  const [artisanUser, setArtisanUser] = useState(null);
  const [realLeads, setRealLeads] = useState([]);
  const [selectingEtaForJobId, setSelectingEtaForJobId] = useState(null);
  const [audioContext, setAudioContext] = useState(null);

  // جلب ملف الحرفي وحساب المستخدم المرتبط به للاستعلام المهني والجغرافي
  useEffect(() => {
    if (!currentUser) return;
    const fetchArtisanProfileAndUser = async () => {
      const artisansList = await db.getCollection("artisans");
      const isArtisan = currentUser.role === 'artisan';
      const targetUserId = isArtisan ? currentUser.id : 'art-1-user';

      let art = artisansList.find(a => a.userId === targetUserId);
      if (!art && !isArtisan) {
        art = {
          id: 'art-1',
          userId: 'art-1-user',
          name: 'شريف رفعت',
          category: 'hvac',
          custom_id: 'AT-0202',
          isOnline: true,
          verified: true
        };
      }
      if (art) setArtisan(art);

      const usersList = await db.getCollection("users");
      let usr = usersList.find(u => u.id === targetUserId);
      if (!usr && !isArtisan) {
        usr = {
          id: 'art-1-user',
          name: 'شريف رفعت',
          phone: '01198765432',
          role: 'artisan',
          governorate: 'الجيزة',
          district: 'حدائق الأهرام'
        };
      }
      if (usr) setArtisanUser(usr);
    };
    fetchArtisanProfileAndUser();
  }, [currentUser]);

  // استعلام واشتراك تلقائي للطلبات النشطة غير المعينة بـ نفس فئة ونفس حي الفني
  useEffect(() => {
    if (!artisan || !artisanUser) return;
    const fetchRealLeads = async () => {
      const allJobs = await db.jobs.getAll();
      const isArtisan = currentUser?.role === 'artisan';
      
      const matching = allJobs.filter(j => 
        j.status === 'pending' && 
        j.artisanId === null && 
        (!isArtisan || (j.category === artisan.category && j.district === artisanUser.district))
      );
      setRealLeads(matching);
    };
    fetchRealLeads();

    const unsub = db.subscribe(() => {
      fetchRealLeads();
    });
    return () => unsub();
  }, [artisan, artisanUser]);

  // توليد صوت جرس تنبيهي نقي بمحاكاة الويب Web Audio API
  const playAlertSound = () => {
    try {
      const ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (!audioContext) setAudioContext(ctx);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // نغمة مرتفعة
      gain.gain.setValueAtTime(0.5, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      setTimeout(() => osc.stop(), 300);
    } catch (e) {
      console.warn("Audio Context blocked by browser policy.", e);
    }
  };



  // قبول الطلب وتحديد وقت الوصول المتوقع (ETA) والتحرك فوراً
  const acceptLeadWithEta = async (job, selectedEta) => {
    if (!artisan) return;

    try {
      // 1. تحديث حالة وتفاصيل الفني المقترن بالطلب
      await db.jobs.update(job.id, {
        artisanId: artisan.id,
        artisanName: artisan.name,
        artisanPhone: currentUser.phone,
        status: 'accepted', // تم القبول والتحرك
        acceptedAt: new Date().toISOString(),
        eta: selectedEta
      });

      // 2. تسجيل العملية في سجل الأمان (Audit Logs)
      await db.addDocument('audit_logs', {
        adminId: 'system',
        adminRole: 'system',
        action: 'accept_job',
        targetUserId: job.id,
        targetUserName: `العميل ${job.customerName}`,
        ip: '127.0.0.1',
        details: `🏎️ الفني ${artisan.name} قبل طلب الصيانة #${job.id.substring(0, 6)} وبدأ التحرك فوراً للعميل. الوقت المتوقع للوصول: ${selectedEta}.`,
        timestamp: new Date().toISOString()
      });

      showToast(language === 'ar' ? '🎉 تم قبول الطلب! بدأ التحرك، اذهب للعمليات الجارية للتواصل.' : 'Lead accepted!', 'success');
      setSelectingEtaForJobId(null);
      
      if (onAcceptSuccess) {
        onAcceptSuccess();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 text-right font-cairo" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      <div className="customer-header">
        <h2 className="text-sm font-extrabold text-brand-navy dark:text-brand-light">استقبال الطلبات النشطة بالحي 📡</h2>
        <p className="text-[10px] text-slate-400 mt-1">
          يتم بث الطلبات فورياً لكافة فنيي تخصصك بمنطقتك ({artisan ? artisan.district : 'حدائق الأهرام'})
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {realLeads.length > 0 ? (
          realLeads.map(job => (
            <div 
              key={job.id}
              className="bg-white dark:bg-slate-900 border-2 border-brand-orange p-5 rounded-3xl shadow-md flex flex-col gap-3 text-xs text-right"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-brand-orange bg-orange-500/10 px-2.5 py-0.5 rounded-md">🚨 طلب بث فوري عاجل</span>
                <span className="text-[9px] text-slate-400 font-bold">بانتظار التحرك ⏱️</span>
              </div>

              <div className="font-extrabold text-slate-800 dark:text-brand-light">العميل: {job.customerName}</div>
              
              <div className="bg-slate-50 dark:bg-slate-950/30 p-3.5 rounded-2xl text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                <strong>الموقع:</strong> {job.street}، عقار {job.building}، الدور {job.floor || 'الأرضي'}، شقة {job.apartment}<br/>
                {job.landmark && <div className="mt-0.5"><strong>علامة مميزة:</strong> {job.landmark}</div>}
                <strong>تفاصيل المشكلة:</strong> {job.description}
              </div>

              {artisan && !artisan.verified ? (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl text-[10px] text-amber-700 dark:text-amber-400 font-extrabold flex items-center gap-2 leading-relaxed">
                  <span>🔒</span>
                  <span>يرجى توثيق حسابك ورفع الوثائق المطلوبة (البطاقة والفيش الجنائي) لتفعيل قبول طلبات الصيانة العاجلة. يمكنك رفعها من شاشة "حسابي".</span>
                </div>
              ) : selectingEtaForJobId === job.id ? (
                /* واجهة اختيار وقت الوصول المتوقع ETA */
                <div className="bg-orange-500/5 border border-brand-orange/20 p-3.5 rounded-2xl flex flex-col gap-2.5">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">🏎️ اختر وقت وصولك المتوقع إلى العميل:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {['15 دقيقة', '30 دقيقة', 'ساعة واحدة', 'ساعتين'].map(etaOption => (
                      <button 
                        key={etaOption}
                        type="button"
                        onClick={() => acceptLeadWithEta(job, etaOption)}
                        className="bg-white hover:bg-orange-50 border border-slate-200 p-2 rounded-xl text-[10px] font-extrabold text-orange-600 transition-colors shadow-sm cursor-pointer"
                      >
                        {etaOption}
                      </button>
                    ))}
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectingEtaForJobId(null)}
                    className="text-[9px] text-slate-450 hover:underline mt-1 cursor-pointer block text-center bg-transparent border-none"
                  >
                    إلغاء وتراجع
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    className="w-full bg-brand-emerald border-brand-emerald text-xs"
                    onClick={() => setSelectingEtaForJobId(job.id)}
                  >
                    قبول الطلب والتحرك فوراً 🏎️
                  </Button>
                </div>
              )}
            </div>
          ))
        ) : (
          /* واجهة السكون */
          <div className="text-center py-12 bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center">
            <span className="text-3xl block mb-2">📡</span>
            <p className="text-xs font-bold text-slate-400">لا يوجد طلبات بث عاجلة بمنطقتك حالياً.</p>
          </div>
        )}
      </div>

    </div>
  );
};
