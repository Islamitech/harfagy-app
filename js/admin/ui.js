/* Admin Panel View Controller and Dynamic Renderer */
import { db } from '../db/store.js';
import { sanitizeHTML, createAuditLog, simulate2FA } from '../utils/security.js';

export class AdminUI {
  constructor(container) {
    this.container = container;
    this.isMounted = false;
    this.activeRole = "superadmin"; // superadmin, security, auditor
    this.activeSubTab = "analytics"; // analytics, verification, disputes, users, logs
    this.searchTerm = "";
  }

  setContainer(newContainer) {
    this.container = newContainer;
  }

  mount() {
    this.isMounted = true;
    this.render();
    this.bindEvents();
  }

  handleDbUpdate(collection) {
    if (!this.isMounted) return;
    console.log("Admin UI refreshing due to DB changes in collection:", collection);
    this.render();
    this.bindEvents();
  }

  render() {
    let sideMenuHtml = this.renderSideMenu();
    let mainContentHtml = "";

    switch (this.activeSubTab) {
      case "analytics":
        mainContentHtml = this.renderAnalytics();
        break;
      case "verification":
        mainContentHtml = this.renderVerifications();
        break;
      case "disputes":
        mainContentHtml = this.renderDisputes();
        break;
      case "users":
        mainContentHtml = this.renderUsers();
        break;
      case "logs":
        mainContentHtml = this.renderAuditLogs();
        break;
    }

    this.container.innerHTML = `
      <div class="admin-wrapper" style="display:flex; flex-direction:column; height:100%; direction:rtl; text-align:right;">
        <!-- Admin header containing role switcher -->
        <div class="admin-header">
          <div class="admin-header-row">
            <div>
              <h2 style="font-size:1.1rem; font-weight:800; color:white;">💼 لوحة الإدارة والأمان للمنصة</h2>
              <span style="font-size:0.6rem; color:rgba(255,255,255,0.7);">رتبة النظام الحالية: </span>
              <span class="admin-role-badge" id="lbl-active-role">${this.getRoleLabel(this.activeRole)}</span>
            </div>
            
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <div style="font-size:0.7rem; color:var(--rose); font-weight:700;">
                ⚠️ إشعارات حرجة: <span style="background:var(--rose); color:white; padding:0.1rem 0.3rem; border-radius:4px; font-weight:800;" id="critical-notification-count">0</span>
              </div>
              <button id="btn-logout-trigger-admin" style="background:transparent; border:none; cursor:pointer; font-size:1.25rem; outline:none;" title="تسجيل الخروج">
                🚪
              </button>
            </div>
          </div>
          
          <div class="admin-role-selector-bar">
            <button class="admin-role-btn ${this.activeRole === 'superadmin' ? 'active' : ''}" data-role="superadmin">مدير عام</button>
            <button class="admin-role-btn ${this.activeRole === 'security' ? 'active' : ''}" data-role="security">مشرف أمني</button>
            <button class="admin-role-btn ${this.activeRole === 'auditor' ? 'active' : ''}" data-role="auditor">مشرف مالي</button>
          </div>
        </div>
        
        <!-- Tab navigation inside sub-panel -->
        <div style="display:flex; flex:1; overflow:hidden;">
          <!-- Sidebar tabs -->
          <div style="width:75px; background:var(--primary-navy); border-left:1px solid var(--border-dark); display:flex; flex-direction:column; align-items:center; padding:1rem 0; gap:1.25rem;">
            ${sideMenuHtml}
          </div>
          
          <!-- Subtab screen wrapper -->
          <div style="flex:1; overflow-y:auto; padding:1rem; background:var(--bg-app);" id="admin-subtab-wrapper">
            ${mainContentHtml}
          </div>
        </div>
      </div>
    `;
    
    this.updateCriticalAlertsCount();
  }

  renderSideMenu() {
    const menus = [
      { id: "analytics", icon: "📊", label: "الرئيسية" },
      { id: "verification", icon: "👮", label: "التوثيق" },
      { id: "disputes", icon: "⚖️", label: "النزاعات" },
      { id: "users", icon: "👤", label: "الحسابات" },
      { id: "logs", icon: "🕵️", label: "الرقابة" }
    ];

    return menus.map(m => `
      <div class="phone-nav-item ${this.activeSubTab === m.id ? 'active' : ''}" data-subtab="${m.id}" style="color:${this.activeSubTab === m.id ? 'var(--primary-orange)' : 'rgba(255,255,255,0.6)'};">
        <span style="font-size:1.35rem; margin-bottom:0.15rem;">${m.icon}</span>
        <span style="font-size:0.55rem; font-weight:700;">${m.label}</span>
      </div>
    `).join("");
  }

  renderAnalytics() {
    const jobs = db.getCollection("jobs");
    const artisans = db.getCollection("artisans");
    const totalVolume = jobs.reduce((sum, j) => sum + (j.price || 0), 0);
    const platformComm = jobs.reduce((sum, j) => sum + ((j.price || 0) * 0.15), 0);

    return `
      <h3 style="font-weight:800; font-size:1rem; margin-bottom:0.75rem; color:var(--text-color);">مؤشرات الأداء العام للمنصة 📈</h3>
      
      <!-- Metrics overview cards -->
      <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:0.5rem; margin-bottom:1rem;">
        <div class="metric-card">
          <span class="metric-card-title">إجمالي المدفوعات كاش</span>
          <span class="metric-card-value" style="color:var(--emerald); font-size:1rem;">${totalVolume.toFixed(2)} ج.م</span>
        </div>
        <div class="metric-card">
          <span class="metric-card-title">عمولات المنصة المستحقة</span>
          <span class="metric-card-value" style="color:var(--primary-orange); font-size:1rem;">${platformComm.toFixed(2)} ج.م</span>
        </div>
        <div class="metric-card">
          <span class="metric-card-title">حجم الطلبات المنجزة</span>
          <span class="metric-card-value" style="font-size:1rem;">${jobs.filter(j=>j.status==='completed').length} طلب</span>
        </div>
        <div class="metric-card">
          <span class="metric-card-title">الحرفيين المسجلين بالمنصة</span>
          <span class="metric-card-value" style="font-size:1rem;">${artisans.length} حرفي</span>
        </div>
      </div>
      
      <!-- SVG Analytics Graphs -->
      <div class="chart-container">
        <div class="chart-title">حجم نمو العمليات الشهري (صيانة منزلية)</div>
        <div class="svg-chart-wrapper">
          <svg viewBox="0 0 300 100">
            <!-- Grid lines -->
            <line class="chart-grid-line" x1="0" y1="20" x2="300" y2="20" />
            <line class="chart-grid-line" x1="0" y1="50" x2="300" y2="50" />
            <line class="chart-grid-line" x1="0" y1="80" x2="300" y2="80" />
            
            <!-- Growth Curve Path -->
            <path class="chart-line" d="M 20 80 Q 70 75, 120 50 T 220 30 T 280 15" />
            
            <!-- Nodes -->
            <circle cx="20" cy="80" r="4" fill="var(--primary-orange)" />
            <circle cx="120" cy="50" r="4" fill="var(--primary-orange)" />
            <circle cx="220" cy="30" r="4" fill="var(--primary-orange)" />
            <circle cx="280" cy="15" r="4" fill="var(--primary-orange)" />
          </svg>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.6rem; color:var(--text-muted); margin-top:0.3rem;">
          <span>مارس</span>
          <span>أبريل</span>
          <span>مايو</span>
          <span>يونيو (الذروة)</span>
        </div>
      </div>
      
      <div class="chart-container">
        <div class="chart-title">توزيع الطلبات الجغرافية بالمحافظات</div>
        <div class="svg-chart-wrapper" style="height:90px;">
          <svg viewBox="0 0 300 90">
            <!-- Cairo bar -->
            <text x="10" y="25" font-size="8" font-weight="bold" fill="var(--text-color)">القاهرة</text>
            <rect class="chart-bar" x="60" y="15" width="200" height="12" rx="4" />
            <text x="270" y="25" font-size="8" font-weight="bold" fill="var(--emerald)">66%</text>
            
            <!-- Giza bar -->
            <text x="10" y="50" font-size="8" font-weight="bold" fill="var(--text-color)">الجيزة</text>
            <rect class="chart-bar" x="60" y="40" width="80" height="12" rx="4" style="fill:#3b82f6;" />
            <text x="270" y="50" font-size="8" font-weight="bold" fill="#3b82f6">24%</text>
            
            <!-- Alex bar -->
            <text x="10" y="75" font-size="8" font-weight="bold" fill="var(--text-color)">الإسكندرية</text>
            <rect class="chart-bar" x="60" y="65" width="30" height="12" rx="4" style="fill:#8b5cf6;" />
            <text x="270" y="75" font-size="8" font-weight="bold" fill="#8b5cf6">10%</text>
          </svg>
        </div>
      </div>
      
      <!-- Market Pricing settings (Super admin only) -->
      ${this.activeRole === 'superadmin' ? `
        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:16px; padding:1rem; margin-top:1rem;">
          <h4 style="font-size:0.8rem; font-weight:800; margin-bottom:0.5rem;">تعديل الأسعار الإرشادية لرسوم الكشف بالمنصة ⚙️</h4>
          <div style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.75rem;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span>رسوم كشف السباكة:</span>
              <div>
                <input type="number" id="fee-plumber" value="50" style="width:50px; text-align:center; padding:0.15rem; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none;"> ج.م
              </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span>رسوم كشف الكهرباء:</span>
              <div>
                <input type="number" id="fee-electrician" value="60" style="width:50px; text-align:center; padding:0.15rem; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-app); color:var(--text-color); outline:none;"> ج.م
              </div>
            </div>
            <button class="btn-primary" id="btn-save-fees" style="font-size:0.7rem; padding:0.35rem; width:100%; margin-top:0.4rem;">حفظ إعدادات السوق المالي</button>
          </div>
        </div>
      ` : ''}
    `;
  }

  renderVerifications() {
    if (this.activeRole === "auditor") {
      return `<div style="text-align:center; padding:3rem 1rem; color:var(--text-muted); font-size:0.8rem;">
        🔒 عذراً، لا تمتلك صلاحيات لمراجعة وثائق الهوية والاعتمادات الأمنية. هذه الصلاحية للمشرف الأمني والمدير العام فقط.
      </div>`;
    }

    const tickets = db.getCollection("verifications");
    const pendingTickets = tickets.filter(t => t.status === "pending");

    let ticketsHtml = pendingTickets.length > 0 ? pendingTickets.map(t => `
      <div class="verification-ticket animate-slide">
        <div class="ticket-header">
          <span>طلب توثيق #${t.id.substring(0, 6)}</span>
          <span class="badge badge-amber">معلق المراجعة</span>
        </div>
        
        <div class="ticket-body">
          <strong>الاسم:</strong> ${t.artisanName}<br>
          <strong>المستندات المرفقة:</strong> ${t.documentType}<br>
          <small>تاريخ التقديم: ${new Date(t.submittedAt).toLocaleDateString('ar-EG')}</small>
        </div>
        
        <div class="document-preview-box">
          📂 <span>صورة الفيش الجنائي وبطاقة الرقم القومي الرقمية: ${t.filePreview}</span>
        </div>
        
        <div class="ticket-actions">
          <button class="ticket-btn-accept btn-ver-accept" data-ticket-id="${t.id}" data-art-id="${t.artisanId}">اعتماد وترقية الحرفي 🟢</button>
          <button class="ticket-btn-reject btn-ver-reject" data-ticket-id="${t.id}">رفض</button>
        </div>
      </div>
    `).join("") : `<div style="text-align:center; padding:4rem 1rem; color:var(--text-muted); font-size:0.8rem;">
      🎉 لا توجد طلبات توثيق معلقة حالياً. جميع الحرفيين تم البت في ملفاتهم.
    </div>`;

    return `
      <h3 style="font-weight:800; font-size:1rem; margin-bottom:0.75rem; color:var(--text-color);">بوابة مراجعة الفيش الجنائي واعتماد التوثيق 👮</h3>
      <p style="font-size:0.65rem; color:var(--text-muted); margin-bottom:1rem;">مراجعة صحيفة الحالة الجنائية وصور البطاقات للحرفيين الجدد لمنع دخول المحتالين للمنصة.</p>
      
      <div style="display:flex; flex-direction:column; gap:0.5rem;">
        ${ticketsHtml}
      </div>
    `;
  }

  renderDisputes() {
    if (this.activeRole === "auditor") {
      return `<div style="text-align:center; padding:3rem 1rem; color:var(--text-muted); font-size:0.8rem;">
        🔒 عذراً، لا تمتلك صلاحيات التحكيم في الشكاوى والنزاعات المفتوحة. هذه الصلاحية خاصة بالمشرف الأمني والمدير العام.
      </div>`;
    }

    const list = db.getCollection("complaints");
    const openDisputes = list.filter(c => c.status === "pending");

    let listHtml = openDisputes.length > 0 ? openDisputes.map(c => `
      <div class="dispute-ticket animate-slide">
        <div class="ticket-header">
          <span>نزاع #${c.id.substring(0, 6)}</span>
          <span class="badge badge-rose">مرفوع للإدارة</span>
        </div>
        
        <div class="ticket-body" style="font-size:0.7rem; line-height:1.4;">
          <strong>العميل:</strong> ${c.customerName} (طلب #${c.jobId.substring(0, 8)})<br>
          <strong>الفني المشكو ضده:</strong> ${c.artisanName}<br>
          <strong>نوع الخلاف:</strong> ${c.type}<br>
          <strong>تفاصيل النزاع:</strong> <span style="color:var(--text-muted);">${c.details}</span>
        </div>
        
        <div class="ticket-actions" style="margin-top:0.4rem; gap:0.35rem;">
          <button class="ticket-btn-accept btn-arbitrate-refund" data-comp-id="${c.id}" data-cust-id="${c.customerId}" data-job-id="${c.jobId}" style="font-size:0.65rem; padding:0.35rem 0.5rem; background:var(--emerald);">تعويض العميل 💵</button>
          <button class="ticket-btn-reject btn-arbitrate-warn" data-comp-id="${c.id}" style="font-size:0.65rem; padding:0.35rem 0.5rem; background:var(--amber);">تحذير الفني ⚠️</button>
          <button class="ticket-btn-reject btn-arbitrate-freeze" data-comp-id="${c.id}" data-art-id="${c.artisanId}" style="font-size:0.65rem; padding:0.35rem 0.5rem; background:var(--rose);">تجميد الفني 🔒</button>
        </div>
      </div>
    `).join("") : `<div style="text-align:center; padding:4rem 1rem; color:var(--text-muted); font-size:0.8rem;">
      🟢 لا يوجد نزاعات أو شكاوى معلقة بانتظار الفصل حالياً. العمل يسير بسلاسة.
    </div>`;

    return `
      <h3 style="font-weight:800; font-size:1rem; margin-bottom:0.75rem; color:var(--text-color);">غرفة النزاعات والشكاوى المفتوحة ⚖️</h3>
      <p style="font-size:0.65rem; color:var(--text-muted); margin-bottom:1rem;">التحكيم الفوري في الشكاوى المالية والفنية المرفوعة من العملاء لتعويضهم أو معاقبة الحرفيين المخالفين.</p>
      
      <div style="display:flex; flex-direction:column; gap:0.5rem;">
        ${listHtml}
      </div>
    `;
  }

  renderUsers() {
    if (this.activeRole === "auditor") {
      return `<div style="text-align:center; padding:3rem 1rem; color:var(--text-muted); font-size:0.8rem;">
        🔒 عذراً، لا تمتلك صلاحيات إدارة حسابات المستخدمين وحظرهم.
      </div>`;
    }

    const users = db.getCollection("users");
    const artisans = db.getCollection("artisans");
    
    const rowsHtml = users.map(user => {
      const isArtisan = user.role === "artisan";
      const artisan = isArtisan ? artisans.find(a => a.userId === user.id) : null;
      const isBlocked = artisan ? !artisan.verified && artisan.completedJobs === -1 : false; // Mocking block status in metadata

      // Email and Phone verification status
      const emailStatus = user.emailVerified || (artisan ? artisan.emailVerified : 'pending');
      const phoneStatus = user.phoneVerified || (artisan ? artisan.phoneVerified : 'pending');

      return `
        <tr>
          <td style="font-weight:700;">${user.name}</td>
          <td>
            ${user.phone}<br>
            <span class="badge ${phoneStatus === 'verified' ? 'badge-emerald' : 'badge-rose'} btn-verify-phone-manual" 
                  style="font-size:0.55rem; padding:0.1rem 0.25rem; margin-top:0.2rem; cursor:pointer;" 
                  data-user-id="${user.id}" data-artisan-id="${artisan?.id || ''}">
              ${phoneStatus === 'verified' ? '📞 هاتف موثق' : '📞 لم يؤكد (اضغط للتوثيق)'}
            </span>
          </td>
          <td>
            <span class="badge ${isArtisan ? 'badge-orange' : 'badge-navy'}" style="font-size:0.55rem; padding:0.1rem 0.25rem;">
              ${isArtisan ? 'حرفي' : 'عميل'}
            </span><br>
            <span class="badge ${emailStatus === 'verified' ? 'badge-emerald' : 'badge-rose'}" style="font-size:0.55rem; padding:0.1rem 0.25rem; margin-top:0.2rem;">
              ${emailStatus === 'verified' ? '📧 بريد مفعل' : '📧 لم يفعل'}
            </span>
          </td>
          <td>${user.district}</td>
          <td>
            ${isArtisan ? `
              <button class="btn-ban-toggle ${isBlocked ? 'unban' : 'ban'}" 
                      data-art-uid="${user.id}" data-art-id="${artisan?.id}" data-action="${isBlocked ? 'unban' : 'ban'}">
                ${isBlocked ? 'فك الحظر 🟢' : 'حظر الحساب 🚫'}
              </button>
            ` : `<span style="color:var(--text-muted);">أمن</span>`}
          </td>
        </tr>
      `;
    }).join("");

    return `
      <h3 style="font-weight:800; font-size:1rem; margin-bottom:0.5rem; color:var(--text-color);">سجل التحكم الشامل بالمستخدمين 👥</h3>
      
      <!-- Search inside table -->
      <div class="search-box-container" style="margin-bottom:0.75rem; padding:0.35rem 0.5rem;">
        <span>🔍</span>
        <input type="text" class="search-input" id="admin-user-search" placeholder="البحث بالاسم أو الهاتف..." style="font-size:0.75rem;">
      </div>

      <div style="overflow-x:auto;">
        <table class="admin-user-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>رقم الهاتف</th>
              <th>الدور</th>
              <th>الحي</th>
              <th>إجراءات الحظر</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  renderAuditLogs() {
    const logs = JSON.parse(localStorage.getItem("audit_logs") || "[]");

    let listHtml = logs.length > 0 ? logs.map(l => `
      <div class="audit-log-row ${this.getLogClass(l.role)} animate-slide">
        <div>
          <strong>الإجراء:</strong> ${l.action}
        </div>
        <div style="font-size:0.6rem; color:var(--text-muted); margin-top:0.15rem;">
          تفاصيل: ${l.details || 'لا يوجد'}
        </div>
        <div class="audit-log-meta">
          <span>الجهاز/المتصفح: ${l.userAgent.substring(0, 30)}...</span>
          <span>IP: ${l.ip}</span>
          <span>الوقت: ${new Date(l.timestamp).toLocaleTimeString('ar-EG')}</span>
        </div>
      </div>
    `).join("") : `<p style="font-size:0.75rem; color:var(--text-muted); text-align:center;">سجل التدقيق فارغ.</p>`;

    return `
      <h3 style="font-weight:800; font-size:1rem; margin-bottom:0.75rem; color:var(--text-color);">سجل التدقيق الأمني الصارم (Audit Logs) 🕵️</h3>
      <p style="font-size:0.65rem; color:var(--text-muted); margin-bottom:1rem;">تتبع تسلسلي لجميع تحركات المشرفين الأمنيين والماليين لزيادة ثقة المستثمرين.</p>
      
      <div class="audit-logs-list">
        ${listHtml}
      </div>
    `;
  }

  getRoleLabel(role) {
    const labels = { superadmin: "مدير عام 👑", security: "مشرف أمني 👮", auditor: "مشرف مالي 💵" };
    return labels[role] || role;
  }

  getLogClass(role) {
    const classes = { superadmin: "super", security: "security", auditor: "financial" };
    return classes[role] || "super";
  }

  updateCriticalAlertsCount() {
    // Count active complaints + pending verifications + pending withdrawals
    const compCount = db.getCollection("complaints").filter(c => c.status === "pending").length;
    const verCount = db.getCollection("verifications").filter(v => v.status === "pending").length;
    const wdCount = db.getCollection("withdrawals").filter(w => w.status === "pending").length;

    let count = 0;
    if (this.activeRole === "superadmin") count = compCount + verCount + wdCount;
    else if (this.activeRole === "security") count = compCount + verCount;
    else if (this.activeRole === "auditor") count = wdCount;

    const badge = document.getElementById("critical-notification-count");
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle("pulse", count > 0);
    }
  }

  /* Event Bindings */
  bindEvents() {
    // Logout action
    document.getElementById("btn-logout-trigger-admin")?.addEventListener("click", () => {
      import('../app.js').then(app => app.logoutUser());
    });

    // 1. Role button switcher clicks
    const btns = this.container.querySelectorAll(".admin-role-btn");
    btns.forEach(btn => {
      btn.addEventListener("click", () => {
        const newRole = btn.getAttribute("data-role");
        
        // Trigger simulated 2FA validation check for Supervisor roles (auditor, security, superadmin)
        simulate2FA(() => {
          this.activeRole = newRole;
          createAuditLog("تغيير صلاحية الرتبة", newRole, `تم تبديل الصلاحية النشطة إلى ${this.getRoleLabel(newRole)}`);
          this.render();
          this.bindEvents();
        }, () => {
          alert("❌ تم رفض تسجيل دخول الرتبة لعدم إدخال رمز التحقق الثنائي!");
        });
      });
    });

    // 2. Sidebar subtab click switches
    const tabItems = this.container.querySelectorAll("[data-subtab]");
    tabItems.forEach(item => {
      item.addEventListener("click", () => {
        this.activeSubTab = item.getAttribute("data-subtab");
        this.render();
        this.bindEvents();
      });
    });

    // 3. Verification accept / reject buttons
    this.container.querySelectorAll(".btn-ver-accept").forEach(btn => {
      btn.addEventListener("click", () => {
        const tId = btn.getAttribute("data-ticket-id");
        const artId = btn.getAttribute("data-art-id");

        db.updateDocument("verifications", tId, { status: "approved" });
        db.updateDocument("artisans", artId, { verified: true });
        
        createAuditLog("اعتماد وتوثيق فني", this.activeRole, `الموافقة على فيش جنائي للأسطى فني ID: ${artId}`);
        alert("✔️ تم اعتماد ملف الفني وترقية حسابه إلى 'موثق' بنجاح!");
        this.render();
        this.bindEvents();
      });
    });

    this.container.querySelectorAll(".btn-ver-reject").forEach(btn => {
      btn.addEventListener("click", () => {
        const tId = btn.getAttribute("data-ticket-id");
        db.updateDocument("verifications", tId, { status: "rejected" });
        
        createAuditLog("رفض ملف التوثيق للفني", this.activeRole, `رفض الوثائق الجنائية المرفقة بطلب ${tId}`);
        alert("❌ تم رفض طلب توثيق الفني وإبلاغه لإعادة إرفاق بطاقته بطريقة واضحة.");
        this.render();
        this.bindEvents();
      });
    });

    // 4. Disputes actions
    this.container.querySelectorAll(".btn-arbitrate-refund").forEach(btn => {
      btn.addEventListener("click", () => {
        const compId = btn.getAttribute("data-comp-id");
        const custId = btn.getAttribute("data-cust-id");
        const jobId = btn.getAttribute("data-job-id");

        // Compensate user (add 100 EGP to customer wallet in database)
        const user = db.getDocument("users", custId);
        if (user) {
          db.updateDocument("users", custId, { wallet: (user.wallet || 0) + 100 });
        }

        db.updateDocument("complaints", compId, {
          status: "resolved",
          resolution: "تم تعويض العميل بمبلغ 100 جنيه في محفظته الرقمية للتسوية."
        });

        db.updateDocument("jobs", jobId, { status: "completed" });

        createAuditLog("تسوية نزاع مالي (تعويض عميل)", this.activeRole, `تعويض العميل ${custId} بمبلغ 100 جنيه وحفظ شكوى ${compId}`);
        alert("💵 تم تعويض محفظة العميل بـ 100 ج.م كاش فوري وحل النزاع ودياً!");
        this.render();
        this.bindEvents();
      });
    });

    this.container.querySelectorAll(".btn-arbitrate-warn").forEach(btn => {
      btn.addEventListener("click", () => {
        const compId = btn.getAttribute("data-comp-id");
        
        db.updateDocument("complaints", compId, {
          status: "resolved",
          resolution: "تم توجيه إنذار رسمي أول للحرفي بعد مراجعة شات المحادثة."
        });

        createAuditLog("تحذير حرفي لشكوى سلوكية", this.activeRole, `إنذار الفني بسبب سلوك غير احترافي للشكوى رقم ${compId}`);
        alert("⚠️ تم إرسال تنبيه وإنذار رسمي لحساب الفني وتوثيقه بسجله المهني.");
        this.render();
        this.bindEvents();
      });
    });

    this.container.querySelectorAll(".btn-arbitrate-freeze").forEach(btn => {
      btn.addEventListener("click", () => {
        const compId = btn.getAttribute("data-comp-id");
        const artId = btn.getAttribute("data-art-id");

        // Freeze artisan: set verified false, completedJobs to -1 (banned code)
        db.updateDocument("artisans", artId, {
          verified: false,
          completedJobs: -1,
          isOnline: false
        });

        db.updateDocument("complaints", compId, {
          status: "resolved",
          resolution: "تم حظر وتجميد حساب الحرفي نهائياً من المنصة لمخالفته القواعد الأمنية."
        });

        createAuditLog("حظر وتجميد حساب حرفي", this.activeRole, `تجميد حساب الفني رقم ${artId} لارتكابه مخالفة جسيمة`);
        alert("🔒 تم تجميد حساب الفني وحظره من الدليل العام نهائياً!");
        this.render();
        this.bindEvents();
      });
    });

    // 5. User list Ban / Unban actions (with 2FA confirmation modal)
    this.container.querySelectorAll(".btn-ban-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const artId = btn.getAttribute("data-art-id");
        const action = btn.getAttribute("data-action");

        simulate2FA(() => {
          if (action === "ban") {
            db.updateDocument("artisans", artId, { verified: false, completedJobs: -1, isOnline: false });
            createAuditLog("حظر حساب مستخدم", this.activeRole, `حظر الفني رقم ${artId}`);
            alert("🚫 تم تجميد وحظر حساب الفني بنجاح.");
          } else {
            db.updateDocument("artisans", artId, { verified: true, completedJobs: 10, isOnline: true });
            createAuditLog("فك حظر حساب مستخدم", this.activeRole, `تنشيط الفني رقم ${artId}`);
            alert("🟢 تم تفعيل الحساب وفك حظره ليعود للدليل العام.");
          }
          this.render();
          this.bindEvents();
        }, () => {
          alert("❌ تم رفض إجراء الحظر/إلغاء الحظر لعدم استكمال التحقق الثنائي (2FA).");
        });
      });
    });

    // Toggling phone verification status manually by admin
    this.container.querySelectorAll(".btn-verify-phone-manual").forEach(badge => {
      badge.addEventListener("click", () => {
        const uId = badge.getAttribute("data-user-id");
        const artId = badge.getAttribute("data-artisan-id");
        
        const user = db.getDocument("users", uId);
        if (!user) return;
        
        const newStatus = user.phoneVerified === "verified" ? "pending" : "verified";
        
        // Update user
        db.updateDocument("users", uId, { phoneVerified: newStatus });
        
        // Update artisan profile if it exists
        if (artId) {
          db.updateDocument("artisans", artId, { phoneVerified: newStatus });
        }
        
        createAuditLog("تعديل توثيق هاتف يدوي", this.activeRole, `تعديل حالة توثيق الهاتف للمستخدم ${user.name} إلى ${newStatus === 'verified' ? 'موثق' : 'غير موثق'}`);
        alert(`📞 تم تعديل حالة توثيق هاتف المستخدم بنجاح إلى: ${newStatus === 'verified' ? 'موثق يدوياً' : 'قيد التحقق اليدوي'}`);
        
        this.render();
        this.bindEvents();
      });
    });

    // 6. Super Admin market pricing configurations
    document.getElementById("btn-save-fees").addEventListener("click", () => {
      const p = parseInt(document.getElementById("fee-plumber").value);
      const e = parseInt(document.getElementById("fee-electrician").value);
      
      const settings = JSON.parse(localStorage.getItem("harfagy_settings") || "{}");
      settings.inspectionFeePlumber = p;
      settings.inspectionFeeElectrician = e;
      localStorage.setItem("harfagy_settings", JSON.stringify(settings));

      createAuditLog("تعديل أسعار الكشف الإرشادية", this.activeRole, `تعديل رسوم كشف السباكة لـ ${p} والكهرباء لـ ${e}`);
      alert("✅ تم تعديل وحفظ أسعار الكشف الإرشادية لضبط توازن السوق بنجاح!");
    });

    // Auditor withdrawal requests list & approvals
    if (this.activeRole === "auditor" || this.activeRole === "superadmin") {
      this.bindAuditorWithdrawals();
    }
  }

  bindAuditorWithdrawals() {
    const listWrapper = document.getElementById("admin-subtab-wrapper");
    if (!listWrapper || this.activeSubTab !== "analytics") return;

    // Financial auditor checks withdrawals approvals
    const withdrawals = db.getCollection("withdrawals").filter(w => w.status === "pending");

    if (withdrawals.length > 0) {
      const wdSection = document.createElement("div");
      wdSection.style.marginTop = "1rem";
      wdSection.innerHTML = `
        <h4 style="font-size:0.8rem; font-weight:800; margin-bottom:0.5rem; color:var(--text-color);">طلبات سحب الأرباح الفورية المعلقة 💵</h4>
        <div style="display:flex; flex-direction:column; gap:0.5rem;">
          ${withdrawals.map(w => `
            <div class="verification-ticket" style="border-right:3px solid var(--emerald); padding:0.75rem;">
              <div class="ticket-header" style="font-size:0.7rem;">
                <strong>طلب سحب #${w.id.substring(0,6)}</strong>
                <span style="color:var(--emerald); font-weight:800;">${w.amount} ج.م</span>
              </div>
              <div style="font-size:0.65rem; color:var(--text-muted); margin:0.25rem 0;">
                المستلم: ${w.method} (${w.details})<br>
                التاريخ: ${new Date(w.timestamp).toLocaleDateString('ar-EG')}
              </div>
              <div style="display:flex; gap:0.35rem;">
                <button class="btn-primary btn-approve-wd" data-wd-id="${w.id}" style="font-size:0.65rem; padding:0.25rem 0.5rem; background:var(--emerald);">تحويل مالي فوري 🟢</button>
                <button class="btn-secondary btn-reject-wd" data-wd-id="${w.id}" style="font-size:0.65rem; padding:0.25rem 0.5rem; color:var(--rose); border-color:var(--rose);">رفض المعاملة</button>
              </div>
            </div>
          `).join("")}
        </div>
      `;
      listWrapper.appendChild(wdSection);

      // Bind withdrawal approvals
      wdSection.querySelectorAll(".btn-approve-wd").forEach(btn => {
        btn.addEventListener("click", () => {
          const wdId = btn.getAttribute("data-wd-id");

          // Large withdrawal safety validation (trigger simulated 2FA for large payout > 500 EGP)
          const transaction = db.getCollection("withdrawals").find(w => w.id === wdId);
          if (transaction && transaction.amount >= 500) {
            alert(`⚠️ تنبيه حماية: المبلغ المطلوب سحبه (${transaction.amount} ج.م) كبير. يتطلب موافقتك الثنائية (2FA) لتأكيد التحويل البنكي.`);
            simulate2FA(() => {
              this.approveWithdrawal(wdId);
            }, () => {
              alert("❌ تم إلغاء المعاملة لعدم تطابق كود الحماية.");
            });
          } else {
            this.approveWithdrawal(wdId);
          }
        });
      });

      wdSection.querySelectorAll(".btn-reject-wd").forEach(btn => {
        btn.addEventListener("click", () => {
          const wdId = btn.getAttribute("data-wd-id");
          db.updateDocument("withdrawals", wdId, { status: "rejected" });
          createAuditLog("رفض سحب أرباح", this.activeRole, `رفض تحويل مالي للطلب رقم ${wdId}`);
          alert("❌ تم رفض المعاملة المالية وإعادة الرصيد لمحفظة الحرفي.");
          this.render();
          this.bindEvents();
        });
      });
    }
  }

  approveWithdrawal(wdId) {
    db.updateDocument("withdrawals", wdId, { status: "completed" });
    createAuditLog("تحويل سحب أرباح معتمد", this.activeRole, `تحويل مالي ناجح للطلب رقم ${wdId}`);
    alert("✔️ تم تحويل المبلغ بنجاح عبر بوابة InstaPay / Vodafone Cash الفورية!");
    this.render();
    this.bindEvents();
  }
}
