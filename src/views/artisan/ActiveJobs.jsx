import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { db } from '../../services/db.js';
import { Button } from '../../components/common/Button.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { InvoiceGenerator } from '../../components/billing/InvoiceGenerator.jsx';

/**
 * كارت إدارة تفاصيل ومراحل العمل لعملية صيانة جارية مع قفل مكالمات العميل (30 دقيقة)
 */
const ActiveJobCard = ({ job, updateJobStatus, completeJob, language }) => {
  const [callAvailable, setCallAvailable] = useState(false);
  const [callRemainingMinutes, setCallRemainingMinutes] = useState(30);

  useEffect(() => {
    if (!job.acceptedAt) {
      setCallAvailable(false);
      setCallRemainingMinutes(30);
      return;
    }

    const calculateRemaining = () => {
      const elapsedSeconds = Math.floor((new Date() - new Date(job.acceptedAt)) / 1000);
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);
      const rem = Math.max(0, 30 - elapsedMinutes);
      setCallRemainingMinutes(rem);
      setCallAvailable(rem <= 0);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [job]);

  return (
    <div className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col gap-3 text-xs text-right">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
        <strong className="text-brand-navy dark:text-brand-light">طلب صيانة للعميل: {job.customerName}</strong>
        <span className="text-[9px] text-brand-orange bg-orange-500/10 px-2 py-0.5 rounded-md font-black">
          رقم: #{job.id.substring(0, 6)}
        </span>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl leading-relaxed text-slate-600 dark:text-slate-400">
        <strong>العنوان:</strong> {job.street}، عقار {job.building}، الدور {job.floor || 'الأرضي'}، شقة {job.apartment}<br/>
        {job.landmark && <div className="mt-0.5"><strong>علامة مميزة للموقع:</strong> {job.landmark}</div>}
        
        {/* حماية الخصوصية: إخفاء رقم الهاتف للطرفين حتى مرور نصف ساعة من القبول */}
        <div className="mt-1 flex items-center gap-1">
          <strong>الهاتف الجاري:</strong>{' '}
          {callAvailable ? (
            <a href={`tel:${job.customerPhone}`} className="text-brand-emerald hover:underline font-bold">
              📞 {job.customerPhone} (اضغط للاتصال)
            </a>
          ) : (
            <span className="text-slate-400 font-bold bg-slate-100 dark:bg-slate-900/60 px-2 py-0.5 rounded-md text-[10px]">
              🔒 يظهر الهاتف بعد {callRemainingMinutes} دقيقة
            </span>
          )}
        </div>

        <strong className="block mt-1">المشكلة:</strong> {job.description}
      </div>

      {/* أزرار التحكم اللوجستية */}
      <div className="flex gap-2.5 mt-2">
        {job.status === 'accepted' && (
          <Button 
            className="w-full text-[10px] bg-brand-orange border-brand-orange"
            onClick={() => updateJobStatus(job.id, 'onway')}
          >
            🛵 أنا في الطريق الآن للعميل
          </Button>
        )}

        {job.status === 'onway' && (
          <Button 
            className="w-full text-[10px] bg-brand-navy border-brand-navy"
            onClick={() => updateJobStatus(job.id, 'arrived')}
          >
            📍 وصلت للعميل وبدأت الفحص الفني
          </Button>
        )}

        {job.status === 'arrived' && (
          <Button 
            className="w-full text-[10px] bg-brand-emerald border-brand-emerald"
            onClick={() => completeJob(job)}
          >
            🎉 أنهيت الصيانة وأريد إصدار الفاتورة المعتمدة
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * إدارة العمليات الجارية وحالات التقدم اللوجستية للحرفي
 */
export const ActiveJobs = () => {
  const { currentUser } = useUser();
  const { language, showToast } = useApp();

  const [artisan, setArtisan] = useState(null);
  const [activeJobs, setActiveJobs] = useState([]);
  
  // شاشات الفواتير والمحادثات
  const [completedJobInvoice, setCompletedJobInvoice] = useState(null);

  // جلب الفني والعمليات النشطة
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchProfileAndJobs = async () => {
      const artisansList = await db.getCollection("artisans");
      const artProfile = artisansList.find(a => a.userId === currentUser.id);
      if (artProfile) {
        setArtisan(artProfile);
        
        // جلب العمليات الجارية غير المنتهية
        const allJobs = await db.jobs.query(j => j.artisanId === artProfile.id);
        setActiveJobs(allJobs.filter(j => j.status !== 'completed' && j.status !== 'disputed' && j.status !== 'cancelled'));
      }
    };
    
    fetchProfileAndJobs();
    
    const unsub = db.subscribe(() => {
      fetchProfileAndJobs();
    });
    return () => unsub();
  }, [currentUser]);

  // تحديث مرحلة سير العمل اللوجستية
  const updateJobStatus = async (jobId, nextStatus) => {
    try {
      await db.jobs.update(jobId, { status: nextStatus });
      showToast(
        language === 'ar' ? '✅ تم تحديث حالة الصيانة بنجاح!' : 'Job status updated!',
        'success'
      );
    } catch (err) {
      console.error(err);
    }
  };

  // إنهاء العمل بالكامل وتوزيع المستحقات المالية
  const completeJob = async (job) => {
    if (!artisan) return;
    
    try {
      // 1. حساب المستحقات والعمولات
      const earn = Number(job.price) || 50;
      const comm = earn * 0.15; // 15% منصة

      // 2. تحديث محفظة الفني
      await db.artisans.update(artisan.id, {
        wallet: artisan.wallet + earn,
        commissionDue: artisan.commissionDue + comm
      });

      // 3. إنهاء حالة الطلب
      const updatedJob = await db.jobs.update(job.id, { status: 'completed' });
      
      showToast(
        language === 'ar' ? '🎉 تم إنجاز الخدمة بنجاح وتوليد الفاتورة!' : 'Job completed, invoice ready!',
        'success'
      );
      
      // فتح كارت الفاتورة الرسمية المعتمدة فوراً لإبهار المستثمرين
      setCompletedJobInvoice(updatedJob);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 text-right font-cairo" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      <div className="customer-header">
        <h2 className="text-sm font-extrabold text-brand-navy dark:text-brand-light">العمليات الجارية والصيانة 🛠️</h2>
        <p className="text-[10px] text-slate-400 mt-1">تحديث مسارات الوصول اللوجستية، الفحص الفني، وإصدار الفواتير الفورية</p>
      </div>

      <div className="flex flex-col gap-4">
        {activeJobs.length > 0 ? (
          activeJobs.map(job => (
            <ActiveJobCard 
              key={job.id}
              job={job}
              updateJobStatus={updateJobStatus}
              completeJob={completeJob}
              language={language}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-3xl">
            <span className="text-3xl block mb-2">🛠️</span>
            <p className="text-xs font-bold text-slate-400">لا يوجد عمليات جارية حالياً.</p>
          </div>
        )}
      </div>

      {/* نافذة الفاتورة المعتمدة Modal عند الإنجاز */}
      {completedJobInvoice && (
        <Modal
          isOpen={!!completedJobInvoice}
          onClose={() => setCompletedJobInvoice(null)}
          title="فاتورة صيانة معتمدة لربط الخدمات المنزلية"
          size="md"
        >
          <InvoiceGenerator job={completedJobInvoice} />
        </Modal>
      )}

    </div>
  );
};
