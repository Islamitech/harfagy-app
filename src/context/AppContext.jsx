import React, { createContext, useContext, useState, useEffect } from 'react';

// إنشاء سياق الإعدادات العامة للمنصة
export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // تفضيلات اللغة (العربية افتراضياً لدعم RTL)
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('harfagy_lang') || 'ar';
  });

  // نمط المظهر الداكن (Dark Mode)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('harfagy_dark_mode') === 'true';
  });

  // إدارة التنبيهات والإشعارات الذكية (Toasts)
  const [toasts, setToasts] = useState([]);

  // عند تغيير اللغة، نقوم بتحديث اتجاه الصفحة وحفظ الخيار محلياً
  useEffect(() => {
    localStorage.setItem('harfagy_lang', language);
    const htmlElement = document.documentElement;
    if (language === 'ar') {
      htmlElement.dir = 'rtl';
      htmlElement.lang = 'ar';
    } else {
      htmlElement.dir = 'ltr';
      htmlElement.lang = 'en';
    }
  }, [language]);

  // عند تغيير المظهر الداكن، نقوم بتحديث فئة 'dark' في كائن الوثيقة الرئيسي
  useEffect(() => {
    localStorage.setItem('harfagy_dark_mode', isDarkMode);
    const htmlElement = document.documentElement;
    if (isDarkMode) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // دالة تبديل اللغة الفوري
  const toggleLanguage = () => {
    setLanguage(prev => (prev === 'ar' ? 'en' : 'ar'));
    showToast(language === 'ar' ? 'Language switched to English' : 'تم تحويل اللغة إلى العربية', 'info');
  };

  // دالة تبديل النمط الليلي
  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
    showToast(!isDarkMode ? (language === 'ar' ? 'تم تفعيل الوضع الليلي' : 'Dark Mode Enabled') : (language === 'ar' ? 'تم تفعيل الوضع المضيء' : 'Light Mode Enabled'), 'info');
  };

  // دالة عرض الإشعارات العائمة الذكية (Toast System)
  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    // إزالة التنبيه تلقائياً بعد 4.5 ثوانٍ
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 4500);
  };

  return (
    <AppContext.Provider value={{
      language,
      setLanguage,
      toggleLanguage,
      isDarkMode,
      toggleDarkMode,
      toasts,
      showToast
    }}>
      {children}
    </AppContext.Provider>
  );
};

// Hook مخصص لسهولة استدعاء إعدادات التطبيق في الواجهات
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
