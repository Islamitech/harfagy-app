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

                            {/* سجل الطلبات والعمليات التفصيلية داخلياً للعملاء والحرفيين */}
                            {(user.role === 'customer' || user.role === 'artisan') && (() => {
                              const userJobsList = user.role === 'customer' 
                                ? jobs.filter(j => j && j.customerId === user.id)
                                : jobs.filter(j => {
                                    const artProfile = artisans.find(a => a && a.userId === user.id);
                                    return artProfile && j && j.artisanId === artProfile.id;
                                  });

                              return (
                                <div className="mt-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-right">
                                  <strong className="text-[10px] font-black text-slate-700 dark:text-slate-300 block mb-2">📋 سجل تفاصيل الطلبات وعمليات الصيانة المرتبطة ({userJobsList.length})</strong>
                                  {userJobsList.length > 0 ? (
                                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 hide-scrollbar">
                                      {userJobsList.map(job => (
                                        <div key={job.id} className="bg-slate-50/50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] flex flex-col gap-1.5">
                                          <div className="flex justify-between items-center pb-1 border-b border-slate-200/50 dark:border-slate-700/50">
                                            <span className="font-extrabold text-brand-navy dark:text-brand-light">تذكرة رقم: #{job.id.substring(0, 8)}</span>
                                            <span className={`px-2 py-0.5 rounded-md font-black text-[9px]
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
                                          
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 leading-relaxed text-slate-500 dark:text-slate-400">
                                            <div>
                                              <strong>👤 العميل:</strong> {job.customerName} ({job.customerPhone || 'بلا هاتف'})
                                            </div>
                                            <div>
                                              <strong>👷‍♂️ الحرفي:</strong> {job.artisanName || 'لم يتم التعيين بعد'} {job.artisanPhone ? `(${job.artisanPhone})` : ''}
                                            </div>
                                            <div>
                                              <strong>⚙️ نوع الخدمة:</strong> {getCategoryLabel(job.category)}
                                            </div>
                                            <div>
                                              <strong>📅 تاريخ الطلب:</strong> {job.createdAt ? new Date(job.createdAt).toLocaleString('ar-EG') : 'غير متوفر'}
                                            </div>
                                          </div>

                                          <div className="bg-slate-100/50 dark:bg-slate-900/60 p-2 rounded-lg text-slate-500 dark:text-slate-400 leading-relaxed">
                                            <strong>📝 وصف البلاغ:</strong> {job.description || 'بلا تفاصيل'} | الشارع: {job.street || 'غير محدد'}
                                          </div>

                                          <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 font-extrabold mt-1">
                                            <span>سعر الفحص: {job.price || 0} ج.م</span>
                                            <span>عمولة المنصة: {job.commission || 0} ج.م</span>
                                            <span>الإجمالي بالضريبة: {job.totalPrice || 0} ج.م</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-center py-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] text-slate-400">
                                      لا توجد طلبات مسجلة لهذا الحساب حالياً.
                                    </div>
                                  )}
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

    </div>
  );
};
