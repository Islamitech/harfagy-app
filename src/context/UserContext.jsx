import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/db.js';
import { useApp } from './AppContext.jsx';

// إنشاء سياق الجلسات والتراخيص
export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const { showToast, language } = useApp();
  
  // حالة المستخدم النشط حالياً وجلسة الدخول
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('harfagy_current_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // قائمة المفضلة المحلية الخاصة بالعميل الحالي
  const [favorites, setFavorites] = useState(() => {
    const savedFavs = localStorage.getItem('harfagy_favorites');
    return savedFavs ? JSON.parse(savedFavs) : [];
  });

  // مزامنة حالة المستخدم والمفضلة مع التخزين المحلي فور التغيير
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('harfagy_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('harfagy_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('harfagy_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // الاستماع لحدث التحديث عبر النوافذ المتعددة (LocalStorage Sync)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'harfagy_current_user') {
        setCurrentUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
      if (e.key === 'harfagy_favorites') {
        setFavorites(e.newValue ? JSON.parse(e.newValue) : []);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // دالة تسجيل الدخول بمحاكاة مطابقة رقم الهاتف والرتبة
  const login = async (phone, role) => {
    try {
      const usersList = await db.users.getAll();
      const matchedUser = usersList.find(u => u.phone === phone && u.role === role);
      
      if (matchedUser) {
        setCurrentUser(matchedUser);
        showToast(
          language === 'ar' ? `مرحباً بك مجدداً، ${matchedUser.name}` : `Welcome back, ${matchedUser.name}`,
          'success'
        );
        return matchedUser;
      } else {
        throw new Error(language === 'ar' ? 'عذراً، لم نجد حساباً يطابق هذه البيانات.' : 'Account not found.');
      }
    } catch (err) {
      showToast(err.message, 'error');
      return null;
    }
  };

  // دالة إنشاء حساب جديد (عميل / حرفي)
  const registerUser = async (userData) => {
    try {
      const newUser = await db.users.create(userData);
      setCurrentUser(newUser);
      showToast(
        language === 'ar' ? 'تم إنشاء حسابك وتفعيله بنجاح! مبروك 🚀' : 'Account created successfully!',
        'success'
      );
      return newUser;
    } catch (err) {
      showToast(err.message, 'error');
      return null;
    }
  };

  // تسجيل الخروج الآمن
  const logout = () => {
    setCurrentUser(null);
    showToast(language === 'ar' ? 'تم تسجيل الخروج بنجاح.' : 'Logged out successfully.', 'info');
  };

  // إدارة قائمة المفضلة للعملاء
  const toggleFavorite = (artisanId) => {
    if (favorites.includes(artisanId)) {
      setFavorites(favorites.filter(id => id !== artisanId));
      showToast(language === 'ar' ? "تمت الإزالة من المفضلة." : "Removed from favorites.", "info");
    } else {
      setFavorites([...favorites, artisanId]);
      showToast(language === 'ar' ? "تمت الإضافة للمفضلة." : "Added to favorites.", "success");
    }
  };

  return (
    <UserContext.Provider value={{
      currentUser,
      favorites,
      login,
      registerUser,
      logout,
      toggleFavorite,
      isLoggedIn: !!currentUser
    }}>
      {children}
    </UserContext.Provider>
  );
};

// Hook مخصص لسهولة استدعاء الجلسة في الواجهات
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
