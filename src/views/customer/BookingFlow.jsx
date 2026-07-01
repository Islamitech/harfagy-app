import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal.jsx';
import { Input } from '../../components/common/Input.jsx';
import { Button } from '../../components/common/Button.jsx';
import { db } from '../../services/db.js';
import { useUser } from '../../context/UserContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { sanitizeInput } from '../../utils/sanitizer.js';

/**
 * معالج طلب الصيانة الفورية المطور (الطلب الفوري وبثه لكافة الفنيين القريبين)
 */
export const BookingFlow = ({
  artisan, // قد يكون null للطلب العام الفوري
  isOpen,
  onClose
}) => {
  const { currentUser } = useUser();
  const { language, showToast } = useApp();

  // الخطوة الحالية للمعالج (1. تفاصيل العطل والخدمة • 2. العنوان والدفع)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // بيانات الحجز
  const [category, setCategory] = useState(artisan ? artisan.category : 'plumber');
  const [description, setDescription] = useState('');
  const [street, setStreet] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [landmark, setLandmark] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    const prices = { plumber: 50, electrician: 60, hvac: 80, carpenter: 50 };
    const selectedCategory = artisan ? artisan.category : category;
    const basePrice = prices[selectedCategory] || 50;

    const payload = {
      customerId: currentUser.id,
      customerName: currentUser.name,
      customerPhone: currentUser.phone,
      artisanId: null, // بث عام، لا فني محدد في البداية
      artisanName: null,
      artisanPhone: null,
      category: selectedCategory,
      description: sanitizeInput(description),
      preferredDate: 'الزيارة الآن (فوراً) ⚡',
      paymentMethod: sanitizeInput(paymentMethod),
      street: sanitizeInput(street),
      building: sanitizeInput(building),
      floor: sanitizeInput(floor),
      apartment: sanitizeInput(apartment),
      landmark: sanitizeInput(landmark),
      governorate: currentUser.governorate || 'الجيزة',
      district: currentUser.district || 'حدائق الأهرام',
      status: 'pending', // بانتظار قبول أي فني
      price: basePrice,
      isRated: false,
      createdAt: new Date().toISOString()
    };

    try {
      await db.jobs.create(payload);
      showToast(
        language === 'ar' ? '🚨 تم بث طلب الصيانة الفورية لكافة الفنيين في منطقتك بنجاح!' : 'Urgent request broadcasted to all nearby technicians!',
        'success'
      );
      onClose();
    } catch (err) {
      console.error(err);
      showToast(language === 'ar' ? 'فشل إرسال طلب الصيانة.' : 'Booking failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (catId) => {
    const labels = { plumber: 'سباكة 🚰', electrician: 'كهرباء ⚡', hvac: 'تكييفات ❄️', carpenter: 'نجارة 🪚' };
    return labels[catId] || catId;
  };

  const getPriceLabel = () => {
    const selectedCategory = artisan ? artisan.category : category;
    const prices = { plumber: 50, electrician: 60, hvac: 80, carpenter: 50 };
    return `${prices[selectedCategory] || 50} ج.م`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'ar' ? 'طلب صيانة فورية عاجلة 🚨' : 'Request Instant Maintenance'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-right font-cairo" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
        
        {/* شريط تقدم الخطوات */}
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl mb-2 text-xs">
          <span className={`font-bold ${step === 1 ? 'text-brand-orange' : 'text-slate-400'}`}>1. تفاصيل العطل والخدمة</span>
          <span className="text-slate-300">➔</span>
          <span className={`font-bold ${step === 2 ? 'text-brand-orange' : 'text-slate-400'}`}>2. العنوان والدفع الفوري</span>
        </div>

        {/* الخطوة 1: تفاصيل المشكلة وتحديد التخصص */}
        {step === 1 && (
          <div className="flex flex-col gap-3.5">
            {/* اختيار التخصص في حال لم يكن الحرفي محدداً مسبقاً */}
            {!artisan ? (
              <div>
                <label className="text-xs font-bold text-brand-navy dark:text-brand-light">التخصص والخدمة المطلوبة</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-brand-navy dark:text-brand-light border border-slate-200 dark:border-slate-700 outline-none focus:border-brand-orange mt-1.5 cursor-pointer font-bold"
                >
                  <option value="plumber">سباكة 🚰</option>
                  <option value="electrician">كهرباء ⚡</option>
                  <option value="hvac">تكييفات وعزل ❄️</option>
                  <option value="carpenter">نجارة وتركيبات 🪚</option>
                </select>
              </div>
            ) : (
              <div className="bg-orange-500/5 border border-brand-orange/20 p-3 rounded-2xl">
                <span className="text-[10px] text-slate-400 block font-bold">الخدمة المستهدفة:</span>
                <strong className="text-xs text-brand-orange block mt-0.5">{getCategoryLabel(artisan.category)}</strong>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-brand-navy dark:text-brand-light">وصف المشكلة والعطل 🚨</label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="مثال: خلاط المياه يسرب في حمام الصالة ويحتاج لتغيير القلب..."
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-brand-navy dark:text-brand-light border border-slate-200 dark:border-slate-700 outline-none focus:border-brand-orange h-24 mt-1.5"
              />
            </div>

            <Button className="mt-2" onClick={() => description.trim() ? setStep(2) : alert('يرجى وصف المشكلة أولاً.')}>
              متابعة لتحديد الموقع والدفع ➡️
            </Button>
          </div>
        )}

        {/* الخطوة 2: العنوان والدفع */}
        {step === 2 && (
          <div className="flex flex-col gap-3 text-xs">
            <div className="grid grid-cols-4 gap-2">
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
                placeholder="278 ح"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
              />
              <Input
                label="رقم الدور"
                required
                placeholder="الـ 3"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
              />
              <Input
                label="رقم الشقة"
                required
                placeholder="6"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
              />
            </div>

            <div>
              <Input
                label="علامة مميزة للمكان (اختياري)"
                placeholder="مثال: العمارة بجوار سوبر ماركت البركة أو أمام صيدلية علي"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
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
                  <strong>كاش نقداً للفني عند الوصول 💵</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">رسوم فحص وانتقال بقيمة {getPriceLabel()} تُدفع مباشرة بعد المعاينة</span>
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
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                رجوع
              </Button>
              <Button type="submit" loading={loading} className="flex-1 bg-brand-emerald border-brand-emerald">
                بث طلب صيانة عاجل 📡
              </Button>
            </div>
          </div>
        )}

      </form>
    </Modal>
  );
};
