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
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    const fetchUsers = async () => {
      const allUsers = await db.users.getAll();
      setUsers(allUsers);
    };
    fetchUsers();

    const unsub = db.subscribe(() => {
      fetchUsers();
    });
    return () => unsub();
  }, []);

  // حظر / فك حظر حساب مستخدم
  const toggleBanStatus = async (user) => {
    // التحقق من الصلاحيات الأمنية للمشرف المالي (auditor)
    if (activeRole === 'auditor') {
      showToast(
        language === 'ar' ? '⚠️ عذراً، لا تمتلك الصلاحيات الأمنية لتعديل حالة الحسابات (صلاحية المشرف المالي مقيدة للمدفوعات فقط).' : 'Access denied: Auditor cannot ban users.',
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
              filteredUsers.map(user => (
                <tr 
                  key={user.id} 
                  className="border-b border-slate-50 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                >
                  <td className="p-3">
                    <div className="font-extrabold text-brand-navy dark:text-brand-light">{user.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{user.email || 'بلا بريد'}</div>
                  </td>
                  
                  <td className="p-3 text-[10px] text-slate-500 dark:text-slate-400">
                    <div>{user.phone}</div>
                    <div className="mt-0.5">{user.governorate} • {user.district}</div>
                  </td>
                  
                  <td className="p-3">
                    {user.id === 'usr-admin' ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black border text-purple-600 bg-purple-500/10 border-purple-200">
                        المدير العام 👑
                      </span>
                    ) : activeRole === 'superadmin' || activeRole === 'admin' ? (
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
                  
                  <td className="p-3 text-center">
                    {user.id === 'usr-admin' || user.role === 'admin' ? (
                      <span className="text-[9px] text-slate-400">محمي 🔒</span>
                    ) : (
                      <Button
                        size="sm"
                        variant={user.isBanned ? 'outline' : 'danger'}
                        className="text-[9px] px-3.5 py-1 rounded-xl mx-auto"
                        onClick={() => toggleBanStatus(user)}
                      >
                        {user.isBanned ? 'فك الحظر 🟢' : 'حظر الحساب 🔴'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))
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
