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

  useEffect(() => {
    const fetchPayouts = async () => {
      const all = await db.withdrawals.getAll();
      setPendingPayouts(all.filter(w => w.status === 'pending'));
    };
    fetchPayouts();

    const unsub = db.subscribe(() => {
      fetchPayouts();
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
      // 1. تحديث حالة السحب
      await db.withdrawals.update(wd.id, { status: 'completed' });

      // 2. تسجيل العملية في سجل التدقيق الأمني (Audit Logs)
      await db.addDocument('audit_logs', {
        adminId: 'usr-admin',
        adminRole: activeRole,
        action: 'approve_payout',
        targetUserId: wd.artisanId,
        targetUserName: `حرفي معرّف #${wd.artisanId.substring(0, 5)}`,
        ip: '192.168.1.45',
        details: `الموافقة على تحويل مبلغ ${wd.amount} ج.م للفني عبر ${wd.method} (${wd.details}).`,
        timestamp: new Date().toISOString()
      });

      showToast(
        language === 'ar' ? `💸 تم اعتماد تحويل مبلغ ${formatCurrency(wd.amount)} للحرفي بنجاح!` : `Payout of ${wd.amount} approved successfully!`,
        'success'
      );
    } catch (err) {
      console.error(err);
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
          pendingPayouts.map(wd => (
            <div 
              key={wd.id}
              className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col gap-3 text-xs"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <strong className="text-brand-navy dark:text-brand-light">قيمة الطلب: {formatCurrency(wd.amount)}</strong>
                <span className="text-[9px] text-brand-emerald bg-emerald-500/10 px-2 py-0.5 rounded-md font-black">
                  بانتظار التحويل 💵
                </span>
              </div>

              <div className="leading-relaxed text-slate-600 dark:text-slate-400">
                <strong>طريقة التحويل المطلوبة:</strong> {wd.method}<br/>
                <strong>بيانات المحفظة/الحساب:</strong> {wd.details}<br/>
                <strong>تاريخ الطلب:</strong> {formatDate(wd.timestamp)}
              </div>

              <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 justify-end">
                <Button 
                  className="bg-brand-emerald border-brand-emerald text-[10px] w-full"
                  onClick={() => approvePayout(wd)}
                >
                  تأكيد التحويل وإقرار الإرسال المالي ➡️
                </Button>
              </div>

            </div>
          ))
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
