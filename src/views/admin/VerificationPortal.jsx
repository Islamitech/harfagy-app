import React, { useState, useEffect } from 'react';
import { db } from '../../services/db.js';
import { Button } from '../../components/common/Button.jsx';
import { useApp } from '../../context/AppContext.jsx';

/**
 * بوابة توثيق واعتماد هويات الحرفيين الجدد بمطابقة بطاقات الرقم القومي والفيش الجنائي
 */
export const VerificationPortal = ({ activeRole = 'superadmin' }) => {
  const { language, showToast } = useApp();

  const [pendingArtisans, setPendingArtisans] = useState([]);

  useEffect(() => {
    const fetchArtisans = async () => {
      const all = await db.artisans.getAll();
      // فحص الحرفيين الذين قاموا برفع الأوراق ولم يتم توثيقهم بعد
      setPendingArtisans(all.filter(a => !a.verified && a.verificationStatus === 'submitted'));
    };
    fetchArtisans();

    const unsub = db.subscribe(() => {
      fetchArtisans();
    });
    return () => unsub();
  }, []);

  // اعتماد وتوثيق الحرفي بالدليل العام للعملاء
  const approveVerification = async (artisan) => {
    if (activeRole === 'auditor') {
      showToast(
        language === 'ar' ? '⚠️ عذراً، لا تمتلك صلاحية توثيق الحسابات (المشرف المالي مقيد للمدفوعات فقط).' : 'Access denied: Auditor cannot verify artisans.',
        'error'
      );
      return;
    }

    try {
      // 1. تحديث الحساب
      await db.artisans.update(artisan.id, { 
        verified: true,
        verificationStatus: 'approved'
      });

      // 2. تسجيل العملية في سجل التدقيق الأمني (Audit Logs)
      await db.addDocument('audit_logs', {
        adminId: 'usr-admin',
        adminRole: activeRole,
        action: 'approve_verification',
        targetUserId: artisan.id,
        targetUserName: artisan.name,
        ip: '192.168.1.45',
        details: `تم اعتماد وتوثيق ملف الأسطى ${artisan.name} بالدليل العام بعد التحقق من المستندات والفيش الجنائي.`,
        timestamp: new Date().toISOString()
      });

      showToast(
        language === 'ar' ? `🛡️ تم توثيق واعتماد الأسطى ${artisan.name} بنجاح!` : `Artisan ${artisan.name} approved!`,
        'success'
      );
    } catch (err) {
      console.error(err);
    }
  };

  // رفض التوثيق
  const rejectVerification = async (artisan) => {
    if (activeRole === 'auditor') {
      showToast(
        language === 'ar' ? '⚠️ عذراً، لا تمتلك صلاحية رفض التوثيق (المشرف المالي مقيد للمدفوعات فقط).' : 'Access denied: Auditor cannot reject verification.',
        'error'
      );
      return;
    }

    try {
      // 1. تحديث الحساب
      await db.artisans.update(artisan.id, { 
        verificationStatus: 'rejected'
      });

      // 2. تسجيل العملية في سجل التدقيق الأمني (Audit Logs)
      await db.addDocument('audit_logs', {
        adminId: 'usr-admin',
        adminRole: activeRole,
        action: 'reject_verification',
        targetUserId: artisan.id,
        targetUserName: artisan.name,
        ip: '192.168.1.45',
        details: `تم رفض توثيق ملف الأسطى ${artisan.name} بسبب عدم استكمال صور الأوراق.`,
        timestamp: new Date().toISOString()
      });

      alert(`تم رفض توثيق الأسطى ${artisan.name} وإرجاع الطلب لتحديث المستندات.`);
      showToast(language === 'ar' ? 'تم رفض الملف الشخصي للفني.' : 'Artisan profile rejected.', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 text-right font-cairo" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      <div className="customer-header">
        <h2 className="text-sm font-extrabold text-brand-navy dark:text-brand-light">بوابة التوثيق والاعتماد 🛡️</h2>
        <p className="text-[10px] text-slate-400 mt-1">مراجعة بطاقة الرقم القومي المصرية والفيش الجنائي لاعتماد الحرفيين</p>
      </div>

      <div className="flex flex-col gap-4">
        {pendingArtisans.length > 0 ? (
          pendingArtisans.map(art => (
            <div 
              key={art.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col gap-3 text-xs"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <strong className="text-slate-800 dark:text-brand-light">اسم المتقدم الحرفي: {art.name} ({art.custom_id})</strong>
                <span className={`text-[9px] px-2.5 py-0.5 rounded-md font-black border ${art.verificationStatus === 'submitted' ? 'text-sky-500 bg-sky-500/10 border-sky-200' : 'text-amber-500 bg-amber-500/10 border-amber-200'}`}>
                  {art.verificationStatus === 'submitted' ? 'مستندات مرفوعة حية 📁' : 'بيانات أولية بانتظار الرفع'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                {/* العمود الأيمن: بطاقة الرقم القومي */}
                <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-2xl border border-slate-150/40 dark:border-slate-850">
                  <strong className="text-[11px] text-slate-800 dark:text-brand-light block mb-2">📄 بطاقة الرقم القومي المصرية:</strong>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
                    <div><strong>الرقم القومي:</strong> {art.nationalIdNumber || 'غير متوفر'}</div>
                    <div><strong>المستند المرفق:</strong> <span className="underline text-orange-500 cursor-pointer">{art.nationalIdImage || 'لم يرفع'}</span></div>
                    <div><strong>الحالة المهنية:</strong> سارية بمطابقة الفيش</div>
                  </div>
                </div>

                {/* العمود الأيسر: صحيفة الحالة الجنائية (الفيش) */}
                <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-2xl border border-slate-150/40 dark:border-slate-850">
                  <strong className="text-[11px] text-slate-800 dark:text-brand-light block mb-2">👮‍♂️ صحيفة الحالة الجنائية (الفيش والتشبيه):</strong>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
                    <div className="text-emerald-500 font-bold">🟢 خالي من السوابق والأحكام الجنائية</div>
                    <div><strong>المستند المرفق:</strong> <span className="underline text-orange-500 cursor-pointer">{art.criminalRecordImage || 'لم يرفع'}</span></div>
                    <div><strong>الجهة الموجه إليها:</strong> منصة حرفجي للخدمات المنزلية</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <Button 
                  variant="outline" 
                  className="flex-1 text-[10px]"
                  onClick={() => rejectVerification(art)}
                >
                  رفض المستندات وإرسال طلب تعديل
                </Button>
                <Button 
                  className="flex-1 bg-brand-emerald border-brand-emerald text-[10px]"
                  onClick={() => approveVerification(art)}
                >
                  الموافقة والاعتماد الفوري بالدليل العام ➡️
                </Button>
              </div>

            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center">
            <span className="text-3xl block mb-2">🛡️</span>
            <p className="text-xs font-bold text-slate-400">ممتاز! لا يوجد أي طلبات توثيق معلقة حالياً.</p>
          </div>
        )}
      </div>

    </div>
  );
};
