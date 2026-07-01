/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // تفعيل نمط الدعم الليلي الذكي
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#f97316',   // البرتقالي الدافئ لتمثيل الطاقة والعمل اليدوي
          navy: '#0f172a',     // الأزرق الداكن للثقة والأمان والمشرفين
          slate: '#1e293b',    // درجات خلفيات النمط الداكن المعتمدة
          emerald: '#10b981',  // الأخضر لإدارة المدفوعات والنجاح المالي
          rose: '#f43f5e',     // الأحمر للشكاوى، التنبيهات، وحالات الحظر
          amber: '#f59e0b',    // الأصفر للتقييم والنجوم والعروض النشطة
          light: '#f8fafc',    // خلفية عامة فاتحة مريحة للعين
        }
      },
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'], // خط الهوية الرسمي المعتمد من Google Fonts
      },
    },
  },
  plugins: [],
}
