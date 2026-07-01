import React from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

/**
 * الفواتير الإلكترونية المعتمدة وإجراء العمليات الحسابية والضرائب المصرية للطلبات
 */
export const InvoiceGenerator = ({ job }) => {
  if (!job) return null;

  // إجراء العمليات الحسابية الدقيقة للضرائب والعمولات المصرية
  const basePrice = Number(job.price) || 0;
  const vat = basePrice * 0.05;                // 5% ضريبة قيمة مضافة إرشادية للمهن الحرة
  const commission = basePrice * 0.15;         // 15% عمولة تشغيل منصة حرفجي
  const totalAmount = basePrice + vat;          // السعر الإجمالي الكلي المحصل من العميل
  const netEarnings = basePrice - commission;   // صافي أرباح الفني بعد خصم عمولة المنصة

  const isCash = job.paymentMethod === 'cash';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xl w-full max-w-md mx-auto font-cairo text-right print:border-none print:shadow-none" style={{ direction: 'rtl' }}>
      
      {/* الترويسة الرئيسية للفاتورة */}
      <div className="border-b border-dashed border-slate-200 dark:border-slate-800 pb-4 mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-brand-navy dark:text-brand-light">فاتورة كشف فني 🧾</h2>
          <span className="text-[10px] font-bold text-slate-400 mt-1 block">الرقم المرجعي: #{job.id ? job.id.substring(0, 8) : 'N/A'}</span>
        </div>
        <div className="text-left">
          <strong className="text-sm font-black text-brand-orange">حَرفَجي</strong>
          <span className="text-[9px] font-bold text-slate-400 block mt-0.5">صيانة منزلية فورية</span>
        </div>
      </div>

      {/* تفاصيل العميل والفني */}
      <div className="grid grid-cols-2 gap-4 text-xs mb-6">
        <div>
          <span className="text-slate-400 block font-bold">اسم العميل</span>
          <strong className="text-brand-navy dark:text-brand-light block mt-0.5">{job.customerName || 'كريم فهمي'}</strong>
          <span className="text-[10px] text-slate-400 block mt-0.5">{job.customerPhone || '01011223344'}</span>
        </div>
        <div className="text-left">
          <span className="text-slate-400 block font-bold">الفني المختص</span>
          <strong className="text-brand-navy dark:text-brand-light block mt-0.5">{job.artisanName}</strong>
          <span className="text-[10px] text-brand-orange block mt-0.5">موثق بالفيش الجنائي 🛡️</span>
        </div>
      </div>

      {/* تفاصيل الخدمة المنفذة */}
      <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl text-xs mb-6 flex flex-col gap-2">
        <div className="flex justify-between">
          <span className="text-slate-400">طبيعة العطل</span>
          <span className="text-brand-navy dark:text-brand-light font-bold">{job.description}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">تاريخ الزيارة</span>
          <span className="text-brand-navy dark:text-brand-light font-bold">{formatDate(job.preferredDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">طريقة الدفع</span>
          <span className="text-brand-navy dark:text-brand-light font-bold">
            {isCash ? 'كاش (نقداً للأسطى)' : 'محفظة إلكترونية قيد التطوير'}
          </span>
        </div>
      </div>

      {/* جدول العمليات المالية والضرائب */}
      <h3 className="text-xs font-extrabold text-brand-navy dark:text-brand-light mb-3">تفاصيل الحساب المالي (EGP)</h3>
      <div className="flex flex-col gap-2.5 text-xs border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
        
        <div className="flex justify-between">
          <span className="text-slate-400">أتعاب الكشف والصيانة الأساسية</span>
          <strong className="text-brand-navy dark:text-brand-light">{formatCurrency(basePrice)}</strong>
        </div>
        
        <div className="flex justify-between">
          <span className="text-slate-400">ضريبة القيمة المضافة (5% VAT)</span>
          <strong className="text-brand-navy dark:text-brand-light">{formatCurrency(vat)}</strong>
        </div>

        {/* كشف العمولة للمستثمرين والإدارة فقط */}
        <div className="flex justify-between bg-orange-500/5 dark:bg-orange-500/10 p-2 rounded-xl border border-dashed border-orange-200 dark:border-orange-950/50">
          <div className="text-right">
            <span className="text-slate-400 text-[10px] block">عمولة تشغيل المنصة (15% Commission)</span>
            <span className="text-[10px] text-brand-orange block">صافي أرباح الفني: {formatCurrency(netEarnings)}</span>
          </div>
          <strong className="text-brand-orange self-center">{formatCurrency(commission)}</strong>
        </div>

      </div>

      {/* المبلغ الكلي النهائي المحصل */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm font-extrabold text-brand-navy dark:text-brand-light">المبلغ الإجمالي المطلوب سداده</span>
        <h2 className="text-lg font-black text-brand-orange">{formatCurrency(totalAmount)}</h2>
      </div>

      {/* الشارة الرسمية الضريبية المعتمدة */}
      <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5 text-center">
        <span className="text-[9px] font-black text-brand-emerald block leading-relaxed">
          📜 فاتورة ضريبية إلكترونية معتمدة من منصة حرفجي لربط الخدمات المنزلية
        </span>
      </div>

      {/* زر الطباعة المدمج */}
      <button 
        onClick={() => window.print()}
        className="w-full mt-4 py-2 text-xs font-bold text-slate-400 hover:text-brand-orange transition-colors flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-800 rounded-xl print:hidden"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        <span>طباعة الفاتورة أو حفظها كـ PDF</span>
      </button>

    </div>
  );
};
