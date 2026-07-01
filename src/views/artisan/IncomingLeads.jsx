import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { db } from '../../services/db.js';
import { Button } from '../../components/common/Button.jsx';

/**
 * لوحة استقبال الطلبات الواردة للحرفي مع نظام الصوت التنبيهي للمحاكاة
 */
export const IncomingLeads = ({ onAcceptSuccess }) => {
  const { currentUser } = useUser();
  const { language, showToast } = useApp();

  const [incomingLead, setIncomingLead] = useState(null);
  const [artisan, setArtisan] = useState(null);
  const [audioContext, setAudioContext] = useState(null);

  // جلب ملف الحرفي المرتبط بالمستخدم
  useEffect(() => {
    if (!currentUser) return;
    const fetchArtisanProfile = async () => {
      const artisansList = await db.getCollection("artisans");
      const art = artisansList.find(a => a.userId === currentUser.id);
      if (art) setArtisan(art);
    };
    fetchArtisanProfile();
  }, [currentUser]);

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
      // تشغيل متقطع كنبضات جرس
      setTimeout(() => osc.stop(), 300);
    } catch (e) {
      console.warn("Audio Context blocked by browser policy.", e);
    }
  };

  // محاكاة طلب صيانة وارد (للمستثمرين)
  const triggerMockLead = () => {
    if (!artisan) return;
    if (!artisan.isOnline) {
      showToast(
        language === 'ar' ? '⚠️ يرجى تفعيل حالة الاتصال (متصل) أولاً لاستقبال الطلبات.' : 'Please turn on presence first.',
        'info'
      );
      return;
    }

    showToast(language === 'ar' ? '📡 جاري البحث ومطابقة موقع عميل قريب...' : 'Searching nearby customers...', 'info');

    setTimeout(() => {
      // تشغيل الصوت التنبيهي
      playAlertSound();
      
      const mockLead = {
        id: 'lead-mock-55',
        customerId: 'cust-1',
        customerName: 'كريم فهمي',
        customerPhone: '01011223344',
        category: artisan.category,
        description: 'تسريب مياه حاد من محبس التغذية الرئيسي في المطبخ ويحتاج لتغيير فوري.',
        street: 'شارع الجيش - البوابة الأولى',
        building: '15 و',
        apartment: '2',
        price: 50 // سعر كشف صيانة
      };
      
      setIncomingLead(mockLead);
      showToast(language === 'ar' ? '🚨 تم رصد طلب صيانة قريب منك!' : 'Incoming lead detected!', 'success');
    }, 1200);
  };

  // قبول الطلب وإدراجه بالكامل في السيستم
  const acceptLead = async () => {
    if (!incomingLead || !artisan) return;

    const payload = {
      customerId: incomingLead.customerId,
      customerName: incomingLead.customerName,
      customerPhone: incomingLead.customerPhone,
      artisanId: artisan.id,
      artisanName: artisan.name,
      category: artisan.category,
      description: incomingLead.description,
      preferredDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      street: incomingLead.street,
      building: incomingLead.building,
      apartment: incomingLead.apartment,
      status: 'accepted',
      price: incomingLead.price,
      isRated: false
    };

    try {
      await db.jobs.create(payload);
      showToast(language === 'ar' ? '🎉 تم قبول الطلب! اذهب للطلبات الجارية للبدء.' : 'Lead accepted!', 'success');
      setIncomingLead(null);
      
      // التوجيه التلقائي للطلبات النشطة
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
        <h2 className="text-sm font-extrabold text-brand-navy dark:text-brand-light">استقبال الطلبات النشطة 📡</h2>
        <p className="text-[10px] text-slate-400 mt-1">توليد ومحاكاة استقبال طلبات العملاء القريبين منك بحدائق الأهرام</p>
      </div>

      {incomingLead ? (
        /* كارت الطلب الوارد */
        <div className="bg-white dark:bg-brand-slate border-2 border-brand-orange p-5 rounded-3xl shadow-lg animate-pulse">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-black text-brand-orange bg-orange-500/10 px-2 py-0.5 rounded-md">🚨 طلب حجز عاجل</span>
            <span className="text-[9px] text-slate-400 font-bold">المسافة: 800 متر تقريباً</span>
          </div>

          <h3 className="text-xs font-extrabold text-brand-navy dark:text-brand-light mb-2">{incomingLead.customerName}</h3>
          
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl text-[11px] text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
            <strong>موقع العميل:</strong> {incomingLead.street}، عقار {incomingLead.building}، شقة {incomingLead.apartment}<br/>
            <strong>طبيعة العطل:</strong> {incomingLead.description}
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1 text-xs"
              onClick={() => setIncomingLead(null)}
            >
              رفض وتخطي الطلب
            </Button>
            <Button 
              className="flex-1 bg-brand-emerald border-brand-emerald text-xs"
              onClick={acceptLead}
            >
              قبول وبدء التحرك ➡️
            </Button>
          </div>
        </div>
      ) : (
        /* واجهة السكون */
        <div className="text-center py-10 bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center">
          <span className="text-3xl block mb-2">📡</span>
          <p className="text-xs font-bold text-slate-400">لا يوجد أي طلبات واردة حالياً. السيستم يراقب حركتك.</p>
          
          {/* زر محاكاة المستثمرين للمطابقة اللحظية */}
          <Button 
            onClick={triggerMockLead}
            className="mt-4 text-xs font-bold py-2 px-4 shadow-md hover:shadow-lg transition-shadow"
          >
            محاكاة طلب عميل قريب (للمستثمرين)
          </Button>
        </div>
      )}

    </div>
  );
};
