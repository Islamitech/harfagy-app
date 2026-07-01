import React, { useState, useEffect } from 'react';
import { db } from '../../services/db.js';
import { Button } from '../../components/common/Button.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { sanitizeInput } from '../../utils/sanitizer.js';

/**
 * مكتب تسوية النزاعات وحظر أو تعويض أطراف الصيانة المنزلية بجمهورية مصر العربية
 */
export const DisputeDesk = ({ activeRole = 'superadmin' }) => {
  const { language, showToast } = useApp();

  const [complaints, setComplaints] = useState([]);
  const [resolutionText, setResolutionText] = useState({});

  useEffect(() => {
    const fetchComplaints = async () => {
      const all = await db.complaints.getAll();
      // جلب النزاعات المعلقة أو المستأنفة
      setComplaints(all.filter(c => c.status !== 'resolved'));
    };
    fetchComplaints();

    const unsub = db.subscribe(() => {
      fetchComplaints();
    });
    return () => unsub();
  }, []);

  const handleResolutionTextChange = (compId, val) => {
    // تطهير نصوص التسوية المكتوبة
    const cleaned = sanitizeInput(val);
    setResolutionText(prev => ({
      ...prev,
      [compId]: cleaned
    }));
  };

  // تسوية النزاع وحله
  const resolveDispute = async (comp, decision) => {
    if (activeRole === 'auditor') {
      showToast(
        language === 'ar' ? '⚠️ عذراً، لا تمتلك الصلاحيات الأمنية لتسوية النزاعات (المشرف المالي مقيد للمدفوعات فقط).' : 'Access denied: Auditor cannot resolve disputes.',
        'error'
      );
      return;
    }

    const text = resolutionText[comp.id] || 'تمت التسوية ودياً بواسطة إدارة حرفجي.';
    try {
      if (decision === 'compensate') {
        // تعويض العميل كاملاً وحظر محفظة الفني
        // 1. استرجاع أتعاب المعاينة لعمولة العميل
        const usersList = await db.getCollection("users");
        const customer = usersList.find(u => u.id === comp.customerId);
        if (customer) {
          await db.users.update(customer.id, { wallet: (customer.wallet || 0) + 100 });
        }
        // 2. تجميد محفظة الفني كعقوبة رادعة
        const artisan = await db.artisans.get(comp.artisanId);
        if (artisan) {
          await db.artisans.update(artisan.id, { wallet: Math.max(0, artisan.wallet - 150) });
        }
        
        await db.complaints.update(comp.id, {
          resolution: `قرار التسوية: تعويض العميل بمبلغ 100 ج.م وخصمها من الفني المخالف. السبب: ${text}`,
          status: 'resolved'
        });

        // 3. تحديث حالة الطلب
        await db.jobs.update(comp.jobId, { status: 'completed' });

        // 4. تسجيل العملية في سجل التدقيق الأمني (Audit Logs)
        await db.addDocument('audit_logs', {
          adminId: 'usr-admin',
          adminRole: activeRole,
          action: 'resolve_dispute_compensate',
          targetUserId: comp.customerId,
          targetUserName: comp.customerName,
          ip: '192.168.1.45',
          details: `تعويض العميل ${comp.customerName} بـ 100 ج.م وخصم 150 ج.م من الفني ${comp.artisanName} لتسوية النزاع #${comp.jobId.substring(0,6)}. السبب: ${text}`,
          timestamp: new Date().toISOString()
        });

        showToast(language === 'ar' ? '⚖️ تم تعويض العميل بنجاح وخصم المستحقات من الفني!' : 'Customer compensated successfully!', 'success');
      } else {
        // رفض الشكوى وإقرار حق الحرفي
        await db.complaints.update(comp.id, {
          resolution: `قرار التسوية: رفض شكوى العميل واعتماد أجر الفني كاملاً. السبب: ${text}`,
          status: 'resolved'
        });

        await db.jobs.update(comp.jobId, { status: 'completed' });

        // تسجيل العملية في سجل التدقيق الأمني (Audit Logs)
        await db.addDocument('audit_logs', {
          adminId: 'usr-admin',
          adminRole: activeRole,
          action: 'resolve_dispute_clear_artisan',
          targetUserId: comp.artisanId,
          targetUserName: comp.artisanName,
          ip: '192.168.1.45',
          details: `رفض شكوى العميل وتبرئة الأسطى ${comp.artisanName} للطلب #${comp.jobId.substring(0,6)}. السبب: ${text}`,
          timestamp: new Date().toISOString()
        });

        showToast(language === 'ar' ? '⚖️ تم رفض الشكوى واعتماد صحة موقف الأسطى!' : 'Complaint rejected, artisan cleared!', 'info');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 text-right font-cairo" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      <div className="customer-header">
        <h2 className="text-sm font-extrabold text-brand-navy dark:text-brand-light">مكتب تسوية النزاعات ⚖️</h2>
        <p className="text-[10px] text-slate-400 mt-1">البت في خلافات فواتير المعاينة أو جودة الخدمة بحدائق الأهرام</p>
      </div>

      <div className="flex flex-col gap-4">
        {complaints.length > 0 ? (
          complaints.map(comp => (
            <div 
              key={comp.id}
              className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col gap-3 text-xs"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <strong className="text-brand-navy dark:text-brand-light">نزاع رقم: {comp.custom_complaint_id || comp.id.substring(0, 6)}</strong>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border
                  ${comp.status === 'appealed' ? 'text-brand-amber bg-amber-500/10 border-amber-200' : 'text-brand-rose bg-rose-500/10 border-rose-200'}`}
                >
                  {comp.status === 'appealed' ? 'الفني استأنف وقدم رداً 📡' : 'بانتظار رد الفني ⏳'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* العمود الأيمن: ادعاء العميل الشاكي */}
                <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-2xl border border-slate-150/40 dark:border-slate-850">
                  <strong className="text-[11px] text-slate-800 dark:text-brand-light block mb-2">👤 ادعاء العميل الشاكي ({comp.customerName}):</strong>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
                    <div><strong>تصنيف الشكوى:</strong> {comp.type}</div>
                    <div className="mt-1"><strong>تفاصيل البلاغ:</strong> "{comp.details}"</div>
                  </div>
                </div>

                {/* العمود الأيسر: إفادة الحرفي المرفقة */}
                <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-2xl border border-slate-150/40 dark:border-slate-850">
                  <strong className="text-[11px] text-slate-800 dark:text-brand-light block mb-2">👷‍♂️ رد وتوضيح الفني المشكو ضده ({comp.artisanName}):</strong>
                  {comp.resolution ? (
                    <div className="text-[10px] text-slate-550 dark:text-slate-400 leading-relaxed">
                      <strong>إفادة الحرفي الرسمية:</strong> "{comp.resolution}"
                    </div>
                  ) : (
                    <div className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                      <span>⚠️ لم يتم تقديم أي دفاع رسمي من الحرفي حتى الآن.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* مدخلات قرار التسوية */}
              <div className="flex flex-col gap-2 mt-1">
                <label className="text-[10px] text-slate-400 font-bold block">ملاحظات وسبب قرار التسوية:</label>
                <input 
                  type="text" 
                  placeholder="مثال: تبين من الرسائل صحة ادعاء العميل..."
                  value={resolutionText[comp.id] || ''}
                  onChange={(e) => handleResolutionTextChange(comp.id, e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-brand-navy dark:text-brand-light border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button 
                  variant="outline" 
                  className="flex-1 text-[10px]"
                  onClick={() => resolveDispute(comp, 'reject')}
                >
                  رفض الشكوى وإقرار حق الفني
                </Button>
                <Button 
                  className="flex-1 bg-brand-rose border-brand-rose text-[10px]"
                  onClick={() => resolveDispute(comp, 'compensate')}
                >
                  تعويض العميل وحظر الفني ⚖️
                </Button>
              </div>

            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center">
            <span className="text-3xl block mb-2">⚖️</span>
            <p className="text-xs font-bold text-slate-400">ممتاز! لا يوجد شكاوى أو خلافات فنية قيد المراجعة الإدارية.</p>
          </div>
        )}
      </div>

    </div>
  );
};
