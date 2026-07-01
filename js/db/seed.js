/* Database Seeds for Egyptian Governorate Districts & Default Mock Users */
import { db } from './store.js';

export const EgyptianGeography = {
  "الجيزة": ["حدائق الأهرام", "الدقي", "المهندسين", "الهرم", "6 أكتوبر", "الشيخ زايد"],
  "القاهرة": ["مصر الجديدة", "مدينة نصر", "المعادي", "التجمع الخامس", "شبرا"],
  "الإسكندرية": ["سموحة", "المنتزه", "العجمي", "سيدي بشر"]
};

export const ArtisanCategories = [
  { id: "plumber", nameAr: "سباك", nameEn: "Plumber", icon: "🚰" },
  { id: "electrician", nameAr: "كهربائي", nameEn: "Electrician", icon: "⚡" },
  { id: "hvac", nameAr: "فني تكييف", nameEn: "AC Technician", icon: "❄️" },
  { id: "carpenter", nameAr: "نجار", nameEn: "Carpenter", icon: "🪚" }
];

export function initializeDatabase() {
  const users = db.getCollection("users");
  const hasAEAdmin = users.some(u => u.name === "AEAdmin");
  const hasRealisticUsers = users.some(u => u.name === "عبد الرحمن الشافعي");
  
  if (users.length === 0 || !hasAEAdmin || !hasRealisticUsers) {
    localStorage.removeItem("harfagy_db_users");
    localStorage.removeItem("harfagy_db_artisans");
    localStorage.removeItem("harfagy_db_jobs");
    localStorage.removeItem("harfagy_db_messages");
    localStorage.removeItem("harfagy_db_complaints");
    localStorage.removeItem("harfagy_db_verifications");
    localStorage.removeItem("harfagy_db_withdrawals");
    localStorage.removeItem("harfagy_supabase_migrated");
    seedDatabase();
  }
}

function seedDatabase() {
  console.log("Seeding Database...");
  
  // 1. Seed System Users (Customers & Supervisors)
  const users = [
    // Customers (Focusing on Hadayek Al Ahram Giza as launch zone)
    { id: "cust-1", name: "كريم فهمي", phone: "01011223344", role: "customer", governorate: "الجيزة", district: "حدائق الأهرام", referralCode: "KAREEM50", wallet: 50, emailVerified: "pending", phoneVerified: "pending", password: "123456" },
    { id: "cust-2", name: "منى ذكي", phone: "01233445566", role: "customer", governorate: "الجيزة", district: "الدقي", referralCode: "MONA50", wallet: 0, emailVerified: "verified", phoneVerified: "verified", password: "123456" },
    { id: "cust-3", name: "شريف منير", phone: "01199887766", role: "customer", governorate: "الإسكندرية", district: "سموحة", referralCode: "SHERIF50", wallet: 0, emailVerified: "verified", phoneVerified: "verified", password: "123456" },
    
    // Supervisors / Admins
    { id: "admin-financial", name: "أماني كمال", phone: "01099991111", role: "auditor", governorate: "الجيزة", district: "المهندسين", password: "123456" },
    { id: "admin-security", name: "شريف عادل", phone: "01099992222", role: "security", governorate: "الجيزة", district: "حدائق الأهرام", password: "123456" },
    { id: "admin-super", name: "سليم المصري", phone: "01099993333", role: "superadmin", governorate: "الجيزة", district: "حدائق الأهرام", password: "123456" },
    
    // Super Admin Special Account
    { id: "admin-system", name: "AEAdmin", phone: "AEAdmin", role: "superadmin", governorate: "الجيزة", district: "حدائق الأهرام", password: "Aa132456", emailVerified: "verified", phoneVerified: "verified" },
    
    // Artisans
    { id: "art-1-user", name: "عبد الرحمن الشافعي", phone: "01001234567", role: "artisan", governorate: "الجيزة", district: "حدائق الأهرام", password: "123456" },
    { id: "art-2-user", name: "أحمد رأفت", phone: "01201234567", role: "artisan", governorate: "الجيزة", district: "حدائق الأهرام", password: "123456" },
    { id: "art-3-user", name: "فرج الله عثمان", phone: "01101234567", role: "artisan", governorate: "الجيزة", district: "حدائق الأهرام", password: "123456" },
    { id: "art-4-user", name: "سيد النجار", phone: "01501234567", role: "artisan", governorate: "الجيزة", district: "الهرم", password: "123456" }
  ];
  db.saveCollection("users", users);

  const artisans = [
    {
      id: "art-1",
      userId: "art-1-user",
      name: "عبد الرحمن الشافعي",
      category: "plumber",
      rating: 4.8,
      ratingDetails: { quality: 4.9, timing: 4.7, politeness: 4.8 },
      completedJobs: 142,
      responseTime: "15 دقيقة",
      wallet: 3200,
      commissionDue: 480,
      rank: "golden",
      isOnline: true,
      bio: "خبرة 15 عاماً في صيانة شبكات السباكة بحدائق الأهرام وحل مشاكل التسريبات بأحدث الأجهزة.",
      workHours: { start: "09:00", end: "21:00", offDays: ["الجمعة"] },
      discounts: [
        { code: "SHAFIQ20", rate: 20, desc: "خصم 20% على كشف السباكة الأول" }
      ],
      gallery: [],
      verified: true,
      emailVerified: "verified",
      phoneVerified: "verified"
    },
    {
      id: "art-2",
      userId: "art-2-user",
      name: "أحمد رأفت",
      category: "electrician",
      rating: 4.9,
      ratingDetails: { quality: 5.0, timing: 4.8, politeness: 4.9 },
      completedJobs: 98,
      responseTime: "20 دقيقة",
      wallet: 1850,
      commissionDue: 270,
      rank: "silver",
      isOnline: true,
      bio: "مهندس كهربائي متخصص في صيانة أعطال الكهرباء المنزلية واللوحات الذكية وتمديد الكابلات بحدائق الأهرام.",
      workHours: { start: "10:00", end: "22:00", offDays: ["الأحد"] },
      discounts: [],
      gallery: [],
      verified: true,
      emailVerified: "verified",
      phoneVerified: "verified"
    },
    {
      id: "art-3",
      userId: "art-3-user",
      name: "فرج الله عثمان",
      category: "hvac",
      rating: 4.6,
      ratingDetails: { quality: 4.5, timing: 4.5, politeness: 4.8 },
      completedJobs: 75,
      responseTime: "30 دقيقة",
      wallet: 940,
      commissionDue: 140,
      rank: "bronze",
      isOnline: false,
      bio: "شحن فريون وغسيل تكييفات وصيانة أعطال الكروت بحدائق الأهرام والهرم.",
      workHours: { start: "08:00", end: "20:00", offDays: ["الجمعة"] },
      discounts: [],
      gallery: [],
      verified: true,
      emailVerified: "pending",
      phoneVerified: "pending"
    },
    {
      id: "art-4",
      userId: "art-4-user",
      name: "سيد النجار",
      category: "carpenter",
      rating: 4.2,
      ratingDetails: { quality: 4.0, timing: 4.1, politeness: 4.5 },
      completedJobs: 30,
      responseTime: "45 دقيقة",
      wallet: 450,
      commissionDue: 60,
      rank: "bronze",
      isOnline: true,
      bio: "فك وتركيب غرف النوم والستائر وتصليح المطابخ الخشبية.",
      workHours: { start: "10:00", end: "20:00", offDays: ["الجمعة"] },
      discounts: [],
      gallery: [],
      verified: false,
      emailVerified: "pending",
      phoneVerified: "pending"
    }
  ];
  db.saveCollection("artisans", artisans);

  // 3. Seed Document Verifications Queue for Unverified Artisans
  const verifications = [
    {
      id: "ver-1",
      artisanId: "art-4",
      artisanName: "سيد النجار",
      documentType: "الفيش الجنائي وبطاقة الرقم القومي",
      submittedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      status: "pending",
      filePreview: "criminal_record_sayed.jpg"
    }
  ];
  db.saveCollection("verifications", verifications);

  // 4. Seed Payout/Withdrawal History Ledger
  const withdrawals = [
    { id: "wd-1", artisanId: "art-1", amount: 1200, method: "Vodafone Cash", details: "01001234567", status: "completed", timestamp: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: "wd-2", artisanId: "art-2", amount: 800, method: "InstaPay", details: "hanielectro@instapay", status: "pending", timestamp: new Date(Date.now() - 12000000).toISOString() }
  ];
  db.saveCollection("withdrawals", withdrawals);

  // 5. Seed Historical Jobs
  const jobs = [
    {
      id: "job-hist-1",
      customerId: "cust-1",
      customerName: "كريم فهمي",
      customerPhone: "01011223344",
      artisanId: "art-1",
      artisanName: "عبد الرحمن الشافعي",
      category: "plumber",
      description: "تصليح خلاط مياه في البوابة الرابعة حدائق الأهرام.",
      preferredDate: "2026-06-25",
      paymentMethod: "cash",
      status: "completed",
      price: 250,
      vat: 12.5, // 5% VAT
      commission: 37.5, // 15% Platform Commission
      totalPrice: 300,
      isRated: true,
      createdAt: new Date(Date.now() - 6 * 86400000).toISOString()
    }
  ];
  db.saveCollection("jobs", jobs);

  // 6. Seed Messages (Chat Logs)
  const messages = [
    { id: "msg-1", jobId: "job-hist-1", senderId: "cust-1", receiverId: "art-1-user", text: "يا أستاذ عبد الرحمن، أنا في حدائق الأهرام البوابة الرابعة، هل أنت قريب؟", timestamp: new Date(Date.now() - 6 * 86400000 + 1000).toISOString() },
    { id: "msg-2", jobId: "job-hist-1", senderId: "art-1-user", receiverId: "cust-1", text: "تمام يا فندم، أنا عند البوابة الثانية حالياً وعشر دقائق وأكون عند حضرتك.", timestamp: new Date(Date.now() - 6 * 86400000 + 60000).toISOString() }
  ];
  db.saveCollection("messages", messages);

  // 7. Seed Complaints
  const complaints = [
    {
      id: "comp-1",
      jobId: "job-hist-1",
      customerId: "cust-1",
      customerName: "كريم فهمي",
      artisanId: "art-1",
      artisanName: "عبد الرحمن الشافعي",
      type: "نزاع مالي",
      details: "طلب زيادة مصنعية للانتقال داخل حدائق الأهرام.",
      status: "resolved",
      resolution: "تم التواصل وديا وإعادة المبلغ للعميل في محفظته وحفظ الشكوى.",
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
    }
  ];
  db.saveCollection("complaints", complaints);

  // 8. Seed Audit Logs
  const auditLogs = [
    { id: "log-seed-1", timestamp: new Date(Date.now() - 10 * 86400000).toISOString(), action: "تهيئة قاعدة البيانات للنسخة التجريبية (حدائق الأهرام)", role: "superadmin", details: "تركيز الجغرافيا على محافظة الجيزة ومنطقة حدائق الأهرام", ip: "192.168.1.1", userAgent: "System Server (Internal)" }
  ];
  localStorage.setItem("audit_logs", JSON.stringify(auditLogs));

  // 9. Initial Global Settings
  const settings = {
    theme: "light",
    language: "ar",
    splitScreen: true,
    inspectionFeePlumber: 50,
    inspectionFeeElectrician: 60,
    inspectionFeeHvac: 80,
    inspectionFeeCarpenter: 50
  };
  localStorage.setItem("harfagy_settings", JSON.stringify(settings));

  console.log("Seeding Completed Successfully.");
}
