/* Main Application Coordinator with Session Authentication & PWA routing */
import { initializeDatabase } from './db/seed.js';
import { TranslationEngine } from './utils/translate.js';
import { createAuditLog, sanitizeHTML } from './utils/security.js';
import { db } from './db/store.js';

export const translateEngine = new TranslationEngine("ar");

let customerModule = null;
let artisanModule = null;
let adminModule = null;

// Global Session State
export const AppState = {
  currentLayout: "split", 
  theme: "light",
  language: "ar",
  activeCustomerTab: "customer-home",
  activeArtisanTab: "artisan-home",
  activeAdminRole: "superadmin",
  session: null // User session details
};

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialise Simulated database (will seed if empty or AEAdmin is missing)
  initializeDatabase();
  
  // 2. Load configurations
  const savedSettings = JSON.parse(localStorage.getItem("harfagy_settings") || "{}");
  AppState.theme = savedSettings.theme || "light";
  AppState.language = savedSettings.language || "ar";
  
  applyTheme(AppState.theme);
  applyLanguage(AppState.language);
  
  initGlobalControls();
  
  // 3. Authenticated session router
  checkSession();
  
  // 4. Synchronize databases
  window.addEventListener('harfagy_db_update', (e) => {
    refreshUI(e.detail.collection);
  });
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('harfagy_db_')) {
      const collection = e.key.replace('harfagy_db_', '');
      refreshUI(collection);
    }
  });
});

/**
 * Checks for active user session and handles routing.
 */
export function checkSession() {
  const savedSession = localStorage.getItem("harfagy_session");
  const authContainer = document.getElementById("auth-container");
  const topHeader = document.querySelector(".top-header");
  const appContainer = document.getElementById("main-app-container");
  
  if (!savedSession) {
    // Show Authentication page, hide dashboards
    AppState.session = null;
    if (authContainer) {
      authContainer.style.display = "block";
      renderAuthPage(authContainer);
    }
    if (topHeader) topHeader.style.display = "none";
    if (appContainer) appContainer.style.display = "none";
  } else {
    // Logged in
    AppState.session = JSON.parse(savedSession);
    
    if (authContainer) authContainer.style.display = "none";
    if (appContainer) appContainer.style.display = "flex";
    
    // Set active username in global header
    const usernameLbl = document.getElementById("header-username-lbl");
    if (usernameLbl) {
      usernameLbl.textContent = AppState.session.name === "AEAdmin" 
        ? `المشرف: ${AppState.session.name}`
        : `المستخدم: ${AppState.session.name}`;
    }
    
    // Check if Super Admin AEAdmin is logged in
    if (AppState.session.name === "AEAdmin") {
      // AEAdmin has access to split-screen simulator and Admin controls
      if (topHeader) topHeader.style.display = "flex";
      updateLayout("split");
    } else {
      // Regular users: Hide the top global simulator header bar completely
      if (topHeader) topHeader.style.display = "none";
      
      // Redirect to their specific single-screen view (Customer or Artisan dashboard)
      if (AppState.session.role === "customer") {
        updateLayout("customer");
      } else if (AppState.session.role === "artisan") {
        updateLayout("artisan");
      } else {
        // Fallback for sub-admins
        updateLayout("admin");
      }
    }
  }
}

/**
 * Log out and clear session cache
 */
export function logoutUser() {
  const name = AppState.session?.name || "مستخدم";
  createAuditLog("تسجيل خروج", AppState.session?.role || "user", `تسجيل خروج للمستخدم ${name}`);
  
  localStorage.removeItem("harfagy_session");
  checkSession();
}

/**
 * Renders the Splash Landing, Login, and Registration views
 */
function renderAuthPage(container) {
  let isLoginMode = true;
  let selectedRole = "customer"; // customer, artisan

  const updateView = () => {
    container.innerHTML = isLoginMode ? renderLoginHtml() : renderRegisterHtml();
    bindAuthEvents();
  };

  const renderLoginHtml = () => `
    <div style="max-width: 400px; margin: 3rem auto; padding: 2rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 28px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); text-align: center; direction: rtl;">
      <span style="font-size: 3rem;">⚙️</span>
      <h2 style="font-weight: 800; color: var(--primary-orange); margin-bottom: 0.25rem;">حرفجي.مصر 🏠</h2>
      <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 1.5rem;">منصة الصيانة المنزلية الصفرية</p>
      
      <form id="auth-login-form" style="display:flex; flex-direction:column; gap:1rem; text-align: right;">
        <div>
          <label style="font-size:0.75rem; font-weight:700; display:block; margin-bottom:0.25rem;">اسم المستخدم أو رقم الهاتف</label>
          <input type="text" id="login-phone" required placeholder="مثال: 01011223344 أو AEAdmin" 
                 style="width:100%; padding:0.6rem; border-radius:10px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none;">
        </div>
        
        <div>
          <label style="font-size:0.75rem; font-weight:700; display:block; margin-bottom:0.25rem;">كلمة السر</label>
          <input type="password" id="login-password" required placeholder="••••••••" 
                 style="width:100%; padding:0.6rem; border-radius:10px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none;">
        </div>
        
        <button type="submit" class="btn-primary" style="margin-top:0.5rem; padding:0.6rem;">تسجيل الدخول 🚪</button>
      </form>
      
      <div style="margin-top: 1.25rem; font-size: 0.8rem; color: var(--text-muted);">
        ليس لديك حساب؟ 
        <a href="#" id="link-goto-register" style="color:var(--primary-orange); font-weight:700; text-decoration:none; margin-right:0.25rem;">إنشاء حساب جديد ➡️</a>
      </div>
    </div>
  `;

  const renderRegisterHtml = () => `
    <div style="max-width: 420px; margin: 2rem auto; padding: 2rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 28px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); direction: rtl; text-align: right;">
      <h2 style="font-weight: 800; color: var(--primary-orange); text-align: center; margin-bottom: 0.25rem;">إنشاء حساب جديد ✨</h2>
      <p style="font-size: 0.75rem; color: var(--text-muted); text-align: center; margin-bottom: 1.25rem;">انضم لمنصة حرفجي صيانة صفرية التكلفة</p>
      
      <!-- Role Toggle -->
      <div style="display:flex; background:var(--bg-app); padding:0.25rem; border-radius:12px; margin-bottom:1rem; border:1px solid var(--border-color);">
        <button type="button" class="btn-role-select" id="btn-role-customer" style="flex:1; border:none; padding:0.45rem; border-radius:8px; font-weight:700; font-size:0.75rem; cursor:pointer; background:${selectedRole === 'customer' ? 'var(--primary-orange)' : 'transparent'}; color:${selectedRole === 'customer' ? 'white' : 'var(--text-color)'};">أنا عميل (أبحث عن فني)</button>
        <button type="button" class="btn-role-select" id="btn-role-artisan" style="flex:1; border:none; padding:0.45rem; border-radius:8px; font-weight:700; font-size:0.75rem; cursor:pointer; background:${selectedRole === 'artisan' ? 'var(--primary-orange)' : 'transparent'}; color:${selectedRole === 'artisan' ? 'white' : 'var(--text-color)'};">أنا حرفي (أبحث عن عمل)</button>
      </div>

      <form id="auth-register-form" style="display:flex; flex-direction:column; gap:0.75rem;">
        <div>
          <label style="font-size:0.7rem; font-weight:700; display:block; margin-bottom:0.2rem;">الاسم الكامل</label>
          <input type="text" id="reg-name" required placeholder="مثال: أحمد محمد علي" 
                 style="width:100%; padding:0.5rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none; font-size:0.8rem;">
        </div>
        
        <div>
          <label style="font-size:0.7rem; font-weight:700; display:block; margin-bottom:0.2rem;">رقم الهاتف</label>
          <input type="tel" id="reg-phone" required placeholder="مثال: 01023456789" 
                 style="width:100%; padding:0.5rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none; font-size:0.8rem;">
        </div>

        <div>
          <label style="font-size:0.7rem; font-weight:700; display:block; margin-bottom:0.2rem;">البريد الإلكتروني</label>
          <input type="email" id="reg-email" required placeholder="example@mail.com" 
                 style="width:100%; padding:0.5rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none; font-size:0.8rem;">
        </div>

        <!-- Geographic Cascades Focus on Giza / Hadayek Al Ahram -->
        <div style="display:flex; gap:0.5rem;">
          <div style="flex:1;">
            <label style="font-size:0.65rem; font-weight:700;">المحافظة</label>
            <select id="reg-gov" style="width:100%; padding:0.45rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none; font-size:0.75rem;">
              <option value="الجيزة">الجيزة</option>
              <option value="القاهرة">القاهرة</option>
            </select>
          </div>
          <div style="flex:1;">
            <label style="font-size:0.65rem; font-weight:700;">الحي السكني</label>
            <select id="reg-district" style="width:100%; padding:0.45rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none; font-size:0.75rem;">
              <option value="حدائق الأهرام">حدائق الأهرام (البوابة)</option>
              <option value="الدقي">الدقي</option>
              <option value="المهندسين">المهندسين</option>
              <option value="الهرم">الهرم</option>
            </select>
          </div>
        </div>

        ${selectedRole === 'artisan' ? `
          <div>
            <label style="font-size:0.7rem; font-weight:700; display:block; margin-bottom:0.2rem;">تخصص الصيانة الأساسي</label>
            <select id="reg-artisan-category" style="width:100%; padding:0.5rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none; font-size:0.8rem;">
              <option value="plumber">سباك صيانة 🚰</option>
              <option value="electrician">كهربائي منازل ⚡</option>
              <option value="hvac">فني تكييفات ❄️</option>
              <option value="carpenter">نجار محترف 🪚</option>
            </select>
          </div>
        ` : ''}

        <div>
          <label style="font-size:0.7rem; font-weight:700; display:block; margin-bottom:0.2rem;">كلمة السر</label>
          <input type="password" id="reg-password" required placeholder="••••••••" 
                 style="width:100%; padding:0.5rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none; font-size:0.8rem;">
        </div>
        
        <button type="submit" class="btn-primary" style="margin-top:0.5rem; padding:0.55rem;">تسجيل الحساب 🚀</button>
      </form>
      
      <div style="margin-top: 1.25rem; font-size: 0.8rem; color: var(--text-muted); text-align: center;">
        لديك حساب بالفعل؟ 
        <a href="#" id="link-goto-login" style="color:var(--primary-orange); font-weight:700; text-decoration:none; margin-right:0.25rem;">سجل دخولك هنا ⬅️</a>
      </div>
    </div>
  `;

  const bindAuthEvents = () => {
    // Switch views
    document.getElementById("link-goto-register")?.addEventListener("click", (e) => {
      e.preventDefault();
      isLoginMode = false;
      updateView();
    });

    document.getElementById("link-goto-login")?.addEventListener("click", (e) => {
      e.preventDefault();
      isLoginMode = true;
      updateView();
    });

    // Toggle customer/artisan signup tab
    document.getElementById("btn-role-customer")?.addEventListener("click", () => {
      selectedRole = "customer";
      updateView();
    });

    document.getElementById("btn-role-artisan")?.addEventListener("click", () => {
      selectedRole = "artisan";
      updateView();
    });

    // Login Form Submit handler
    document.getElementById("auth-login-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const phoneInput = document.getElementById("login-phone").value.trim();
      const passwordInput = document.getElementById("login-password").value.trim();

      // Check Super Admin AEAdmin credentials
      if (phoneInput === "AEAdmin" && passwordInput === "Aa132456") {
        const adminSession = {
          id: "admin-system",
          name: "AEAdmin",
          phone: "AEAdmin",
          role: "superadmin",
          governorate: "الجيزة",
          district: "حدائق الأهرام"
        };
        localStorage.setItem("harfagy_session", JSON.stringify(adminSession));
        createAuditLog("تسجيل دخول المشرف العام", "superadmin", "تسجيل دخول المشرف العام AEAdmin محاكي الشاشات");
        checkSession();
        return;
      }

      // Check against seeded db users
      const users = db.getCollection("users");
      const user = users.find(u => u.phone === phoneInput && u.password === passwordInput);

      if (user) {
        localStorage.setItem("harfagy_session", JSON.stringify(user));
        createAuditLog("تسجيل دخول ناجح", user.role, `تسجيل دخول للمستخدم ${user.name}`);
        checkSession();
      } else {
        alert("❌ عذراً، رقم الهاتف أو كلمة السر غير صحيحة! يرجى مراجعة إعدادات Seeding أو إنشاء حساب جديد.");
      }
    });

    // Register Form Submit handler
    document.getElementById("auth-register-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const name = sanitizeHTML(document.getElementById("reg-name").value.trim());
      const phone = sanitizeHTML(document.getElementById("reg-phone").value.trim());
      const email = sanitizeHTML(document.getElementById("reg-email").value.trim());
      const gov = document.getElementById("reg-gov").value;
      const district = document.getElementById("reg-district").value;
      const password = document.getElementById("reg-password").value.trim();

      // Validation
      const users = db.getCollection("users");
      if (users.some(u => u.phone === phone)) {
        alert("رقم الهاتف هذا مسجل بالفعل بالمنصة!");
        return;
      }

      // Register User
      const userPayload = {
        name,
        phone,
        email,
        role: selectedRole,
        governorate: gov,
        district,
        password,
        referralCode: "REF" + Math.floor(1000 + Math.random() * 9000),
        wallet: selectedRole === "customer" ? 50 : 0, // Customer welcome bonus
        emailVerified: "pending",
        phoneVerified: "pending" // Admin verifies manually
      };

      const newUser = db.addDocument("users", userPayload);

      // If registered as artisan, create artisan profile record
      if (selectedRole === "artisan") {
        const cat = document.getElementById("reg-artisan-category").value;
        const artisanPayload = {
          userId: newUser.id,
          name: newUser.name,
          category: cat,
          rating: 5.0,
          ratingDetails: { quality: 5.0, timing: 5.0, politeness: 5.0 },
          completedJobs: 0,
          responseTime: "15 دقيقة",
          wallet: 0,
          commissionDue: 0,
          rank: "bronze",
          isOnline: true,
          bio: `فني صيانة متكامل في تخصص ${cat} صيانة بحدائق الأهرام.`,
          workHours: { start: "09:00", end: "21:00", offDays: ["الجمعة"] },
          discounts: [],
          gallery: [],
          verified: false, // Awaiting admin criminal records verification
          emailVerified: "pending",
          phoneVerified: "pending"
        };
        db.addDocument("artisans", artisanPayload);
      }

      alert("🎉 تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول للبدء بالخدمة. الهاتف قيد المراجعة الأمنية من الإدارة.");
      isLoginMode = true;
      updateView();
    });
  };

  updateView();
}

/**
 * Initializes upper global control bar buttons (Only active for AEAdmin)
 */
function initGlobalControls() {
  const btnSplit = document.getElementById("btn-layout-split");
  const btnCustomer = document.getElementById("btn-layout-customer");
  const btnArtisan = document.getElementById("btn-layout-artisan");
  const btnAdmin = document.getElementById("btn-layout-admin");
  const btnTheme = document.getElementById("btn-theme-toggle");
  const btnLang = document.getElementById("btn-lang-toggle");

  const btnLogoutHeader = document.getElementById("btn-logout-header");
  btnLogoutHeader?.addEventListener("click", () => {
    logoutUser();
  });

  const layoutButtons = [btnSplit, btnCustomer, btnArtisan, btnAdmin];
  
  const clearActiveLayoutButtons = () => {
    layoutButtons.forEach(btn => btn?.classList.remove("active"));
  };

  btnSplit?.addEventListener("click", () => {
    clearActiveLayoutButtons();
    btnSplit.classList.add("active");
    updateLayout("split");
  });

  btnCustomer?.addEventListener("click", () => {
    clearActiveLayoutButtons();
    btnCustomer.classList.add("active");
    updateLayout("customer");
  });

  btnArtisan?.addEventListener("click", () => {
    clearActiveLayoutButtons();
    btnArtisan.classList.add("active");
    updateLayout("artisan");
  });

  btnAdmin?.addEventListener("click", () => {
    clearActiveLayoutButtons();
    btnAdmin.classList.add("active");
    updateLayout("admin");
  });

  btnTheme?.addEventListener("click", () => {
    const newTheme = AppState.theme === "light" ? "dark" : "light";
    applyTheme(newTheme);
  });

  btnLang?.addEventListener("click", () => {
    const newLang = AppState.language === "ar" ? "en" : "ar";
    applyLanguage(newLang);
    btnLang.textContent = newLang === "ar" ? "🌐 EN" : "🌐 AR";
  });
}

/**
 * Switch layout modes
 */
async function updateLayout(layoutMode) {
  AppState.currentLayout = layoutMode;
  
  const splitLayout = document.getElementById("split-layout");
  const singleLayout = document.getElementById("single-layout");
  const singleWrapper = document.getElementById("single-content-wrapper");
  
  // Hide all first
  splitLayout.style.display = "none";
  singleLayout.style.display = "none";
  singleWrapper.style.display = "none";
  
  if (layoutMode === "split") {
    splitLayout.style.display = "flex";
    
    const customerScreen = document.getElementById("customer-screen");
    if (customerScreen) {
      if (!customerModule) {
        const { CustomerUI } = await import('./customer/ui.js');
        customerModule = new CustomerUI(customerScreen);
      } else {
        customerModule.setContainer(customerScreen);
      }
      customerModule.mount();
    }
    
    const artisanScreen = document.getElementById("artisan-screen");
    if (artisanScreen) {
      if (!artisanModule) {
        const { ArtisanUI } = await import('./artisan/ui.js');
        artisanModule = new ArtisanUI(artisanScreen);
      } else {
        artisanModule.setContainer(artisanScreen);
      }
      artisanModule.mount();
    }
  } else {
    // Single Full Width layout (responsive centered phone mockup)
    singleLayout.style.display = "flex";
    singleWrapper.style.display = "block";
    
    if (layoutMode === "customer") {
      if (!customerModule) {
        const { CustomerUI } = await import('./customer/ui.js');
        customerModule = new CustomerUI(singleWrapper);
      } else {
        customerModule.setContainer(singleWrapper);
      }
      customerModule.mount();
    } else if (layoutMode === "artisan") {
      if (!artisanModule) {
        const { ArtisanUI } = await import('./artisan/ui.js');
        artisanModule = new ArtisanUI(singleWrapper);
      } else {
        artisanModule.setContainer(singleWrapper);
      }
      artisanModule.mount();
    } else if (layoutMode === "admin") {
      if (!adminModule) {
        const { AdminUI } = await import('./admin/ui.js');
        adminModule = new AdminUI(singleWrapper);
      } else {
        adminModule.setContainer(singleWrapper);
      }
      adminModule.mount();
    }
  }
  
  translateEngine.translatePage();
}

/**
 * Refreshes components depending on database collection updates
 */
function refreshUI(collection) {
  if (customerModule && customerModule.isMounted) {
    customerModule.handleDbUpdate(collection);
  }
  if (artisanModule && artisanModule.isMounted) {
    artisanModule.handleDbUpdate(collection);
  }
  if (adminModule && adminModule.isMounted) {
    adminModule.handleDbUpdate(collection);
  }
}

/**
 * Changes active theme
 */
function applyTheme(theme) {
  AppState.theme = theme;
  const btnTheme = document.getElementById("btn-theme-toggle");
  
  if (theme === "dark") {
    document.body.classList.remove("light-mode");
    document.body.classList.add("dark-mode");
    if (btnTheme) btnTheme.textContent = "☀️";
  } else {
    document.body.classList.remove("dark-mode");
    document.body.classList.add("light-mode");
    if (btnTheme) btnTheme.textContent = "🌙";
  }
  
  const settings = JSON.parse(localStorage.getItem("harfagy_settings") || "{}");
  settings.theme = theme;
  localStorage.setItem("harfagy_settings", JSON.stringify(settings));
}

/**
 * Changes active language
 */
function applyLanguage(lang) {
  AppState.language = lang;
  translateEngine.setLanguage(lang);
  translateEngine.translatePage();
  
  if (customerModule && customerModule.isMounted) customerModule.render();
  if (artisanModule && artisanModule.isMounted) artisanModule.render();
  if (adminModule && adminModule.isMounted) adminModule.render();
  
  const settings = JSON.parse(localStorage.getItem("harfagy_settings") || "{}");
  settings.language = lang;
  localStorage.setItem("harfagy_settings", JSON.stringify(settings));
}
