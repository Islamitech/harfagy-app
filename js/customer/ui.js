/* Customer View Controller and Dynamic Renderer */
import { db } from '../db/store.js';
import { translateEngine } from '../app.js';
import { sanitizeHTML } from '../utils/security.js';

export class CustomerUI {
  constructor(container) {
    this.container = container;
    this.isMounted = false;
    
    // UI state
    this.activeTab = "customer-home"; // customer-home, customer-orders, customer-favorites, customer-complaints
    this.selectedCategory = "all";
    this.searchQuery = "";
    this.selectedGovernorate = "الجيزة";
    this.selectedDistrict = "حدائق الأهرام";
    
    // Filters
    this.filterRating = false;
    this.filterPrice = false;
    this.filterOnline = false;
    
    // Dynamic tracking state
    this.activeOrderId = null;
    this.mapAnimationTimer = null;
    this.artisanPosition = 0; // 0 to 100 percentage along path

    // Load active session dynamically to avoid hardcoded IDs
    const session = JSON.parse(localStorage.getItem("harfagy_session") || "{}");
    this.customerId = session.role === "customer" ? session.id : "cust-1";
    this.customerName = session.role === "customer" ? session.name : "كريم فهمي";
    this.customerPhone = session.role === "customer" ? session.phone : "01011223344";
  }

  setContainer(newContainer) {
    this.container = newContainer;
  }

  mount() {
    this.isMounted = true;
    this.render();
    this.bindEvents();
    this.bindTabNavigation();
  }

  handleDbUpdate(collection) {
    if (!this.isMounted) return;
    console.log("Customer UI refreshing due to DB changes in collection:", collection);
    this.render();
    this.bindEvents();
    this.bindTabNavigation();
  }

  render() {
    // Generate view based on activeTab
    let contentHtml = "";
    
    switch (this.activeTab) {
      case "customer-home":
        contentHtml = this.renderHomeView();
        break;
      case "customer-orders":
        contentHtml = this.renderOrdersView();
        break;
      case "customer-favorites":
        contentHtml = this.renderFavoritesView();
        break;
      case "customer-complaints":
        contentHtml = this.renderComplaintsView();
        break;
      case "customer-profile":
        contentHtml = this.renderProfileView();
        break;
    }
    
    this.container.innerHTML = `
      <div class="customer-wrapper animate-slide" style="display:flex; flex-direction:column; height:100%;">
        <div style="flex:1; overflow-y:auto; overflow-x:hidden; display:flex; flex-direction:column;">
          ${contentHtml}
        </div>
        
        <!-- Bottom Nav Bar -->
        <div class="phone-nav-bar" id="customer-nav-bar">
          <div class="phone-nav-item ${this.activeTab === 'customer-home' ? 'active' : ''}" data-tab="customer-home">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span data-i18n="nav-home">الرئيسية</span>
          </div>
          <div class="phone-nav-item ${this.activeTab === 'customer-orders' ? 'active' : ''}" data-tab="customer-orders">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><circle x="12" y="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span data-i18n="nav-orders">طلباتي</span>
          </div>
          <div class="phone-nav-item ${this.activeTab === 'customer-favorites' ? 'active' : ''}" data-tab="customer-favorites">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span data-i18n="nav-favorites">المفضلة</span>
          </div>
          <div class="phone-nav-item ${this.activeTab === 'customer-complaints' ? 'active' : ''}" data-tab="customer-complaints">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span data-i18n="nav-complaints">الدعم</span>
          </div>
          <div class="phone-nav-item ${this.activeTab === 'customer-profile' ? 'active' : ''}" data-tab="customer-profile">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" y="7" r="4"/></svg>
            <span data-i18n="nav-profile">حسابي</span>
          </div>
        </div>
      </div>
      <!-- Booking Wizard Modal Mount point -->
      <div id="booking-modal-container"></div>
      <!-- Detail Profile Modal Mount point -->
      <div id="profile-modal-container"></div>
    `;
  }

  renderHomeView() {
    const categories = [
      { id: "all", name: "الكل", icon: "🔍" },
      { id: "plumber", name: "سباكة", icon: "🚰" },
      { id: "electrician", name: "كهرباء", icon: "⚡" },
      { id: "hvac", name: "تكييف", icon: "❄️" },
      { id: "carpenter", name: "نجارة", icon: "🪚" }
    ];

    const artisans = this.getFilteredArtisans();
    const favorites = JSON.parse(localStorage.getItem("customer_favorites") || "[]");

    let categoriesHtml = categories.map(cat => `
      <div class="category-pill ${this.selectedCategory === cat.id ? 'active' : ''}" data-category="${cat.id}">
        <span style="font-size:1.5rem;">${cat.icon}</span>
        <span class="category-label">${cat.name}</span>
      </div>
    `).join("");

    let artisansHtml = artisans.length > 0 ? artisans.map(art => {
      const isFav = favorites.includes(art.id);
      return `
        <div class="artisan-card animate-slide" data-artisan-id="${art.id}">
          <button class="favorite-btn ${isFav ? 'active' : ''}" data-fav-id="${art.id}" title="إضافة للمفضلة">
            ❤️
          </button>
          
          <div class="artisan-card-header ${art.isOnline ? 'online' : 'offline'}">
            <div class="artisan-avatar-container">
              <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=${art.name}" class="artisan-avatar" alt="${art.name}">
              <span class="status-dot ${art.isOnline ? 'online' : 'offline'}"></span>
            </div>
            
            <div class="artisan-info">
              <div class="artisan-name">
                ${art.name}
                ${art.verified ? '<span class="badge badge-emerald" style="padding:0.1rem 0.3rem; font-size:0.55rem;">✔️ موثق</span>' : ''}
              </div>
              <div class="artisan-title">${this.getCategoryName(art.category)} - ${art.bio.substring(0, 30)}...</div>
            </div>
            
            <div class="rating-badge">
              ⭐ <span>${art.rating}</span>
            </div>
          </div>

          <div class="artisan-card-stats">
            <div class="stat-item">
              <span class="stat-label">مستوى رتبة</span>
              <span class="stat-val badge ${this.getRankBadgeClass(art.rank)}">${this.getRankName(art.rank)}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">المحافظة / الحي</span>
              <span class="stat-val" style="color:var(--primary-orange);">${art.workHours ? 'نشط' : 'إجازة'}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">الطلبات المنجزة</span>
              <span class="stat-val">${art.completedJobs} خدمة</span>
            </div>
          </div>
          
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;">
            <div style="font-size:0.75rem; font-weight:700;">
              💵 رسوم الكشف: <span style="color:var(--emerald); font-size:0.9rem;">${this.getCategoryPrice(art.category)} ج.م</span>
            </div>
            <button class="btn-primary btn-book-wizard" data-art-id="${art.id}" style="padding:0.35rem 0.75rem; font-size:0.75rem; border-radius:8px;">
              احجز الآن ➡️
            </button>
          </div>
        </div>
      `;
    }).join("") : `
      <div style="text-align:center; padding:3rem 1rem; color:var(--text-muted);">
        <p style="font-size:3rem; margin-bottom:1rem;">🔍</p>
        <p style="font-weight:700; font-size:0.9rem;" data-i18n="no-artisans">لا يوجد حرفيين مطابقين في منطقتك الجغرافية حالياً.</p>
      </div>
    `;

    return `
      <!-- Search Banner -->
      <div class="customer-header">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <h2 style="font-weight:800; font-size:1.1rem; color:var(--primary-navy);">ابحث عن فني صيانة 🏠</h2>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <div style="font-size: 0.7rem; font-weight:700; color:var(--emerald); cursor:pointer;" id="customer-referral-btn">
              🎁 إحالات
            </div>
            <button id="btn-logout-trigger-cust" style="background:transparent; border:none; cursor:pointer; font-size:1.15rem; outline:none;" title="تسجيل الخروج">
              🚪
            </button>
          </div>
        </div>
        
        <div class="search-box-container">
          <span>🔍</span>
          <input type="text" class="search-input" id="cust-search-input" value="${this.searchQuery}" placeholder="ابحث بالاسم أو التخصص..." data-i18n="search-placeholder">
        </div>
        
        <!-- Geographic Filters Dropdown mimicking GPS -->
        <div style="display:flex; gap:0.5rem;">
          <div style="flex:1;">
            <label style="font-size:0.6rem; font-weight:700; color:var(--text-muted);">المحافظة</label>
            <select id="select-gov" style="width:100%; font-size:0.75rem; padding:0.25rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-color); outline:none;">
              <option value="القاهرة" ${this.selectedGovernorate === "القاهرة" ? "selected" : ""}>القاهرة</option>
              <option value="الجيزة" ${this.selectedGovernorate === "الجيزة" ? "selected" : ""}>الجيزة</option>
              <option value="الإسكندرية" ${this.selectedGovernorate === "الإسكندرية" ? "selected" : ""}>الإسكندرية</option>
            </select>
          </div>
          <div style="flex:1;">
            <label style="font-size:0.6rem; font-weight:700; color:var(--text-muted);">الحي السكني (GPS دقيق)</label>
            <select id="select-district" style="width:100%; font-size:0.75rem; padding:0.25rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-color); outline:none;">
              <option value="الكل">كل الأحياء</option>
              ${this.getDistrictsForGov(this.selectedGovernorate).map(dist => `
                <option value="${dist}" ${this.selectedDistrict === dist ? "selected" : ""}>${dist}</option>
              `).join("")}
            </select>
          </div>
        </div>
      </div>
      
      <!-- Category slider bar -->
      <div class="categories-slider">
        ${categoriesHtml}
      </div>
      
      <!-- Filters options -->
      <div class="filter-row">
        <div class="filter-badge ${this.filterRating ? 'active' : ''}" id="filter-btn-rating">⭐ 4.5+</div>
        <div class="filter-badge ${this.filterPrice ? 'active' : ''}" id="filter-btn-price">💵 سعر اقتصادي</div>
        <div class="filter-badge ${this.filterOnline ? 'active' : ''}" id="filter-btn-online">🟢 متصل الآن</div>
      </div>
      
      <!-- Artisan lists content -->
      <div class="artisan-list" style="flex:1; overflow-y:auto;">
        ${artisansHtml}
      </div>
    `;
  }

  renderOrdersView() {
    const jobs = db.query("jobs", job => job.customerId === this.customerId);
    
    let jobsHtml = jobs.length > 0 ? jobs.map(job => `
      <div class="verification-ticket" style="border-right: 4px solid ${this.getJobStatusColor(job.status)};" data-job-id="${job.id}">
        <div class="ticket-header">
          <span>طلب #${job.id.substring(0, 8)}</span>
          <span class="badge" style="background:${this.getJobStatusBg(job.status)}; color:${this.getJobStatusColor(job.status)};">
            ${this.getJobStatusName(job.status)}
          </span>
        </div>
        
        <div class="ticket-body">
          <strong style="color:var(--text-color);">${job.artisanName}</strong> (${this.getCategoryName(job.category)})<br>
          <span style="font-size:0.7rem; color:var(--text-muted);">${job.description}</span><br>
          <small>📅 موعد الزيارة: ${job.preferredDate}</small>
        </div>
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.3rem;">
          <span style="font-size:0.75rem; font-weight:700;">المبلغ: ${job.price || 'لم يحدد'} ج.م</span>
          
          <div style="display:flex; gap:0.5rem;">
            ${job.status === "completed" && !job.isRated ? `
              <button class="btn-primary btn-rate-job" data-job-rate="${job.id}" style="padding:0.25rem 0.5rem; font-size:0.65rem; background:var(--amber);">⭐ تقييم الخدمة</button>
            ` : ''}
            
            ${['accepted', 'onway', 'arrived'].includes(job.status) ? `
              <button class="btn-primary btn-track-job" data-job-track="${job.id}" style="padding:0.25rem 0.5rem; font-size:0.65rem;">📍 تتبع بالفيديو والموقع</button>
            ` : ''}
            
            ${job.status === "completed" ? `
              <button class="btn-secondary btn-receipt-job" data-job-rec="${job.id}" style="padding:0.25rem 0.5rem; font-size:0.65rem;">🧾 فاتورة رقمية</button>
            ` : ''}
            
            <button class="btn-secondary btn-chat-job" data-job-chat="${job.id}" data-artisan-user-id="${this.getArtisanUserId(job.artisanId)}" style="padding:0.25rem 0.5rem; font-size:0.65rem;">💬 دردشة حية</button>
          </div>
        </div>
      </div>
    `).join("") : `
      <div style="text-align:center; padding:4rem 1rem; color:var(--text-muted);">
        <p style="font-size:3rem; margin-bottom:1rem;">🛠️</p>
        <p style="font-weight:700; font-size:0.9rem;">ليس لديك أي طلبات صيانة حالية أو سابقة.</p>
      </div>
    `;

    return `
      <div class="customer-header">
        <h2 style="font-weight:800; font-size:1.1rem;">سجل طلبات الصيانة الخاصة بي 🗒️</h2>
        <p style="font-size:0.7rem; color:var(--text-muted);">تتبع حالة الصيانة الحية وحل النزاعات مع الفنيين هنا</p>
      </div>
      
      <div style="flex:1; overflow-y:auto; padding:1rem;" id="orders-list-container">
        ${jobsHtml}
      </div>
    `;
  }

  renderFavoritesView() {
    const favorites = JSON.parse(localStorage.getItem("customer_favorites") || "[]");
    const artisans = db.getCollection("artisans").filter(art => favorites.includes(art.id));
    
    let listHtml = artisans.length > 0 ? artisans.map(art => `
      <div class="artisan-card animate-slide" data-artisan-id="${art.id}">
        <button class="favorite-btn active" data-fav-id="${art.id}">❤️</button>
        <div class="artisan-card-header ${art.isOnline ? 'online' : 'offline'}">
          <div class="artisan-avatar-container">
            <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=${art.name}" class="artisan-avatar" alt="${art.name}">
            <span class="status-dot ${art.isOnline ? 'online' : 'offline'}"></span>
          </div>
          <div class="artisan-info">
            <div class="artisan-name">${art.name}</div>
            <div class="artisan-title">${this.getCategoryName(art.category)}</div>
          </div>
          <div class="rating-badge">⭐ <span>${art.rating}</span></div>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;">
          <span style="font-size:0.75rem; color:var(--text-muted);">${art.bio.substring(0, 40)}...</span>
          <button class="btn-primary btn-book-wizard" data-art-id="${art.id}" style="padding:0.35rem 0.75rem; font-size:0.75rem;">احجز الآن</button>
        </div>
      </div>
    `).join("") : `
      <div style="text-align:center; padding:4rem 1rem; color:var(--text-muted);">
        <p style="font-size:3rem; margin-bottom:1rem;">❤️</p>
        <p style="font-weight:700; font-size:0.9rem;">قائمتك المفضلة فارغة حالياً. يمكنك إضافة الحرفيين المميزين للوصول السريع.</p>
      </div>
    `;

    return `
      <div class="customer-header">
        <h2 style="font-weight:800; font-size:1.1rem;">الفنيين المفضلين لدي ⭐️</h2>
        <p style="font-size:0.7rem; color:var(--text-muted);">حفظ محلي لأسرع الحرفيين للوصول إليهم بضغطة زر</p>
      </div>
      <div style="flex:1; overflow-y:auto; padding:1rem;">
        ${listHtml}
      </div>
    `;
  }

  renderComplaintsView() {
    const complaints = db.query("complaints", c => c.customerId === this.customerId);
    
    let complaintsHtml = complaints.length > 0 ? complaints.map(c => `
      <div class="verification-ticket" style="border-right:3px solid ${c.status === 'resolved' ? 'var(--emerald)' : 'var(--rose)'};">
        <div class="ticket-header">
          <span>شكوى #${c.id.substring(0,6)}</span>
          <span class="badge ${c.status === 'resolved' ? 'badge-emerald' : 'badge-rose'}">
            ${c.status === 'resolved' ? 'تم الحل ودياً' : 'قيد المراجعة الإدارية'}
          </span>
        </div>
        <div class="ticket-body">
          <strong>الفني المشكو ضده:</strong> ${c.artisanName}<br>
          <strong>المشكلة:</strong> ${c.details}<br>
          ${c.resolution ? `<div style="background:var(--bg-app); padding:0.4rem; border-radius:6px; margin-top:0.3rem; border-right:2px solid var(--emerald);"><strong>قرار التسوية:</strong> ${c.resolution}</div>` : ''}
        </div>
      </div>
    `).join("") : '';

    return `
      <div class="customer-header">
        <h2 style="font-weight:800; font-size:1.1rem;">مركز الدعم وحل النزاعات 🛡️</h2>
        <p style="font-size:0.7rem; color:var(--text-muted);">ارفع شكوى في حال عدم التزام الفني بالاتفاق المالي أو الفني</p>
      </div>
      
      <div style="flex:1; overflow-y:auto; padding:1rem;">
        <div class="referral-share-card" style="border-color:var(--rose); background:rgba(244, 63, 94, 0.05); margin-top:0;">
          <p style="font-size:0.8rem; font-weight:700; color:var(--rose); margin-bottom:0.5rem;">🚨 هل تواجه مشكلة مالية أو فنية مع فني؟</p>
          <button class="btn-primary" id="btn-raise-complaint" style="background:var(--rose); font-size:0.75rem; padding:0.4rem 1rem;">تقديم شكوى رسمية للإدارة</button>
        </div>
        
        <h3 style="font-size:0.85rem; font-weight:700; margin:1rem 0 0.5rem 0;">الشكاوى السابقة وتتبعها</h3>
        ${complaintsHtml || '<p style="font-size:0.7rem; color:var(--text-muted); text-align:center; padding:1.5rem 0;">لا يوجد شكاوى سابقة مسجلة.</p>'}
      </div>
    `;
  }

  renderProfileView() {
    const session = JSON.parse(localStorage.getItem("harfagy_session") || "{}");
    const wallet = session.wallet || 0;
    
    // Verification alerts
    const showEmailAlert = session.emailVerified === "pending";
    const showWhatsAppAlert = session.phoneVerified === "pending";
    
    let alertsHtml = "";
    if (showEmailAlert) {
      alertsHtml += `
        <div class="verification-alert" id="email-verification-alert" style="background:rgba(245, 158, 11, 0.08); border:1px solid var(--amber); padding:1rem; border-radius:18px; text-align:right; margin-bottom: 0.5rem;">
          <strong style="font-size:0.75rem; color:var(--amber);">📧 تأكيد البريد الإلكتروني معلق!</strong>
          <p style="font-size:0.65rem; color:var(--text-muted); margin-top:0.2rem;">يرجى تأكيد بريدك الإلكتروني لتلقي إشعارات الحجز والفواتير الرسمية.</p>
          <button class="btn-primary" id="btn-verify-email" style="margin-top:0.5rem; padding:0.35rem 0.75rem; font-size:0.7rem; background:var(--amber); border:none; border-radius:8px; color:white; cursor:pointer;">أرسل رمز تفعيل البريد</button>
        </div>
      `;
    }
    if (showWhatsAppAlert) {
      alertsHtml += `
        <div class="verification-alert" id="whatsapp-verification-alert" style="background:rgba(16, 185, 129, 0.08); border:1px solid var(--emerald); padding:1rem; border-radius:18px; text-align:right; margin-bottom: 0.5rem;">
          <strong style="font-size:0.75rem; color:var(--emerald);">🟢 تأكيد الواتساب معلق!</strong>
          <p style="font-size:0.65rem; color:var(--text-muted); margin-top:0.2rem;">يرجى ربط وتأكيد حساب الواتساب الخاص بك لتلقي تحديثات صيانة منزلك فورياً.</p>
          <button class="btn-primary" id="btn-verify-whatsapp" style="margin-top:0.5rem; padding:0.35rem 0.75rem; font-size:0.7rem; background:var(--emerald); border:none; border-radius:8px; color:white; cursor:pointer;">تأكيد عبر الواتساب الآن</button>
        </div>
      `;
    }
    
    return `
      <div class="customer-header">
        <h2 style="font-weight:800; font-size:1.1rem;">الملف الشخصي للمستخدم 👤</h2>
        <p style="font-size:0.7rem; color:var(--text-muted);">عرض بيانات حسابك وإدارة المحفظة وتسجيل الخروج</p>
      </div>
      
      <div style="flex:1; overflow-y:auto; padding:1.5rem; display:flex; flex-direction:column; gap:1.25rem;">
        
        <!-- Alerts -->
        ${alertsHtml}

        <!-- Profile Card -->
        <div style="background:var(--bg-card); border:1px solid var(--border-color); padding:1.25rem; border-radius:18px; text-align:center;">
          <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=${session.name || 'حرفجي'}" style="width:72px; height:72px; border-radius:50%; border:3px solid var(--primary-orange); margin-bottom:0.5rem;">
          <h3 style="font-weight:800; font-size:1rem; color:var(--text-color);">${session.name || 'مستخدم حرفجي'}</h3>
          <span style="font-size:0.7rem; color:var(--primary-orange); font-weight:700;">عميل موثق 🛡️</span>
        </div>

        <!-- Details List -->
        <div style="background:var(--bg-card); border:1px solid var(--border-color); padding:1rem; border-radius:18px; display:flex; flex-direction:column; gap:0.75rem;">
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
            <span style="color:var(--text-muted);">رقم الهاتف</span>
            <strong style="color:var(--text-color);">${session.phone || 'غير مسجل'}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
            <span style="color:var(--text-muted);">البريد الإلكتروني</span>
            <strong style="color:var(--text-color);">${session.email || 'غير مسجل'}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
            <span style="color:var(--text-muted);">المنطقة الجغرافية</span>
            <strong style="color:var(--text-color);">${session.governorate || 'الجيزة'} - ${session.district || 'حدائق الأهرام'}</strong>
          </div>
        </div>

        <!-- Wallet Card -->
        <div style="background:linear-gradient(135deg, var(--primary-navy), #1e293b); color:white; padding:1.25rem; border-radius:18px; text-align:center; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
          <span style="font-size:0.65rem; text-transform:uppercase; letter-spacing:1px; opacity:0.8;">رصيد المحفظة النشط</span>
          <h2 style="font-size:1.8rem; font-weight:800; margin:0.25rem 0; color:var(--primary-orange);">${wallet} ج.م</h2>
          <div style="font-size:0.65rem; opacity:0.7;">سيتم خصم رسوم الكشوف القادمة من رصيدك تلقائياً.</div>
        </div>

        <!-- Referral Link -->
        <div style="background:var(--bg-card); border:1px dashed var(--primary-orange); padding:1rem; border-radius:18px; text-align:center;">
          <span style="font-size:0.7rem; font-weight:700; color:var(--primary-orange); display:block; margin-bottom:0.25rem;">🎁 كود الإحالة الخاص بك</span>
          <code style="font-size:1rem; font-weight:800; color:var(--text-color); letter-spacing:1px;">${session.referralCode || 'REF100'}</code>
          <span style="font-size:0.6rem; color:var(--text-muted); display:block; margin-top:0.25rem;">شاركه مع أصدقائك للحصول على 50 ج.م رصيد فوري.</span>
        </div>

        <!-- Big Red Logout Button -->
        <button id="btn-profile-logout" style="width:100%; padding:0.75rem; font-size:0.85rem; font-weight:700; border-radius:14px; border:none; background:var(--rose); color:white; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.5rem; box-shadow:0 4px 6px -1px rgba(244,63,94,0.2);">
          🚪 تسجيل الخروج من الحساب
        </button>
      </div>
    `;
  }

  /* Helper utilities */
  getFilteredArtisans() {
    let list = db.getCollection("artisans");
    
    // Category filter
    if (this.selectedCategory !== "all") {
      list = list.filter(art => art.category === this.selectedCategory);
    }
    
    // Search query
    if (this.searchQuery.trim() !== "") {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(art => art.name.toLowerCase().includes(q) || this.getCategoryName(art.category).includes(q));
    }
    
    // Geographic filter
    const users = db.getCollection("users");
    list = list.filter(art => {
      const user = users.find(u => u.id === art.userId);
      if (!user) return false;
      
      const matchGov = user.governorate === this.selectedGovernorate;
      const matchDist = this.selectedDistrict === "الكل" || user.district === this.selectedDistrict;
      return matchGov && matchDist;
    });

    // Rating star filter (4.5+)
    if (this.filterRating) {
      list = list.filter(art => art.rating >= 4.5);
    }
    
    // Price filter (inspection fees <= 50)
    if (this.filterPrice) {
      list = list.filter(art => this.getCategoryPrice(art.category) <= 50);
    }
    
    // Online filter
    if (this.filterOnline) {
      list = list.filter(art => art.isOnline);
    }

    return list;
  }

  getDistrictsForGov(gov) {
    const geo = {
      "القاهرة": ["مصر الجديدة", "مدينة نصر", "المعادي", "التجمع الخامس", "شبرا"],
      "الجيزة": ["الدقي", "المهندسين", "الهرم", "6 أكتوبر", "الشيخ زايد"],
      "الإسكندرية": ["سموحة", "مصر الجديدة (الرمل)", "المنتزه", "العجمي", "سيدي بشر"]
    };
    return geo[gov] || [];
  }

  getCategoryName(cat) {
    const names = { plumber: "سباك صيانة", electrician: "كهربائي منازل", hvac: "فني تكييفات", carpenter: "نجار محترف" };
    return names[cat] || cat;
  }

  getCategoryPrice(cat) {
    const prices = { plumber: 50, electrician: 60, hvac: 80, carpenter: 50 };
    return prices[cat] || 50;
  }

  getRankName(rank) {
    const ranks = { golden: "ذهبي 🥇", silver: "فضي 🥈", bronze: "برونزي 🥉" };
    return ranks[rank] || rank;
  }

  getRankBadgeClass(rank) {
    const classes = { golden: "badge-amber", silver: "badge-navy", bronze: "badge-orange" };
    return classes[rank] || "badge-orange";
  }

  getJobStatusColor(status) {
    const colors = { pending: "var(--amber)", accepted: "#3b82f6", onway: "#8b5cf6", arrived: "var(--primary-orange)", completed: "var(--emerald)", disputed: "var(--rose)" };
    return colors[status] || "gray";
  }
  
  getJobStatusBg(status) {
    const colors = { pending: "rgba(245, 158, 11, 0.1)", accepted: "rgba(59, 130, 246, 0.1)", onway: "rgba(139, 92, 246, 0.1)", arrived: "rgba(249, 115, 22, 0.1)", completed: "rgba(16, 185, 129, 0.1)", disputed: "rgba(244, 63, 94, 0.1)" };
    return colors[status] || "rgba(0,0,0,0.05)";
  }

  getJobStatusName(status) {
    const names = { pending: "بانتظار الفني", accepted: "تم القبول", onway: "الفني في الطريق", arrived: "قيد الصيانة الآن", completed: "تم الإنجاز بنجاح", disputed: "نزاع مفتوح" };
    return names[status] || status;
  }

  getArtisanUserId(artisanId) {
    const art = db.getDocument("artisans", artisanId);
    return art ? art.userId : null;
  }

  /* Event Bindings */
  bindEvents() {
    // Logout action
    document.getElementById("btn-logout-trigger-cust")?.addEventListener("click", () => {
      import('../app.js').then(app => app.logoutUser());
    });
    
    // Profile tab logout action
    document.getElementById("btn-profile-logout")?.addEventListener("click", () => {
      import('../app.js').then(app => app.logoutUser());
    });
    
    // Verify Email Trigger
    document.getElementById("btn-verify-email")?.addEventListener("click", () => {
      alert("📧 تم إرسال رمز التأكيد المكون من 6 أرقام إلى بريدك الإلكتروني.");
      const code = prompt("يرجى إدخال رمز التأكيد المكون من 6 أرقام (أدخل أي أرقام للمحاكاة):");
      if (code) {
        db.updateDocument("users", this.customerId, { emailVerified: "verified" });
        const session = JSON.parse(localStorage.getItem("harfagy_session") || "{}");
        session.emailVerified = "verified";
        localStorage.setItem("harfagy_session", JSON.stringify(session));
        alert("🎉 تم تأكيد البريد الإلكتروني بنجاح!");
        this.render();
        this.bindEvents();
        this.bindTabNavigation();
      }
    });

    // Verify WhatsApp Trigger
    document.getElementById("btn-verify-whatsapp")?.addEventListener("click", () => {
      alert("🟢 تم إرسال رمز تأكيد الواتساب إلى رقم هاتفك.");
      const code = prompt("يرجى إدخال رمز التأكيد المرسل لك عبر الواتساب (أدخل أي أرقام للمحاكاة):");
      if (code) {
        db.updateDocument("users", this.customerId, { phoneVerified: "verified" });
        const session = JSON.parse(localStorage.getItem("harfagy_session") || "{}");
        session.phoneVerified = "verified";
        localStorage.setItem("harfagy_session", JSON.stringify(session));
        alert("🎉 تم ربط وتوثيق حساب الواتساب بنجاح!");
        this.render();
        this.bindEvents();
        this.bindTabNavigation();
      }
    });

    // Search input event
    const searchInput = document.getElementById("cust-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value;
        this.refreshArtisansListOnly();
      });
    }

    // Category pills events
    const pills = this.container.querySelectorAll(".category-pill");
    pills.forEach(pill => {
      pill.addEventListener("click", () => {
        pills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        this.selectedCategory = pill.getAttribute("data-category");
        this.refreshArtisansListOnly();
      });
    });

    // Gov district select change triggers GPS filter
    const selectGov = document.getElementById("select-gov");
    const selectDist = document.getElementById("select-district");
    
    selectGov?.addEventListener("change", (e) => {
      this.selectedGovernorate = e.target.value;
      this.selectedDistrict = "الكل";
      // Update District options
      if (selectDist) {
        selectDist.innerHTML = `<option value="الكل">كل الأحياء</option>` + 
          this.getDistrictsForGov(this.selectedGovernorate).map(dist => `<option value="${dist}">${dist}</option>`).join("");
      }
      this.refreshArtisansListOnly();
    });

    selectDist?.addEventListener("change", (e) => {
      this.selectedDistrict = e.target.value;
      this.refreshArtisansListOnly();
    });

    // Filtering options
    const fRating = document.getElementById("filter-btn-rating");
    fRating?.addEventListener("click", () => {
      this.filterRating = !this.filterRating;
      fRating.classList.toggle("active", this.filterRating);
      this.refreshArtisansListOnly();
    });

    const fPrice = document.getElementById("filter-btn-price");
    fPrice?.addEventListener("click", () => {
      this.filterPrice = !this.filterPrice;
      fPrice.classList.toggle("active", this.filterPrice);
      this.refreshArtisansListOnly();
    });

    const fOnline = document.getElementById("filter-btn-online");
    fOnline?.addEventListener("click", () => {
      this.filterOnline = !this.filterOnline;
      fOnline.classList.toggle("active", this.filterOnline);
      this.refreshArtisansListOnly();
    });

    // Open detail profile modal click
    const cards = this.container.querySelectorAll(".artisan-card");
    cards.forEach(card => {
      card.addEventListener("click", (e) => {
        // Stop if clicked inside booking buttons or favorite buttons
        if (e.target.closest('.favorite-btn') || e.target.closest('.btn-book-wizard')) return;
        const id = card.getAttribute("data-artisan-id");
        this.openArtisanProfile(id);
      });
    });

    // Add favorites action click
    const favButtons = this.container.querySelectorAll(".favorite-btn");
    favButtons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-fav-id");
        this.toggleFavorite(id);
      });
    });

    // Open booking wizard buttons
    const bookButtons = this.container.querySelectorAll(".btn-book-wizard");
    bookButtons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-art-id");
        this.openBookingWizard(id);
      });
    });

    // Referral system info click
    document.getElementById("customer-referral-btn")?.addEventListener("click", () => {
      alert("[حرفجي - كود الإحالة التسويقي 🎁]\n\nشارك كود الدعوة الخاص بك 'KAREEM50' مع أصدقائك. عند قيامهم بحجز أول طلب صيانة منجز، سيحصل صديقك على كود كشف مجاني وستحصل أنت على 50 ج.م رصيد فوري يضاف لمحفظتك!");
    });

    // Support complaints trigger
    document.getElementById("btn-raise-complaint")?.addEventListener("click", () => {
      this.openComplaintsModal();
    });

    // Order items interactive links: track, receipt, rate, chat
    this.container.querySelectorAll(".btn-track-job").forEach(btn => {
      btn.addEventListener("click", () => {
        const jobId = btn.getAttribute("data-job-track");
        this.openTrackingModal(jobId);
      });
    });

    this.container.querySelectorAll(".btn-receipt-job").forEach(btn => {
      btn.addEventListener("click", () => {
        const jobId = btn.getAttribute("data-job-rec");
        this.openReceiptModal(jobId);
      });
    });

    this.container.querySelectorAll(".btn-rate-job").forEach(btn => {
      btn.addEventListener("click", () => {
        const jobId = btn.getAttribute("data-job-rate");
        this.openRateModal(jobId);
      });
    });

    this.container.querySelectorAll(".btn-chat-job").forEach(btn => {
      btn.addEventListener("click", () => {
        const jobId = btn.getAttribute("data-job-chat");
        const partnerUserId = btn.getAttribute("data-artisan-user-id");
        this.openChatModal(jobId, partnerUserId);
      });
    });
  }

  bindTabNavigation() {
    const navItems = this.container.querySelectorAll("#customer-nav-bar .phone-nav-item");
    navItems.forEach(item => {
      item.addEventListener("click", () => {
        this.activeTab = item.getAttribute("data-tab");
        this.render();
        this.bindEvents();
        this.bindTabNavigation();
      });
    });
  }

  refreshArtisansListOnly() {
    const container = this.container.querySelector(".artisan-list");
    if (!container) return;
    
    const artisans = this.getFilteredArtisans();
    const favorites = JSON.parse(localStorage.getItem("customer_favorites") || "[]");

    container.innerHTML = artisans.length > 0 ? artisans.map(art => {
      const isFav = favorites.includes(art.id);
      return `
        <div class="artisan-card animate-slide" data-artisan-id="${art.id}">
          <button class="favorite-btn ${isFav ? 'active' : ''}" data-fav-id="${art.id}">❤️</button>
          <div class="artisan-card-header ${art.isOnline ? 'online' : 'offline'}">
            <div class="artisan-avatar-container">
              <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=${art.name}" class="artisan-avatar" alt="${art.name}">
              <span class="status-dot ${art.isOnline ? 'online' : 'offline'}"></span>
            </div>
            <div class="artisan-info">
              <div class="artisan-name">
                ${art.name}
                ${art.verified ? '<span class="badge badge-emerald" style="padding:0.1rem 0.3rem; font-size:0.55rem;">✔️ موثق</span>' : ''}
              </div>
              <div class="artisan-title">${this.getCategoryName(art.category)} - ${art.bio.substring(0, 30)}...</div>
            </div>
            <div class="rating-badge">⭐ <span>${art.rating}</span></div>
          </div>
          <div class="artisan-card-stats">
            <div class="stat-item">
              <span class="stat-label">مستوى رتبة</span>
              <span class="stat-val badge ${this.getRankBadgeClass(art.rank)}">${this.getRankName(art.rank)}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">المحافظة / الحي</span>
              <span class="stat-val" style="color:var(--primary-orange);">${art.workHours ? 'نشط' : 'إجازة'}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">الطلبات المنجزة</span>
              <span class="stat-val">${art.completedJobs} خدمة</span>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;">
            <div style="font-size:0.75rem; font-weight:700;">
              💵 رسوم الكشف: <span style="color:var(--emerald); font-size:0.9rem;">${this.getCategoryPrice(art.category)} ج.م</span>
            </div>
            <button class="btn-primary btn-book-wizard" data-art-id="${art.id}" style="padding:0.35rem 0.75rem; font-size:0.75rem; border-radius:8px;">
              احجز الآن ➡️
            </button>
          </div>
        </div>
      `;
    }).join("") : `
      <div style="text-align:center; padding:3rem 1rem; color:var(--text-muted);">
        <p style="font-size:3rem; margin-bottom:1rem;">🔍</p>
        <p style="font-weight:700; font-size:0.9rem;">لا يوجد حرفيين مطابقين في منطقتك الجغرافية حالياً.</p>
      </div>
    `;

    // Re-bind details click on newly loaded cards
    container.querySelectorAll(".artisan-card").forEach(card => {
      card.addEventListener("click", (e) => {
        if (e.target.closest('.favorite-btn') || e.target.closest('.btn-book-wizard')) return;
        const id = card.getAttribute("data-artisan-id");
        this.openArtisanProfile(id);
      });
    });

    container.querySelectorAll(".favorite-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleFavorite(btn.getAttribute("data-fav-id"));
      });
    });

    container.querySelectorAll(".btn-book-wizard").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.openBookingWizard(btn.getAttribute("data-art-id"));
      });
    });
  }

  toggleFavorite(artisanId) {
    let favorites = JSON.parse(localStorage.getItem("customer_favorites") || "[]");
    if (favorites.includes(artisanId)) {
      favorites = favorites.filter(id => id !== artisanId);
    } else {
      favorites.push(artisanId);
    }
    localStorage.setItem("customer_favorites", JSON.stringify(favorites));
    this.render();
    this.bindEvents();
  }

  /* Booking Wizard logic */
  openBookingWizard(artisanId) {
    const artisan = db.getDocument("artisans", artisanId);
    if (!artisan) return;

    const modalContainer = document.getElementById("booking-modal-container");
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-overlay open" id="booking-wizard-modal">
        <div class="modal-content">
          <div class="modal-header">
            <span class="modal-title">احجز مع: ${artisan.name}</span>
            <button class="modal-close" id="close-booking-wizard">&times;</button>
          </div>
          
          <div class="wizard-steps">
            <div class="wizard-step-node active" id="node-1">1</div>
            <div class="wizard-step-node" id="node-2">2</div>
            <div class="wizard-step-node" id="node-3">3</div>
          </div>
          
          <form id="booking-form" style="display:flex; flex-direction:column; gap:1rem;">
            <!-- STEP 1: Describe trouble -->
            <div class="wizard-panel" id="panel-1">
              <label style="font-weight:700; font-size:0.85rem;">وصف العطل بالتفصيل 🛠️</label>
              <textarea id="booking-description" required placeholder="مثال: هناك تسريب مستمر تحت حوض المطبخ مما يؤدي لتجمع المياه، أرجو إحضار خلاط مياه إيطالي..." 
                        style="width:100%; height:90px; padding:0.5rem; border-radius:10px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none; font-size:0.8rem;"></textarea>
              
              <div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top:1rem;">
                <button type="button" class="btn-primary" id="btn-booking-step1" style="font-size:0.8rem; padding:0.4rem 1rem;">التالي ⬅️</button>
              </div>
            </div>
            
            <!-- STEP 2: Preferred Time -->
            <div class="wizard-panel" id="panel-2" style="display:none;">
              <label style="font-weight:700; font-size:0.85rem;">موعد الزيارة المفضل 📅</label>
              <input type="date" id="booking-date-val" required min="${new Date().toISOString().split('T')[0]}"
                     style="width:100%; padding:0.5rem; border-radius:10px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none; font-size:0.8rem;">
              
              <div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top:1rem;">
                <button type="button" class="btn-secondary" id="btn-back-step2" style="font-size:0.8rem; padding:0.4rem 1rem;">السابق</button>
                <button type="button" class="btn-primary" id="btn-booking-step2" style="font-size:0.8rem; padding:0.4rem 1rem;">التالي ⬅️</button>
              </div>
            </div>
            
            <!-- STEP 3: Payment Options -->
            <div class="wizard-panel" id="panel-3" style="display:none;">
              <label style="font-weight:700; font-size:0.85rem;">طريقة الدفع المقترحة 💳</label>
              
              <div style="display:flex; flex-direction:column; gap:0.5rem;">
                <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.8rem; background:var(--bg-app); padding:0.75rem; border-radius:10px; border:1px solid var(--border-color); cursor:pointer;">
                  <input type="radio" name="payment-method" value="cash" checked>
                  <div>
                    <strong>💵 كاش نقدي (مع الفني)</strong>
                    <div style="font-size:0.65rem; color:var(--text-muted);">الدفع مباشرة للفني يدوياً بعد إنجاز الخدمة في منزلك.</div>
                  </div>
                </label>
                
                <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.8rem; background:var(--bg-app); padding:0.75rem; border-radius:10px; border:1px solid var(--border-color); opacity:0.6; cursor:not-allowed;">
                  <input type="radio" name="payment-method" value="digital" disabled>
                  <div>
                    <strong>💳 الدفع الإلكتروني والتقسيط (فيزا / فودافون كاش / إنستاباي)</strong>
                    <div style="font-size:0.65rem; color:var(--text-muted); font-weight:700;">معطل مؤقتاً (قريباً)</div>
                  </div>
                </label>
              </div>
              
              <div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top:1rem;">
                <button type="button" class="btn-secondary" id="btn-back-step3" style="font-size:0.8rem; padding:0.4rem 1rem;">السابق</button>
                <button type="submit" class="btn-primary" style="font-size:0.8rem; padding:0.4rem 1rem;">تأكيد وحجز الطلب ⚙️</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;

    const modal = document.getElementById("booking-wizard-modal");
    
    // Close modal event
    document.getElementById("close-booking-wizard").addEventListener("click", () => {
      modalContainer.innerHTML = "";
    });

    // Step navigations
    const desc = document.getElementById("booking-description");
    const dateVal = document.getElementById("booking-date-val");
    
    document.getElementById("btn-booking-step1").addEventListener("click", () => {
      if (!desc.value.trim()) {
        desc.reportValidity();
        return;
      }
      document.getElementById("panel-1").style.display = "none";
      document.getElementById("panel-2").style.display = "block";
      document.getElementById("node-2").classList.add("active");
    });

    document.getElementById("btn-back-step2").addEventListener("click", () => {
      document.getElementById("panel-2").style.display = "none";
      document.getElementById("panel-1").style.display = "block";
      document.getElementById("node-2").classList.remove("active");
    });

    document.getElementById("btn-booking-step2").addEventListener("click", () => {
      if (!dateVal.value) {
        dateVal.reportValidity();
        return;
      }
      document.getElementById("panel-2").style.display = "none";
      document.getElementById("panel-3").style.display = "block";
      document.getElementById("node-3").classList.add("active");
    });

    document.getElementById("btn-back-step3").addEventListener("click", () => {
      document.getElementById("panel-3").style.display = "none";
      document.getElementById("panel-2").style.display = "block";
      document.getElementById("node-3").classList.remove("active");
    });

    // Final submit
    document.getElementById("booking-form").addEventListener("submit", (e) => {
      e.preventDefault();
      
      const payload = {
        customerId: this.customerId,
        customerName: this.customerName,
        customerPhone: this.customerPhone,
        artisanId: artisan.id,
        artisanName: artisan.name,
        category: artisan.category,
        description: sanitizeHTML(desc.value),
        preferredDate: dateVal.value,
        paymentMethod: document.querySelector('input[name="payment-method"]:checked').value,
        status: "pending",
        price: this.getCategoryPrice(artisan.category),
        isRated: false
      };

      db.addDocument("jobs", payload);
      alert("✅ تم إرسال طلب الحجز للأسطى بنجاح! سيتم إخطاره فوراً وقبول الطلب.");
      modalContainer.innerHTML = "";
      this.activeTab = "customer-orders";
      this.render();
      this.bindEvents();
    });
  }

  /* Artisan Details Modal */
  openArtisanProfile(artisanId) {
    const artisan = db.getDocument("artisans", artisanId);
    if (!artisan) return;

    const modalContainer = document.getElementById("profile-modal-container");
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-overlay open" id="profile-modal">
        <div class="modal-content">
          <div class="modal-header">
            <span class="modal-title">الصفحة الشخصية للحرفي</span>
            <button class="modal-close" id="close-profile-modal">&times;</button>
          </div>
          
          <div style="text-align:center; margin-bottom:1rem;">
            <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=${artisan.name}" style="width:72px; height:72px; border-radius:50%; border:3px solid var(--primary-orange);" alt="${artisan.name}">
            <h3 style="font-weight:800; margin-top:0.5rem; color:var(--text-color);">${artisan.name}</h3>
            <span class="badge ${this.getRankBadgeClass(artisan.rank)}">${this.getRankName(artisan.rank)}</span>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.3rem;">حرفجي موثق رقمي بفيش جنائي معتمد 👮</div>
            <div style="display:flex; justify-content:center; gap:0.4rem; margin-top:0.35rem; font-size:0.65rem; font-weight:700;">
              <span class="badge ${artisan.phoneVerified === 'verified' ? 'badge-emerald' : 'badge-rose'}">
                ${artisan.phoneVerified === 'verified' ? '📞 هاتف موثق يدوياً' : '📞 قيد مراجعة الهاتف'}
              </span>
              <span class="badge ${artisan.emailVerified === 'verified' ? 'badge-emerald' : 'badge-rose'}">
                ${artisan.emailVerified === 'verified' ? '📧 بريد مفعل' : '📧 بريد غير مفعل'}
              </span>
            </div>
          </div>
          
          <div style="background:var(--bg-app); padding:1rem; border-radius:16px; margin-bottom:1rem; font-size:0.8rem; line-height:1.5;">
            <strong style="color:var(--primary-orange);">السيرة المهنية:</strong><br>
            ${artisan.bio}
          </div>

          <!-- Multi-dimensional review system -->
          <div style="margin-bottom:1.5rem;">
            <strong style="font-size:0.85rem; display:block; margin-bottom:0.5rem; font-weight:800;">التقييم ثلاثي الأبعاد 📊</strong>
            <div style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.75rem;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>جودة العمل والتشطيب:</span>
                <span style="font-weight:700; color:var(--amber);">⭐ ${artisan.ratingDetails?.quality || 4.5} / 5</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>الالتزام بالمواعيد المحددة:</span>
                <span style="font-weight:700; color:var(--amber);">⭐ ${artisan.ratingDetails?.timing || 4.5} / 5</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>الاحترافية والأمانة في التعامل:</span>
                <span style="font-weight:700; color:var(--amber);">⭐ ${artisan.ratingDetails?.politeness || 4.5} / 5</span>
              </div>
            </div>
          </div>

          <!-- Portfolio gallery -->
          <div style="margin-bottom:1.5rem;">
            <strong style="font-size:0.85rem; display:block; margin-bottom:0.5rem; font-weight:800;">معرض أعمال الحرفي 📸</strong>
            <div style="display:flex; gap:0.5rem; overflow-x:auto;">
              ${(artisan.gallery || []).length > 0 ? artisan.gallery.map(img => `
                <img src="${img}" style="width:100px; height:80px; border-radius:10px; object-fit:cover; border:1px solid var(--border-color);">
              `).join("") : `
                <div style="flex:1; background:var(--bg-app); border:1px dashed var(--border-color); border-radius:10px; text-align:center; padding:1.5rem; font-size:0.7rem; color:var(--text-muted);">
                  لا يوجد صور مسبقة لمعرض الأعمال للحرفي.
                </div>
              `}
            </div>
          </div>
          
          <button class="btn-primary btn-book-wizard" data-art-id="${artisan.id}" style="width:100%;">
            بدء حجز صيانة فورية ⚙️
          </button>
        </div>
      </div>
    `;

    document.getElementById("close-profile-modal").addEventListener("click", () => {
      modalContainer.innerHTML = "";
    });

    modalContainer.querySelector(".btn-book-wizard").addEventListener("click", () => {
      modalContainer.innerHTML = "";
      this.openBookingWizard(artisanId);
    });
  }

  /* Chat Synchronization Modal */
  openChatModal(jobId, artisanUserId) {
    const job = db.getDocument("jobs", jobId);
    if (!job) return;

    const modalContainer = document.getElementById("booking-modal-container");
    if (!modalContainer) return;

    // Load initial chat messages
    const loadMessagesHtml = () => {
      const messages = db.query("messages", m => m.jobId === jobId);
      return messages.map(m => `
        <div class="chat-bubble ${m.senderId === 'cust-1' ? 'sent' : 'received'}">
          ${m.text}
          <div class="chat-time">${new Date(m.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      `).join("");
    };

    modalContainer.innerHTML = `
      <div class="modal-overlay open" id="chat-modal">
        <div class="modal-content" style="max-height:95%; height:90%;">
          <div class="modal-header" style="margin-bottom:0.5rem;">
            <div>
              <span class="modal-title" style="font-size:0.95rem; font-weight:800;">دردشة حية: ${job.artisanName}</span>
              <div style="font-size:0.65rem; color:var(--emerald);">🟢 متصل الآن (مزامنة فورية)</div>
            </div>
            <button class="modal-close" id="close-chat-modal">&times;</button>
          </div>
          
          <div class="chat-window">
            <div class="chat-messages" id="chat-messages-container">
              ${loadMessagesHtml()}
            </div>
            <div class="chat-footer">
              <input type="text" class="chat-input-box" id="chat-message-input" placeholder="اكتب رسالتك للأسطى هنا...">
              <button class="btn-primary" id="btn-send-message" style="padding:0.5rem; border-radius:10px; width:40px; height:40px; justify-content:center;">
                🕊️
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const chatContainer = document.getElementById("chat-messages-container");
    chatContainer.scrollTop = chatContainer.scrollHeight;

    document.getElementById("close-chat-modal").addEventListener("click", () => {
      modalContainer.innerHTML = "";
    });

    const msgInput = document.getElementById("chat-message-input");
    const sendBtn = document.getElementById("btn-send-message");

    const sendMessage = () => {
      const txt = msgInput.value.trim();
      if (!txt) return;

      db.addDocument("messages", {
        jobId: jobId,
        senderId: "cust-1",
        receiverId: artisanUserId,
        text: sanitizeHTML(txt),
        timestamp: new Date().toISOString()
      });

      msgInput.value = "";
      chatContainer.innerHTML = loadMessagesHtml();
      chatContainer.scrollTop = chatContainer.scrollHeight;
    };

    sendBtn.addEventListener("click", sendMessage);
    msgInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });

    // Real-time synchronization within the chat modal
    const chatUpdateListener = (e) => {
      if (e.detail.collection === "messages") {
        chatContainer.innerHTML = loadMessagesHtml();
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    };
    window.addEventListener('harfagy_db_update', chatUpdateListener);

    // Unsubscribe when closed
    document.getElementById("close-chat-modal").addEventListener("click", () => {
      window.removeEventListener('harfagy_db_update', chatUpdateListener);
    });
  }

  /* Dynamic Tracking Modal containing SVG Street Map */
  openTrackingModal(jobId) {
    const job = db.getDocument("jobs", jobId);
    if (!job) return;

    this.activeOrderId = jobId;
    const modalContainer = document.getElementById("booking-modal-container");
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-overlay open" id="tracking-modal">
        <div class="modal-content">
          <div class="modal-header">
            <span class="modal-title">تتبع حي للفني: ${job.artisanName}</span>
            <button class="modal-close" id="close-tracking-modal">&times;</button>
          </div>
          
          <div class="map-canvas-container">
            <svg class="map-svg-element" viewBox="0 0 400 180">
              <!-- Road network -->
              <path class="map-road" d="M 20 90 L 380 90" />
              <path class="map-road" d="M 120 10 L 120 170" />
              <path class="map-road" d="M 280 10 L 280 170" />
              
              <!-- Customer Pin (Right side of middle street) -->
              <circle class="map-user-pin pulse" cx="300" cy="90" r="10" />
              <text x="300" y="115" font-size="10" font-weight="bold" fill="var(--text-color)" text-anchor="middle">موقعي 🏠</text>
              
              <!-- Artisan Pin (Moving on road) -->
              <g id="map-artisan-marker">
                <circle class="map-artisan-pin" cx="50" cy="90" r="8" />
                <text x="50" y="75" font-size="9" font-weight="bold" fill="var(--emerald)" text-anchor="middle">الأسطى 🛠️</text>
              </g>
            </svg>
          </div>

          <div style="background:var(--bg-app); border:1px solid var(--border-color); border-radius:12px; padding:0.8rem; margin:1rem 0; text-align:center;">
            <div style="font-weight:800; font-size:0.85rem; color:var(--primary-orange);" id="tracking-status-text">
              الفني قبل طلبك وقيد التجهيز
            </div>
            <div style="font-size:0.65rem; color:var(--text-muted); margin-top:0.2rem;" id="tracking-eta-text">
              الوقت المقدر للوصول: 25 دقيقة
            </div>
          </div>
          
          <!-- Steps bar -->
          <div style="display:flex; justify-content:space-between; font-size:0.65rem; font-weight:700; color:var(--text-muted);">
            <span class="${['accepted', 'onway', 'arrived', 'completed'].includes(job.status) ? 'active' : ''}" style="color:var(--emerald);">قبول</span>
            <span class="${['onway', 'arrived', 'completed'].includes(job.status) ? 'active' : ''}" id="step-onway-t">في الطريق</span>
            <span class="${['arrived', 'completed'].includes(job.status) ? 'active' : ''}" id="step-arrived-t">وصل وبدأ</span>
            <span class="${['completed'].includes(job.status) ? 'active' : ''}">أنجز العمل</span>
          </div>
        </div>
      </div>
    `;

    document.getElementById("close-tracking-modal").addEventListener("click", () => {
      clearInterval(this.mapAnimationTimer);
      modalContainer.innerHTML = "";
    });

    this.startMapAnimation(job.status);
    
    // Auto-update if DB changes (e.g. artisan clicks in route)
    const trackingDbListener = (e) => {
      if (e.detail.collection === "jobs") {
        const j = db.getDocument("jobs", jobId);
        if (j) {
          this.startMapAnimation(j.status);
        }
      }
    };
    window.addEventListener('harfagy_db_update', trackingDbListener);
    
    document.getElementById("close-tracking-modal").addEventListener("click", () => {
      window.removeEventListener('harfagy_db_update', trackingDbListener);
    });
  }

  startMapAnimation(status) {
    clearInterval(this.mapAnimationTimer);
    
    const artisanMarker = document.getElementById("map-artisan-marker");
    const statusText = document.getElementById("tracking-status-text");
    const etaText = document.getElementById("tracking-eta-text");
    
    if (!artisanMarker || !statusText || !etaText) return;

    let targetX = 50;
    
    if (status === "accepted") {
      targetX = 80;
      statusText.textContent = "الأسطى يجهز المعدات لبدء الحركة 🔧";
      etaText.textContent = "الوقت المقدر للوصول: 25 دقيقة";
    } else if (status === "onway") {
      // Dynamic moving simulator
      statusText.textContent = "الأسطى في الطريق إليك الآن 🛵";
      this.mapAnimationTimer = setInterval(() => {
        this.artisanPosition += 2;
        if (this.artisanPosition > 90) this.artisanPosition = 10; // reset loop for demo effect
        
        // Calculate coordinates along horizontal road (X ranges 50 to 250)
        const curX = 50 + (this.artisanPosition / 100) * 200;
        
        artisanMarker.setAttribute("transform", `translate(${curX - 50}, 0)`);
        etaText.textContent = `الوقت المقدر للوصول: ${Math.max(2, Math.floor(15 - (this.artisanPosition/10)))} دقائق`;
      }, 500);
      return;
    } else if (status === "arrived") {
      targetX = 290;
      statusText.textContent = "الأسطى بدأ الصيانة المنزلية الآن 🛠️";
      etaText.textContent = "يتم حل المشكلة الفنية...";
      document.getElementById("step-arrived-t").style.color = "var(--primary-orange)";
    } else if (status === "completed") {
      targetX = 300;
      statusText.textContent = "تم إنجاز الخدمة وإصلاح العطل بنجاح! 🎉";
      etaText.textContent = "يمكنك مراجعة الفاتورة الإلكترونية الآن.";
    }

    artisanMarker.setAttribute("transform", `translate(${targetX - 50}, 0)`);
  }

  /* Complaints submitting modal */
  openComplaintsModal() {
    const modalContainer = document.getElementById("booking-modal-container");
    if (!modalContainer) return;

    // Fetch jobs to link complaint
    const jobs = db.query("jobs", j => j.customerId === this.customerId);

    modalContainer.innerHTML = `
      <div class="modal-overlay open" id="complaint-form-modal">
        <div class="modal-content">
          <div class="modal-header">
            <span class="modal-title">رفع نزاع أو شكوى فنية</span>
            <button class="modal-close" id="close-complaint-modal">&times;</button>
          </div>
          
          <form id="complaint-submit-form" style="display:flex; flex-direction:column; gap:1rem;">
            <div>
              <label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.3rem;">اختر طلب الصيانة المرتبط بالخلاف</label>
              <select id="comp-job-select" required style="width:100%; padding:0.4rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none; font-size:0.75rem;">
                ${jobs.map(j => `<option value="${j.id}">طلب #${j.id.substring(0,8)} - ${j.artisanName} (${this.getCategoryName(j.category)})</option>`).join("")}
              </select>
            </div>
            
            <div>
              <label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.3rem;">تصنيف الشكوى</label>
              <select id="comp-type" required style="width:100%; padding:0.4rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none; font-size:0.75rem;">
                <option value="خلاف مالي">خلاف مالي (تغيير السعر المتفق عليه)</option>
                <option value="جودة الصيانة">سوء جودة الصيانة (التلف لم يصلح)</option>
                <option value="سلوك الفني">سلوك غير احترافي من الحرفي</option>
              </select>
            </div>
            
            <div>
              <label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.3rem;">تفاصيل الخلاف بالتفصيل 🚨</label>
              <textarea id="comp-details" required placeholder="يرجى وصف المشكلة والمبالغ المالية المطلوبة بوضوح للتسوية..." 
                        style="width:100%; height:90px; padding:0.5rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none; font-size:0.8rem;"></textarea>
            </div>
            
            <button type="submit" class="btn-primary" style="background:var(--rose);">إرسال الشكوى للإدارة المباشرة</button>
          </form>
        </div>
      </div>
    `;

    document.getElementById("close-complaint-modal").addEventListener("click", () => {
      modalContainer.innerHTML = "";
    });

    document.getElementById("complaint-submit-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const jobId = document.getElementById("comp-job-select").value;
      const type = document.getElementById("comp-type").value;
      const details = document.getElementById("comp-details").value;
      
      const job = db.getDocument("jobs", jobId);
      if (!job) return;

      db.addDocument("complaints", {
        jobId,
        customerId: this.customerId,
        customerName: this.customerName,
        artisanId: job.artisanId,
        artisanName: job.artisanName,
        type,
        details: sanitizeHTML(details),
        status: "pending",
        resolution: ""
      });

      // Update job status to disputed
      db.updateDocument("jobs", jobId, { status: "disputed" });

      alert("⚠️ تم تسجيل شكواك بنجاح! تم تعليق عمولة الطلب مؤقتاً وسيتواصل معك مفتش الإدارة الأمنية والمالية لحل النزاع ودياً.");
      modalContainer.innerHTML = "";
      this.activeTab = "customer-complaints";
      this.render();
      this.bindEvents();
    });
  }

  /* Digital Approved Invoice Receipt Overlay */
  openReceiptModal(jobId) {
    const job = db.getDocument("jobs", jobId);
    if (!job) return;

    const modalContainer = document.getElementById("booking-modal-container");
    if (!modalContainer) return;

    const vat = parseFloat(job.price) * 0.05;
    const comm = parseFloat(job.price) * 0.15;
    const total = parseFloat(job.price) + vat;

    modalContainer.innerHTML = `
      <div class="modal-overlay open" id="receipt-modal">
        <div class="modal-content" style="max-width:360px; margin:auto; border-radius:24px; font-size:0.8rem;">
          <div class="modal-header">
            <span class="modal-title">🧾 الفاتورة الإلكترونية المعتمدة</span>
            <button class="modal-close" id="close-receipt-modal">&times;</button>
          </div>
          
          <div style="border: 2px dashed var(--border-color); padding: 1rem; border-radius:12px; background:var(--bg-app); line-height:1.6; text-align:center;">
            <h3 style="font-weight:800; color:var(--primary-navy); margin-bottom:0.25rem;">منصة حرفجي الرقمية</h3>
            <span style="font-size:0.6rem; color:var(--text-muted); display:block; margin-bottom:0.75rem;">رقم مرجعي: ${job.id}</span>
            
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:0.4rem; margin-bottom:0.4rem; font-size:0.7rem; text-align:right;">
              <div>
                <strong>العميل:</strong> ${job.customerName}<br>
                <strong>الحرفي:</strong> ${job.artisanName}
              </div>
              <div style="text-align:left;">
                <strong>التخصص:</strong> ${this.getCategoryName(job.category)}<br>
                <strong>التاريخ:</strong> ${job.preferredDate}
              </div>
            </div>
            
            <div style="display:flex; justify-content:space-between; margin-bottom:0.3rem;">
              <span>قيمة الكشف/المصنعية الأساسية:</span>
              <strong>${job.price} ج.م</strong>
            </div>
            
            <div style="display:flex; justify-content:space-between; margin-bottom:0.3rem;">
              <span>ضريبة القيمة المضافة (5%):</span>
              <strong>${vat.toFixed(2)} ج.م</strong>
            </div>
            
            <div style="display:flex; justify-content:space-between; border-top:1px solid var(--text-color); padding-top:0.4rem; font-weight:800; font-size:0.9rem; color:var(--emerald);">
              <span>المبلغ الإجمالي المطلـوب:</span>
              <span>${total.toFixed(2)} ج.م</span>
            </div>
            
            <div style="font-size:0.6rem; color:var(--text-muted); margin-top:0.5rem; text-align:right;">
              * يشمل هذا الطلب رسوم صيانة صفرية للمنصة. يتحمل الحرفي عمولة المنصة البالغة 15% (${comm.toFixed(2)} ج.م) لدعم بقاء المنصة مجانية.
            </div>
          </div>
          
          <button class="btn-primary" id="btn-print-receipt" style="width:100%; margin-top:1rem;">تحميل بصيغة PDF 📥</button>
        </div>
      </div>
    `;

    document.getElementById("close-receipt-modal").addEventListener("click", () => {
      modalContainer.innerHTML = "";
    });
    
    document.getElementById("btn-print-receipt").addEventListener("click", () => {
      alert("تم تحميل الفاتورة المعتمدة وحفظها في جهازك بنجاح!");
      modalContainer.innerHTML = "";
    });
  }

  /* Review Rating Modal */
  openRateModal(jobId) {
    const job = db.getDocument("jobs", jobId);
    if (!job) return;

    const modalContainer = document.getElementById("booking-modal-container");
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="modal-overlay open" id="rate-modal">
        <div class="modal-content" style="max-width:350px; margin:auto; border-radius:24px;">
          <div class="modal-header">
            <span class="modal-title">تقييم الأسطى: ${job.artisanName}</span>
            <button class="modal-close" id="close-rate-modal">&times;</button>
          </div>
          
          <form id="rate-submit-form" style="display:flex; flex-direction:column; gap:1rem;">
            <div>
              <label style="font-weight:700; font-size:0.75rem; display:block; margin-bottom:0.25rem;">جودة الصيانة والتشطيب المنزلية</label>
              <select id="rate-quality" style="width:100%; padding:0.35rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none;">
                <option value="5">⭐⭐⭐⭐⭐ ممتاز جداً</option>
                <option value="4">⭐⭐⭐⭐ جيد جداً</option>
                <option value="3">⭐⭐⭐ متوسط</option>
                <option value="2">⭐⭐ مقبول</option>
                <option value="1">⭐ سيء</option>
              </select>
            </div>
            
            <div>
              <label style="font-weight:700; font-size:0.75rem; display:block; margin-bottom:0.25rem;">الالتزام بالمواعيد والوقت المتفق عليه</label>
              <select id="rate-timing" style="width:100%; padding:0.35rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none;">
                <option value="5">⭐⭐⭐⭐⭐ ممتاز جداً</option>
                <option value="4">⭐⭐⭐⭐ جيد جداً</option>
                <option value="3">⭐⭐⭐ متوسط</option>
                <option value="2">⭐⭐ مقبول</option>
                <option value="1">⭐ متأخر للغاية</option>
              </select>
            </div>
            
            <div>
              <label style="font-weight:700; font-size:0.75rem; display:block; margin-bottom:0.25rem;">السلوك والتعامل والأمانة</label>
              <select id="rate-politeness" style="width:100%; padding:0.35rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none;">
                <option value="5">⭐⭐⭐⭐⭐ خلوق ومحترم للغاية</option>
                <option value="4">⭐⭐⭐⭐ مهذب وسلوك جيد</option>
                <option value="3">⭐⭐⭐ طبيعي</option>
                <option value="2">⭐⭐ غير ودود</option>
                <option value="1">⭐ تعامل سيء جداً</option>
              </select>
            </div>
            
            <button type="submit" class="btn-primary" style="background:var(--amber);">تأكيد تقييم الحرفي</button>
          </form>
        </div>
      </div>
    `;

    document.getElementById("close-rate-modal").addEventListener("click", () => {
      modalContainer.innerHTML = "";
    });

    document.getElementById("rate-submit-form").addEventListener("submit", (e) => {
      e.preventDefault();
      
      const q = parseFloat(document.getElementById("rate-quality").value);
      const t = parseFloat(document.getElementById("rate-timing").value);
      const p = parseFloat(document.getElementById("rate-politeness").value);
      
      const avg = parseFloat(((q + t + p) / 3).toFixed(1));

      // Update artisan rating and completion metrics
      const artisan = db.getDocument("artisans", job.artisanId);
      if (artisan) {
        const completed = artisan.completedJobs + 1;
        const newRating = parseFloat(((artisan.rating * artisan.completedJobs + avg) / completed).toFixed(1));
        
        db.updateDocument("artisans", job.artisanId, {
          rating: newRating,
          completedJobs: completed,
          ratingDetails: { quality: q, timing: t, politeness: p }
        });
      }

      // Mark job as rated
      db.updateDocument("jobs", jobId, { isRated: true });

      alert("❤️ شكراً لتقييمك! آرائك تساعد المنصة في تصفية الحرفيين السيئين وترقية المميزين.");
      modalContainer.innerHTML = "";
      this.render();
      this.bindEvents();
    });
  }
}
