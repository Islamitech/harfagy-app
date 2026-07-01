import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';
import { db } from '../../services/db.js';
import { useUser } from '../../context/UserContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { sanitizeInput } from '../../utils/sanitizer.js';

/**
 * معالج حجز الخدمة تفاعلي متعدد الخطوات (Multistep Wizard)
 */
export const BookingFlow = ({
  artisan,
  isOpen,
  onClose
}) => {
  const { currentUser } = useUser();
  const { language, showToast } = useApp();

  // الخطوة الحالية للمعالج
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // بيانات الحجز
  const [description, setDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [street, setStreet] = useState('');
  const [building, setBuilding] = useState('');
  const [apartment, setApartment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    const prices = { plumber: 50, electrician: 60, hvac: 80, carpenter: 50 };
    const basePrice = prices[artisan.category] || 50;

    const payload = {
      customerId: currentUser.id,
      customerName: currentUser.name,
      customerPhone: currentUser.phone,
      artisanId: artisan.id,
      artisanName: artisan.name,
      category: artisan.category,
      description: sanitizeInput(description),
      preferredDate: sanitizeInput(preferredDate),
      paymentMethod: sanitizeInput(paymentMethod),
      street: sanitizeInput(street),
      building: sanitizeInput(building),
      apartment: sanitizeInput(apartment),
      status: 'pending',
      price: basePrice,
      isRated: false
    };

    try {
      await db.jobs.create(payload);
      showToast(
        language === 'ar' ? '✅ تم إرسال طلب الحجز للأسطى بنجاح! سيتم إخطاره فورا.' : 'Booking requested successfully!',
        'success'
      );
      onClose();
    } catch (err) {
      console.error(err);
      showToast(language === 'ar' ? 'فشل حجز الصيانة.' : 'Booking failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? `حجز صيانة مع الأسطى ${artisan.name}` : `Book with ${artisan.name}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-right font-cairo" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
        
        {/* شريط تقدم الخطوات */}
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl mb-2 text-xs">
          <span className={`font-bold ${step === 1 ? 'text-brand-orange' : 'text-slate-400'}`}>1. تفاصيل العطل</span>
          <span className="text-slate-300">➔</span>
          <span className={`font-bold ${step === 2 ? 'text-brand-orange' : 'text-slate-400'}`}>2. الموعد</span>
          <span className="text-slate-300">➔</span>
          <span className={`font-bold ${step === 3 ? 'text-brand-orange' : 'text-slate-400'}`}>3. العنوان والدفع</span>
        </div>

        {/* الخطوة 1: تفاصيل المشكلة */}
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-brand-navy dark:text-brand-light">وصف المشكلة بالتفصيل 🚨</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: خلاط المياه يسرب في حمام الصالة ويحتاج لتغيير القلب..."
              className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-brand-navy dark:text-brand-light border border-slate-200 dark:border-slate-700 outline-none focus:border-brand-orange h-24"
            />
            <Button className="mt-2" onClick={() => description.trim() ? setStep(2) : alert('يرجى وصف المشكلة أولاً.')}>
              متابعة لاختيار الوقت ➡️
            </Button>
          </div>
        )}

        {/* الخطوة 2: تحديد الموعد */}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            <Input
              label="تاريخ الزيارة المطلوبة"
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
            />
            <div className="flex gap-2 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                رجوع
              </Button>
              <Button className="flex-1" onClick={() => preferredDate ? setStep(3) : alert('يرجى اختيار تاريخ الزيارة أولاً.')}>
                متابعة للعنوان والدفع ➡️
              </Button>
            </div>
          </div>
        )}

        {/* الخطوة 3: العنوان والدفع */}
        {step === 3 && (
          <div className="flex flex-col gap-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <Input
                label="اسم الشارع"
                required
                placeholder="الشارع الثاني"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
              <Input
                label="رقم العقار"
                required
                placeholder="ح ع"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
              />
              <Input
                label="رقم الشقة"
                required
                placeholder="10"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-3">
              <label className="font-bold text-brand-navy dark:text-brand-light">طريقة سداد الرسوم</label>
              
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 cursor-pointer">
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  value="cash" 
                  checked={paymentMethod === 'cash'} 
                  onChange={() => setPaymentMethod('cash')} 
                />
                <div className="text-right">
                  <strong>كاش نقداً للأسطى 💵</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">سدد رسوم المعاينة البالغة {artisan.id === 'art-3' ? '80 ج.م' : '50 ج.م'} مباشرة في المنزل</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 opacity-60 cursor-not-allowed">
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  value="digital" 
                  disabled
                  checked={paymentMethod === 'digital'} 
                  onChange={() => setPaymentMethod('digital')} 
                />
                <div className="text-right">
                  <strong>محفظة كاش وإلكتروني (قيد التطوير ⏳)</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">الدفع الآمن من التطبيق بالفيزا وفودافون كاش قريباً</span>
                </div>
              </label>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                رجوع
              </Button>
              <Button type="submit" loading={loading} className="flex-1 bg-brand-emerald border-brand-emerald">
                تأكيد الحجز الفوري 🛡️
              </Button>
            </div>
          </div>
        )}

      </form>
    </Modal>
  );
};
