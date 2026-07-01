import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal.jsx';
import { Button } from '../../components/common/Button.jsx';
import { db } from '../../services/db.js';
import { useUser } from '../../context/UserContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { sanitizeInput } from '../../utils/sanitizer.js';

/**
 * مكتب تقديم البلاغات والشكاوى الرسمية ضد الفنيين وإحالتها للإشراف
 */
export const ComplaintsDesk = ({
  job,
  isOpen,
  onClose
}) => {
  const { currentUser } = useUser();
  const { language, showToast } = useApp();

  const [type, setType] = useState('خلاف مالي');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser || !job) return;

    setLoading(true);

    const payload = {
      jobId: job.id,
      customerId: currentUser.id,
      customerName: currentUser.name,
      artisanId: job.artisanId,
      artisanName: job.artisanName,
      type: sanitizeInput(type),
      details: sanitizeInput(details),
      status: 'pending',
      resolution: ''
    };

    try {
      await db.complaints.create(payload);
      // تحديث حالة الطلب ليصبح به نزاع مفتوح
      await db.jobs.update(job.id, { status: 'disputed' });
      
      showToast(
        language === 'ar' ? '🚨 تم إرسال الشكوى للإدارة بنجاح! سيتم فحصها فوراً.' : 'Dispute filed successfully!',
        'success'
      );
      onClose();
    } catch (err) {
      console.error(err);
      showToast(language === 'ar' ? 'فشل تقديم الشكوى.' : 'Failed to submit complaint.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? 'رفع نزاع أو شكوى فنية للإدارة' : 'File a Dispute'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-right font-cairo" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
        
        <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-brand-rose/20 p-3 rounded-2xl text-[10px] text-brand-rose leading-relaxed font-bold">
          ⚠️ تنبيه: رفع بلاغ كاذب أو وهمي قد يؤدي إلى تعليق حسابك. يتم رصد كافة الفواتير والرسائل لحل النزاع ودياً.
        </div>

        <div>
          <label className="text-xs font-bold text-brand-navy dark:text-brand-light block mb-1">اختر تصنيف الشكوى</label>
          <select 
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 outline-none focus:border-brand-rose"
          >
            <option value="خلاف مالي">خلاف مالي (تغيير السعر المتفق عليه)</option>
            <option value="جودة الصيانة">سوء جودة الصيانة (العطل لم يصلح)</option>
            <option value="سلوك الفني">سلوك غير احترافي من الفني</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-brand-navy dark:text-brand-light block mb-1">تفاصيل الخلاف بالتفصيل 🚨</label>
          <textarea
            required
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="يرجى وصف المشكلة بوضوح والمبالغ المالية المطلوبة للتسوية..."
            className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-brand-navy dark:text-brand-light border border-slate-200 dark:border-slate-700 outline-none focus:border-brand-rose h-24"
          />
        </div>

        <div className="flex gap-2 mt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            إلغاء
          </Button>
          <Button 
            type="submit" 
            loading={loading}
            className="flex-1 bg-brand-rose border-brand-rose"
          >
            إرسال الشكوى للإدارة ➡️
          </Button>
        </div>

      </form>
    </Modal>
  );
};
