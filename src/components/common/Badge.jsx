import React from 'react';

/**
 * الشارات الملونة (لرتب الفنيين والشكاوى والحالة) تدعم الوضع المظلم
 */
export const Badge = ({
  type = 'info',
  text
}) => {
  
  // تعريف أنماط الشارات بناءً على النوع المطلوب
  const styles = {
    success: 'bg-emerald-50 text-brand-emerald border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
    warning: 'bg-amber-50 text-brand-amber border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
    danger: 'bg-rose-50 text-brand-rose border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30',
    info: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30'
  };

  return (
    <span className={`
      inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-cairo
      ${styles[type] || styles.info}
    `}>
      {text}
    </span>
  );
};
