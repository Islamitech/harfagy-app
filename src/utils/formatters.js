/**
 * تنسيق المبالغ المالية لجمهورية مصر العربية بصيغة جنيه مصري مع الحفاظ على دقة الكسور
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * تنسيق وعرض التواريخ بالصياغة واللغة العربية الرسمية
 */
export const formatDate = (dateString, locale = 'ar-EG') => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

/**
 * تنسيق أوقات إنجاز الزيارات بصيغة 12 ساعة مريحة للعميل
 */
export const formatTime = (dateString, locale = 'ar-EG') => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
};
