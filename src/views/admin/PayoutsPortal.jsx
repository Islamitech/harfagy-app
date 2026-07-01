import React, { useState, useEffect } from 'react';
import { db } from '../../services/db.js';
import { Button } from '../../components/common/Button.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

/**
 * بوابة مراجعة واعتماد طلبات سحب أرباح الحرفيين (للمشرف المالي والمدير العام)
 */
export const PayoutsPortal = ({ activeRole = 'superadmin' }) => {
  const { language, showToast } = useApp();

  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [artisans, setArtisans] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchPayoutsAndDetails = async () => {
      const allWd = await db.withdrawals.getAll();
      const allArtisans = await db.artisans.getAll();
      const allUsers = await db.users.getAll();

      setPendingPayouts(allWd.filter(w => w.status === 'pending'));
      setArtisans(allArtisans);
      setUsers(allUsers);
    };
    fetchPayoutsAndDetails();

    const unsub = db.subscribe(() => {
      fetchPayoutsAndDetails();
    });
    return () => unsub();
  }, []);

  // اعتماد تحويل الأرباح للحرفي
  const approvePayout = async (wd) => {
    if (activeRole === 'security') {
      showToast(
        language === 'ar' ? '⚠️ عذراً، لا تمتلك الصلاحيات المالية للموافقة على عمليات السحب (صلاحية المشرف الأمني مقيدة للتنظيم الجنائي والنزاعات فقط).' : 'Access denied: Security Officer cannot approve payouts.',
        'error'
      );
      return;
    }

    try {
      // 1. تحديث حالة السحب في قاعدة البيانات إلى success
      await db.withdrawals.update(wd.id, { status: 'success' });

      // 2. خصم المبلغ من محفظة الحرفي المعني حياً وتصفير مديونيته
      const artisan = await db.artisans.get(wd.artisanId);
      if (artisan) {
        const nextWallet = Math.max(0, (artisan.wallet || 0) - Number(wd.amount));
        await db.artisans.update(artisan.id, { 
          wallet: nextWallet,
          commissionDue: 0 // تصفير مديونيته
        });
      }

      // 3. تسجيل العملية في سجل التدقيق الأمني (Audit Logs)
      await db.addDocument('audit_logs', {
        adminId: 'usr-admin',
        adminRole: activeRole,
        action: 'approve_payout',
        targetUserId: wd.artisanId,
        targetUserName: artisan ? artisan.name : `حرفي #${wd.artisanId.substring(0, 5)}`,
        ip: '192.168.1.45',
        details: `💸 اعتماد تحويل مبلغ ${wd.amount} ج.م للفني ${artisan ? artisan.name : wd.artisanId}، وخصمه من محفظته وتصفير مديونيته بالكامل.`,
        timestamp: new Date().toISOString()
      });

      showToast(
        language === 'ar' ? `💸 تم اعتماد تحويل مبلغ ${formatCurrency(wd.amount)} للحرفي وتصفير مديونيته بنجاح!` : `Payout of ${wd.amount} approved and debt cleared successfully!`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast(language === 'ar' ? 'حدث خطأ أثناء اعتماد السحب.' : 'Error approving payout.', 'error');
    }
  };

  // رفض طلب السحب المالي وإلغاؤه
  const rejectPayout = async (wd) => {
    if (activeRole === 'security') {
      showToast(
        language === 'ar' ? '⚠️ عذراً، لا تمتلك الصلاحيات المالية لرفض عمليات السحب (صلاحية المشرف الأمني مقيدة للتنظيم الجنائي والنزاعات فقط).' : 'Access denied: Security Officer cannot reject payouts.',
        'error'
      );
      return;
    }

    try {
      // 1. تحديث حالة السحب في قاعدة البيانات إلى rejected
      await db.withdrawals.update(wd.id, { status: 'rejected' });

      const artisan = artisans.find(a => a.id === wd.artisanId);

      // 2. تسجيل العملية في سجل التدقيق الأمني (Audit Logs)
      await db.addDocument('audit_logs', {
        adminId: 'usr-admin',
        adminRole: activeRole,
        action: 'reject_payout',
        targetUserId: wd.artisanId,
        targetUserName: artisan ? artisan.name : `حرفي #${wd.artisanId.substring(0, 5)}`,
        ip: '192.168.1.45',
        details: `❌ رفض وإلغاء طلب تحويل أرباح بقيمة ${wd.amount} ج.م للفني ${artisan ? artisan.name : wd.artisanId} بسبب عدم اجتياز معايير التدقيق المالي.`,
        timestamp: new Date().toISOString()
      });

      showToast(
        language === 'ar' ? `❌ تم رفض وإلغاء طلب سحب أرباح الحرفي بنجاح.` : `Payout request rejected and cancelled.`,
        'info'
      );
    } catch (err) {
      console.error(err);
      showToast(language === 'ar' ? 'حدث خطأ أثناء رفض السحب.' : 'Error rejecting payout.', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 text-right font-cairo" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      <div className="customer-header">
        <h2 className="text-sm font-extrabold text-brand-navy dark:text-brand-light">بوابة اعتماد سحوبات الأرباح 💰</h2>
        <p className="text-[10px] text-slate-400 mt-1">مراجعة طلبات تحويل أتعاب الصيانة عبر المحافظ الإلكترونية وإنستاباي</p>
      </div>

      <div className="flex flex-col gap-4">
        {pendingPayouts.length > 0 ? (
          pendingPayouts.map(wd => {
            const artisan = artisans.find(a => a.id === wd.artisanId);
            const user = artisan ? users.find(u => u.id === artisan.userId) : null;

            const isBalanceSufficient = artisan ? (artisan.wallet >= Number(wd.amount)) : false;
            const isVerified = artisan ? artisan.verified : false;
            const isNotBanned = user ? !user.isBanned : true;
            const isWithinLimits = Number(wd.amount) >= 50 && Number(wd.amount) <= 10000;
            const canApprove = isBalanceSufficient && isVerified && isNotBanned && isWithinLimits;

            return (
              <div 
                key={wd.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col gap-3.5 text-xs text-right"
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <strong className="text-slate-800 dark:text-brand-light">قيمة الطلب: {formatCurrency(wd.amount)}</strong>
                  <span className={`text-[9px] px-2.5 py-0.5 rounded-md font-black border ${
                    canApprove ? 'text-emerald-500 bg-emerald-500/10 border-emerald-200' : 'text-rose-500 bg-rose-500/10 border-rose-200'
                  }`}>
                    {canApprove ? 'مستوفٍ لمعايير الصرف 🟢' : 'فشل التدقيق المالي ⚠️'}
                  </span>
                </div>

                <div className="leading-relaxed text-slate-600 dark:text-slate-400 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-2xl border border-slate-150/40 dark:border-slate-850/50">
                  <div><strong>طريقة التحويل المطلوبة:</strong> {wd.method}</div>
                  <div><strong>بيانات المحفظة/الحساب:</strong> {wd.details}</div>
                  <div><strong>اسم صاحب الحساب:</strong> {artisan ? artisan.name : 'غير معروف'}</div>
                  <div><strong>تاريخ الطلب:</strong> {formatDate(wd.timestamp)}</div>
                </div>

                {/* تقرير التدقيق المالي والرقابي المتقدم */}
                <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-150/50 dark:border-slate-850/50 flex flex-col gap-2.5">
                  <span className="text-[10px] text-slate-400 font-extrabold block border-b border-slate-200/40 dark:border-slate-800/40 pb-1.5">
                    📋 تقرير الفحص المالي والأمني الآلي للطلب:
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-bold">
                    {/* الرصيد المتاح */}
                    <div className="flex items-center gap-1.5">
                      <span>{isBalanceSufficient ? '🟢' : '🔴'}</span>
                      <span className="text-slate-400">الرصيد المتاح بمحفظته:</span>
                      <span className="text-slate-700 dark:text-brand-light">
                        {artisan ? `${formatCurrency(artisan.wallet)}` : 'غير متوفر'}
                      </span>
                    </div>

                    {/* حالة التوثيق */}
                    <div className="flex items-center gap-1.5">
                      <span>{isVerified ? '🟢' : '🔴'}</span>
                      <span className="text-slate-400">حالة التوثيق بالدليل:</span>
                      <span className="text-slate-700 dark:text-brand-light">
                        {isVerified ? 'موثق ومعتمد 🛡️' : 'غير موثق بالدليل ⚠️'}
                      </span>
                    </div>

                    {/* حالة الحساب الأمنية */}
                    <div className="flex items-center gap-1.5">
                      <span>{isNotBanned ? '🟢' : '🔴'}</span>
                      <span className="text-slate-400">الحالة الأمنية للحساب:</span>
                      <span className="text-slate-700 dark:text-brand-light">
                        {isNotBanned ? 'نشط وسليم 🟢' : 'محظور أمنياً 🔴'}
                      </span>
                    </div>

                    {/* حدود السحب */}
                    <div className="flex items-center gap-1.5">
                      <span>{isWithinLimits ? '🟢' : '🔴'}</span>
                      <span className="text-slate-400">سقف السحب (50 - 10,000 ج.م):</span>
                      <span className="text-slate-700 dark:text-brand-light">
                        {isWithinLimits ? 'متوافق' : 'خارج الحدود المسموحة'}
                      </span>
                    </div>
                  </div>

                  {!canApprove && (
                    <div className="text-[9px] bg-rose-500/5 text-rose-500 border border-rose-500/10 p-2.5 rounded-xl font-extrabold mt-1 leading-relaxed">
                      ⚠️ يرجى رفض وإلغاء هذا الطلب فوراً لمخالفة شروط السحب (عجز بالرصيد أو حساب محظور أو غير موثق).
                    </div>
                  )}
                </div>

                <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 justify-end">
                  <Button 
                    variant="outline"
                    className="text-[10px] flex-1 text-rose-500 border-rose-500/30 hover:bg-rose-500/5 hover:text-rose-600"
                    onClick={() => rejectPayout(wd)}
                  >
                    ✕ رفض وإلغاء طلب السحب
                  </Button>
                  <Button 
                    disabled={!canApprove}
                    className={`text-[10px] flex-1 ${
                      canApprove 
                        ? 'bg-brand-emerald border-brand-emerald text-white' 
                        : 'bg-slate-200 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-650 cursor-not-allowed'
                    }`}
                    onClick={() => canApprove && approvePayout(wd)}
                  >
                    تأكيد التحويل وإقرار الإرسال المالي ➡️
                  </Button>
                </div>

              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center">
            <span className="text-3xl block mb-2">💰</span>
            <p className="text-xs font-bold text-slate-400">ممتاز! لا يوجد طلبات سحب أرباح معلقة حالياً.</p>
          </div>
        )}
      </div>

    </div>
  );
};
