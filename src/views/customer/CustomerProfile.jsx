import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { db } from '../../services/db.js';
import { Button } from '../../components/common/Button.jsx';

/**
 * الملف الشخصي للعميل مع المحفظة وكود الإحالة وتوثيق رقم الهاتف والواتساب
 */
export const CustomerProfile = () => {
  const { currentUser, logout, login } = useUser();
  const { language, showToast } = useApp();

  const [customerUser, setCustomerUser] = useState(currentUser);

  useEffect(() => {
    if (!currentUser) return;
    const fetchUser = async () => {
      const isCustomer = currentUser.role === 'customer';
      if (isCustomer) {
        setCustomerUser(currentUser);
      } else {
        const usersList = await db.getCollection("users");
        const clientAcc = usersList.find(u => u.id === 'cust-1');
        if (clientAcc) setCustomerUser(clientAcc);
      }
    };
    fetchUser();
    const unsub = db.subscribe(fetchUser);
    return () => unsub();
  }, [currentUser]);

  if (!customerUser) return null;

  const showEmailAlert = customerUser.emailVerified === 'pending';
  const showWhatsAppAlert = customerUser.phoneVerified === 'pending';

  // معالجة توثيق البريد الإلكتروني
  const verifyEmail = async () => {
    alert("📧 تم إرسال رمز تأكيد مكون من 6 أرقام إلى بريدك الإلكتروني.");
    const code = prompt("يرجى إدخال رمز التأكيد لتفعيل البريد (أدخل أي أرقام للمحاكاة):");
    if (code) {
      const updatedUser = await db.users.update(customerUser.id, { emailVerified: 'verified' });
      if (updatedUser) {
        if (currentUser.role === 'customer') {
          localStorage.setItem('harfagy_current_user', JSON.stringify(updatedUser));
        }
        showToast(
          language === 'ar' ? '🎉 تم تفعيل البريد الإلكتروني بنجاح!' : 'Email verified successfully!',
          'success'
        );
        window.location.reload(); // إعادة التحميل لتحديث الجلسة العامة للسيستم
      }
    }
  };

  // معالجة توثيق الواتساب
  const verifyWhatsApp = async () => {
    alert("🟢 تم إرسال رمز تأكيد الواتساب إلى رقم هاتفك المسجل.");
    const code = prompt("يرجى إدخال رمز التأكيد لتفعيل الواتساب (أدخل أي أرقام للمحاكاة):");
    if (code) {
      const updatedUser = await db.users.update(customerUser.id, { phoneVerified: 'verified' });
      if (updatedUser) {
        if (currentUser.role === 'customer') {
          localStorage.setItem('harfagy_current_user', JSON.stringify(updatedUser));
        }
        showToast(
          language === 'ar' ? '🎉 تم ربط وتوثيق حساب الواتساب بنجاح!' : 'WhatsApp verified successfully!',
          'success'
        );
        window.location.reload();
      }
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 text-right font-cairo" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      <div className="customer-header">
        <h2 className="text-sm font-extrabold text-brand-navy dark:text-brand-light">الملف الشخصي للمستخدم 👤</h2>
        <p className="text-[10px] text-slate-400 mt-1">عرض بيانات حسابك وإدارة المحفظة وتسجيل الخروج</p>
      </div>

      {/* تحذيرات التوثيق المعلق */}
      {showEmailAlert && (
        <div className="bg-sky-500/5 border border-sky-400/25 p-4 rounded-2xl text-right flex items-start gap-3.5 shadow-sm transition-all hover:scale-[1.01]">
          <div className="text-2xl p-2 bg-sky-500/10 rounded-xl text-sky-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeLined="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <strong className="text-[11px] text-sky-600 dark:text-sky-400 font-black block">📧 تأكيد البريد الإلكتروني معلق</strong>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
              تلقي إشعارات الحجز والفواتير الرسمية بأمان.
            </p>
            <button 
              onClick={verifyEmail}
              className="text-[9px] font-black text-sky-500 hover:text-sky-600 dark:hover:text-sky-400 mt-2 block underline"
            >
              أرسل رمز التفعيل للبريد ➡️
            </button>
          </div>
        </div>
      )}

      {showWhatsAppAlert && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl text-right flex items-start gap-3.5 shadow-sm transition-all hover:scale-[1.01]">
          <div className="text-2xl p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" stroked="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="flex-1">
            <strong className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black block">🟢 ربط حساب الواتساب معلق</strong>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
              تلقي تحديثات الصيانة من الفنيين فورياً على هاتفك.
            </p>
            <button 
              onClick={verifyWhatsApp}
              className="text-[9px] font-black text-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 mt-2 block underline"
            >
              ربط الحساب وتفعيله الآن ➡️
            </button>
          </div>
        </div>
      )}

      {/* كارت الملف الشخصي */}
      <div className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-brand-orange flex items-center justify-center text-3xl mb-3 shadow-inner">
          👤
        </div>
        <h3 className="text-sm font-extrabold text-brand-navy dark:text-brand-light">{customerUser.name}</h3>
        <span className="text-[10px] font-bold text-slate-450 dark:text-slate-400 block mt-1">الهوية الرقمية: {customerUser.custom_id || 'U-0101'}</span>
        <span className="text-[10px] font-bold text-brand-orange bg-orange-500/10 px-2.5 py-0.5 rounded-full mt-1.5">عميل موثق 🛡️</span>
      </div>

      {/* تفاصيل الحساب */}
      <div className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm flex flex-col gap-3 text-xs">
        <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <span className="text-slate-400 font-bold">رقم الهاتف</span>
          <strong className="text-brand-navy dark:text-brand-light">{customerUser.phone}</strong>
        </div>
        <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <span className="text-slate-400 font-bold">البريد الإلكتروني</span>
          <strong className="text-brand-navy dark:text-brand-light">{customerUser.email || 'غير مسجل'}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400 font-bold">المنطقة الجغرافية</span>
          <strong className="text-brand-navy dark:text-brand-light">{customerUser.governorate} - {customerUser.district}</strong>
        </div>
      </div>

      {/* كارت المحفظة المالية */}
      <div className="bg-gradient-to-tr from-brand-navy to-slate-800 text-white p-5 rounded-3xl text-center shadow-lg">
        <span className="text-[10px] tracking-wider opacity-85 block uppercase font-bold">رصيد المحفظة النشط</span>
        <h2 className="text-2xl font-black text-brand-orange my-2">{customerUser.wallet || 0} ج.م</h2>
        <p className="text-[9px] opacity-70">سيتم خصم رسوم الكشوف القادمة من رصيدك تلقائياً.</p>
      </div>

      {/* برنامج الإحالات والتسويق */}
      <div className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm text-center">
        <span className="text-[10px] font-extrabold text-brand-orange block mb-1">🎁 كود الإحالة الخاص بك</span>
        <code className="text-base font-black text-brand-navy dark:text-brand-light block tracking-widest">{customerUser.referralCode || 'REF-CUST1'}</code>
        <span className="text-[9px] text-slate-450 block mt-2">شاركه مع أصدقائك للحصول على 50 ج.م رصيد فوري لكل حجز ناجح.</span>
      </div>

      {/* زر تسجيل الخروج */}
      <Button 
        variant="danger" 
        onClick={logout}
        className="w-full py-2.5 text-xs font-bold rounded-2xl"
      >
        🚪 تسجيل الخروج من الحساب
      </Button>

    </div>
  );
};
