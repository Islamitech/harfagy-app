import React from 'react';
import { sanitizeInput } from '../../utils/sanitizer.js';

/**
 * حقول إدخال آمنة تدعم التصفية الفورية من هجمات XSS والتكيف مع المظهر المظلم
 */
export const Input = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  error = '',
  sanitized = false,
  className = '',
  ...rest
}) => {
  
  // معالجة حدث خروج التركيز (onBlur) لتنظيف النصوص آلياً
  const handleBlur = (e) => {
    if (sanitized && onChange) {
      const rawValue = e.target.value;
      const cleanValue = sanitizeInput(rawValue);
      
      // إذا تم العثور على وسوم خبيثة وتطهيرها، نقوم بتحديث الحالة الحاكمة
      if (cleanValue !== rawValue) {
        onChange({
          ...e,
          target: {
            ...e.target,
            value: cleanValue
          }
        });
      }
    }
    
    // استدعاء المنهج الأصلي إذا وجد
    if (rest.onBlur) {
      rest.onBlur(e);
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 w-full font-cairo ${className}`}>
      {label && (
        <label className="text-xs font-bold text-brand-navy dark:text-brand-light">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`
          w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all duration-200
          bg-white text-brand-navy border-slate-200 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange
          dark:bg-slate-800 dark:text-brand-light dark:border-slate-700 dark:focus:border-brand-orange dark:focus:ring-brand-orange
          ${error ? 'border-brand-rose focus:border-brand-rose focus:ring-brand-rose dark:border-brand-rose' : ''}
        `}
        {...rest}
      />
      {error && (
        <span className="text-[10px] font-bold text-brand-rose">
          ⚠️ {error}
        </span>
      )}
    </div>
  );
};
