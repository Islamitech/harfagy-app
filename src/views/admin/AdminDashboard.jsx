import React, { useState, useEffect } from 'react';
import { db } from '../../services/db.js';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency } from '../../utils/formatters.js';

/**
 * لوحة التحليلات المركزية الكلية للإشراف والأمان في مصر
 */
export const AdminDashboard = ({ activeRole = 'superadmin' }) => {
  const { language } = useApp();

  const [stats, setStats] = useState({
    totalEarned: 0,
    jobsCompleted: 0,
    pendingPayouts: 0,
    activeUsersCount: 0
  });

  useEffect(() => {
    const calculateStats = async () => {
      // 1. حساب إجمالي العمولات والعمليات المنجزة
      const allJobs = await db.jobs.getAll();
      const completed = allJobs.filter(j => j.status === 'completed');
      const commissionTotal = completed.reduce((acc, curr) => acc + (Number(curr.price) * 0.15), 0);

      // 2. حساب طلبات السحب المعلقة
      const allWd = await db.withdrawals.getAll();
      const pendingWdCount = allWd.filter(w => w.status === 'pending').length;

      // 3. حساب المستخدمين الإجمالي
      const allUsers = await db.getCollection("users");

      setStats({
        totalEarned: commissionTotal,
        jobsCompleted: completed.length,
        pendingPayouts: pendingWdCount,
        activeUsersCount: allUsers.length
      });
    };

    calculateStats();

    const unsub = db.subscribe(() => {
      calculateStats();
    });
    return () => unsub();
  }, []);

  return (
    <div className="flex flex-col gap-5 p-4 text-right font-cairo" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      <div className="customer-header">
        <h2 className="text-sm font-extrabold text-brand-navy dark:text-brand-light">لوحة التحليلات المركزية 📊</h2>
        <p className="text-[10px] text-slate-400 mt-1">الرصد الفوري والمالي لعمليات منصة حرفجي بجمهورية مصر العربية</p>
      </div>

      {/* الرتبة النشطة المحددة */}
      <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-between">
        <span>الصلاحيات الجارية: {activeRole === 'superadmin' ? 'المدير العام 👑' : activeRole === 'auditor' ? 'المشرف المالي 💵' : 'المشرف الأمني 🛡️'}</span>
        <span className="w-2.5 h-2.5 rounded-full bg-brand-emerald animate-pulse"></span>
      </div>

      {/* كروت رصد الأداء الإحصائي */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold text-center">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <span className="text-[9px] text-slate-400 block mb-1">إجمالي عمولات الشركة</span>
          <strong className="text-sm font-black text-orange-500">{formatCurrency(stats.totalEarned)}</strong>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <span className="text-[9px] text-slate-400 block mb-1">عمليات الصيانة المنجزة</span>
          <strong className="text-sm font-black text-slate-800 dark:text-brand-light">{stats.jobsCompleted} عملية</strong>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <span className="text-[9px] text-slate-400 block mb-1">سحبيات معلقة للاعتماد</span>
          <strong className="text-sm font-black text-rose-500">{stats.pendingPayouts} طلب سحب</strong>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <span className="text-[9px] text-slate-400 block mb-1">إجمالي الحسابات المسجلة</span>
          <strong className="text-sm font-black text-emerald-500">{stats.activeUsersCount} حساب نشط</strong>
        </div>

      </div>

      {/* رسم بياني نقي SVG لمعدل العمليات الجغرافية بمصر */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col gap-4">
        <h3 className="text-xs font-extrabold text-slate-800 dark:text-brand-light">📈 توزيع العمليات الشهري وجغرافية الخدمة بمصر</h3>
        
        {/* رسم بياني SVG خطي مطور بالتدرجات اللمسية */}
        <div className="w-full h-44 bg-slate-50 dark:bg-slate-950/40 rounded-2xl overflow-hidden p-3 flex items-center justify-center border border-slate-100 dark:border-slate-900">
          <svg viewBox="0 0 300 100" className="w-full h-full">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* خطوط الخلفية الإرشادية */}
            <line x1="0" y1="20" x2="300" y2="20" stroke="#f1f5f9" strokeDasharray="3,3" strokeWidth="0.75" />
            <line x1="0" y1="50" x2="300" y2="50" stroke="#f1f5f9" strokeDasharray="3,3" strokeWidth="0.75" />
            <line x1="0" y1="80" x2="300" y2="80" stroke="#f1f5f9" strokeDasharray="3,3" strokeWidth="0.75" />
            
            {/* التدرج اللوني أسفل المنحنى */}
            <path d="M 10,80 Q 50,75 100,50 T 200,30 T 290,15 L 290,90 L 10,90 Z" fill="url(#chartGradient)" />

            {/* المنحنى البياني لنمو العمليات */}
            <path d="M 10,80 Q 50,75 100,50 T 200,30 T 290,15" 
                  fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
            
            {/* نقاط التفاعل */}
            <circle cx="10" cy="80" r="3.5" fill="#f97316" stroke="#fff" strokeWidth="1" />
            <circle cx="100" cy="50" r="3.5" fill="#f97316" stroke="#fff" strokeWidth="1" />
            <circle cx="200" cy="30" r="3.5" fill="#f97316" stroke="#fff" strokeWidth="1" />
            <circle cx="290" cy="15" r="3.5" fill="#f97316" stroke="#fff" strokeWidth="1" />
 
            {/* تسميات الأشهر متباعدة لمنع التداخل */}
            <text x="10" y="93" fontSize="6.5" fill="#94a3b8" textAnchor="middle" fontWeight="bold">مارس</text>
            <text x="100" y="93" fontSize="6.5" fill="#94a3b8" textAnchor="middle" fontWeight="bold">أبريل</text>
            <text x="200" y="93" fontSize="6.5" fill="#94a3b8" textAnchor="middle" fontWeight="bold">مايو</text>
            <text x="290" y="93" fontSize="6.5" fill="#94a3b8" textAnchor="middle" fontWeight="bold">يونيو</text>
          </svg>
        </div>

        {/* توزيع جغرافية العمليات */}
        <div className="flex flex-col gap-2.5 text-[10px] font-bold">
          <div className="flex justify-between items-center">
            <span className="text-slate-450">محافظة الجيزة (حدائق الأهرام والدقي)</span>
            <span className="text-orange-500">85% من إجمالي الطلبات</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: '85%' }}></div>
          </div>

          <div className="flex justify-between items-center mt-1">
            <span className="text-slate-450">محافظة الإسكندرية (سموحة)</span>
            <span className="text-slate-800 dark:text-brand-light">15% من الطلبات</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-slate-900 dark:bg-brand-light rounded-full" style={{ width: '15%' }}></div>
          </div>
        </div>

      </div>

    </div>
  );
};
