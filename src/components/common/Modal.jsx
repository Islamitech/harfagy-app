import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';

/**
 * نافذة منبثقة تفاعلية تدعم الوضع الداكن وتغيير اتجاه الترويسة طبقاً للغة
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  const { language } = useApp();

  // إغلاق النافذة عند الضغط على زر ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // تعريف مقاسات النافذة المنبثقة
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  const isRTL = language === 'ar';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-cairo">
      {/* الخلفية المظلمة نصف الشفافة Overlay */}
      <div 
        className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* محتوى النافذة المنبثقة */}
      <div className={`
        relative w-full ${sizes[size] || sizes.md} bg-white dark:bg-brand-slate 
        rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800
        animate-in fade-in zoom-in-95 duration-200 z-10 flex flex-col max-h-[90vh]
      `}>
        {/* الترويسة Header */}
        <div className={`
          px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between
          ${isRTL ? 'flex-row' : 'flex-row-reverse'}
        `}>
          {/* زر الإغلاق الجانبي */}
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-brand-orange dark:hover:text-brand-orange transition-colors p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {/* العنوان الرئيسي للنافذة */}
          <h3 className="text-sm font-extrabold text-brand-navy dark:text-brand-light">
            {title}
          </h3>
        </div>

        {/* جسم النافذة Body */}
        <div className="p-6 overflow-y-auto flex-1 text-right" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
          {children}
        </div>
      </div>
    </div>
  );
};
