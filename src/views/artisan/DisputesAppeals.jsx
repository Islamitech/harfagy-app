import React, { useState, useEffect } from 'react';
import { db } from '../../services/db.js';
import { Button } from '../../components/common/Button.jsx';
import { useUser } from '../../context/UserContext.jsx';
import { useApp } from '../../context/AppContext.jsx';

/**
 * إدارة شكاوى العملاء الموجهة ضد الحرفي والرد عليها لمنع تعليق الحساب
 */
export const DisputesAppeals = () => {
  const { currentUser } = useUser();
  const { language, showToast } = useApp();

  const [artisan, setArtisan] = useState(null);
  const [complaints, setComplaints] = useState([]);
  
  // حقول الردود
  const [activeComplaintId, setActiveComplaintId] = useState(null);
  const [appealText, setAppealText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchComplaintsData = async () => {
      const artisansList = await db.getCollection("artisans");
      const artProfile = artisansList.find(a => a.userId === currentUser.id);
      if (artProfile) {
        setArtisan(artProfile);
        
        // جلب الشكاوى المسجلة ضده
        const list = await db.complaints.query(c => c.artisanId === artProfile.id);
        setComplaints(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      }
    };

    fetchComplaintsData();

    const unsub = db.subscribe(() => {
      fetchComplaintsData();
    });
    return () => unsub();
  }, [currentUser]);

  // إرسال رد رسمي للإشراف الفني
  const submitAppeal = async (e, compId) => {
    e.preventDefault();
    if (!appealText.trim()) return;

    setLoading(true);

    try {
      // إرفاق رد الفني في الشكوى مع إبقائها قيد الفحص الإداري للتسوية
      await db.complaints.update(compId, {
        resolution: `رد الحرفي: ${appealText}`,
        status: 'appealed' // تحديث الحالة ليراها المسؤول
      });

      showToast(
        language === 'ar' ? '✅ تم إرسال توضيحك وردك الفني بنجاح للإدارة!' : 'Defense statement submitted!',
        'success'
      );
      
      setAppealText('');
      setActiveComplaintId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!artisan) return null;

  return (
    <div className="flex flex-col gap-5 p-4 text-right font-cairo" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      <div className="customer-header">
        <h2 className="text-sm font-extrabold text-brand-navy dark:text-brand-light">فض النزاعات والشكاوى ⚖️</h2>
        <p className="text-[10px] text-slate-400 mt-1">الرد على شكاوى واعتراضات العملاء الموجهة ضدك وتوضيح الجوانب المهنية</p>
      </div>

      <div className="flex flex-col gap-4">
        {complaints.length > 0 ? (
          complaints.map(comp => (
            <div 
              key={comp.id}
              className={`
                bg-white dark:bg-brand-slate border p-5 rounded-3xl shadow-sm flex flex-col gap-3 text-xs
                ${comp.status === 'pending' ? 'border-brand-rose' : 'border-slate-200 dark:border-slate-800'}
              `}
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <strong className="text-brand-navy dark:text-brand-light">العميل الشاكي: {comp.customerName}</strong>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border 
                  ${comp.status === 'resolved' 
                    ? 'text-brand-emerald bg-emerald-500/10 border-emerald-200' 
                    : 'text-brand-rose bg-rose-500/10 border-rose-200'}`}
                >
                  {comp.status === 'resolved' ? 'تم الحل ودياً' : comp.status === 'appealed' ? 'قيد المراجعة الإدارية' : 'بانتظار ردك ⚠️'}
                </span>
              </div>

              <div className="leading-relaxed text-slate-600 dark:text-slate-400">
                <strong>نوع النزاع:</strong> {comp.type}<br/>
                <strong>تفاصيل بلاغ العميل:</strong> "{comp.details}"
              </div>

              {/* إظهار التسوية أو الرد السابق */}
              {comp.resolution && (
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border-r-2 border-brand-emerald mt-1">
                  <strong>الرد المسجل:</strong> {comp.resolution}
                </div>
              )}

              {/* فورم كتابة التوضيح/الرد */}
              {comp.status === 'pending' && activeComplaintId !== comp.id && (
                <Button 
                  size="sm"
                  className="mt-2 self-start text-[10px]"
                  onClick={() => setActiveComplaintId(comp.id)}
                >
                  الرد وتفنيد شكوى العميل
                </Button>
              )}

              {activeComplaintId === comp.id && (
                <form onSubmit={(e) => submitAppeal(e, comp.id)} className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">اكتب ردك أو مبرراتك المهنية بوضوح:</label>
                  <textarea
                    required
                    value={appealText}
                    onChange={(e) => setAppealText(e.target.value)}
                    placeholder="مثال: تم الاتفاق على زيادة السعر لأن العميل طلب تصليح ماسورتين إضافيتين خلف السيراميك..."
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-brand-navy dark:text-brand-light border border-slate-200 dark:border-slate-700 outline-none focus:border-brand-rose h-20"
                  />
                  <div className="flex gap-2 justify-end mt-1">
                    <Button size="sm" variant="outline" onClick={() => setActiveComplaintId(null)}>إلغاء</Button>
                    <Button size="sm" type="submit" loading={loading} className="bg-brand-rose border-brand-rose">إرسال الدفاع</Button>
                  </div>
                </form>
              )}

            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center">
            <span className="text-3xl block mb-2">⚖️</span>
            <p className="text-xs font-bold text-slate-400">ممتاز! لا يوجد أي شكاوى أو نزاعات مسجلة ضدك.</p>
          </div>
        )}
      </div>

    </div>
  );
};
