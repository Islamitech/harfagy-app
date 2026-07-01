import React, { useState, useEffect } from 'react';
import { db } from '../../services/db.js';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';
import { useUser } from '../../context/UserContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

/**
 * المحفظة وسجل المعاملات وطلبات سحب الأرباح للحرفي
 */
export const ArtisanWallet = () => {
  const { currentUser } = useUser();
  const { language, showToast } = useApp();

  const [artisan, setArtisan] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  
  // حقول طلب السحب
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Vodafone Cash');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchWalletData = async () => {
      const artisansList = await db.getCollection("artisans");
      const artProfile = artisansList.find(a => a.userId === currentUser.id);
      if (artProfile) {
        setArtisan(artProfile);
        
        // جلب سجل السحبيات الخاص به
        const allWd = await db.withdrawals.query(w => w.artisanId === artProfile.id);
        setWithdrawals(allWd.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      }
    };

    fetchWalletData();

    const unsub = db.subscribe(() => {
      fetchWalletData();
    });
    return () => unsub();
  }, [currentUser]);

  const handleWithdrawalRequest = async (e) => {
    e.preventDefault();
    if (!artisan) return;

    const withdrawVal = Number(amount);
    if (withdrawVal < 50) {
      alert("الحد الأدنى لطلب سحب الأرباح هو 50 ج.م.");
      return;
    }
    if (withdrawVal > artisan.wallet) {
      alert("عذراً، رصيدك المتاح أقل من المبلغ المطلوب.");
      return;
    }

    setLoading(true);

    const payload = {
      artisanId: artisan.id,
      amount: withdrawVal,
      method,
      details,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    try {
      // 1. تسجيل العملية في سجل السحب
      await db.withdrawals.create(payload);

      // 2. خصم الرصيد تلقائياً من محفظة الفني
      await db.artisans.update(artisan.id, {
        wallet: artisan.wallet - withdrawVal
      });

      showToast(
        language === 'ar' ? '⏳ تم إرسال طلب السحب للمشرف المالي للاعتماد الفوري!' : 'Payout request submitted!',
        'success'
      );
      
      setAmount('');
      setDetails('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!artisan) return null;

  return (
    <div className="flex flex-col gap-5 p-4 text-right font-cairo" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      <div className="customer-header">
        <h2 className="text-sm font-extrabold text-brand-navy dark:text-brand-light">المحفظة وسحب الأرباح 💵</h2>
        <p className="text-[10px] text-slate-400 mt-1">سحب صافي أرباحك ومتابعة القيود والعمليات الحسابية مع المنصة</p>
      </div>

      {/* كروت الرصيد */}
      <div className="grid grid-cols-2 gap-3.5 text-xs text-center font-bold">
        <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 text-white p-4 rounded-3xl shadow-sm">
          <span className="text-[9px] opacity-80 block">الرصيد المتاح للسحب</span>
          <strong className="text-base font-black mt-1 block">{formatCurrency(artisan.wallet)}</strong>
        </div>
        
        <div className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 p-4 rounded-3xl text-brand-navy dark:text-brand-light shadow-sm">
          <span className="text-[9px] text-slate-400 block">عمولة التشغيل المعلقة للشركة</span>
          <strong className="text-base font-black text-brand-rose mt-1 block">{formatCurrency(artisan.commissionDue)}</strong>
        </div>
      </div>

      {/* نموذج طلب السحب الفوري */}
      <form onSubmit={handleWithdrawalRequest} className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm flex flex-col gap-3 text-xs">
        <h3 className="font-extrabold text-brand-navy dark:text-brand-light mb-1">💸 تقديم طلب سحب أرباح جديد</h3>
        
        <Input 
          label="المبلغ المطلوب سحبه (ج.م)"
          type="number"
          required
          min="50"
          max={artisan.wallet}
          placeholder="مثال: 500"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 block font-bold mb-1">طريقة السحب</label>
            <select 
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 outline-none"
            >
              <option value="Vodafone Cash">فودافون كاش 📱</option>
              <option value="InstaPay">إنستاباي (InstaPay) ⚡</option>
            </select>
          </div>
          
          <Input 
            label="رقم المحفظة أو العنوان المرجعي"
            type="text"
            required
            placeholder={method === 'InstaPay' ? 'username@instapay' : '01001234567'}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>

        <Button 
          type="submit" 
          loading={loading}
          className="w-full mt-2 bg-brand-emerald border-brand-emerald"
        >
          تأكيد تحويل الأرباح الفورية ➡️
        </Button>
      </form>

      {/* جدول العمليات التاريخية */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-extrabold text-brand-navy dark:text-brand-light mb-1">📋 سجل عمليات السحب التاريخية</h3>
        
        <div className="flex flex-col gap-3">
          {withdrawals.length > 0 ? (
            withdrawals.map(wd => (
              <div 
                key={wd.id}
                className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl flex items-center justify-between text-[11px]"
              >
                <div>
                  <strong className="text-brand-navy dark:text-brand-light">{formatCurrency(wd.amount)}</strong>
                  <span className="text-[9px] text-slate-400 block mt-0.5">بواسطة {wd.method} • {wd.details}</span>
                </div>
                <div className="text-left">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border 
                    ${wd.status === 'completed' 
                      ? 'text-brand-emerald bg-emerald-500/10 border-emerald-200' 
                      : 'text-brand-amber bg-amber-500/10 border-amber-200'}`}
                  >
                    {wd.status === 'completed' ? 'تم التحويل' : 'قيد المراجعة'}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-1">{formatDate(wd.timestamp)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-xs text-slate-400 py-6">لم تقم بأي عملية سحب أرباح بعد.</p>
          )}
        </div>
      </div>

    </div>
  );
};
