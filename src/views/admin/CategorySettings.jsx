import React, { useState, useEffect } from 'react';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';
import { useApp } from '../../context/AppContext.jsx';

/**
 * إدارة تخصصات الخدمات المنزلية وسقف أسعار المعاينة لضبط استقرار السوق
 */
export const CategorySettings = ({ activeRole = 'superadmin' }) => {
  const { language, showToast } = useApp();

  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('harfagy_pricing_settings');
    return saved ? JSON.parse(saved) : [
      { id: 'plumber', name: 'سباكة (Plumbing)', fee: 50, cap: 250 },
      { id: 'electrician', name: 'كهرباء (Electricity)', fee: 60, cap: 300 },
      { id: 'hvac', name: 'تكييفات (HVAC)', fee: 80, cap: 400 },
      { id: 'carpenter', name: 'نجارة (Carpentry)', fee: 50, cap: 250 }
    ];
  });

  const [editingId, setEditingId] = useState(null);
  const [feeVal, setFeeVal] = useState('');
  const [capVal, setCapVal] = useState('');

  useEffect(() => {
    localStorage.setItem('harfagy_pricing_settings', JSON.stringify(categories));
  }, [categories]);

  const startEdit = (cat) => {
    if (activeRole !== 'superadmin') {
      showToast(
        language === 'ar' ? '⚠️ عذراً، لا تمتلك الصلاحيات الإدارية لتعديل تسعيرة الخدمات (هذا الإجراء مقصور على المدير العام فقط).' : 'Access denied: Only Super Admin can edit pricing.',
        'error'
      );
      return;
    }
    setEditingId(cat.id);
    setFeeVal(cat.fee.toString());
    setCapVal(cat.cap.toString());
  };

  const saveEdit = async (catId) => {
    if (activeRole !== 'superadmin') {
      showToast(
        language === 'ar' ? '⚠️ عذراً، لا تمتلك الصلاحيات الإدارية لتعديل تسعيرة الخدمات.' : 'Access denied.',
        'error'
      );
      return;
    }

    try {
      setCategories(categories.map(c => {
        if (c.id === catId) {
          return {
            ...c,
            fee: Number(feeVal) || c.fee,
            cap: Number(capVal) || c.cap
          };
        }
        return c;
      }));
      setEditingId(null);

      // تسجيل العملية في سجل التدقيق الأمني (Audit Logs)
      await db.addDocument('audit_logs', {
        adminId: 'usr-admin',
        adminRole: activeRole,
        action: 'update_service_pricing',
        targetUserId: catId,
        targetUserName: `فئة ${catId}`,
        ip: '192.168.1.45',
        details: `تعديل أتعاب فئة ${catId} لتصبح المعاينة: ${feeVal} ج.م، السقف: ${capVal} ج.م.`,
        timestamp: new Date().toISOString()
      });

      showToast(language === 'ar' ? '✅ تم تحديث تسعيرة الخدمة وسقف الأسعار بنجاح!' : 'Pricing updated!', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 text-right font-cairo" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      <div className="customer-header">
        <h2 className="text-sm font-extrabold text-brand-navy dark:text-brand-light">تخصصات الخدمات والتسعير ⚙️</h2>
        <p className="text-[10px] text-slate-400 mt-1">تحديد قيم أتعاب كشف المعاينة وسقف الأسعار الإرشادية بالجيزة</p>
      </div>

      <div className="bg-orange-500/5 border border-brand-orange/20 p-3 rounded-2xl text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-bold">
        ℹ️ الأسعار المحددة هنا تفرض تلقائياً كرسوم معاينة أولية للطلبات المنفذة في حدائق الأهرام ومصر الجديدة لضبط استقرار تسعير المهن الحرة.
      </div>

      <div className="flex flex-col gap-4">
        {categories.map(cat => (
          <div 
            key={cat.id}
            className="bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm text-xs flex flex-col gap-3"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <strong className="text-brand-navy dark:text-brand-light">{cat.name}</strong>
              <span className="text-[10px] text-brand-orange font-black">الحالة: مفعل ونشط</span>
            </div>

            {editingId === cat.id ? (
              <div className="flex flex-col gap-3 mt-1">
                <div className="grid grid-cols-2 gap-3">
                  <Input 
                    label="رسوم الكشف الأساسية (ج.م)"
                    type="number"
                    value={feeVal}
                    onChange={(e) => setFeeVal(e.target.value)}
                  />
                  <Input 
                    label="الحد الأقصى للخدمة (ج.م)"
                    type="number"
                    value={capVal}
                    onChange={(e) => setCapVal(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 justify-end mt-1">
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>إلغاء</Button>
                  <Button size="sm" className="bg-brand-emerald border-brand-emerald" onClick={() => saveEdit(cat.id)}>حفظ الأسعار</Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center text-xs mt-1">
                <div className="flex gap-4">
                  <div>
                    <span className="text-slate-400 block text-[9px] font-bold">رسم الكشف</span>
                    <strong className="text-brand-navy dark:text-brand-light text-sm mt-0.5 block">{cat.fee} ج.م</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] font-bold">الحد الأقصى للإرشاد</span>
                    <strong className="text-brand-navy dark:text-brand-light text-sm mt-0.5 block">{cat.cap} ج.م</strong>
                  </div>
                </div>
                
                <Button 
                  size="sm"
                  variant="outline"
                  className="text-[9px] px-3.5"
                  onClick={() => startEdit(cat)}
                >
                  تعديل الأسعار
                </Button>
              </div>
            )}

          </div>
        ))}
      </div>

    </div>
  );
};
