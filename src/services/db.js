import { SUPABASE_CONFIG } from './config.js';
import { generateUUID } from '../utils/uuid.js';

let isSupabaseActive = false;
let supabase = null;

if (SUPABASE_CONFIG && SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    isSupabaseActive = true;
  } catch (err) {
    console.warn("Supabase initialization failed. Falling back to LocalStorage Mode.", err);
  }
}

// ----------------------------------------------------
// Seed Data definition for LocalStorage Mode
// ----------------------------------------------------
const SEED_DATA = {
  users: [
    { id: "cust-1", name: "أحمد صاوي", phone: "01011223344", role: "customer", governorate: "الجيزة", district: "حدائق الأهرام", referralCode: "SAWI50", wallet: 200, emailVerified: "pending", phoneVerified: "pending", password: "123456", email: "sawi.customer@gmail.com", custom_id: "U-0101" },
    { id: "cust-2", name: "منى ذكي", phone: "01233445566", role: "customer", governorate: "الجيزة", district: "الدقي", referralCode: "MONA50", wallet: 0, emailVerified: "verified", phoneVerified: "verified", password: "123456", email: "mona.zaki@gmail.com", custom_id: "U-0002" },
    { id: "cust-3", name: "شريف منير", phone: "01199887766", role: "customer", governorate: "الإسكندرية", district: "سموحة", referralCode: "SHERIF50", wallet: 0, emailVerified: "verified", phoneVerified: "verified", password: "123456", email: "sherif.monir@gmail.com", custom_id: "U-0003" },
    { id: "admin-financial", name: "أماني كمال", phone: "01099991111", role: "auditor", governorate: "الجيزة", district: "المهندسين", password: "123456", email: "amani.finance@harfagy.com", custom_id: "MF-0001" },
    { id: "admin-security", name: "شريف عادل", phone: "01099992222", role: "security", governorate: "الجيزة", district: "حدائق الأهرام", password: "123456", email: "sherif.security@harfagy.com", custom_id: "MS-0001" },
    { id: "admin-super", name: "سليم المصري", phone: "01099993333", role: "superadmin", governorate: "الجيزة", district: "حدائق الأهرام", password: "123456", email: "selim.ceo@harfagy.com", custom_id: "MG-0001" },
    { id: "admin-system", name: "أحمد عزالدين", phone: "AEAdmin", role: "superadmin", governorate: "الجيزة", district: "حدائق الأهرام", password: "Aa132456", emailVerified: "verified", phoneVerified: "verified", email: "admin@harfagy.com", custom_id: "MG-0303" },
    { id: "art-1-user", name: "شريف رفعت", phone: "01198765432", role: "artisan", governorate: "الجيزة", district: "حدائق الأهرام", password: "123456", email: "sherif.refat@gmail.com", custom_id: "AT-0202", category: "hvac" },
    { id: "art-2-user", name: "أحمد رأفت", phone: "01201234567", role: "artisan", governorate: "الجيزة", district: "حدائق الأهرام", password: "123456", email: "raafat.electro@gmail.com", custom_id: "AK-0001", category: "electrician" },
    { id: "art-3-user", name: "فرج الله عثمان", phone: "01101234567", role: "artisan", governorate: "الجيزة", district: "حدائق الأهرام", password: "123456", email: "faraj.hvac@gmail.com", custom_id: "AT-0001", category: "hvac" },
    { id: "art-4-user", name: "سيد النجار", phone: "01501234567", role: "artisan", governorate: "الجيزة", district: "الهرم", password: "123456", email: "sayed.wood@gmail.com", custom_id: "AN-0001", category: "carpenter" }
  ],
  artisans: [
    { id: "art-1", userId: "art-1-user", name: "شريف رفعت", category: "hvac", rating: 4.8, completedJobs: 142, responseTime: "15 دقيقة", wallet: 3200, commissionDue: 480, rank: "golden", isOnline: true, bio: "خبرة 15 عاماً في صيانة شبكات التكييف والتبريد بحدائق الأهرام وحل مشاكل الفريون.", workHours: { start: "09:00", end: "21:00", offDays: ["الجمعة"] }, discounts: [{ code: "REFAT20", rate: 20, desc: "خصم 20% على أول صيانة تكييف" }], gallery: [], verified: true, emailVerified: "verified", phoneVerified: "verified", custom_id: "AT-0202" },
    { id: "art-2", userId: "art-2-user", name: "أحمد رأفت", category: "electrician", rating: 4.9, completedJobs: 98, responseTime: "20 دقيقة", wallet: 1850, commissionDue: 270, rank: "silver", isOnline: true, bio: "مهندس كهربائي متخصص في صيانة أعطال الكهرباء المنزلية واللوحات الذكية وتمديد الكابلات بحدائق الأهرام.", workHours: { start: "10:00", end: "22:00", offDays: ["الأحد"] }, discounts: [], gallery: [], verified: true, emailVerified: "verified", phoneVerified: "verified", custom_id: "AK-0001" },
    { id: "art-3", userId: "art-3-user", name: "فرج الله عثمان", category: "hvac", rating: 4.6, completedJobs: 75, responseTime: "30 دقيقة", wallet: 940, commissionDue: 140, rank: "bronze", isOnline: false, bio: "شحن فريون وغسيل تكييفات وصيانة أعطال الكروت بحدائق الأهرام والهرم.", workHours: { start: "08:00", end: "20:00", offDays: ["الجمعة"] }, discounts: [], gallery: [], verified: true, emailVerified: "pending", phoneVerified: "pending", custom_id: "AT-0001" },
    { id: "art-4", userId: "art-4-user", name: "سيد النجار", category: "carpenter", rating: 4.2, completedJobs: 30, responseTime: "45 دقيقة", wallet: 450, commissionDue: 60, rank: "bronze", isOnline: true, bio: "فك وتركيب غرف النوم والستائر وتصليح المطابخ الخشبية.", workHours: { start: "10:00", end: "20:00", offDays: ["الجمعة"] }, discounts: [], gallery: [], verified: false, emailVerified: "pending", phoneVerified: "pending", custom_id: "AN-0001" }
  ],
  jobs: [
    { id: "job-hist-1", customerId: "cust-1", customerName: "أحمد صاوي", customerPhone: "01011223344", artisanId: "art-1", artisanName: "شريف رفعت", category: "hvac", description: "شحن فريون للتكييف بالبوابة الرابعة حدائق الأهرام.", preferredDate: "2026-06-25", paymentMethod: "cash", status: "completed", price: 250, vat: 12.5, commission: 37.5, totalPrice: 300, isRated: true, createdAt: new Date(Date.now() - 6 * 86400000).toISOString() }
  ],
  messages: [
    { id: "msg-1", jobId: "job-hist-1", senderId: "cust-1", receiverId: "art-1-user", text: "يا مهندس شريف، أنا في حدائق الأهرام البوابة الرابعة، هل أنت قريب؟", timestamp: new Date(Date.now() - 6 * 86400000 + 1000).toISOString() },
    { id: "msg-2", jobId: "job-hist-1", senderId: "art-1-user", receiverId: "cust-1", text: "تمام يا فندم، أنا عند البوابة الثانية حالياً وعشر دقائق وأكون عند حضرتك.", timestamp: new Date(Date.now() - 6 * 86400000 + 60000).toISOString() }
  ],
  complaints: [
    { id: "comp-1", jobId: "job-hist-1", customerId: "cust-1", customerName: "أحمد صاوي", artisanId: "art-1", artisanName: "شريف رفعت", type: "نزاع مالي", details: "طلب زيادة مصنعية للانتقال داخل حدائق الأهرام.", status: "resolved", resolution: "تم التواصل وديا وإعادة المبلغ للعميل في محفظته وحفظ الشكوى.", createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), custom_complaint_id: "C-0001" }
  ],
  verifications: [
    { id: "ver-1", artisanId: "art-4", artisanName: "سيد النجار", documentType: "الفيش الجنائي وبطاقة الرقم القومي", submittedAt: new Date(Date.now() - 86400000).toISOString(), status: "pending", filePreview: "criminal_record_sayed.jpg" }
  ],
  withdrawals: [
    { id: "wd-1", artisanId: "art-1", amount: 1200, method: "Vodafone Cash", details: "01001234567", status: "completed", timestamp: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: "wd-2", artisanId: "art-2", amount: 800, method: "InstaPay", details: "hanielectro@instapay", status: "pending", timestamp: new Date(Date.now() - 12000000).toISOString() }
  ],
  audit_logs: []
};

// ----------------------------------------------------
// Unified Database Access Layer
// ----------------------------------------------------
class DualModeDatabase {
  constructor() {
    this.listeners = new Set();
    this.initLocalStorage();
  }

  initLocalStorage() {
    for (const key of Object.keys(SEED_DATA)) {
      const dbKey = `harfagy_db_${key}`;
      if (!localStorage.getItem(dbKey)) {
        localStorage.setItem(dbKey, JSON.stringify(SEED_DATA[key]));
      }
    }
  }

  // Get Supabase active status
  isOnline() {
    return isSupabaseActive;
  }

  // Notify listeners of data updates
  notify(collection) {
    const event = new CustomEvent("harfagy_db_update", { detail: { collection } });
    window.dispatchEvent(event);
    this.listeners.forEach(callback => callback(collection));
  }

  // Subscribe to changes
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Retrieve entire collection (Table)
  async getCollection(collectionName) {
    if (isSupabaseActive) {
      try {
        const { data, error } = await supabase
          .from(collectionName)
          .select('*');
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn(`Supabase read failed for ${collectionName}. Falling back to LocalStorage.`, err);
      }
    }
    return JSON.parse(localStorage.getItem(`harfagy_db_${collectionName}`) || "[]");
  }

  // Retrieve single document by ID
  async getDocument(collectionName, docId) {
    if (isSupabaseActive) {
      try {
        const { data, error } = await supabase
          .from(collectionName)
          .select('*')
          .eq('id', docId)
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn(`Supabase read failed for ${collectionName}:${docId}. Falling back to LocalStorage.`, err);
      }
    }
    const collection = await this.getCollection(collectionName);
    return collection.find(doc => doc.id === docId) || null;
  }

  // خوارزمية توليد كود تعريفي رقمي فريد ومقيد (Custom Unique ID System)
  async generateCustomUserId(payload) {
    let prefix = "";
    if (payload.role === 'customer') {
      prefix = "U-";
    } else if (payload.role === 'artisan') {
      const category = payload.category || 'plumber';
      const categoryMapping = {
        plumber: 'S',
        electrician: 'K',
        hvac: 'T',
        carpenter: 'N',
        painter: 'D',
        appliances: 'H'
      };
      const code = categoryMapping[category] || 'S';
      prefix = `A${code}-`;
    } else if (payload.role === 'admin' || payload.role === 'superadmin' || payload.role === 'auditor' || payload.role === 'security') {
      let roleCode = "G";
      if (payload.role === 'auditor') roleCode = "F";
      else if (payload.role === 'security') roleCode = "S";
      prefix = `M${roleCode}-`;
    } else {
      prefix = "U-";
    }

    const allUsers = await this.getCollection("users");
    const matchingIds = allUsers
      .map(u => u.custom_id)
      .filter(id => id && id.startsWith(prefix));

    let maxNum = 0;
    matchingIds.forEach(id => {
      const parts = id.split("-");
      if (parts[1]) {
        const numPart = parseInt(parts[1], 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });

    const nextNum = maxNum + 1;
    const paddedNum = String(nextNum).padStart(4, '0');
    return `${prefix}${paddedNum}`;
  }

  // Create new document (Insert Row)
  async addDocument(collectionName, payload) {
    // توليد الهوية الرقمية للعملاء والحرفيين والمسؤولين تلقائياً عند التسجيل
    if (collectionName === 'users' && !payload.custom_id) {
      payload.custom_id = await this.generateCustomUserId(payload);
    }

    // توليد هوية تذكرة الشكوى الفريدة C-XXXX
    if (collectionName === 'complaints' && !payload.custom_complaint_id) {
      const allComplaints = await this.getCollection("complaints");
      let maxNum = 0;
      allComplaints.forEach(c => {
        const idStr = c.custom_complaint_id;
        if (idStr && idStr.startsWith("C-")) {
          const numPart = parseInt(idStr.split("-")[1], 10);
          if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
        }
      });
      const nextNum = maxNum + 1;
      payload.custom_complaint_id = `C-${String(nextNum).padStart(4, '0')}`;
    }

    const newDoc = {
      id: payload.id || generateUUID(),
      ...payload,
      createdAt: payload.createdAt || new Date().toISOString()
    };

    if (isSupabaseActive) {
      try {
        const { data, error } = await supabase
          .from(collectionName)
          .insert([newDoc])
          .select();
        if (error) throw error;
        this.notify(collectionName);
        return data[0];
      } catch (err) {
        console.warn(`Supabase write failed for ${collectionName}. Falling back to LocalStorage.`, err);
      }
    }

    // LocalStorage fallback
    const collection = await this.getCollection(collectionName);
    collection.push(newDoc);
    localStorage.setItem(`harfagy_db_${collectionName}`, JSON.stringify(collection));
    this.notify(collectionName);
    return newDoc;
  }

  // Update existing document (Update Row)
  async updateDocument(collectionName, docId, updates) {
    if (isSupabaseActive) {
      try {
        const { data, error } = await supabase
          .from(collectionName)
          .update(updates)
          .eq('id', docId)
          .select();
        if (error) throw error;
        this.notify(collectionName);
        return data[0];
      } catch (err) {
        console.warn(`Supabase update failed for ${collectionName}:${docId}. Falling back to LocalStorage.`, err);
      }
    }

    // LocalStorage fallback
    const collection = await this.getCollection(collectionName);
    const index = collection.findIndex(doc => doc.id === docId);
    if (index !== -1) {
      collection[index] = { ...collection[index], ...updates };
      localStorage.setItem(`harfagy_db_${collectionName}`, JSON.stringify(collection));
      this.notify(collectionName);
      return collection[index];
    }
    return null;
  }

  // Delete document (Delete Row)
  async deleteDocument(collectionName, docId) {
    if (isSupabaseActive) {
      try {
        const { error } = await supabase
          .from(collectionName)
          .delete()
          .eq('id', docId);
        if (error) throw error;
        this.notify(collectionName);
        return true;
      } catch (err) {
        console.warn(`Supabase delete failed for ${collectionName}:${docId}. Falling back to LocalStorage.`, err);
      }
    }

    // LocalStorage fallback
    const collection = await this.getCollection(collectionName);
    const filtered = collection.filter(doc => doc.id !== docId);
    localStorage.setItem(`harfagy_db_${collectionName}`, JSON.stringify(filtered));
    this.notify(collectionName);
    return true;
  }

  // Query utility helper
  async query(collectionName, filterFunc) {
    const list = await this.getCollection(collectionName);
    return list.filter(filterFunc);
  }
}

export const db = new DualModeDatabase();

const makeCollectionHelper = (collectionName) => ({
  getAll: () => db.getCollection(collectionName),
  get: (id) => db.getDocument(collectionName, id),
  create: (data) => db.addDocument(collectionName, data),
  update: (id, data) => db.updateDocument(collectionName, id, data),
  delete: (id) => db.deleteDocument(collectionName, id)
});

db.users = makeCollectionHelper("users");
db.artisans = makeCollectionHelper("artisans");
db.jobs = makeCollectionHelper("jobs");
db.messages = makeCollectionHelper("messages");
db.complaints = makeCollectionHelper("complaints");
db.verifications = makeCollectionHelper("verifications");
db.withdrawals = makeCollectionHelper("withdrawals");
db.audit_logs = makeCollectionHelper("audit_logs");

// Custom chat helpers for db.messages to support real-time sync
db.messages.getByJob = async (jobId) => {
  const allMsgs = await db.getCollection("messages");
  return allMsgs.filter(m => m.jobId === jobId).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

db.messages.send = async (jobIdOrPayload, senderId, receiverId, text) => {
  let payload;
  if (typeof jobIdOrPayload === 'object' && jobIdOrPayload !== null) {
    payload = {
      jobId: jobIdOrPayload.job_id || jobIdOrPayload.jobId,
      senderId: jobIdOrPayload.sender_id || jobIdOrPayload.senderId,
      receiverId: jobIdOrPayload.receiver_id || jobIdOrPayload.receiverId,
      text: jobIdOrPayload.text,
      timestamp: jobIdOrPayload.timestamp || new Date().toISOString()
    };
  } else {
    payload = {
      jobId: jobIdOrPayload,
      senderId,
      receiverId,
      text
    };
  }
  return await db.addDocument("messages", payload);
};

db.messages.subscribe = (jobId, callback) => {
  let lastCount = 0;
  db.messages.getByJob(jobId).then(list => { lastCount = list.length; });

  const handler = (eventCollection) => {
    if (eventCollection === "messages") {
      db.messages.getByJob(jobId).then(list => {
        if (list.length > lastCount) {
          const newMsg = list[list.length - 1];
          lastCount = list.length;
          callback(newMsg);
        }
      });
    }
  };
  db.subscribe(handler);

  let channel = null;
  if (db.isOnline() && supabase) {
    channel = supabase
      .channel(`public:messages:job_id=eq.${jobId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${jobId}` },
        (payload) => {
          const newMsg = {
            id: payload.new.id,
            jobId: payload.new.job_id,
            senderId: payload.new.sender_id,
            receiverId: payload.new.receiver_id,
            text: payload.new.text,
            timestamp: payload.new.timestamp
          };
          callback(newMsg);
        }
      )
      .subscribe();
  }

  const unsubscribe = () => {
    db.listeners.delete(handler);
    if (channel) {
      supabase.removeChannel(channel);
    }
  };

  return {
    unsubscribe
  };
};
