/* Artisan View Controller and Dynamic Renderer */
import { db } from '../db/store.js';
import { sanitizeHTML } from '../utils/security.js';

  constructor(container) {
    this.container = container;
    this.isMounted = false;
    this.activeTab = "artisan-home"; // artisan-home, artisan-wallet, artisan-schedule, artisan-disputes, artisan-profile
    
    // Retrieve logged in user session dynamically
    const session = JSON.parse(localStorage.getItem("harfagy_session") || "{}");
    const artisanProfile = db.getCollection("artisans").find(a => a.userId === session.id);
    this.artisanId = artisanProfile ? artisanProfile.id : "art-1";
    this.leadTimer = null;
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
    console.log("Artisan UI refreshing due to DB changes in collection:", collection);
    this.render();
    this.bindEvents();
    this.bindTabNavigation();
  }

  render() {
    let contentHtml = "";
    
    switch (this.activeTab) {
      case "artisan-home":
        contentHtml = this.renderHomeView();
        break;
      case "artisan-wallet":
        contentHtml = this.renderWalletView();
        break;
      case "artisan-schedule":
        contentHtml = this.renderScheduleView();
        break;
      case "artisan-disputes":
        contentHtml = this.renderDisputesView();
        break;
      case "artisan-profile":
        contentHtml = this.renderProfileView();
        break;
    }
    
    this.container.innerHTML = `
      <div class="artisan-wrapper animate-slide" style="display:flex; flex-direction:column; height:100%; position:relative;">
        <div style="flex:1; overflow-y:auto; overflow-x:hidden; display:flex; flex-direction:column;">
          ${contentHtml}
        </div>
        
        <!-- Bottom Nav Bar -->
        <div class="phone-nav-bar" id="artisan-nav-bar">
          <div class="phone-nav-item ${this.activeTab === 'artisan-home' ? 'active' : ''}" data-tab="artisan-home">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
            <span data-i18n="nav-dashboard">الرئيسية</span>
          </div>
          <div class="phone-nav-item ${this.activeTab === 'artisan-wallet' ? 'active' : ''}" data-tab="artisan-wallet">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
            <span data-i18n="nav-wallet">المحفظة</span>
          </div>
          <div class="phone-nav-item ${this.activeTab === 'artisan-schedule' ? 'active' : ''}" data-tab="artisan-schedule">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span data-i18n="nav-schedule">المواعيد</span>
          </div>
          <div class="phone-nav-item ${this.activeTab === 'artisan-disputes' ? 'active' : ''}" data-tab="artisan-disputes">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span data-i18n="nav-disputes">النزاعات</span>
          </div>
          <div class="phone-nav-item ${this.activeTab === 'artisan-profile' ? 'active' : ''}" data-tab="artisan-profile">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" y="7" r="4"/></svg>
            <span data-i18n="nav-profile">حسابي</span>
          </div>
        </div>
        
        <!-- Floating Lead Simulator Button for investors -->
        <button class="investor-simulator-trigger" id="investor-sim-btn" style="bottom: 70px;" title="محاكاة عميل وهمي للمستثمر">
          📡
        </button>
      </div>
      <!-- Modals container -->
      <div id="artisan-modal-container"></div>
    `;
  }

  renderHomeView() {
    const artisan = db.getDocument("artisans", this.artisanId);
    if (!artisan) return "Error: Artisan profile not found";

    // Fetch active jobs (pending, accepted, onway, arrived)
    const activeJobs = db.query("jobs", j => j.artisanId === this.artisanId && ["pending", "accepted", "onway", "arrived"].includes(j.status));

    let activeJobsHtml = activeJobs.map(job => `
      <div class="active-job-card animate-slide" data-active-job-id="${job.id}">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; border-bottom:1px solid var(--border-color); padding-bottom:0.4rem; margin-bottom:0.4rem;">
          <span style="font-weight:800; color:var(--primary-navy);">طلب صيانة منزلية جديد 🏡</span>
          <span class="badge badge-orange" style="font-size:0.6rem;">${job.paymentMethod === 'cash' ? 'كاش نقدي' : 'تقسيط'}</span>
        </div>
        
        <div style="font-size:0.75rem; line-height:1.4;">
          <strong>العميل:</strong> ${job.customerName}<br>
          <strong>الهاتف:</strong> ${job.customerPhone}<br>
          <strong>العنوان:</strong> القاهرة - مصر الجديدة<br>
          <strong>المشكلة:</strong> <span style="color:var(--text-muted);">${job.description}</span>
        </div>
        
        <!-- Interactive Job stage workflow controller -->
        <div class="job-steps-indicator" style="margin-top:0.5rem;">
          <span class="job-step-text ${job.status === 'pending' ? 'active' : ''}">بانتظار الموافقة</span>
          <span class="job-step-text ${job.status === 'accepted' ? 'active' : ''}">تم القبول</span>
          <span class="job-step-text ${job.status === 'onway' ? 'active' : ''}">في الطريق</span>
          <span class="job-step-text ${job.status === 'arrived' ? 'active' : ''}">وصل وبدأ</span>
        </div>
        
        <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
          ${job.status === 'pending' ? `
            <button class="btn-primary btn-artisan-accept" data-j-id="${job.id}" style="flex:2; font-size:0.7rem; padding:0.35rem 0.5rem; background:var(--emerald);">قبول وتأكيد 🟢</button>
            <button class="btn-secondary btn-artisan-reject" data-j-id="${job.id}" style="flex:1; font-size:0.7rem; padding:0.35rem 0.5rem; color:var(--rose); border-color:var(--rose);">رفض</button>
          ` : ''}
          
          ${job.status === 'accepted' ? `
            <button class="btn-primary btn-artisan-onway" data-j-id="${job.id}" style="width:100%; font-size:0.7rem; padding:0.4rem;">بدء الحركة (أنا في الطريق للعميل) 🛵</button>
          ` : ''}
          
          ${job.status === 'onway' ? `
            <button class="btn-primary btn-artisan-arrived" data-j-id="${job.id}" style="width:100%; font-size:0.7rem; padding:0.4rem; background:var(--amber);">وصلت لموقع العميل وبدأت الصيانة 🛠️</button>
          ` : ''}
          
          ${job.status === 'arrived' ? `
            <button class="btn-primary btn-artisan-completed" data-j-id="${job.id}" style="width:100%; font-size:0.7rem; padding:0.4rem; background:var(--emerald);">إنهاء وتسليم العمل وإصدار الفاتورة 🧾</button>
          ` : ''}
          
          <button class="btn-secondary btn-artisan-chat" data-j-id="${job.id}" data-cust-phone="${job.customerPhone}" style="padding:0.4rem; border-radius:8px;">💬 دردشة</button>
        </div>
      </div>
    `).join("");

    return `
      <!-- Artisan Profile Banner -->
      <div class="artisan-profile-header">
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=${artisan.name}" style="width:52px; height:52px; border-radius:50%; border:2px solid var(--primary-orange);">
            <div>
              <h2 style="font-weight:800; font-size:1rem; color:var(--text-color);">${artisan.name}</h2>
              <div style="font-size:0.65rem; color:var(--text-muted);">رتبة: <span class="badge ${this.getRankBadgeClass(artisan.rank)}" style="padding:0.1rem 0.3rem;">${this.getRankName(artisan.rank)}</span></div>
            </div>
          </div>
          <button id="btn-logout-trigger-artisan" style="background:transparent; border:none; cursor:pointer; font-size:1.25rem; outline:none;" title="تسجيل الخروج">
            🚪
          </button>
        </div>
        
        <!-- Online Presence Toggle Switch -->
        <div class="presence-banner">
          <div class="presence-status-text" id="status-text-lbl">
            ${artisan.isOnline ? '🟢 <span style="color:var(--emerald);">متصل ومستعد لاستقبال زبائن</span>' : '🔴 <span style="color:var(--text-muted);">غير متاح للعمل حالياً</span>'}
          </div>
          <label class="switch-container">
            <input type="checkbox" id="presence-toggle-chk" ${artisan.isOnline ? 'checked' : ''}>
            <span class="switch-slider"></span>
          </label>
        </div>
      </div>
      
      <!-- Metrics Grid -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-card-header">
            <span class="metric-card-title">أرباح المحفظة</span>
            <div class="metric-icon-wrap" style="background:rgba(16,185,129,0.1); color:var(--emerald);">💵</div>
          </div>
          <span class="metric-card-value">${artisan.wallet} ج.م</span>
        </div>
        <div class="metric-card">
          <div class="metric-card-header">
            <span class="metric-card-title">متوسط التقييم</span>
            <div class="metric-icon-wrap" style="background:rgba(245,158,11,0.1); color:var(--amber);">⭐️</div>
          </div>
          <span class="metric-card-value">${artisan.rating}</span>
        </div>
        <div class="metric-card">
          <div class="metric-card-header">
            <span class="metric-card-title">الطلبات المنجزة</span>
            <div class="metric-icon-wrap" style="background:rgba(249,115,22,0.1); color:var(--primary-orange);">⚙️</div>
          </div>
          <span class="metric-card-value">${artisan.completedJobs} خدمة</span>
        </div>
        <div class="metric-card">
          <div class="metric-card-header">
            <span class="metric-card-title">وقت الاستجابة</span>
            <div class="metric-icon-wrap" style="background:rgba(139,92,246,0.1); color:#8b5cf6);">⚡</div>
          </div>
          <span class="metric-card-value">${artisan.responseTime || '15 د'}</span>
        </div>
      </div>
      
      <!-- Active requests queue -->
      <div style="flex:1; overflow-y:auto;">
        <h3 style="font-size:0.85rem; font-weight:800; margin:0 1rem 0.5rem 1rem;">طلبات الصيانة المفتوحة 🛠️</h3>
        ${activeJobsHtml.length > 0 ? activeJobsHtml : `
          <div style="text-align:center; padding:2rem 1rem; color:var(--text-muted); font-size:0.75rem;">
            لا يوجد لديك طلبات صيانة حالياً. انقر على زر (📡) العائم بالأسفل لمحاكاة وصول عميل قريب للمستثمرين.
          </div>
        `}
      </div>
    `;
  }

  renderWalletView() {
    const artisan = db.getDocument("artisans", this.artisanId);
    if (!artisan) return "Error: Artisan profile not found";

    // Payout transactions ledger
    const ledger = db.query("withdrawals", w => w.artisanId === this.artisanId);

    let ledgerHtml = ledger.length > 0 ? ledger.map(w => `
      <div class="ledger-item">
        <div class="ledger-details">
          <span class="ledger-type">${w.method} - سحب أرباح</span>
          <span class="ledger-date">${new Date(w.timestamp).toLocaleDateString('ar-EG')}</span>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end;">
          <span class="ledger-amount debit">-${w.amount} ج.م</span>
          <span class="badge ${w.status === 'completed' ? 'badge-emerald' : 'badge-amber'}" style="font-size:0.55rem; padding:0.05rem 0.2rem;">
            ${w.status === 'completed' ? 'تم التحويل' : 'بانتظار المالي'}
          </span>
        </div>
      </div>
    `).join("") : `<div style="text-align:center; padding:1.5rem 0; font-size:0.7rem; color:var(--text-muted);">لم تقم بأي عمليات سحب مسبقة.</div>`;

    return `
      <div class="artisan-profile-header">
        <h2 style="font-weight:800; font-size:1.1rem;">المحفظة والسحب الفوري للأرباح 🏦</h2>
        <p style="font-size:0.7rem; color:var(--text-muted);">سحب فوري لأرباحك عبر المحافظ الإلكترونية أو إنستاباي</p>
      </div>
      
      <div style="flex:1; overflow-y:auto; padding:1rem;">
        <!-- Available balance display card -->
        <div class="referral-share-card" style="background:linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(10, 150, 100, 0.1) 100%); border-color:var(--emerald); margin-top:0;">
          <span style="font-size:0.75rem; color:var(--text-muted);">الرصيد المتاح للسحب حالياً</span>
          <h2 style="font-size:2rem; font-weight:800; color:var(--emerald); margin:0.3rem 0;">${artisan.wallet} ج.م</h2>
          <div style="font-size:0.65rem; color:var(--rose); font-weight:700;">عمولات المنصة المستحقة: ${artisan.commissionDue} ج.م (تخصم تلقائياً)</div>
        </div>
        
        <!-- Withdrawal request form -->
        <form id="withdrawal-request-form" style="display:flex; flex-direction:column; gap:0.75rem; margin-bottom:1.5rem;">
          <div>
            <label style="font-size:0.75rem; font-weight:700; display:block; margin-bottom:0.25rem;">مبلغ السحب المطلوب (ج.م)</label>
            <input type="number" id="payout-amount" required min="50" max="${artisan.wallet}" value="${artisan.wallet}" 
                   style="width:100%; padding:0.45rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none; font-size:0.8rem; font-weight:700;">
          </div>
          
          <div style="display:flex; gap:0.5rem;">
            <div style="flex:1;">
              <label style="font-size:0.7rem; font-weight:700;">طريقة السحب</label>
              <select id="payout-method" style="width:100%; padding:0.45rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none; font-size:0.75rem;">
                <option value="Vodafone Cash">فودافون كاش 📱</option>
                <option value="InstaPay">إنستاباي (InstaPay) ⚡</option>
              </select>
            </div>
            <div style="flex:2;">
              <label style="font-size:0.7rem; font-weight:700;">رقم المحفظة أو عنوان الدفع</label>
              <input type="text" id="payout-details" required placeholder="مثال: 01001234567" 
                     style="width:100%; padding:0.45rem; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none; font-size:0.8rem;">
            </div>
          </div>
          
          <button type="submit" class="btn-primary" style="background:var(--emerald); width:100%; font-size:0.8rem; padding:0.5rem 1rem;">سحب الأرباح الفورية الآن ➡️</button>
        </form>
        
        <h3 style="font-size:0.85rem; font-weight:800;">سجل العمليات والقيود المالية</h3>
        <div class="ledger-container">
          ${ledgerHtml}
        </div>
      </div>
    `;
  }

  renderScheduleView() {
    const artisan = db.getDocument("artisans", this.artisanId);
    if (!artisan) return "Error: Artisan profile not found";

    const days = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
    const offDays = artisan.workHours?.offDays || [];

    const scheduleGridHtml = days.map(day => {
      const isOff = offDays.includes(day);
      return `<div class="schedule-day-box ${isOff ? 'off' : 'active'}" data-day-name="${day}">
        ${day}<br>
        <span style="font-size:0.55rem; font-weight:normal;">${isOff ? 'إجازة 😴' : 'متاح 🟢'}</span>
      </div>`;
    }).join("");

    // Promo code rendering list
    const promotions = artisan.discounts || [];
    let promoListHtml = promotions.length > 0 ? promotions.map(p => `
      <div class="ledger-item" style="border-right: 3px solid var(--primary-orange);">
        <div class="ledger-details">
          <strong style="color:var(--text-color);">${p.code}</strong>
          <span style="font-size:0.6rem; color:var(--text-muted);">${p.desc}</span>
        </div>
        <strong style="color:var(--primary-orange); font-size:0.85rem;">${p.rate}% خصم</strong>
      </div>
    `).join("") : `<div style="text-align:center; padding:1rem 0; font-size:0.7rem; color:var(--text-muted);">لا توجد أكواد خصم نشطة حالياً.</div>`;

    return `
      <div class="artisan-profile-header">
        <h2 style="font-weight:800; font-size:1.1rem;">إدارة الأوقات وأكواد الخصم ⏰</h2>
        <p style="font-size:0.7rem; color:var(--text-muted);">تحكم في ساعات تواجدك وأكواد الدعاية التسويقية لجذب الزبائن</p>
      </div>
      
      <div style="flex:1; overflow-y:auto; padding:1rem;">
        <h3 style="font-size:0.85rem; font-weight:800; margin-bottom:0.25rem;">جدول الإجازات وتحديد التواجد</h3>
        <p style="font-size:0.65rem; color:var(--text-muted); margin-bottom:0.5rem;">انقر على اليوم لتبديله بين متاح للعمل أو إجازة أسبوعية</p>
        
        <div class="schedule-grid">
          ${scheduleGridHtml}
        </div>
        
        <hr style="border:0; border-top:1px solid var(--border-color); margin:1.25rem 0;">
        
        <h3 style="font-size:0.85rem; font-weight:800; margin-bottom:0.5rem;">أكواد الدعاية والخصومات الخاصة بك 🏷️</h3>
        <form id="promo-code-form" style="display:flex; gap:0.5rem; align-items:flex-end; margin-bottom:1rem;">
          <div style="flex:1.5;">
            <label style="font-size:0.65rem; font-weight:700;">رمز الكود</label>
            <input type="text" id="promo-code-input" required placeholder="مثال: ABDO30" style="width:100%; padding:0.4rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); font-size:0.75rem; text-transform:uppercase;">
          </div>
          <div style="flex:1;">
            <label style="font-size:0.65rem; font-weight:700;">الخصم (%)</label>
            <input type="number" id="promo-rate-input" required min="5" max="90" placeholder="20" style="width:100%; padding:0.4rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); font-size:0.75rem;">
          </div>
          <button type="submit" class="btn-primary" style="font-size:0.75rem; padding:0.45rem 0.75rem;">إضافة الكود</button>
        </form>
        
        <div style="display:flex; flex-direction:column; gap:0.5rem;">
          ${promoListHtml}
        </div>
      </div>
    `;
  }

  renderDisputesView() {
    // Get open complaints against this artisan
    const complaints = db.query("complaints", c => c.artisanId === this.artisanId);

    let listHtml = complaints.length > 0 ? complaints.map(c => `
      <div class="verification-ticket" style="border-right: 3px solid ${c.status === 'resolved' ? 'var(--emerald)' : 'var(--rose)'};">
        <div class="ticket-header">
          <span>نزاع #${c.id.substring(0,6)}</span>
          <span class="badge ${c.status === 'resolved' ? 'badge-emerald' : 'badge-rose'}">
            ${c.status === 'resolved' ? 'تمت التسوية' : 'بانتظار ردك أو قرار المشرف'}
          </span>
        </div>
        
        <div class="ticket-body" style="font-size:0.7rem;">
          <strong>العميل المشكي:</strong> ${c.customerName}<br>
          <strong>المشكلة المرفوعة:</strong> ${c.details}<br>
          ${c.resolution ? `<div style="background:var(--bg-app); padding:0.4rem; border-radius:6px; margin-top:0.3rem;"><strong>قرار التسوية الإدارية:</strong> ${c.resolution}</div>` : ''}
        </div>
        
        ${c.status === 'pending' ? `
          <div style="display:flex; flex-direction:column; gap:0.4rem; border-top:1px solid var(--border-color); padding-top:0.5rem; margin-top:0.5rem;">
            <label style="font-size:0.65rem; font-weight:700; color:var(--text-color);">اكتب ردك / اعتراضك الرسمي للإدارة:</label>
            <div style="display:flex; gap:0.4rem;">
              <input type="text" id="dispute-response-${c.id}" placeholder="اكتب ردك هنا لتوضيح المشكلة..." style="flex:1; padding:0.35rem; border-radius:6px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); font-size:0.7rem;">
              <button class="btn-primary btn-submit-dispute-response" data-comp-id="${c.id}" style="font-size:0.65rem; padding:0.25rem 0.5rem;">إرسال الرد</button>
            </div>
          </div>
        ` : ''}
      </div>
    `).join("") : `<div style="text-align:center; padding:3rem 1rem; color:var(--text-muted); font-size:0.75rem;">
      🎉 ممتاز! لا يوجد أي نزاعات أو شكاوى معلقة ضدك في سجل الإدارة.
    </div>`;

    return `
      <div class="artisan-profile-header">
        <h2 style="font-weight:800; font-size:1.1rem;">سجل النزاعات والاعتراضات ⚖️</h2>
        <p style="font-size:0.7rem; color:var(--text-muted);">الرد على شكاوى العملاء المرفوعة ضدك لتجنب تجميد حسابك</p>
      </div>
      <div style="flex:1; overflow-y:auto; padding:1rem;">
        ${listHtml}
      </div>
    `;
  }

  getRankName(rank) {
    const ranks = { golden: "ذهبي 🥇", silver: "فضي 🥈", bronze: "برونزي 🥉" };
    return ranks[rank] || rank;
  }

  getRankBadgeClass(rank) {
    const classes = { golden: "badge-amber", silver: "badge-navy", bronze: "badge-orange" };
    return classes[rank] || "badge-orange";
  }

  /* Bindings & Click Interactions */
  bindEvents() {
    // Logout action
    document.getElementById("btn-logout-trigger-artisan")?.addEventListener("click", () => {
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
        db.updateDocument("artisans", this.artisanId, { emailVerified: "verified" });
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
        db.updateDocument("artisans", this.artisanId, { phoneVerified: "verified" });
        const session = JSON.parse(localStorage.getItem("harfagy_session") || "{}");
        session.phoneVerified = "verified";
        localStorage.setItem("harfagy_session", JSON.stringify(session));
        alert("🎉 تم ربط وتوثيق حساب الواتساب بنجاح!");
        this.render();
        this.bindEvents();
        this.bindTabNavigation();
      }
    });

    // 1. Presence toggle switch
    const switchChk = document.getElementById("presence-toggle-chk");
    const statusLbl = document.getElementById("status-text-lbl");
    switchChk?.addEventListener("change", (e) => {
      const isOnline = e.target.checked;
      db.updateDocument("artisans", this.artisanId, { isOnline });
      if (statusLbl) {
        statusLbl.innerHTML = isOnline 
          ? '🟢 <span style="color:var(--emerald);">متصل ومستعد لاستقبال زبائن</span>' 
          : '🔴 <span style="color:var(--text-muted);">غير متاح للعمل حالياً</span>';
      }
    });

    // 2. Click float simulator triggers lead popup
    const investorBtn = document.getElementById("investor-sim-btn");
    investorBtn?.addEventListener("click", () => {
      this.triggerInvestorLeadMock();
    });

    // 3. Workflow actions: accept, reject, onway, arrived, completed
    this.container.querySelectorAll(".btn-artisan-accept").forEach(btn => {
      btn.addEventListener("click", () => {
        const jId = btn.getAttribute("data-j-id");
        db.updateDocument("jobs", jId, { status: "accepted" });
      });
    });

    this.container.querySelectorAll(".btn-artisan-reject").forEach(btn => {
      btn.addEventListener("click", () => {
        const jId = btn.getAttribute("data-j-id");
        db.deleteDocument("jobs", jId);
      });
    });

    this.container.querySelectorAll(".btn-artisan-onway").forEach(btn => {
      btn.addEventListener("click", () => {
        const jId = btn.getAttribute("data-j-id");
        db.updateDocument("jobs", jId, { status: "onway" });
      });
    });

    this.container.querySelectorAll(".btn-artisan-arrived").forEach(btn => {
      btn.addEventListener("click", () => {
        const jId = btn.getAttribute("data-j-id");
        db.updateDocument("jobs", jId, { status: "arrived" });
      });
    });

    this.container.querySelectorAll(".btn-artisan-completed").forEach(btn => {
      btn.addEventListener("click", () => {
        const jId = btn.getAttribute("data-j-id");
        
        // Finalize transaction: Add funds to artisan wallet
        const job = db.getDocument("jobs", jId);
        const artisan = db.getDocument("artisans", this.artisanId);
        if (job && artisan) {
          const totalEarned = job.price;
          const comm = totalEarned * 0.15; // 15% Platform commission
          
          db.updateDocument("artisans", this.artisanId, {
            wallet: artisan.wallet + totalEarned,
            commissionDue: artisan.commissionDue + comm
          });
        }

        db.updateDocument("jobs", jId, { status: "completed" });
        alert("🧾 تم تسليم العمل بنجاح! تم إصدار الفاتورة المعتمدة للعميل وإيداع الرصيد بمحفظتك.");
      });
    });

    // Chat link inside artisan
    this.container.querySelectorAll(".btn-artisan-chat").forEach(btn => {
      btn.addEventListener("click", () => {
        const jId = btn.getAttribute("data-j-id");
        this.openChatModal(jId);
      });
    });

    // 4. Wallet withdrawals submission
    const withdrawForm = document.getElementById("withdrawal-request-form");
    withdrawForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const amount = parseFloat(document.getElementById("payout-amount").value);
      const method = document.getElementById("payout-method").value;
      const details = document.getElementById("payout-details").value;
      
      const artisan = db.getDocument("artisans", this.artisanId);
      
      if (amount > artisan.wallet) {
        alert("الرصيد المتاح غير كافٍ لإتمام عملية السحب!");
        return;
      }

      // Add to withdrawals collection
      db.addDocument("withdrawals", {
        artisanId: this.artisanId,
        amount,
        method,
        details: sanitizeHTML(details),
        status: "pending"
      });

      // Deduct from wallet
      db.updateDocument("artisans", this.artisanId, {
        wallet: artisan.wallet - amount
      });

      alert("⏳ تم تقديم طلب السحب الفوري بنجاح! سيقوم المشرف المالي باعتماد المعاملة خلال دقائق.");
      this.render();
      this.bindEvents();
    });

    // 5. Calendar day box toggles
    this.container.querySelectorAll(".schedule-day-box").forEach(box => {
      box.addEventListener("click", () => {
        const day = box.getAttribute("data-day-name");
        const artisan = db.getDocument("artisans", this.artisanId);
        
        let offDays = artisan.workHours?.offDays || [];
        if (offDays.includes(day)) {
          offDays = offDays.filter(d => d !== day);
        } else {
          offDays.push(day);
        }
        
        db.updateDocument("artisans", this.artisanId, {
          workHours: {
            ...artisan.workHours,
            offDays
          }
        });
        
        this.render();
        this.bindEvents();
      });
    });

    // 6. Promotions add promo form
    const promoForm = document.getElementById("promo-code-form");
    promoForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const code = document.getElementById("promo-code-input").value.toUpperCase().trim();
      const rate = parseInt(document.getElementById("promo-rate-input").value);
      
      const artisan = db.getDocument("artisans", this.artisanId);
      
      const discounts = artisan.discounts || [];
      discounts.push({
        code,
        rate,
        desc: `خصم ${rate}% على خدمات الحرفي بالدليل`
      });

      db.updateDocument("artisans", this.artisanId, { discounts });
      alert(`🏷️ تم نشر كود الخصم الجديد '${code}' بنجاح بالدليل العام!`);
      this.render();
      this.bindEvents();
    });

    // 7. Dispute Response Text Submission
    this.container.querySelectorAll(".btn-submit-dispute-response").forEach(btn => {
      btn.addEventListener("click", () => {
        const compId = btn.getAttribute("data-comp-id");
        const input = document.getElementById(`dispute-response-${compId}`);
        const responseText = input.value.trim();
        
        if (!responseText) {
          input.focus();
          return;
        }

        const complaint = db.getDocument("complaints", compId);
        if (complaint) {
          db.updateDocument("complaints", compId, {
            details: complaint.details + `\n\n[رد الحرفي الرسمي]: ` + sanitizeHTML(responseText),
            status: "pending" // flag back to pending review
          });
          alert("✅ تم إرسال ردك الرسمي للمشرف الأمني لمراجعة تسوية النزاع.");
          this.render();
          this.bindEvents();
        }
      });
    });
  }

  bindTabNavigation() {
    const navItems = this.container.querySelectorAll("#artisan-nav-bar .phone-nav-item");
    navItems.forEach(item => {
      item.addEventListener("click", () => {
        this.activeTab = item.getAttribute("data-tab");
        this.render();
        this.bindEvents();
        this.bindTabNavigation();
      });
    });
  }

  /* Chat popup inside Artisan App */
  openChatModal(jobId) {
    const job = db.getDocument("jobs", jobId);
    if (!job) return;

    const modalContainer = document.getElementById("artisan-modal-container");
    if (!modalContainer) return;

    const loadMessagesHtml = () => {
      const messages = db.query("messages", m => m.jobId === jobId);
      return messages.map(m => `
        <div class="chat-bubble ${m.senderId === 'art-1-user' ? 'sent' : 'received'}">
          ${m.text}
          <div class="chat-time">${new Date(m.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      `).join("");
    };

    modalContainer.innerHTML = `
      <div class="modal-overlay open" id="artisan-chat-modal">
        <div class="modal-content" style="max-height:95%; height:90%;">
          <div class="modal-header" style="margin-bottom:0.5rem;">
            <div>
              <span class="modal-title" style="font-size:0.95rem; font-weight:800;">دردشة العميل: ${job.customerName}</span>
              <div style="font-size:0.65rem; color:var(--emerald);">🟢 مزامنة نشطة</div>
            </div>
            <button class="modal-close" id="close-artisan-chat">&times;</button>
          </div>
          
          <div class="chat-window">
            <div class="chat-messages" id="artisan-chat-messages">
              ${loadMessagesHtml()}
            </div>
            <div class="chat-footer">
              <input type="text" class="chat-input-box" id="artisan-chat-input" placeholder="اكتب ردك للعميل هنا...">
              <button class="btn-primary" id="btn-artisan-send-msg" style="padding:0.5rem; border-radius:10px; width:40px; height:40px; justify-content:center;">
                🕊️
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const chatContainer = document.getElementById("artisan-chat-messages");
    chatContainer.scrollTop = chatContainer.scrollHeight;

    document.getElementById("close-artisan-chat").addEventListener("click", () => {
      modalContainer.innerHTML = "";
    });

    const msgInput = document.getElementById("artisan-chat-input");
    const sendBtn = document.getElementById("btn-artisan-send-msg");

    const sendMessage = () => {
      const txt = msgInput.value.trim();
      if (!txt) return;

      db.addDocument("messages", {
        jobId: jobId,
        senderId: "art-1-user",
        receiverId: "cust-1",
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

    const chatUpdateListener = (e) => {
      if (e.detail.collection === "messages") {
        chatContainer.innerHTML = loadMessagesHtml();
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    };
    window.addEventListener('harfagy_db_update', chatUpdateListener);

    document.getElementById("close-artisan-chat").addEventListener("click", () => {
      window.removeEventListener('harfagy_db_update', chatUpdateListener);
    });
  }

  /* Simulated Lead pop up with countdown bar & ringing */
  triggerInvestorLeadMock() {
    const modalContainer = document.getElementById("artisan-modal-container");
    if (!modalContainer) return;

    // Try playing sound alert
    try {
      const audio = document.getElementById("lead-alert-sound");
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(err => console.log("Sound play requires user interaction first: ", err));
      }
    } catch(e) {}

    modalContainer.innerHTML = `
      <div class="modal-overlay open" id="lead-alert-modal" style="z-index: 1000;">
        <div class="modal-content" style="max-width:340px; margin:auto; border-radius:24px; text-align:center;">
          <div class="lead-modal-content">
            <div class="lead-radar-animation">
              <div class="lead-radar-circle"></div>
              <div class="lead-radar-icon">🛵</div>
            </div>
            
            <h3 style="font-weight:800; color:var(--primary-navy);">طلب صيانة قريب وارد! ⚡</h3>
            <p style="font-size:0.75rem; color:var(--text-muted);">عميل على بعد 1.2 كم في منطقتك الجغرافية يطلب خدمة صيانة عاجلة.</p>
            
            <div style="background:var(--bg-app); border:1px solid var(--border-color); padding:0.6rem; border-radius:12px; width:100%; font-size:0.75rem; text-align:right;">
              <strong>العميل المجدد:</strong> أحمد السيد<br>
              <strong>المشكلة:</strong> صمام المياه الرئيسي معطل ويقوم بتسريب في صالة المدخل.<br>
              <strong>رسوم الكشف:</strong> 50 ج.م كاش
            </div>
            
            <!-- Countdown Progress Bar -->
            <div class="lead-timer-progress">
              <div class="lead-timer-bar" id="lead-countdown-bar"></div>
            </div>
            <div style="font-size:0.65rem; color:var(--rose); font-weight:700;">الموعد ينتهي خلال: <span id="lead-countdown-sec">10</span> ثواني</div>
            
            <div style="display:flex; gap:0.5rem; width:100%;">
              <button class="btn-primary" id="btn-accept-lead" style="flex:2; font-size:0.75rem; background:var(--emerald);">قبول الطلب ✅</button>
              <button class="btn-secondary" id="btn-reject-lead" style="flex:1; font-size:0.75rem; color:var(--rose); border-color:var(--rose);">تجاهل</button>
            </div>
          </div>
        </div>
      </div>
    `;

    let timeRemaining = 10;
    const bar = document.getElementById("lead-countdown-bar");
    const label = document.getElementById("lead-countdown-sec");

    const timer = setInterval(() => {
      timeRemaining--;
      if (label) label.textContent = timeRemaining;
      if (bar) bar.style.width = (timeRemaining * 10) + "%";
      
      if (timeRemaining <= 0) {
        clearInterval(timer);
        this.closeLeadModal();
      }
    }, 1000);

    const closeAlert = () => {
      clearInterval(timer);
      this.closeLeadModal();
    };

    document.getElementById("btn-reject-lead").addEventListener("click", closeAlert);
    
    document.getElementById("btn-accept-lead").addEventListener("click", () => {
      clearInterval(timer);
      // Register job in DB
      db.addDocument("jobs", {
        customerId: "cust-2",
        customerName: "أحمد السيد (محاكاة)",
        customerPhone: "01288887777",
        artisanId: this.artisanId,
        artisanName: "الأسطى عبده السباك",
        category: "plumber",
        description: "صمام المياه الرئيسي معطل ويقوم بتسريب في صالة المدخل.",
        preferredDate: new Date().toISOString().split('T')[0],
        paymentMethod: "cash",
        status: "accepted",
        price: 50,
        isRated: false
      });
      
      this.closeLeadModal();
      alert("🎉 تم قبول الطلب بنجاح! انتقل للشاشة الرئيسية لبدء الحركة لموقع العميل.");
      this.render();
      this.bindEvents();
    });
  }

  closeLeadModal() {
    const modalContainer = document.getElementById("artisan-modal-container");
    if (modalContainer) modalContainer.innerHTML = "";
  }

  getCategoryName(cat) {
    const names = { plumber: "سباكة", electrician: "كهرباء", hvac: "تكييفات", carpenter: "نجارة" };
    return names[cat] || cat;
  }

  renderProfileView() {
    const art = db.getDocument("artisans", this.artisanId);
    if (!art) return `<div style="padding:2rem; text-align:center;">تعذر تحميل الملف الشخصي.</div>`;
    
    const session = JSON.parse(localStorage.getItem("harfagy_session") || "{}");
    const showEmailAlert = art.emailVerified === "pending" || session.emailVerified === "pending";
    const showWhatsAppAlert = art.phoneVerified === "pending" || session.phoneVerified === "pending";
    
    let alertsHtml = "";
    if (showEmailAlert) {
      alertsHtml += `
        <div class="verification-alert" id="email-verification-alert" style="background:rgba(245, 158, 11, 0.08); border:1px solid var(--amber); padding:1rem; border-radius:18px; text-align:right; margin-bottom:0.5rem;">
          <strong style="font-size:0.75rem; color:var(--amber);">📧 تأكيد البريد الإلكتروني معلق!</strong>
          <p style="font-size:0.65rem; color:var(--text-muted); margin-top:0.2rem;">يرجى تأكيد بريدك الإلكتروني لتلقي إشعارات مستحقات المحفظة وتحديثات العمولات.</p>
          <button class="btn-primary" id="btn-verify-email" style="margin-top:0.5rem; padding:0.35rem 0.75rem; font-size:0.7rem; background:var(--amber); border:none; border-radius:8px; color:white; cursor:pointer;">أرسل رمز تفعيل البريد</button>
        </div>
      `;
    }
    if (showWhatsAppAlert) {
      alertsHtml += `
        <div class="verification-alert" id="whatsapp-verification-alert" style="background:rgba(16, 185, 129, 0.08); border:1px solid var(--emerald); padding:1rem; border-radius:18px; text-align:right; margin-bottom:0.5rem;">
          <strong style="font-size:0.75rem; color:var(--emerald);">🟢 تأكيد الواتساب معلق!</strong>
          <p style="font-size:0.65rem; color:var(--text-muted); margin-top:0.2rem;">يرجى ربط وتأكيد حساب الواتساب الخاص بك لتلقي طلبات الصيانة العاجلة فوراً.</p>
          <button class="btn-primary" id="btn-verify-whatsapp" style="margin-top:0.5rem; padding:0.35rem 0.75rem; font-size:0.7rem; background:var(--emerald); border:none; border-radius:8px; color:white; cursor:pointer;">تأكيد عبر الواتساب الآن</button>
        </div>
      `;
    }
    
    return `
      <div class="customer-header">
        <h2 style="font-weight:800; font-size:1.1rem;">الملف المهني للحرفي 🛠️</h2>
        <p style="font-size:0.7rem; color:var(--text-muted);">عرض إحصاءات عملك وإدارة توثيق بيانات الاتصال</p>
      </div>
      
      <div style="flex:1; overflow-y:auto; padding:1.5rem; display:flex; flex-direction:column; gap:1.25rem;">
        
        <!-- Alerts -->
        ${alertsHtml}

        <!-- Profile Card -->
        <div style="background:var(--bg-card); border:1px solid var(--border-color); padding:1.25rem; border-radius:18px; text-align:center;">
          <img src="https://api.dicebear.com/7.x/bottts/svg?seed=${art.name}" style="width:72px; height:72px; border-radius:50%; border:3px solid var(--primary-orange); margin-bottom:0.5rem;">
          <h3 style="font-weight:800; font-size:1rem; color:var(--text-color);">${art.name}</h3>
          <span style="font-size:0.75rem; font-weight:700; color:var(--primary-orange); background:rgba(249,115,22,0.1); padding:0.2rem 0.6rem; border-radius:10px; display:inline-block; margin-top:0.25rem;">
            الحالة: ${art.verified ? 'حساب موثق بالفيش الجنائي 🛡️' : 'بانتظار التحقق الأمني ⏳'}
          </span>
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
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
            <span style="color:var(--text-muted);">التخصص المهني</span>
            <strong style="color:var(--text-color);">${this.getCategoryName(art.category)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; border-bottom:1px solid var(--border-color); padding-bottom:0.5rem;">
            <span style="color:var(--text-muted);">التقييم الإجمالي</span>
            <strong style="color:var(--text-color);">⭐ ${art.rating} (${art.completedJobs} خدمة منجزة)</strong>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem;">
            <span style="color:var(--text-muted);">المنطقة الجغرافية</span>
            <strong style="color:var(--text-color);">${session.governorate || 'الجيزة'} - ${session.district || 'حدائق الأهرام'}</strong>
          </div>
        </div>

        <!-- Bio Card -->
        <div style="background:var(--bg-card); border:1px solid var(--border-color); padding:1rem; border-radius:18px;">
          <span style="font-size:0.7rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:0.25rem;">📝 نبذة مهنية للعملاء</span>
          <p style="font-size:0.75rem; color:var(--text-color); line-height:1.4;">${art.bio}</p>
        </div>

        <!-- Big Red Logout Button -->
        <button id="btn-profile-logout" style="width:100%; padding:0.75rem; font-size:0.85rem; font-weight:700; border-radius:14px; border:none; background:var(--rose); color:white; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.5rem; box-shadow:0 4px 6px -1px rgba(244,63,94,0.2);">
          🚪 تسجيل الخروج من الحساب
        </button>
      </div>
    `;
  }
}
