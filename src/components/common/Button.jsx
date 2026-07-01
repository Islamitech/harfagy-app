import React from 'react';

/**
 * زر الإجراءات الموحد لمنصة حرفجي يدعم الوضع الداكن ومؤشر التحميل الذكي
 */
export const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  loading = false,
  className = '',
  type = 'button',
  ...rest
}) => {
  // تعريف الأنماط اللونية للزر
  const variants = {
    primary: 'bg-brand-orange text-white hover:bg-orange-600 focus:ring-brand-orange dark:bg-brand-orange dark:hover:bg-orange-600',
    secondary: 'bg-brand-navy text-white hover:bg-slate-800 focus:ring-brand-navy dark:bg-slate-900 dark:hover:bg-slate-800',
    danger: 'bg-brand-rose text-white hover:bg-rose-600 focus:ring-brand-rose dark:bg-brand-rose dark:hover:bg-rose-600',
    outline: 'border border-brand-orange text-brand-orange hover:bg-orange-50 focus:ring-brand-orange dark:border-brand-orange dark:text-brand-orange dark:hover:bg-slate-800'
  };

  // تعريف مقاسات الزر
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-2xl'
  };

  const isBtnDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isBtnDisabled}
      className={`
        font-cairo font-bold transition-all duration-200 outline-none focus:ring-2 focus:ring-offset-2 
        flex items-center justify-center gap-2
        ${variants[variant] || variants.primary} 
        ${sizes[size] || sizes.md} 
        ${isBtnDisabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
        ${className}
      `}
      {...rest}
    >
      {/* مؤشر التحميل Spinner SVG */}
      {loading && (
        <svg className="animate-spin h-4.5 w-4.5 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      <span>{children}</span>
    </button>
  );
};
