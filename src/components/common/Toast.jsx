import React from 'react';
import { useApp } from '../../context/AppContext.jsx';

/**
 * نظام عرض التنبيهات المنبثقة التفاعلية العائمة (Floating Toast Notifications)
 */
export const ToastContainer = () => {
  const { toasts } = useApp();

  // تخصيص الألوان لكل نوع تنبيه
  const colors = {
    success: 'bg-emerald-500 text-white shadow-emerald-500/20 border-emerald-400',
    error: 'bg-brand-rose text-white shadow-rose-500/20 border-rose-400',
    info: 'bg-brand-navy text-white shadow-slate-900/20 border-slate-700'
  };

  // أيقونات SVG نقية ومميزة لكل فئة
  const icons = {
    success: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  return (
    <div className="fixed top-6 right-6 left-6 md:left-auto md:w-80 z-50 flex flex-col gap-3 pointer-events-none font-cairo">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xl
            animate-in slide-in-from-top-4 duration-300
            ${colors[toast.type] || colors.info}
          `}
          style={{ direction: 'rtl' }}
        >
          <span>{icons[toast.type]}</span>
          <p className="text-xs font-bold leading-relaxed">{toast.message}</p>
        </div>
      ))}
    </div>
  );
};
export default ToastContainer;
