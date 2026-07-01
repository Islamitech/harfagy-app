import React, { useState, useEffect } from 'react';
import { db } from '../../services/db.js';
import { useUser } from '../../context/UserContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { Button } from '../../components/common/Button.jsx';
import { BookingFlow } from './BookingFlow.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { sanitizeInput } from '../../utils/sanitizer.js';

/**
 * شاشة تصفح وبحث الحرفيين الرئيسية للعميل
 */
export const CustomerHome = ({ onSelectJobTrack }) => {
  const { currentUser, favorites, toggleFavorite } = useUser();
  const { language, showToast } = useApp();

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

  // معالع الحجز وملف الفني الشخصي
  const [selectedArtisanForBooking, setSelectedArtisanForBooking] = useState(null);
  const [selectedArtisanForProfile, setSelectedArtisanForProfile] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [activePendingJob, setActivePendingJob] = useState(null);

  // تحقق ديناميكي من وجود طلب بث معلق نشط للعميل لمنع تكرار الطلبات وعرض الرادار
  useEffect(() => {
    if (!currentUser) return;
    const checkPendingJob = async () => {
      const allJobs = await db.jobs.getAll();
      const isCustomer = currentUser.role === 'customer';
      const targetCustomerId = isCustomer ? currentUser.id : 'cust-1';
      
      const pending = allJobs.find(j => j.customerId === targetCustomerId && j.status === 'pending');
      setActivePendingJob(pending || null);
    };
    checkPendingJob();

    const unsub = db.subscribe(() => {
      checkPendingJob();
    });
    return () => unsub();
  }, [currentUser]);

  // جلب حساب المستخدم المرتبط بالفني لمعاينة الملف الشخصي
  useEffect(() => {
    if (!selectedArtisanForProfile) {
      setProfileUser(null);
      return;
    }
    const fetchUser = async () => {
      const usersList = await db.getCollection("users");
      const matched = usersList.find(u => u.id === selectedArtisanForProfile.userId);
      if (matched) setProfileUser(matched);
    };
    fetchUser();
  }, [selectedArtisanForProfile]);

  const getCategoryWorkImages = (cat) => {
    const defaultImages = {
      plumber: [
        'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?w=400&q=80',
        'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80'
      ],
      electrician: [
        'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80',
        'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?w=400&q=80'
      ],
      hvac: [
        'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?w=400&q=80',
        'https://images.unsplash.com/photo-1621905252507-b354bc25edac?w=400&q=80'
      ],
      carpenter: [
        'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=400&q=80',
        'https://images.unsplash.com/photo-1459802014292-8969011195a6?w=400&q=80'
      ]
    };
    return defaultImages[cat] || [
      'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?w=400&q=80',
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80'
    ];
  };

  // جلب قائمة الفنيين
  useEffect(() => {
    const fetchArtisans = async () => {
      const list = await db.artisans.getAll();
      setArtisans(list || []);
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
  const filteredArtisans = (artisans || []).filter(art => {
    // 0. يجب عرض الفنيين الموثقين والمعتمدين فقط
    if (!art || !art.verified) return false;

    // 1. الفئة
    if (selectedCategory !== 'all' && art.category !== selectedCategory) return false;
    
    // 2. البحث النصي
    const q = searchQuery.toLowerCase();
    const matchesSearch = (art.name || '').toLowerCase().includes(q) || (art.bio || '').toLowerCase().includes(q);
    if (!matchesSearch) return false;

    // 3. فلترة جغرافية (محاكاة جلب موقع الفني المرتبط بالمستخدم)
    if (district !== 'الكل' && art.id === 'art-4' && district !== 'الهرم') return false; // سيد النجار بالهرم
    if (district !== 'الكل' && ['art-1', 'art-2', 'art-3'].includes(art.id) && district !== 'حدائق الأهرام') return false;
    
    return true;
  });

  const getCategoryLabel = (catId) => {
    const cat = categories.find(c => c.id === catId);
    return cat ? (language === 'ar' ? cat.name_ar : cat.name_en) : catId;
  };

  if (activePendingJob) {
    const matchingOnlineCount = (artisans || []).filter(a => a && a.category === activePendingJob.category && a.isOnline).length;

    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 bg-slate-50 dark:bg-[#0b0f19] text-center font-cairo h-full min-h-[500px]" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
        
        {/* رادار مضيء يدور */}
        <div className="relative w-44 h-44 mb-6 flex items-center justify-center">
          {/* دوائر النبض */}
          <div className="absolute inset-0 rounded-full bg-orange-500/10 animate-ping" />
          <div className="absolute inset-4 rounded-full bg-orange-500/20 animate-pulse" />
          {/* الدائرة الدوارة الأساسية */}
          <div className="absolute w-36 h-36 rounded-full border-4 border-dashed border-brand-orange animate-spin" style={{ animationDuration: '8s' }} />
          
          {/* فقاعات فنيين حقيقيين نشطين حول الدائرة بشكل واقعي ثابت */}
          <div className="absolute -top-2 left-16 w-10 h-10 rounded-full bg-white dark:bg-slate-900 border-2 border-emerald-500 flex items-center justify-center text-lg shadow-md z-20">
            👷‍♂️
          </div>
          <div className="absolute top-16 -right-2 w-10 h-10 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 opacity-60 flex items-center justify-center text-lg z-20">
            👨‍🔧
          </div>

          {/* أيقونة راديو إرسال في المنتصف */}
          <div className="w-20 h-20 rounded-full bg-brand-orange text-white flex items-center justify-center text-3xl shadow-lg z-10 font-bold">
            📡
          </div>
        </div>

        {/* شريط حالة المعاينة والنبض للفنيين */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 px-4 py-2.5 rounded-2xl flex items-center gap-2 mb-6 shadow-sm max-w-xs justify-center">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse block"></span>
          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-350">
            📡 تم بث طلبك إلى {matchingOnlineCount || 1} فني متصل حالياً بالحي
          </span>
        </div>

        <h3 className="text-xs font-black text-brand-navy dark:text-brand-light mb-2">
          📡 جاري البحث عن حرفي وبث طلبك...
        </h3>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mb-8">
          تم إرسال بلاغ العطل العاجل لكافة فنيي <span className="text-brand-orange font-bold">({getCategoryLabel(activePendingJob.category)})</span> بمنطقة <span className="font-bold text-slate-800 dark:text-brand-light">{activePendingJob.district}</span>. 
          يرجى الانتظار حتى يقبل أحد الفنيين القريبين الطلب ويتحرك إليك فوراً.
        </p>

        {/* زر إلغاء البث الفوري */}
        <Button 
          variant="danger"
          onClick={async () => {
            await db.jobs.update(activePendingJob.id, { status: 'cancelled' });
            showToast(language === 'ar' ? '✕ تم إلغاء طلب البحث بنجاح' : 'Search request cancelled', 'info');
          }}
          className="text-[10px] font-black py-2.5 px-6 rounded-full shadow-md active:scale-95 transition-all border-none"
        >
          ✕ إلغاء طلب البحث الفوري
        </Button>
        
        <span className="text-[8px] text-slate-400 mt-3 font-bold">
          ملاحظة: يمكنك إلغاء طلب البث الآن مجاناً دون تطبيق أي رسوم.
        </span>

      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4 text-right font-cairo bg-slate-50 dark:bg-[#0b0f19]" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
      
      {/* كارت طلب صيانة فورية عاجلة وبثه للحي */}
      <div className="bg-gradient-to-l from-orange-500 to-amber-500 p-4.5 rounded-3xl text-white shadow-md shadow-orange-500/10 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="text-right">
          <strong className="text-xs font-black block">🚨 صيانة فورية عاجلة بـ {district === 'الكل' ? governorate : district}</strong>
          <span className="text-[9px] text-orange-100 block mt-1">بث عطلك فوراً لكافة فنيي السباكة، الكهرباء والتكييف القريبين منك ليصلك أحدهم حالاً!</span>
        </div>
        <button 
          onClick={() => setSelectedArtisanForBooking({ id: 'dummy', name: 'بث عام لكافة الفنيين', category: 'plumber' })}
          className="bg-white text-orange-600 text-[10px] font-black py-2 px-5 rounded-full hover:bg-orange-50 transition-colors shadow-sm active:scale-95 cursor-pointer border-none whitespace-nowrap"
        >
          اطلب فني الآن 🏎️
        </button>
      </div>

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
                onClick={() => setSelectedArtisanForProfile(art)}
                className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4.5 rounded-3xl shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md cursor-pointer text-right"
              >
                {/* زر المفضلة */}
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(art.id); }}
                  className="absolute left-4 top-4 text-sm p-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-rose-500 transition-transform active:scale-75 cursor-pointer z-10"
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
                      onClick={(e) => { e.stopPropagation(); setSelectedArtisanForBooking(art); }}
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
          artisan={selectedArtisanForBooking.id === 'dummy' ? null : selectedArtisanForBooking}
          isOpen={!!selectedArtisanForBooking}
          onClose={() => setSelectedArtisanForBooking(null)}
        />
      )}

      {/* نافذة استعراض الملف المهني للفني */}
      {selectedArtisanForProfile && (
        <Modal
          isOpen={!!selectedArtisanForProfile}
          onClose={() => setSelectedArtisanForProfile(null)}
          title={`الملف المهني للأسطى: ${selectedArtisanForProfile.name}`}
          size="md"
        >
          <div className="flex flex-col gap-4 text-right font-cairo text-xs leading-relaxed" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
            
            {/* بطاقة الرأس والتقييم */}
            <div className="flex gap-4 items-center bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-brand-orange flex items-center justify-center text-3xl shadow-inner">
                👷‍♂️
              </div>
              <div className="flex-1">
                <strong className="text-sm text-brand-navy dark:text-brand-light block">{selectedArtisanForProfile.name}</strong>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">الهوية الرقمية: {selectedArtisanForProfile.custom_id}</span>
                <span className="text-[10px] text-amber-500 font-bold block mt-1">⭐ {selectedArtisanForProfile.rating} / 5.0 ({selectedArtisanForProfile.completedJobs} عملية ناجحة)</span>
              </div>
            </div>

            {/* نبذة عن الفني */}
            <div>
              <strong className="text-brand-navy dark:text-brand-light block mb-1">نبذة شخصية وخبرات:</strong>
              <p className="bg-slate-50/50 dark:bg-slate-850 p-3 rounded-2xl text-slate-600 dark:text-slate-400">
                {selectedArtisanForProfile.bio}
              </p>
            </div>

            {/* نطاق وموقع الخدمة */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50/50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-450 block font-bold text-[10px]">المحافظة والنطاق الرئيسي</span>
                <strong className="text-brand-navy dark:text-brand-light mt-0.5 block">{profileUser ? profileUser.governorate : 'الجيزة'}</strong>
              </div>
              <div className="bg-slate-50/50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-450 block font-bold text-[10px]">الحي والمربع السكني</span>
                <strong className="text-brand-navy dark:text-brand-light mt-0.5 block">{profileUser ? profileUser.district : 'حدائق الأهرام'}</strong>
              </div>
            </div>

            {/* معرض الأعمال السابقة */}
            <div>
              <strong className="text-brand-navy dark:text-brand-light block mb-1.5">📸 معرض صور الأعمال السابقة المنفذة:</strong>
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                {getCategoryWorkImages(selectedArtisanForProfile.category).map((url, idx) => (
                  <div key={idx} className="relative rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800 aspect-[4/3] bg-slate-100">
                    <img 
                      src={url} 
                      alt="work sample" 
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" 
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* زر الحجز المباشر */}
            <Button
              onClick={() => {
                setSelectedArtisanForBooking(selectedArtisanForProfile);
                setSelectedArtisanForProfile(null);
              }}
              className="w-full bg-brand-emerald border-brand-emerald text-xs font-black py-2.5 mt-2"
            >
              طلب فحص وصيانة فورية الآن 🏎️
            </Button>

          </div>
        </Modal>
      )}

    </div>
  );
};
