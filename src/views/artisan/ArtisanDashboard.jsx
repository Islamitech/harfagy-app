import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { db } from '../../services/db.js';

/**
 * لوحة التحكم وحالة النشاط للحرفي
 */
export const ArtisanDashboard = () => {
  const { currentUser } = useUser();
  const { language } = useApp();

  const [artisan, setArtisan] = useState(null);
  const [dnd, setDnd] = useState(false);

  // جلب ملف الحرفي المرتبط بالمستخدم
  useEffect(() => {
    if (!currentUser) return;
    const fetchArtisanProfile = async () => {
      const artisansList = await db.getCollection("artisans");
      const art = artisansList.find(a => a.userId === currentUser.id);
      if (art) setArtisan(art);
    };
    fetchArtisanProfile();

    const unsub = db.subscribe(() => {
      fetchArtisanProfile();
    });
    return () => unsub();
  }, [currentUser]);

  // تبديل حالة التواجد والنشاط
  const togglePresence = async (e) => {
    if (!artisan) return;
    const isOnline = e.target.checked;
    await db.artisans.update(artisan.id, { isOnline });
  };

  if (!artisan) {
    return <div className="text-center py-10 font-cairo text-xs text-slate-400">تحميل بيانات لوحة التحكم...</div>;
  }

  return (
    <div className="flex flex-col gap-5 p-4 text-right font-cairo" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      {/* الترويسة الرئيسية */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-extrabold text-brand-navy dark:text-brand-light">لوحة تحكم الأسطى 👷‍♂️</h2>
          <span className="text-[10px] text-slate-500 font-bold block mt-0.5">الهوية الرقمية: {artisan.custom_id || 'AS-0001'}</span>
          <span className="text-[10px] text-slate-400 mt-1 block">رتبتك الحالية: {artisan.rank === 'golden' ? 'ذهبي 🥇' : artisan.rank === 'silver' ? 'فضي 🥈' : 'برونزي 🥉'}</span>
        </div>
        
        {/* زر التواجد On/Off */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            checked={artisan.isOnline}
            onChange={togglePresence}
            className="sr-only peer" 
          />
          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-emerald"></div>
          <span className="mr-3 text-xs font-bold text-slate-500 dark:text-slate-400">
            {artisan.isOnline ? '🟢 متصل' : '🔴 غير متصل'}
          </span>
        </label>
      </div>

      {/* الكروت الإحصائية */}
      <div className="grid grid-cols-2 gap-3.5 text-xs">
        <div className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm text-center">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">أرباحك المتاحة</span>
          <strong className="text-base font-black text-brand-emerald">{artisan.wallet} ج.م</strong>
        </div>

        <div className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm text-center">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">العمليات الناجحة</span>
          <strong className="text-base font-black text-brand-navy dark:text-brand-light">{artisan.completedJobs} عملية</strong>
        </div>

        <div className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm text-center">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">التقييم العام</span>
          <strong className="text-base font-black text-brand-orange">⭐ {artisan.rating}</strong>
        </div>

        <div className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm text-center flex flex-col items-center justify-center">
          <span className="text-[10px] text-slate-400 font-bold block mb-1">العمولة المستحقة</span>
          <strong className="text-xs font-bold text-brand-rose">{artisan.commissionDue} ج.م</strong>
        </div>
      </div>

      {/* ميزة عدم الإزعاج DND */}
      <div className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm flex items-center justify-between text-xs">
        <div className="text-right">
          <strong>تفعيل وضع عدم الإزعاج (DND) 💤</strong>
          <span className="text-[10px] text-slate-400 block mt-0.5">تجميد استقبال أي طلبات مؤقتاً لتجنب إخفاض تقييمك.</span>
        </div>
        
        <input 
          type="checkbox" 
          checked={dnd}
          onChange={(e) => setDnd(e.target.checked)}
          className="w-4 h-4 text-brand-orange bg-slate-100 border-slate-300 rounded focus:ring-brand-orange cursor-pointer"
        />
      </div>

      {/* إرشادات الإطلاق الفعلي بحدائق الأهرام */}
      <div className="bg-orange-500/5 border border-brand-orange/20 p-4 rounded-3xl text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        <strong className="text-brand-orange block mb-1">📢 تعليمات الإطلاق التجريبي بالجيزة:</strong>
        يرجى الحفاظ على سرعة قبول الطلبات الواردة لرفع رتبتك من برونزي إلى ذهبي، حيث يتم احتساب عمولة المنصة (15%) على الفواتير المنجزة وخصمها من الرصيد النشط.
      </div>

    </div>
  );
};
