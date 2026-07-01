import React, { useState, useEffect } from 'react';
import { db } from '../../services/db.js';
import { useUser } from '../../context/UserContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { Button } from '../../components/common/Button.jsx';
import { BookingFlow } from './BookingFlow.jsx';
import { sanitizeInput } from '../../utils/sanitizer.js';

/**
 * شاشة تصفح وبحث الحرفيين الرئيسية للعميل
 */
export const CustomerHome = ({ onSelectJobTrack }) => {
  const { currentUser, favorites, toggleFavorite } = useUser();
  const { language } = useApp();

  // الحالات المحلية
  const [artisans, setArtisans] = useState([]);
  const [categories, setCategories] = useState([
    { id: 'all', name_ar: 'الكل', name_en: 'All', icon: '🔍' },
    { id: 'plumber', name_ar: 'سباكة', name_en: 'Plumbing', icon: '🚰' },
    { id: 'electrician', name_ar: 'كهرباء', name_en: 'Electricity', icon: '⚡' },
    { id: 'hvac', name_ar: 'تكييفات', name_en: 'HVAC', icon: '❄️' },
    { id: 'carpenter', name_ar: 'نجارة', name_en: 'Carpentry', icon: '🪚' }
  ]);
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // الفلترة الجغرافية
  const [governorate, setGovernorate] = useState('الجيزة');
  const [district, setDistrict] = useState('الكل');

  // معالج الحجز
  const [selectedArtisanForBooking, setSelectedArtisanForBooking] = useState(null);

  // جلب قائمة الفنيين
  useEffect(() => {
    const fetchArtisans = async () => {
      const list = await db.artisans.getAll();
      setArtisans(list);
    };
    fetchArtisans();
    
    // الاشتراك لتحديث الفنيين فوريا
    const unsub = db.subscribe(() => {
      fetchArtisans();
    });
    return () => unsub();
  }, []);

  // أحياء حدائق الأهرام والدقي لفلترة الجيزة
  const districtsForGov = {
    'الجيزة': ['الكل', 'حدائق الأهرام', 'الهرم', 'الدقي', 'المهندسين'],
    'القاهرة': ['الكل', 'مصر الجديدة', 'مدينة نصر', 'المعادي', 'التجمع الخامس'],
    'الإسكندرية': ['الكل', 'سموحة', 'المنشية', 'سيدي بشر', 'ميامي']
  };

  // فلترة الفنيين النشطين والمعتمدين جغرافيا وحسب الفئة والبحث
  const filteredArtisans = artisans.filter(art => {
    // 1. الفئة
    if (selectedCategory !== 'all' && art.category !== selectedCategory) return false;
    
    // 2. البحث النصي
    const q = searchQuery.toLowerCase();
    const matchesSearch = art.name.toLowerCase().includes(q) || art.bio.toLowerCase().includes(q);
    if (!matchesSearch) return false;

    // 3. فلترة جغرافية (محاكاة جلب موقع الفني المرتبط بالمستخدم)
    // الفنيين المسجلين بالسيستم لديهم تفضيل أو موقع مرتبط بـ Hadayek Al Ahram
    if (district !== 'الكل' && art.id === 'art-4' && district !== 'الهرم') return false; // سيد النجار بالهرم
    if (district !== 'الكل' && ['art-1', 'art-2', 'art-3'].includes(art.id) && district !== 'حدائق الأهرام') return false;
    
    return true;
  });

  const getCategoryLabel = (catId) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? (language === 'ar' ? cat.name_ar : cat.name_en) : catId;
  };

  return (
    <div className="flex flex-col gap-5 p-4 text-right font-cairo" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      {/* الفلترة الجغرافية الفورية */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-4.5 rounded-3xl shadow-sm">
        <h3 className="text-[11px] font-black text-slate-800 dark:text-brand-light mb-3">📍 اختيار موقع الخدمة بدقة</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] text-slate-400 block font-bold mb-1">المحافظة</label>
            <select 
              value={governorate}
              onChange={(e) => {
                setGovernorate(e.target.value);
                setDistrict('الكل');
              }}
              className="w-full text-[11px] p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200/50 dark:border-slate-700 outline-none focus:border-orange-500 transition-colors"
            >
              <option value="الجيزة">الجيزة</option>
              <option value="القاهرة">القاهرة</option>
              <option value="الإسكندرية">الإسكندرية</option>
            </select>
          </div>
          
          <div>
            <label className="text-[9px] text-slate-400 block font-bold mb-1">الحي السكني</label>
            <select 
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full text-[11px] p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white border border-slate-200/50 dark:border-slate-700 outline-none focus:border-orange-500 transition-colors"
            >
              {(districtsForGov[governorate] || ['الكل']).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* حقل البحث السريع */}
      <div className="relative">
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(sanitizeInput(e.target.value))}
          placeholder={language === 'ar' ? "ابحث بالاسم أو التخصص (سباك، تكييف)..." : "Search by name or specialty..."}
          className="w-full text-[11px] px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-brand-light border border-slate-200/50 dark:border-slate-800/80 outline-none shadow-sm focus:border-orange-500 transition-colors"
        />
        <span className="absolute left-4 top-3.5 text-slate-400 text-xs">🔍</span>
      </div>

      {/* شريط التصنيفات الأفقي */}
      <div className="flex gap-2 overflow-x-auto pb-1.5 hide-scrollbar">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`
              flex items-center gap-1.5 py-1.5 px-4 rounded-full text-[10px] font-bold whitespace-nowrap transition-all duration-300 border cursor-pointer
              ${selectedCategory === cat.id 
                ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/10' 
                : 'bg-white text-slate-500 border-slate-200 hover:border-orange-500 hover:text-orange-500 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'}
            `}
          >
            <span>{cat.icon}</span>
            <span>{language === 'ar' ? cat.name_ar : cat.name_en}</span>
          </button>
        ))}
      </div>

      {/* قائمة الفنيين المتاحة */}
      <div className="flex flex-col gap-4">
        <h3 className="text-[11px] font-black text-slate-800 dark:text-brand-light flex items-center justify-between">
          <span>👷‍♂️ الفنيين المتوفرين بـ {district === 'الكل' ? governorate : district}</span>
          <span className="text-[9px] text-slate-400 font-bold">{filteredArtisans.length} فني جاهز</span>
        </h3>

        {filteredArtisans.length > 0 ? (
          filteredArtisans.map(art => {
            const isFav = favorites.includes(art.id);
            return (
              <div 
                key={art.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative"
              >
                {/* زر المفضلة */}
                <button 
                  onClick={() => toggleFavorite(art.id)}
                  className="absolute left-4 top-4 text-sm p-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-rose-500 transition-transform active:scale-75 cursor-pointer"
                >
                  {isFav ? '❤️' : '🤍'}
                </button>

                {/* ترويسة كارت الفني */}
                <div className="flex gap-3 mb-2.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-lg shadow-inner border border-slate-200/10">
                    👷‍♂️
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-slate-800 dark:text-brand-light flex items-center gap-1.5">
                      <span>{art.name}</span>
                      {art.verified && <span className="text-[9px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md font-bold">موثق 🛡️</span>}
                    </h4>
                    <span className="text-[9px] text-orange-500 font-bold mt-0.5 block">
                      {getCategoryLabel(art.category)}
                    </span>
                  </div>
                </div>

                {/* نبذة وتفاصيل التقشير */}
                <p className="text-[10px] text-slate-500 dark:text-slate-450 leading-relaxed mb-3.5 pl-8">
                  {art.bio}
                </p>

                {/* بيانات المعاينة والتقييم والطلب */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-500">⭐ {art.rating}</span>
                    <span className="text-[9px] text-slate-400 font-bold">({art.completedJobs} عملية)</span>
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">المعاينة: {art.id === 'art-3' ? '80 ج.م' : '50 ج.م'}</span>
                    <Button 
                      size="sm"
                      onClick={() => setSelectedArtisanForBooking(art)}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-[9px] font-black py-1.5 px-3 rounded-full transition-all duration-300 shadow-sm active:scale-95 border-none"
                    >
                      طلب فحص
                    </Button>
                  </div>
                </div>

              </div>
            );
          })
        ) : (
          <div className="text-center py-10 bg-white dark:bg-brand-slate border border-slate-200 dark:border-slate-800 rounded-3xl">
            <span className="text-3xl block mb-2">🤷‍♂️</span>
            <p className="text-xs font-bold text-slate-400">عذراً، لا يوجد فني متوفر بهذه الشروط حالياً.</p>
          </div>
        )}
      </div>

      {/* معالج حجز الخدمة Booking Wizard Modal */}
      {selectedArtisanForBooking && (
        <BookingFlow
          artisan={selectedArtisanForBooking}
          isOpen={!!selectedArtisanForBooking}
          onClose={() => setSelectedArtisanForBooking(null)}
        />
      )}

    </div>
  );
};
