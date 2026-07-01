import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext.jsx';
import { useUser } from './context/UserContext.jsx';
import { ToastContainer } from './components/common/Toast.jsx';

// استيراد الشاشات والواجهات الفرعية للعملاء بالامتدادات الصريحة
import { CustomerHome } from './views/customer/CustomerHome.jsx';
import { CustomerProfile } from './views/customer/CustomerProfile.jsx';
import { JobTracking } from './views/customer/JobTracking.jsx';

// استيراد الشاشات والواجهات الفرعية للحرفيين بالامتدادات الصريحة
import { IncomingLeads } from './views/artisan/IncomingLeads.jsx';
import { ActiveJobs } from './views/artisan/ActiveJobs.jsx';
import { ArtisanProfile } from './views/artisan/ArtisanProfile.jsx';

// استيراد الشاشات والواجهات الفرعية للإشراف والتحكم الإداري بالامتدادات الصريحة
import { AdminDashboard } from './views/admin/AdminDashboard.jsx';
import { MasterDirectory } from './views/admin/MasterDirectory.jsx';
import { VerificationPortal } from './views/admin/VerificationPortal.jsx';
import { DisputeDesk } from './views/admin/DisputeDesk.jsx';
import { CategorySettings } from './views/admin/CategorySettings.jsx';
import { PayoutsPortal } from './views/admin/PayoutsPortal.jsx';

import { Button } from './components/common/Button.jsx';
import { Input } from './components/common/Input.jsx';
import { db } from './services/db.js';

// سايدبار سجل الحركات العام المحدث تصاعدياً وبشكل حي
function AuditLogsSidebar({ activeRole }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const all = await db.getCollection('audit_logs');
      // فرز تصاعدي (من الأقدم للأحدث كما طلب المستخدم)
      const sorted = [...all].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setLogs(sorted);
    };
    fetchLogs();

    const unsub = db.subscribe(() => {
      fetchLogs();
    });
    return () => unsub();
  }, []);

  return (
    <div className="w-80 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col gap-4 max-h-[600px] overflow-y-auto hide-scrollbar text-right font-cairo">
      <div>
        <h3 className="text-xs font-extrabold text-slate-850 dark:text-brand-light">🔐 سجل الرقابة والعمليات الأمنية</h3>
        <p className="text-[9px] text-slate-400 mt-0.5">رصد فوري لجميع حركات المشرفين والمديرين</p>
      </div>

      <div className="flex flex-col gap-3">
        {logs.length > 0 ? (
          logs.map(log => (
            <div 
              key={log.id} 
              className="bg-slate-50 dark:bg-slate-950/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 flex flex-col gap-1.5 text-[10px]"
            >
              <div className="flex justify-between items-center text-[8px]">
                <span className={`px-2 py-0.5 rounded-md font-bold text-white ${
                  log.adminRole === 'superadmin' ? 'bg-orange-500' : log.adminRole === 'auditor' ? 'bg-slate-900 dark:bg-slate-700' : 'bg-rose-600'
                }`}>
                  {log.adminRole === 'superadmin' ? 'مدير عام' : log.adminRole === 'auditor' ? 'مشرف مالي' : 'مشرف أمني'}
                </span>
                <span className="text-slate-400 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-semibold text-[9.5px]">
                {log.details}
              </p>
              <div className="flex justify-between items-center text-[8px] text-slate-400 border-t border-slate-100/50 dark:border-slate-850 pt-1.5 font-mono">
                <span>IP: {log.ip || '192.168.1.45'}</span>
                <span>ID: {log.targetUserId ? log.targetUserId.substring(0, 5) : 'System'}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-slate-400 text-[10px] font-bold">
            لا توجد حركات أمنية مسجلة حالياً.
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * منظم جذر تطبيق منصة حرفجي PWA - واجهة عصرية عازلة للمستثمرين
 */
export default function App() {
  const { language, toggleLanguage, isDarkMode, toggleDarkMode } = useApp();
  const { currentUser, login, logout, registerUser } = useUser();

  // تفضيلات وضع المعاينة المنقسم للمستثمرين (يتاح للمدير واللوحة التجريبية فقط)
  const [splitScreenMode, setSplitScreenMode] = useState(false); 
  const [adminRole, setAdminRole] = useState('superadmin'); // رتب الإشراف (superadmin, auditor, security)

  // التبويبات النشطة للعميل، الحرفي والمسؤول
  const [customerTab, setCustomerTab] = useState('home');
  const [artisanTab, setArtisanTab] = useState('profile'); // الصفحة الشخصية الشاملة افتراضياً لتسهيل الرصد
  const [adminTab, setAdminTab] = useState('analytics');

  // نموذج الدخول والإنشاء
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('plumber');
  const [isRegistering, setIsRegistering] = useState(false);

  // تسجيل الدخول
  const handleAuth = async (e) => {
    e.preventDefault();
    if (phone === 'AEAdmin') {
      if (password !== 'Aa132456') {
        alert("⚠️ كلمة المرور غير صحيحة لحساب المدير العام.");
        return;
      }
      const adminUser = {
        id: 'admin-system',
        name: 'أحمد عزالدين',
        phone: 'AEAdmin',
        role: 'superadmin',
        governorate: 'الجيزة',
        district: 'حدائق الأهرام',
        wallet: 0,
        custom_id: 'MG-0303'
      };
      localStorage.setItem('harfagy_current_user', JSON.stringify(adminUser));
      window.location.reload();
      return;
    }

    if (isRegistering) {
      if (!name || !phone || !password) {
        alert("يرجى إدخال البيانات كاملة بما في ذلك كلمة المرور.");
        return;
      }
      const newUser = {
        name,
        phone,
        password,
        role: role === 'artisan' ? 'artisan' : 'customer',
        category: role === 'artisan' ? category : undefined,
        governorate: 'الجيزة',
        district: 'حدائق الأهرام',
        wallet: role === 'customer' ? 200 : 0, 
        referralCode: `REF-${name.substring(0,4).toUpperCase()}`,
        emailVerified: 'pending',
        phoneVerified: 'pending'
      };
      const created = await registerUser(newUser);
      if (created && role === 'artisan') {
        const newArtisan = {
          userId: created.id,
          name: created.name,
          category: category,
          custom_id: created.custom_id,
          bio: 'فني صحي وعضو مسجل جديد في دليل حدائق الأهرام صيانة وتسريبات.',
          rating: 5.0,
          completedJobs: 0,
          wallet: 0,
          commissionDue: 0,
          isOnline: true,
          verified: false,
          rank: 'bronze'
        };
        await db.addDocument("artisans", newArtisan);
      }
    } else {
      await login(phone, password, role);
    }
  };

  // حوكمة تبويبات المشرفين الثلاثة
  const getAvailableAdminTabs = () => {
    if (adminRole === 'auditor') {
      return [
        { id: 'analytics', label: '📊 التحليلات والنمو' },
        { id: 'payouts', label: '💰 سحوبات الحرفيين' },
        { id: 'categories', label: '⚙️ سقف تسعير الخدمات' }
      ];
    }
    if (adminRole === 'security') {
      return [
        { id: 'users', label: '👥 سجل المستخدمين' },
        { id: 'verify', label: '🛡️ توثيق هويات الفنيين' },
        { id: 'disputes', label: '⚖️ تسوية نزاعات الصيانة' }
      ];
    }
    return [
      { id: 'analytics', label: '📊 التحليلات والنمو' },
      { id: 'users', label: '👥 سجل المستخدمين' },
      { id: 'verify', label: '🛡️ توثيق هويات الفنيين' },
      { id: 'disputes', label: '⚖️ تسوية نزاعات الصيانة' },
      { id: 'payouts', label: '💰 سحوبات الحرفيين' },
      { id: 'categories', label: '⚙️ سقف تسعير الخدمات' }
    ];
  };

  const adminTabs = getAvailableAdminTabs();
  const activeAdminTab = adminTabs.some(t => t.id === adminTab) ? adminTab : adminTabs[0]?.id || 'analytics';

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-[#0b0f19] font-cairo text-right transition-colors duration-350`} style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      {/* صندوق التنبيهات العام */}
      <ToastContainer />

      {/* بوابة الدخول والتسجيل الفاخرة بأسلوب الزجاج البلوري */}
      {!currentUser ? (
        <div className="flex flex-col min-h-screen bg-gradient-to-tr from-slate-100 to-orange-50/40 dark:from-[#0b0f19] dark:to-slate-900">
          
          {/* شريط الإعدادات العلوي للبوابة */}
          <header className="px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <img src="/assets/icon-192.png" alt="logo" className="w-12 h-12 object-contain" />
              <strong className="text-lg font-black text-orange-500 tracking-wide">حَرفَجي</strong>
              <span className="hidden sm:inline-block text-[10px] text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full font-bold shadow-sm">بوابة الخدمات الآمنة 📍</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleDarkMode} 
                className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 text-sm shadow-sm transition-all duration-300 hover:scale-105"
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              <button 
                onClick={toggleLanguage} 
                className="text-xs font-black px-4 py-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 shadow-sm transition-all duration-300 hover:scale-105"
              >
                {language === 'ar' ? 'English' : 'العربية'}
              </button>
            </div>
          </header>

          {/* الدخول الفردي المباشر */}
          <main className="max-w-md mx-auto py-8 px-4 flex flex-col gap-6 w-full justify-center flex-1 z-10">
            <div className="text-center flex flex-col items-center gap-3">
              <img src="/assets/icon-192.png" alt="logo" className="w-36 h-36 object-contain drop-shadow-md hover:scale-105 transition-transform duration-300 mb-1" />
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-brand-light">منصة حرفجي للخدمات المنزلية</h1>
                <p className="text-xs text-slate-450 dark:text-slate-400 mt-2">تسجيل دخول آمن وتصفح الدليل المهني المعتمد بمصر</p>
              </div>
            </div>

            <form 
              onSubmit={handleAuth} 
              className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800 p-7 rounded-[2rem] shadow-2xl flex flex-col gap-4 text-xs"
            >
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-brand-light pb-2 border-b border-slate-100 dark:border-slate-800">
                {isRegistering ? '📝 إنشاء حساب جديد بالدليل' : '🔑 تسجيل الدخول بالرقم المسجل'}
              </h3>

              {isRegistering && (
                <Input 
                  label="الاسم الكامل"
                  type="text"
                  required
                  placeholder="أحمد علي"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              )}

              <Input 
                label="رقم الهاتف"
                type="text"
                required
                placeholder="01011223344"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <Input 
                label="كلمة المرور"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {!isRegistering && phone !== 'AEAdmin' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-400 block font-bold">نوع الرتبة والحساب</label>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200/60 dark:border-slate-750 outline-none transition-all duration-350 focus:border-orange-500"
                  >
                    <option value="customer">عميل صيانة منزلية 👤</option>
                    <option value="artisan">حرفي / فني صيانة 👷‍♂️</option>
                  </select>
                </div>
              )}

              {isRegistering && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 block font-bold">تسجيل الحساب كـ</label>
                    <select 
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200/60 dark:border-slate-750 outline-none transition-all duration-350 focus:border-orange-500"
                    >
                      <option value="customer">عميل صيانة منزلية 👤</option>
                      <option value="artisan">حرفي / فني صيانة 👷‍♂️</option>
                    </select>
                  </div>

                  {role === 'artisan' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-400 block font-bold">تخصص الصيانة الأساسي</label>
                      <select 
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200/60 dark:border-slate-750 outline-none transition-all duration-350 focus:border-orange-500"
                      >
                        <option value="plumber">سباكة (S)</option>
                        <option value="electrician">كهرباء (K)</option>
                        <option value="hvac">تكييف (T)</option>
                        <option value="carpenter">نجارة (N)</option>
                        <option value="painter">دهانات (D)</option>
                        <option value="appliances">أجهزة منزلية (H)</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              <Button 
                type="submit" 
                className="w-full mt-2 bg-orange-500 border-orange-500 text-white font-black py-3 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-orange-500/10 active:scale-95"
              >
                {isRegistering ? 'تأكيد إنشاء الحساب وبدء التشغيل' : 'تسجيل دخول آمن ➡️'}
              </Button>

              <div className="text-center mt-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <button 
                  type="button" 
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-[10px] font-bold text-orange-500 hover:underline"
                >
                  {isRegistering ? 'بالفعل لدي حساب؟ قم بتسجيل الدخول' : 'ليس لديك حساب؟ سجل معنا كعميل أو حرفي الآن'}
                </button>
              </div>
            </form>
          </main>
        </div>
      ) : (
        /* واجهات المستخدمين بعد تسجيل الدخول بنجاح */
        <div className="min-h-screen flex flex-col">
          
          {/* 1. واجهة العميل العادي المعزولة والمؤطرة كجهاز هاتف PWA */}
          {currentUser.role === 'customer' && (
            <div className="flex-1 flex items-center justify-center p-4 bg-slate-100 dark:bg-[#070b12] transition-colors duration-300">
              <div className="w-full max-w-[365px] bg-slate-50 dark:bg-[#0b0f19] rounded-[3.2rem] shadow-2xl border-[11px] border-slate-900 dark:border-slate-800 overflow-hidden relative aspect-[9/19.5] flex flex-col min-h-[730px] max-h-[800px] transition-all duration-300">
                
                {/* كاميرا الهاتف Mock */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-slate-900 dark:bg-slate-800 rounded-full z-20 flex items-center justify-center">
                  <div className="w-2.5 h-1 rounded-full bg-slate-800"></div>
                </div>

                {/* ترويسة هاتف العميل */}
                <div className="pt-8 flex-1 overflow-y-auto pb-16 hide-scrollbar bg-slate-50 dark:bg-[#0b0f19]">
                  <div className="bg-white dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/80 px-4 py-2 text-[11px] font-black flex justify-between items-center sticky top-0 z-15 shadow-sm text-slate-800 dark:text-brand-light">
                    <span className="flex items-center gap-2">
                      <img src="/assets/icon-192.png" alt="logo" className="w-10 h-10 object-contain drop-shadow-sm" />
                      <span>{currentUser.name} ({currentUser.custom_id || 'U-0101'})</span>
                    </span>
                    <span className="text-[10px] text-orange-500">📍 حدائق الأهرام</span>
                  </div>

                  {customerTab === 'home' && <CustomerHome />}
                  {customerTab === 'tracking' && <JobTracking />}
                  {customerTab === 'profile' && <CustomerProfile />}
                </div>

                {/* شريط ملاحة هاتف العميل - رموز وتدرجات مخصصة للجوال مع ميكرو-لاين علوي */}
                <nav className="absolute bottom-0 left-0 right-0 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 py-2.5 px-3 flex justify-around items-center z-20 shadow-lg">
                  <button 
                    onClick={() => setCustomerTab('home')} 
                    className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-all duration-300 relative ${customerTab === 'home' ? 'text-orange-500 scale-110 font-bold' : 'text-slate-450 dark:text-slate-500'}`}
                  >
                    {customerTab === 'home' && <span className="absolute -top-2.5 w-6 h-0.5 bg-orange-500 rounded-full transition-all duration-300 animate-pulse"></span>}
                    <span className="text-base">🔍</span>
                    <span>تصفح الفنيين</span>
                  </button>
                  
                  <button 
                    onClick={() => setCustomerTab('tracking')} 
                    className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-all duration-300 relative ${customerTab === 'tracking' ? 'text-orange-500 scale-110 font-bold' : 'text-slate-450 dark:text-slate-500'}`}
                  >
                    {customerTab === 'tracking' && <span className="absolute -top-2.5 w-6 h-0.5 bg-orange-500 rounded-full transition-all duration-300 animate-pulse"></span>}
                    <span className="text-base">📋</span>
                    <span>التتبع والدردشة</span>
                  </button>
                  
                  <button 
                    onClick={() => setCustomerTab('profile')} 
                    className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-all duration-300 relative ${customerTab === 'profile' ? 'text-orange-500 scale-110 font-bold' : 'text-slate-450 dark:text-slate-500'}`}
                  >
                    {customerTab === 'profile' && <span className="absolute -top-2.5 w-6 h-0.5 bg-orange-500 rounded-full transition-all duration-300 animate-pulse"></span>}
                    <span className="text-base">👤</span>
                    <span>حسابي</span>
                  </button>
                </nav>

              </div>
            </div>
          )}

          {/* 2. واجهة الحرفي العادي المعزولة والمؤطرة كجهاز هاتف PWA */}
          {currentUser.role === 'artisan' && (
            <div className="flex-1 flex items-center justify-center p-4 bg-slate-100 dark:bg-[#070b12] transition-colors duration-300">
              <div className="w-full max-w-[365px] bg-slate-50 dark:bg-[#0b0f19] rounded-[3.2rem] shadow-2xl border-[11px] border-slate-900 dark:border-slate-800 overflow-hidden relative aspect-[9/19.5] flex flex-col min-h-[730px] max-h-[800px] transition-all duration-300">
                
                {/* كاميرا الهاتف Mock */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-slate-900 dark:bg-slate-800 rounded-full z-20 flex items-center justify-center">
                  <div className="w-2.5 h-1 rounded-full bg-slate-800"></div>
                </div>

                {/* ترويسة هاتف الحرفي */}
                <div className="pt-8 flex-1 overflow-y-auto pb-16 hide-scrollbar bg-slate-50 dark:bg-[#0b0f19]">
                  <div className="bg-white dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/80 px-4 py-2 text-[11px] font-black flex justify-between items-center sticky top-0 z-15 shadow-sm text-slate-800 dark:text-brand-light">
                    <span className="flex items-center gap-2">
                      <img src="/assets/icon-192.png" alt="logo" className="w-10 h-10 object-contain drop-shadow-sm" />
                      <span>{currentUser.name}</span>
                    </span>
                    <span className="text-[10px] text-orange-500 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{currentUser.custom_id || 'AT-0202'}</span>
                  </div>

                  {artisanTab === 'leads' && <IncomingLeads onAcceptSuccess={() => setArtisanTab('jobs')} />}
                  {artisanTab === 'jobs' && <ActiveJobs />}
                  {artisanTab === 'profile' && <ArtisanProfile />}
                </div>

                {/* شريط ملاحة هاتف الحرفي - رموز مخصصة للجوال مع ميكرو-لاين برتقالي */}
                <nav className="absolute bottom-0 left-0 right-0 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 py-2.5 px-3 flex justify-around items-center z-20 shadow-lg">
                  <button 
                    onClick={() => setArtisanTab('leads')} 
                    className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-all duration-300 relative ${artisanTab === 'leads' ? 'text-orange-500 scale-110 font-bold' : 'text-slate-450 dark:text-slate-500'}`}
                  >
                    {artisanTab === 'leads' && <span className="absolute -top-2.5 w-6 h-0.5 bg-orange-500 rounded-full transition-all duration-300 animate-pulse"></span>}
                    <span className="text-base">🔔</span>
                    <span>الطلبات الواردة</span>
                  </button>
                  
                  <button 
                    onClick={() => setArtisanTab('jobs')} 
                    className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-all duration-300 relative ${artisanTab === 'jobs' ? 'text-orange-500 scale-110 font-bold' : 'text-slate-450 dark:text-slate-500'}`}
                  >
                    {artisanTab === 'jobs' && <span className="absolute -top-2.5 w-6 h-0.5 bg-orange-500 rounded-full transition-all duration-300 animate-pulse"></span>}
                    <span className="text-base">🛠️</span>
                    <span>العمليات الجارية</span>
                  </button>
                  
                  <button 
                    onClick={() => setArtisanTab('profile')} 
                    className={`flex flex-col items-center gap-1 text-[10px] font-medium transition-all duration-300 relative ${artisanTab === 'profile' ? 'text-orange-500 scale-110 font-bold' : 'text-slate-450 dark:text-slate-500'}`}
                  >
                    {artisanTab === 'profile' && <span className="absolute -top-2.5 w-6 h-0.5 bg-orange-500 rounded-full transition-all duration-300 animate-pulse"></span>}
                    <span className="text-base">👤</span>
                    <span>الملف الشخصي</span>
                  </button>
                </nav>

              </div>
            </div>
          )}

          {/* 3. لوحة تحكم المسؤول والإدارة والأمن المركزية (Admin Center Wide View) */}
          {(currentUser.role === 'admin' || currentUser.role === 'superadmin') && (
            <div className="flex-1 flex flex-col p-6 w-full max-w-7xl mx-auto">
              
              {/* شريط تحكم الإدارة وتنشيط وضع المستثمر المزدوج للآدمن */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
                <div>
                  <h1 className="text-sm font-black text-slate-900 dark:text-brand-light">بوابة الإشراف والأمان المركزية 👑</h1>
                  <p className="text-[10px] text-slate-400 mt-1">حساب المسؤول المعتمد: {currentUser.name} ({adminRole === 'superadmin' ? 'MG-0303' : adminRole === 'auditor' ? 'MF-0001' : 'MS-0001'})</p>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* زر تفعيل وضع المستثمر المزدوج التفاعلي */}
                  <button 
                    onClick={() => setSplitScreenMode(!splitScreenMode)}
                    className={`
                      flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black border transition-all duration-300
                      ${splitScreenMode 
                        ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/10' 
                        : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}
                    `}
                  >
                    📱📱 تفعيل وضع المستثمر المزدوج
                  </button>

                  {/* تبديل رتب الإشراف وتجربة الصلاحيات */}
                  <div className="flex gap-1.5 border border-slate-200 dark:border-slate-750 p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <button onClick={() => setAdminRole('superadmin')} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all ${adminRole === 'superadmin' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500'}`}>المدير العام (MG)</button>
                    <button onClick={() => setAdminRole('auditor')} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all ${adminRole === 'auditor' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500'}`}>المشرف المالي (MF)</button>
                    <button onClick={() => setAdminRole('security')} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all ${adminRole === 'security' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500'}`}>المشرف الأمني (MS)</button>
                  </div>
                </div>
              </div>

              {/* وضع المعاينة المزدوج المتزامن للمستثمرين (Investor Split-Screen Mode) */}
              {splitScreenMode ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-start max-w-5xl mx-auto py-4">
                  
                  {/* هاتف اليمين: العميل (أحمد صاوي) */}
                  <div className="border-[11px] border-slate-900 dark:border-slate-800 rounded-[3.2rem] overflow-hidden shadow-2xl bg-white dark:bg-slate-900 max-w-[365px] mx-auto w-full aspect-[9/19.5] flex flex-col min-h-[730px] max-h-[800px] relative">
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-slate-900 dark:bg-slate-800 rounded-full z-20 flex items-center justify-center">
                      <div className="w-2.5 h-1 rounded-full bg-slate-850"></div>
                    </div>
                    
                    <div className="pt-8 flex-1 overflow-y-auto pb-16 hide-scrollbar bg-slate-50 dark:bg-[#0b0f19]">
                      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/80 px-4 py-3 text-[11px] font-black flex justify-between items-center sticky top-0 z-10 text-slate-800 dark:text-brand-light">
                        <span>📱 هاتف العميل: {currentUser && currentUser.role === 'customer' ? currentUser.name : 'أحمد صاوي'} ({currentUser && currentUser.role === 'customer' ? currentUser.custom_id : 'U-0101'})</span>
                        <span>📍 حدائق الأهرام</span>
                      </div>
                      {customerTab === 'home' && <CustomerHome />}
                      {customerTab === 'tracking' && <JobTracking />}
                      {customerTab === 'profile' && <CustomerProfile />}
                    </div>

                    <nav className="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 py-2.5 px-3 flex justify-around items-center z-10 shadow-lg">
                      <button onClick={() => setCustomerTab('home')} className={`flex flex-col items-center text-[9px] font-bold transition-all ${customerTab === 'home' ? 'text-orange-500 scale-105' : 'text-slate-400'}`}><span className="text-base">🔍</span><span>تصفح</span></button>
                      <button onClick={() => setCustomerTab('tracking')} className={`flex flex-col items-center text-[9px] font-bold transition-all ${customerTab === 'tracking' ? 'text-orange-500 scale-105' : 'text-slate-400'}`}><span className="text-base">📋</span><span>التتبع</span></button>
                      <button onClick={() => setCustomerTab('profile')} className={`flex flex-col items-center text-[9px] font-bold transition-all ${customerTab === 'profile' ? 'text-orange-500 scale-105' : 'text-slate-400'}`}><span className="text-base">👤</span><span>حسابي</span></button>
                    </nav>
                  </div>

                  {/* هاتف اليسار: الحرفي (شريف رفعت) */}
                  <div className="border-[11px] border-slate-900 dark:border-slate-800 rounded-[3.2rem] overflow-hidden shadow-2xl bg-white dark:bg-slate-900 max-w-[365px] mx-auto w-full aspect-[9/19.5] flex flex-col min-h-[730px] max-h-[800px] relative">
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-slate-900 dark:bg-slate-800 rounded-full z-20 flex items-center justify-center">
                      <div className="w-2.5 h-1 rounded-full bg-slate-850"></div>
                    </div>
                    
                    <div className="pt-8 flex-1 overflow-y-auto pb-16 hide-scrollbar bg-slate-50 dark:bg-[#0b0f19]">
                      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800/80 px-4 py-3 text-[11px] font-black flex justify-between items-center sticky top-0 z-10 text-slate-800 dark:text-brand-light">
                        <span>📱 هاتف الحرفي: {currentUser && currentUser.role === 'artisan' ? currentUser.name : 'شريف رفعت'} ({currentUser && currentUser.role === 'artisan' ? currentUser.custom_id : 'AT-0202'})</span>
                        <span>⚡ صيانة الأعطال</span>
                      </div>
                      {artisanTab === 'leads' && <IncomingLeads onAcceptSuccess={() => setArtisanTab('jobs')} />}
                      {artisanTab === 'jobs' && <ActiveJobs />}
                      {artisanTab === 'profile' && <ArtisanProfile />}
                    </div>

                    <nav className="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 py-2.5 px-3 flex justify-around items-center z-10 shadow-lg">
                      <button onClick={() => setArtisanTab('leads')} className={`flex flex-col items-center text-[9px] font-bold transition-all ${artisanTab === 'leads' ? 'text-orange-500 scale-105' : 'text-slate-400'}`}><span className="text-base">🔔</span><span>الطلبات</span></button>
                      <button onClick={() => setArtisanTab('jobs')} className={`flex flex-col items-center text-[9px] font-bold transition-all ${artisanTab === 'jobs' ? 'text-orange-500 scale-105' : 'text-slate-400'}`}><span className="text-base">🛠️</span><span>العمليات</span></button>
                      <button onClick={() => setArtisanTab('profile')} className={`flex flex-col items-center text-[9px] font-bold transition-all ${artisanTab === 'profile' ? 'text-orange-500 scale-105' : 'text-slate-400'}`}><span className="text-base">👤</span><span>حسابي</span></button>
                    </nav>
                  </div>

                </div>
              ) : (
                /* لوحة التحكم الإدارية المتسعة للكمبيوتر مع سايدبار سجل العمليات */
                <div className="flex flex-col lg:flex-row gap-6 w-full items-start max-w-6xl mx-auto py-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex-1 w-full">
                    
                    {/* شريط تبويبات المشرفين المنظم بالرتب المحددة */}
                    <div className="flex justify-around border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 text-xs font-black text-slate-400">
                      {adminTabs.map(tab => (
                        <button 
                          key={tab.id}
                          onClick={() => setAdminTab(tab.id)} 
                          className={activeAdminTab === tab.id ? 'text-orange-500 border-b-2 border-orange-500 pb-4 -mb-4.5 font-black scale-105' : ''}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* رندر محتوى التبويب الإداري */}
                    {activeAdminTab === 'analytics' && <AdminDashboard activeRole={adminRole} />}
                    {activeAdminTab === 'users' && <MasterDirectory activeRole={adminRole} />}
                    {activeAdminTab === 'verify' && <VerificationPortal activeRole={adminRole} />}
                    {activeAdminTab === 'disputes' && <DisputeDesk activeRole={adminRole} />}
                    {activeAdminTab === 'payouts' && <PayoutsPortal activeRole={adminRole} />}
                    {activeAdminTab === 'categories' && <CategorySettings activeRole={adminRole} />}

                    {/* تسجيل خروج المشرف */}
                    <Button variant="danger" className="w-full mt-6 text-xs font-bold" onClick={logout}>🚪 تسجيل الخروج من إدارة النظام</Button>
                  </div>

                  {/* سايدبار رصد الحركات الأمنية الفوري */}
                  <AuditLogsSidebar activeRole={adminRole} />
                </div>
              )}

            </div>
          )}

          {/* تسجيل خروج للهواتف في الشاشة الواحدة */}
          {currentUser && currentUser.role !== 'admin' && currentUser.role !== 'superadmin' && !splitScreenMode && (
            <div className="max-w-4xl mx-auto mt-2 text-center pb-6">
              <button onClick={logout} className="text-xs text-slate-450 hover:text-brand-rose font-bold">🚪 تسجيل الخروج من الحساب</button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
