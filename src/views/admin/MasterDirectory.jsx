import React, { useState, useEffect } from 'react';
import { db } from '../../services/db.js';
import { Button } from '../../components/common/Button.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { sanitizeInput } from '../../utils/sanitizer.js';

/**
 * سجل التحكم بالمستخدمين وتجميد/حظر الحسابات المخالفة للسياسات الأمنية
 */
export const MasterDirectory = ({ activeRole = 'superadmin' }) => {
  const { language, showToast } = useApp();

  const [users, setUsers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [artisans, setArtisans] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [expandedUserId, setExpandedUserId] = useState(null);

  // حالات النافذة الداخلية للتفاصيل التاريخية الشاملة
  const [historyModalUser, setHistoryModalUser] = useState(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalStatusFilter, setModalStatusFilter] = useState('all');
  const [modalActiveTab, setModalActiveTab] = useState('jobs');

  useEffect(() => {
    const fetchAllData = async () => {
      const allUsers = await db.users.getAll();
      const allJobs = await db.jobs.getAll();
      const allComplaints = await db.complaints.getAll();
      const allArtisans = await db.artisans.getAll();
      const allLogs = await db.audit_logs.getAll();
      
      setUsers(allUsers || []);
      setJobs(allJobs || []);
      setComplaints(allComplaints || []);
      setArtisans(allArtisans || []);
      setAuditLogs(allLogs || []);
    };
    fetchAllData();

    const unsub = db.subscribe(fetchAllData);
    return () => unsub();
  }, []);

  // ترجمة وتسمية التخصصات المهنية باللغة العربية
  const getCategoryLabel = (catId) => {
    const categories = {
      plumber: 'سباكة (S)',
      electrician: 'كهرباء (K)',
      hvac: 'تكييف (T)',
      carpenter: 'نجارة (N)',
      painter: 'دهانات (D)',
      appliances: 'أجهزة منزلية (H)'
    };
    return categories[catId] || catId;
  };

  // التحقق من صلاحيات حظر حسابات المستخدمين بناءً على رتب النظام
  const canBlockUser = (activeAdminRole, targetUser) => {
    // لا يمكن حظر حسابات المدير العام أو المسؤول الأول إطلاقاً
    if (targetUser.role === 'superadmin' || targetUser.role === 'admin' || targetUser.phone === 'AEAdmin' || targetUser.id === 'admin-system') {
      return false;
    }

    if (activeAdminRole === 'superadmin') {
      // المدير العام يحق له حظر المشرف المالي والمشرف الأمني والعملاء والحرفيين
      return true;
    }

    if (activeAdminRole === 'security') {
      // المشرف الأمني له صلاحية حظر العملاء والحرفيين فقط
      return targetUser.role === 'customer' || targetUser.role === 'artisan';
    }

    return false; // المشرف المالي (auditor) ليس له صلاحية الحظر مطلقاً
  };

  // تجميع وإعداد التقارير الإحصائية الشاملة لكل مستخدم
  const getUserStats = (user) => {
    if (user.role === 'customer') {
      const userJobs = (jobs || []).filter(j => j && j.customerId === user.id);
      const completed = userJobs.filter(j => j.status === 'completed');
      const cancelled = userJobs.filter(j => j.status === 'cancelled');
      const userComplaints = (complaints || []).filter(c => c && c.customerId === user.id);
      const totalSpent = completed.reduce((sum, j) => sum + (j.totalPrice || 0), 0);
      
      return {
        type: 'customer',
        totalJobs: userJobs.length,
        completedCount: completed.length,
        cancelledCount: cancelled.length,
        complaintsCount: userComplaints.length,
        totalSpent,
        wallet: user.wallet || 0
      };
    }
    
    if (user.role === 'artisan') {
      const artProfile = (artisans || []).find(a => a && a.userId === user.id);
      const artProfileId = artProfile ? artProfile.id : null;
      const userJobs = (jobs || []).filter(j => j && j.artisanId === artProfileId);
      const completed = userJobs.filter(j => j.status === 'completed');
      const cancelled = userJobs.filter(j => j.status === 'cancelled');
      const userComplaints = (complaints || []).filter(c => c && c.artisanId === artProfileId);
      const totalIncome = completed.reduce((sum, j) => sum + (j.price || 0), 0);
      const totalCommission = completed.reduce((sum, j) => sum + (j.commission || 0), 0);
      
      return {
        type: 'artisan',
        totalJobs: userJobs.length,
        completedCount: completed.length,
        cancelledCount: cancelled.length,
        complaintsCount: userComplaints.length,
        totalIncome,
        totalCommission,
        wallet: artProfile ? (artProfile.wallet || 0) : 0,
        commissionDue: artProfile ? (artProfile.commissionDue || 0) : 0,
        rating: artProfile ? artProfile.rating : 5.0,
        rank: artProfile ? artProfile.rank : 'bronze',
        verified: artProfile ? artProfile.verified : false
      };
    }
    
    // رتب إدارية
    const actionsCount = (auditLogs || []).filter(log => log && log.adminRole === user.role).length;
    return {
      type: 'admin',
      actionsCount,
      accessLevel: user.role === 'superadmin' ? 'كامل الصلاحيات والمراقبة العامة (المدير العام)'
                 : user.role === 'auditor' ? 'صلاحيات مالية واعتماد طلبات السحب'
                 : user.role === 'security' ? 'صلاحيات أمنية وتسوية شكاوى ونزاعات الصيانة'
                 : 'صلاحيات إدارية ورقابة عامة'
    };
  };

  // حظر / فك حظر حساب مستخدم
  const toggleBanStatus = async (user) => {
    // التحقق من صلاحية الإجراء بناءً على الرتبة الحالية والرتبة المستهدفة
    if (!canBlockUser(activeRole, user)) {
      showToast(
        language === 'ar' ? '⚠️ غير مصرح: لا تمتلك الصلاحية الكافية لحظر أو تعديل حالة هذا الحساب الإداري.' : 'Unauthorized: Insufficient permissions to modify this account.',
        'error'
      );
      return;
    }

    const nextBanState = !user.isBanned;
    try {
      // 1. تحديث الحساب
      await db.users.update(user.id, { isBanned: nextBanState });

      // 2. تسجيل العملية في سجل التدقيق الأمني (Audit Logs)
      await db.addDocument('audit_logs', {
        adminId: 'usr-admin',
        adminRole: activeRole,
        action: nextBanState ? 'ban_user' : 'unban_user',
        targetUserId: user.id,
        targetUserName: user.name,
        ip: '192.168.1.45', // IP افتراضي
        details: `تم ${nextBanState ? 'حظر' : 'إلغاء حظر'} حساب المستخدم ${user.name} بنجاح.`,
        timestamp: new Date().toISOString()
      });

      showToast(
        nextBanState 
          ? (language === 'ar' ? `🔴 تم حظر الحساب ${user.name} بنجاح.` : `Account ${user.name} banned.`)
          : (language === 'ar' ? `🟢 تم إلغاء حظر الحساب ${user.name} بنجاح.` : `Account ${user.name} unbanned.`),
        'info'
      );
    } catch (err) {
      console.error(err);
    }
  };

  // تغيير رتبة وتعيين صلاحيات الإدارة للمستخدمين مع حماية البيانات من التكرار
  const updateUserRole = async (user, newRole) => {
    if (activeRole !== 'superadmin' && activeRole !== 'admin') {
      showToast(
        language === 'ar' ? '⚠️ عذراً، لا تمتلك صلاحية تعديل رتب الحسابات (هذه الصلاحية للمدير العام فقط).' : 'Access denied: Super Admin only.',
        'error'
      );
      return;
    }

    try {
      // 1. توليد كود تعريفي مقيد وجديد مطابق للرتبة الجديدة
      const tempUser = { ...user, role: newRole };
      let newCustomId = user.custom_id;
      if (user.role !== newRole) {
        newCustomId = await db.generateCustomUserId(tempUser);
      }

      // 2. تحديث رتبة ومعرف المستخدم في جدول المستخدمين (users)
      await db.users.update(user.id, { 
        role: newRole,
        custom_id: newCustomId
      });

      // 3. مزامنة وتأمين جدول الحرفيين (artisans) لمنع الأخطاء والتكرارات
      if (newRole === 'artisan') {
        const artisansList = await db.artisans.getAll();
        const existingArtisan = artisansList.find(a => a.userId === user.id);
        
        if (!existingArtisan) {
          // إنشاء ملف أسطى جديد
          await db.addDocument("artisans", {
            userId: user.id,
            name: user.name,
            category: 'plumber',
            custom_id: newCustomId,
            bio: 'عضو مسجل جديد صيانة وتمديدات صحية.',
            rating: 5.0,
            completedJobs: 0,
            wallet: 0,
            commissionDue: 0,
            isOnline: true,
            verified: false,
            rank: 'bronze'
          });
        } else {
          // تحديث معرف الملف القائم
          await db.artisans.update(existingArtisan.id, { 
            custom_id: newCustomId 
          });
        }
      } else {
        // حذف ملف الأسطى إن وجد لمنع ظهوره بالخطأ بالدليل العام للعملاء عند تغيير رتبته
        const artisansList = await db.artisans.getAll();
        const existingArtisan = artisansList.find(a => a.userId === user.id);
        if (existingArtisan) {
          await db.deleteDocument("artisans", existingArtisan.id);
        }
      }

      // 4. تسجيل الإجراء الرقابي في سجل الأمان (Audit Logs)
      await db.addDocument('audit_logs', {
        adminId: 'usr-admin',
        adminRole: activeRole,
        action: 'change_user_role',
        targetUserId: user.id,
        targetUserName: user.name,
        ip: '192.168.1.45',
        details: `👑 ترقية/تغيير رتبة المستخدم ${user.name} من (${user.role}) إلى (${newRole}) وتوليد المعرف الرقمي (${newCustomId}) له.`,
        timestamp: new Date().toISOString()
      });

      showToast(
        language === 'ar' ? `👑 تم تغيير رتبة ${user.name} بنجاح إلى رتبة جديدة!` : `User role changed successfully!`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast(language === 'ar' ? 'حدث خطأ أثناء تعديل رتبة الحساب.' : 'Error changing role.', 'error');
    }
  };

  // معالجة البحث وتصفية المدخلات ضد XSS
  const handleSearchChange = (e) => {
    const cleaned = sanitizeInput(e.target.value);
    setSearchQuery(cleaned);
  };

  // فلترة قائمة المستخدمين
  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.phone.includes(q) || (u.email && u.email.toLowerCase().includes(q));
  });

  return (
    <div className="flex flex-col gap-5 p-4 text-right font-cairo" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      <div className="customer-header">
        <h2 className="text-sm font-extrabold text-brand-navy dark:text-brand-light">سجل التحكم بالمستخدمين 👥</h2>
        <p className="text-[10px] text-slate-400 mt-1">البحث في دليل العملاء والحرفيين وتجميد الحسابات المزعجة</p>
      </div>

      {/* أدوات البحث والفلترة */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <input 
            type="text" 
            placeholder="ابحث بالاسم، الهاتف أو البريد..." 
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-brand-slate text-brand-navy dark:text-brand-light border border-slate-200 dark:border-slate-800 outline-none shadow-sm focus:border-brand-orange"
          />
        </div>
        
        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 outline-none"
          >
            <option value="all">الكل</option>
            <option value="customer">العملاء 👤</option>
            <option value="artisan">الحرفيين 👷‍♂️</option>
            <option value="auditor">المشرف المالي 💵</option>
            <option value="security">المشرف الأمني 🛡️</option>
            <option value="superadmin">المدير العام 👑</option>
          </select>
        </div>
      </div>

      {/* قائمة جدول المستخدمين */}
      <div className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm max-h-[70vh] overflow-y-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-extrabold text-right">
              <th className="p-3">المستخدم</th>
              <th className="p-3">الهاتف والمنطقة</th>
              <th className="p-3">الرتبة</th>
              <th className="p-3 text-center">التحكم الأمني</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => {
                const isExpanded = expandedUserId === user.id;
                const isBannable = canBlockUser(activeRole, user);
                const stats = getUserStats(user);

                return (
                  <React.Fragment key={user.id}>
                    <tr 
                      onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                      className={`border-b border-slate-50 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 cursor-pointer transition-colors ${isExpanded ? 'bg-orange-500/5 dark:bg-orange-550/5 font-bold' : ''}`}
                    >
                      <td className="p-3">
                        <div className="font-extrabold text-brand-navy dark:text-brand-light flex items-center gap-1.5">
                          <span>{user.name}</span>
                          {isExpanded && <span className="text-[8px] bg-brand-orange/10 text-brand-orange px-1.5 py-0.2 rounded-md font-black">نشط الآن 👁️</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{user.email || 'بلا بريد'}</div>
                      </td>
                      
                      <td className="p-3 text-[10px] text-slate-500 dark:text-slate-400">
                        <div>{user.phone}</div>
                        <div className="mt-0.5">{user.governorate} • {user.district}</div>
                      </td>
                      
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        {user.id === 'usr-admin' || user.id === 'admin-system' || user.phone === 'AEAdmin' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black border text-purple-600 bg-purple-500/10 border-purple-200">
                            المدير العام 👑
                          </span>
                        ) : activeRole === 'superadmin' ? (
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user, e.target.value)}
                            className="text-[10px] p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 font-bold outline-none focus:border-brand-orange cursor-pointer"
                          >
                            <option value="customer">عميل 👤</option>
                            <option value="artisan">حرفي 👷‍♂️</option>
                            <option value="auditor">مشرف مالي 💵</option>
                            <option value="security">مشرف أمني 🛡️</option>
                            <option value="superadmin">مدير عام 👑</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border
                            ${user.role === 'superadmin' || user.role === 'admin' 
                              ? 'text-purple-600 bg-purple-500/10 border-purple-200' 
                              : user.role === 'artisan' 
                                ? 'text-brand-orange bg-orange-500/10 border-orange-200' 
                                : 'text-brand-navy bg-slate-100 dark:bg-slate-800 dark:text-brand-light'}`}
                          >
                            {user.role === 'superadmin' || user.role === 'admin' ? 'مدير عام' 
                             : user.role === 'artisan' ? 'حرفي' 
                             : user.role === 'auditor' ? 'مشرف مالي' 
                             : user.role === 'security' ? 'مشرف أمني' 
                             : 'عميل'}
                          </span>
                        )}
                      </td>
                      
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {!isBannable ? (
                          <span className="text-[9px] text-slate-400 font-extrabold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">محمي 🔒</span>
                        ) : (
                          <Button
                            size="sm"
                            variant={user.isBanned ? 'outline' : 'danger'}
                            className="text-[9px] px-3.5 py-1 rounded-xl mx-auto font-black"
                            onClick={() => toggleBanStatus(user)}
                          >
                            {user.isBanned ? 'فك الحظر 🟢' : 'حظر الحساب 🔴'}
                          </Button>
                        )}
                      </td>
                    </tr>

                    {/* الصف الإحصائي التوسعي للمراقبة المتقدمة */}
                    {isExpanded && (
                      <tr>
                        <td colSpan="4" className="bg-slate-50/40 dark:bg-slate-900/30 p-3 border-b border-slate-100 dark:border-slate-850 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-4 rounded-2xl flex flex-col gap-3.5 text-right shadow-inner">
                            
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] font-black text-brand-orange bg-orange-500/10 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                                📊 التقرير التحليلي الرقابي الشامل للمستخدم
                              </span>
                              <span className="text-[9px] text-slate-400 font-extrabold">الهوية الرقمية: {user.custom_id || 'بلا معرف'}</span>
                            </div>

                            {/* رندر البيانات المخصصة لنوع المستخدم */}
                            {user.role === 'customer' && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                  <span className="text-slate-400 text-[9px] block font-bold">الطلبات المنجزة</span>
                                  <strong className="text-brand-navy dark:text-brand-light text-xs mt-1 block">{stats.completedCount} من {stats.totalJobs} طلب</strong>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                  <span className="text-slate-400 text-[9px] block font-bold">الطلبات الملغاة</span>
                                  <strong className="text-rose-600 dark:text-rose-400 text-xs mt-1 block">{stats.cancelledCount} عملية</strong>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                  <span className="text-slate-400 text-[9px] block font-bold">النزاعات والشكاوى</span>
                                  <strong className={`${stats.complaintsCount > 0 ? 'text-amber-600' : 'text-slate-500'} text-xs mt-1 block`}>{stats.complaintsCount} شكاوى</strong>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                  <span className="text-slate-400 text-[9px] block font-bold">المحفظة وإجمالي الإنفاق</span>
                                  <strong className="text-emerald-600 dark:text-emerald-400 text-xs mt-1 block">{stats.totalSpent} ج.م (الرصيد: {stats.wallet} ج.م)</strong>
                                </div>
                              </div>
                            )}

                            {user.role === 'artisan' && (
                              <div className="flex flex-col gap-3">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                  <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-400 text-[9px] block font-bold">العمليات المنجزة</span>
                                    <strong className="text-brand-navy dark:text-brand-light text-xs mt-1 block">{stats.completedCount} من {stats.totalJobs} عملية</strong>
                                  </div>
                                  <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-400 text-[9px] block font-bold">العمليات الملغاة</span>
                                    <strong className="text-rose-600 dark:text-rose-400 text-xs mt-1 block">{stats.cancelledCount}</strong>
                                  </div>
                                  <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-400 text-[9px] block font-bold">النزاعات والشكاوى</span>
                                    <strong className={`${stats.complaintsCount > 0 ? 'text-amber-600' : 'text-slate-500'} text-xs mt-1 block`}>{stats.complaintsCount} شكوى</strong>
                                  </div>
                                  <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-slate-400 text-[9px] block font-bold">الرصيد المتاح بالمحفظة</span>
                                    <strong className="text-emerald-600 dark:text-emerald-400 text-xs mt-1 block">{stats.wallet} ج.م</strong>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center border-t border-slate-100 dark:border-slate-800 pt-3">
                                  <div className="bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl">
                                    <span className="text-slate-400 text-[9px] block font-bold">أرباح الحرفي الصافية</span>
                                    <strong className="text-brand-navy dark:text-brand-light text-xs mt-0.5 block">{stats.totalIncome} ج.م</strong>
                                  </div>
                                  <div className="bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl">
                                    <span className="text-slate-400 text-[9px] block font-bold">أرباح المنصة عمولة</span>
                                    <strong className="text-orange-600 dark:text-orange-400 text-xs mt-0.5 block">{stats.totalCommission} ج.م (المستحقات: {stats.commissionDue} ج.م)</strong>
                                  </div>
                                  <div className="bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl">
                                    <span className="text-slate-400 text-[9px] block font-bold">التقييم الفني والرتبة</span>
                                    <strong className="text-amber-500 text-xs mt-0.5 block">⭐ {stats.rating} ({stats.rank === 'golden' ? 'ذهبي 👑' : stats.rank === 'silver' ? 'فضي 🥈' : 'برونزي 🥉'})</strong>
                                  </div>
                                </div>
                              </div>
                            )}

                            {['superadmin', 'admin', 'auditor', 'security'].includes(user.role) && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
                                <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                  <span className="text-slate-400 text-[9px] block font-bold">صلاحيات مستوى الترخيص</span>
                                  <strong className="text-brand-navy dark:text-brand-light text-[11px] mt-1.5 block">{stats.accessLevel}</strong>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center flex flex-col justify-center">
                                  <span className="text-slate-400 text-[9px] block font-bold">العمليات الرقابية بسجل الأمان</span>
                                  <strong className="text-purple-600 dark:text-purple-400 text-xs mt-1 block">{stats.actionsCount} إجراء أمني</strong>
                                </div>
                              </div>
                            )}

                            {/* زر الانتقال وعرض السجل التفصيلي الشامل في نافذة داخلية */}
                            {(user.role === 'customer' || user.role === 'artisan') && (() => {
                              const userJobsList = user.role === 'customer' 
                                ? jobs.filter(j => j && j.customerId === user.id)
                                : jobs.filter(j => {
                                    const artProfile = artisans.find(a => a && a.userId === user.id);
                                    return artProfile && j && j.artisanId === artProfile.id;
                                  });

                              return (
                                <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3 text-center">
                                  <Button 
                                    variant="primary" 
                                    size="sm"
                                    className="text-[9px] font-black px-6 py-2 rounded-xl w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-orange-550 to-amber-550 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm transition-all hover:scale-[1.01]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setHistoryModalUser(user);
                                    }}
                                  >
                                    <span>📋 فتح السجل التاريخي وتذاكر الصيانة الشاملة ({userJobsList.length} طلب) ➡️</span>
                                  </Button>
                                </div>
                              );
                            })()}

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-10 text-slate-400">عذراً، لم نجد أي مستخدم يطابق شروط البحث.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* النافذة الداخلية الشاملة والعملية للتقرير التاريخي والرقابي */}
      {historyModalUser && (() => {
        const stats = getUserStats(historyModalUser);
        const isCustomer = historyModalUser.role === 'customer';
        
        // جلب العمليات والطلبات المرتبطة
        const userJobsList = isCustomer 
          ? jobs.filter(j => j && j.customerId === historyModalUser.id)
          : jobs.filter(j => {
              const artProfile = artisans.find(a => a && a.userId === historyModalUser.id);
              return artProfile && j && j.artisanId === artProfile.id;
            });
            
        // جلب الشكاوى المرتبطة
        const userComplaintsList = isCustomer
          ? complaints.filter(c => c && c.customerId === historyModalUser.id)
          : complaints.filter(c => {
              const artProfile = artisans.find(a => a && a.userId === historyModalUser.id);
              return artProfile && c && c.artisanId === artProfile.id;
            });

        // فلترة الطلبات بناءً على البحث والفلترة داخل النافذة
        const filteredModalJobs = userJobsList.filter(job => {
          if (modalStatusFilter !== 'all' && job.status !== modalStatusFilter) return false;
          
          const q = modalSearchQuery.toLowerCase();
          return job.id.toLowerCase().includes(q) || 
                 job.customerName.toLowerCase().includes(q) || 
                 (job.artisanName && job.artisanName.toLowerCase().includes(q)) ||
                 (job.description && job.description.toLowerCase().includes(q)) ||
                 (job.street && job.street.toLowerCase().includes(q));
        });

        return (
          <div className="absolute inset-0 z-40 bg-[#f8fafc] dark:bg-[#090d16] flex flex-col p-4 animate-fadeIn overflow-y-auto">
            {/* الهيدر العلوي */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-xs font-black text-brand-navy dark:text-brand-light flex items-center gap-1.5">
                  🔍 السجل التاريخي الشامل: {historyModalUser.name}
                </h3>
                <span className="text-[9px] text-slate-400 font-extrabold mt-0.5 block">الهوية الرقمية: {historyModalUser.custom_id || 'بلا معرف'} | الرتبة: {historyModalUser.role === 'customer' ? 'عميل 👤' : 'حرفي 👷‍♂️'}</span>
              </div>
              <button 
                onClick={() => {
                  setHistoryModalUser(null);
                  setModalSearchQuery('');
                  setModalStatusFilter('all');
                  setModalActiveTab('jobs');
                }}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-rose-500 hover:text-white transition-colors flex items-center justify-center font-black text-xs shadow-sm"
              >
                ✕
              </button>
            </div>

            {/* تفاصيل ومعلومات الحساب الجانبية */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200/50 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-sm text-[10px] grid grid-cols-2 gap-3.5 mt-3 text-right">
              <div>
                <span className="text-slate-400 font-bold block mb-1">📞 رقم الهاتف الجوال</span>
                <strong className="text-brand-navy dark:text-brand-light text-xs">{historyModalUser.phone}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold block mb-1">📍 العنوان والحي الجغرافي</span>
                <strong className="text-brand-navy dark:text-brand-light text-[11px]">{historyModalUser.governorate} • {historyModalUser.district}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold block mb-1">✉️ البريد الإلكتروني</span>
                <strong className="text-brand-navy dark:text-brand-light text-[11px]">{historyModalUser.email || 'غير مسجل'}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold block mb-1">💰 رصيد المحفظة الحالي</span>
                <strong className="text-emerald-600 dark:text-emerald-400 text-xs font-black">{stats.wallet} ج.م</strong>
              </div>
            </div>

            {/* التبويبات الداخلية للنافذة */}
            <div className="flex border-b border-slate-200 dark:border-slate-850 mt-4 text-[10px] font-black">
              <button 
                onClick={() => setModalActiveTab('jobs')}
                className={`py-2 px-4 border-b-2 transition-all ${modalActiveTab === 'jobs' ? 'border-brand-orange text-brand-orange bg-orange-500/5' : 'border-transparent text-slate-400'}`}
              >
                🛠️ تذاكر الصيانة والعمليات ({userJobsList.length})
              </button>
              <button 
                onClick={() => setModalActiveTab('complaints')}
                className={`py-2 px-4 border-b-2 transition-all ${modalActiveTab === 'complaints' ? 'border-brand-orange text-brand-orange bg-orange-500/5' : 'border-transparent text-slate-400'}`}
              >
                ⚠️ الشكاوى والنزاعات المسجلة ({userComplaintsList.length})
              </button>
            </div>

            {/* محتوى التبويبات */}
            <div className="flex-1 overflow-y-auto mt-3 pr-1 hide-scrollbar">
              {modalActiveTab === 'jobs' && (
                <div className="flex flex-col gap-3">
                  {/* أدوات التصفية والبحث المصغرة داخل التبويب */}
                  <div className="grid grid-cols-3 gap-2 pb-2">
                    <div className="col-span-2">
                      <input 
                        type="text" 
                        placeholder="ابحث برقم التذكرة أو الوصف أو اسم الطرف الآخر..." 
                        value={modalSearchQuery}
                        onChange={(e) => setModalSearchQuery(e.target.value)}
                        className="w-full text-[9px] p-2 rounded-xl bg-white dark:bg-[#111827] text-brand-navy dark:text-brand-light border border-slate-200 dark:border-slate-800 outline-none shadow-sm focus:border-brand-orange"
                      />
                    </div>
                    <div>
                      <select
                        value={modalStatusFilter}
                        onChange={(e) => setModalStatusFilter(e.target.value)}
                        className="w-full text-[9px] p-2 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 outline-none"
                      >
                        <option value="all">كل الحالات</option>
                        <option value="completed">✓ مكتملة</option>
                        <option value="cancelled">✕ ملغاة</option>
                        <option value="accepted">🏎️ قيد التنفيذ</option>
                        <option value="pending">📡 قيد الانتظار</option>
                      </select>
                    </div>
                  </div>

                  {filteredModalJobs.length > 0 ? (
                    filteredModalJobs.map(job => (
                      <div key={job.id} className="bg-white dark:bg-[#111827] border border-slate-200/60 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-sm text-[10px] flex flex-col gap-2.5 text-right">
                        
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                          <span className="font-extrabold text-brand-navy dark:text-brand-light text-xs">تذكرة صيانة رقم: #{job.id.substring(0, 8)}</span>
                          <span className={`px-2 py-0.5 rounded-full font-black text-[9px]
                            ${job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600'
                             : job.status === 'cancelled' ? 'bg-rose-500/10 text-rose-600'
                             : job.status === 'accepted' ? 'bg-orange-500/10 text-orange-600'
                             : 'bg-amber-500/10 text-amber-600 animate-pulse'}`}
                          >
                            {job.status === 'completed' ? '✓ مكتملة'
                             : job.status === 'cancelled' ? '✕ ملغاة'
                             : job.status === 'accepted' ? '🏎️ جاري التنفيذ'
                             : '📡 قيد البحث والانتظار'}
                          </span>
                        </div>

                        {/* طرفي الطلب المتكاملة */}
                        <div className="grid grid-cols-2 gap-3 leading-relaxed text-slate-600 dark:text-slate-400 pb-2 border-b border-slate-50 dark:border-slate-850">
                          <div className="bg-slate-50/50 dark:bg-slate-900/50 p-2 rounded-xl">
                            <strong className="text-brand-orange block text-[8px] mb-0.5">👤 العميل (صاحب الطلب)</strong>
                            <div className="font-black text-slate-800 dark:text-brand-light">{job.customerName}</div>
                            <div className="mt-0.5">{job.customerPhone || 'بلا هاتف'}</div>
                          </div>
                          
                          <div className="bg-slate-50/50 dark:bg-slate-900/50 p-2 rounded-xl">
                            <strong className="text-brand-orange block text-[8px] mb-0.5">👷‍♂️ الحرفي (مزود الخدمة)</strong>
                            <div className="font-black text-slate-800 dark:text-brand-light">{job.artisanName || 'لم يتم قبول الطلب بعد'}</div>
                            <div className="mt-0.5">{job.artisanPhone || 'لا يوجد'}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 leading-relaxed text-slate-500 dark:text-slate-400">
                          <div>
                            <strong>⚙️ نوع التخصص:</strong> {getCategoryLabel(job.category)}
                          </div>
                          <div>
                            <strong>📅 تاريخ التذكرة:</strong> {job.createdAt ? new Date(job.createdAt).toLocaleString('ar-EG') : 'غير متوفر'}
                          </div>
                        </div>

                        <div className="bg-[#f8fafc] dark:bg-slate-900/60 p-2.5 rounded-xl text-slate-600 dark:text-slate-400 leading-relaxed">
                          <strong className="text-slate-700 dark:text-slate-350 block text-[9px] mb-1">📝 تفاصيل بلاغ الصيانة والموقع:</strong> 
                          <div>{job.description || 'بلا وصف للمشكلة'}</div>
                          <div className="mt-1 text-[8.5px] border-t border-slate-200/40 dark:border-slate-800/40 pt-1 text-slate-450">
                            📍 الشارع الجغرافي: {job.street || 'غير محدد'}
                          </div>
                        </div>

                        {/* الحساب المالي التفصيلي والربحية */}
                        <div className="bg-orange-500/5 dark:bg-orange-550/5 border border-orange-500/10 p-2.5 rounded-xl grid grid-cols-3 gap-2 text-center font-extrabold text-[9px]">
                          <div>
                            <span className="text-slate-400 block text-[8px]">سعر الكشف</span>
                            <strong className="text-slate-700 dark:text-slate-300 block mt-0.5">{job.price || 0} ج.م</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[8px]">عمولة المنصة</span>
                            <strong className="text-brand-orange block mt-0.5">{job.commission || 0} ج.م</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[8px]">إجمالي التذكرة</span>
                            <strong className="text-emerald-600 dark:text-emerald-400 block mt-0.5">{job.totalPrice || 0} ج.م</strong>
                          </div>
                        </div>

                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-white dark:bg-[#111827] border border-slate-200/50 dark:border-slate-800 rounded-2xl text-[10px] text-slate-400">
                      لم يتم العثور على أي تذاكر مطابقة لشروط البحث.
                    </div>
                  )}
                </div>
              )}

              {modalActiveTab === 'complaints' && (
                <div className="flex flex-col gap-3">
                  {userComplaintsList.length > 0 ? (
                    userComplaintsList.map(complaint => (
                      <div key={complaint.id} className="bg-white dark:bg-[#111827] border border-slate-200/60 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-sm text-[10px] flex flex-col gap-2 text-right">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                          <strong className="font-extrabold text-brand-navy dark:text-brand-light text-xs">تذكرة نزاع رقم: #{complaint.id.substring(0, 8)}</strong>
                          <span className={`px-2 py-0.5 rounded-full font-black text-[9px] bg-amber-500/10 text-amber-600`}>
                            ⚠️ شكوى مسجلة
                          </span>
                        </div>

                        <div className="leading-relaxed text-slate-600 dark:text-slate-400">
                          <div><strong>📝 تفاصيل الشكوى المقدمة:</strong> {complaint.text || complaint.description || 'بلا وصف'}</div>
                          <div className="mt-1"><strong>📅 تاريخ التسجيل:</strong> {complaint.createdAt ? new Date(complaint.createdAt).toLocaleString('ar-EG') : 'غير متوفر'}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-white dark:bg-[#111827] border border-slate-200/50 dark:border-slate-800 rounded-2xl text-[10px] text-slate-400">
                      لا توجد أي شكاوى أو نزاعات مسجلة لهذا المستخدم.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
