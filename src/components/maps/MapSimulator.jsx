import React from 'react';

/**
 * محاكي خرائط رسومي مبدع وتفاعلي يحاكي حركة مسار الحرفي بالـ SVG
 */
export const MapSimulator = ({
  step = 1, // 1 = معلق، 2 = في الطريق، 3 = وصل وبدأ، 4 = تم الإنجاز
  artisanName = 'الحرفي'
}) => {
  
  // تحديد إحداثيات موقع الفني بناءً على خطة التنفيذ اللوجستية
  const positions = {
    1: { x: 50, y: 50, label: 'الأسطى يجهز المعدات في الورشة 🔧' },
    2: { x: 190, y: 110, label: 'الأسطى متوجه إليك الآن بالدراجة 🛵' },
    3: { x: 300, y: 200, label: 'بدأ صيانة العطل في منزلك الآن 🛠️' },
    4: { x: 300, y: 200, label: 'تم إنجاز الصيانة وإغلاق الطلب 🎉' }
  };

  const current = positions[step] || positions[1];

  return (
    <div className="flex flex-col gap-3 font-cairo w-full">
      {/* خريطة الشوارع الرسومية SVG */}
      <div className="relative w-full h-64 bg-slate-100 dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
        <svg viewBox="0 0 400 250" className="w-full h-full">
          {/* 1. النهر / المجرى المائي */}
          <path d="M 0,220 C 100,210 150,150 220,130 C 290,110 320,60 400,50" 
                fill="none" stroke="#60a5fa" strokeWidth="18" opacity="0.6" />
          
          {/* 2. الحديقة الخضراء (Green Park Area) */}
          <rect x="250" y="20" width="100" height="60" rx="15" fill="#86efac" opacity="0.4" />
          
          {/* 3. شبكة الطرق والشوارع التخطيطية (Hadaiq Al Ahram Roads Mock) */}
          {/* شارع رئيسي أفقي */}
          <line x1="0" y1="50" x2="400" y2="50" stroke="#cbd5e1" strokeWidth="12" strokeDasharray="6 4" opacity="0.8" />
          <line x1="0" y1="200" x2="400" y2="200" stroke="#cbd5e1" strokeWidth="12" strokeDasharray="6 4" opacity="0.8" />
          {/* شارع رئيسي رأسي */}
          <line x1="80" y1="0" x2="80" y2="250" stroke="#cbd5e1" strokeWidth="12" strokeDasharray="6 4" opacity="0.8" />
          <line x1="300" y1="0" x2="300" y2="250" stroke="#cbd5e1" strokeWidth="12" strokeDasharray="6 4" opacity="0.8" />
          {/* شوارع فرعية مائلة */}
          <line x1="80" y1="50" x2="300" y2="200" stroke="#e2e8f0" strokeWidth="8" opacity="0.9" />

          {/* 4. موقع منزل العميل (نقطة الوصول الثابتة) */}
          <g transform="translate(300, 200)">
            {/* وميض نبضي متكرر إذا كان الفني في الطريق أو وصل */}
            {[2, 3].includes(step) && (
              <circle r="18" fill="none" stroke="#f97316" strokeWidth="2" className="animate-ping" opacity="0.6" />
            )}
            <circle r="10" fill="#f97316" />
            {/* أيقونة منزل صغيرة */}
            <path d="M -5,3 L -5,-3 L 0,-7 L 5,-3 L 5,3 Z" fill="white" />
          </g>

          {/* 5. أيقونة الحرفي المتحركة (Artisan Marker) */}
          <g 
            className="transition-all duration-1000 ease-in-out cursor-pointer"
            style={{ transform: `translate(${current.x}px, ${current.y}px)` }}
          >
            {/* وميض نبضي أخضر عند مرحلة الصيانة النشطة */}
            {step === 3 && (
              <circle r="22" fill="none" stroke="#10b981" strokeWidth="2" className="animate-ping" opacity="0.8" />
            )}
            {/* خلفية الأيقونة */}
            <circle r="15" fill={step === 4 ? '#10b981' : '#0f172a'} className="shadow-lg border-2 border-white" />
            
            {/* رمز الفني داخل الدائرة */}
            {step === 4 ? (
              // علامة الصح الأخضر عند إنجاز الخدمة
              <path d="M -6,0 L -2,4 L 6,-4" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              // رمز الفني العادي (دراجة نارية / فني)
              <path d="M -5,2 C -5,-3 5,-3 5,2 Z M 0,-6 A 3,3 0 1,1 0,-12 A 3,3 0 1,1 0,-6" fill="white" />
            )}
          </g>
        </svg>

        {/* علامة نجاح خضراء تطفو فوق الخريطة عند الإنجاز */}
        {step === 4 && (
          <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-[1px] flex items-center justify-center animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-2xl px-4 py-2 shadow-xl flex items-center gap-2">
              <span className="text-emerald-500 font-extrabold text-sm">تم الإصلاح بنجاح! 🎉</span>
            </div>
          </div>
        )}
      </div>

      {/* الحالة اللفظية التفسيرية لخط سير الفني */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl flex items-center justify-between">
        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">حالة تتبع الأسطى</span>
          <strong className="text-xs text-brand-navy dark:text-brand-light block mt-0.5">
            {current.label}
          </strong>
        </div>
        <div className="text-left">
          <span className="text-[10px] font-bold text-brand-orange block">{artisanName}</span>
          <span className="text-[9px] font-bold text-slate-400 block mt-0.5">حدائق الأهرام 📍</span>
        </div>
      </div>
    </div>
  );
};
