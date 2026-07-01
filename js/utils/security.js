/* Security Helpers: XSS Sanitization & Simulated 2FA */

/**
 * Escapes HTML characters to prevent cross-site scripting (XSS) attacks.
 * @param {string} string Input from form fields (chat, complaints, settings)
 * @returns {string} Safe text
 */
export function sanitizeHTML(string) {
  if (typeof string !== 'string') return string;
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    "/": '&#x2F;',
    "`": '&grave;'
  };
  const reg = /[&<>"'/`]/ig;
  return string.replace(reg, (match) => map[match]);
}

/**
 * Audit Log structure creator helper
 */
export function createAuditLog(action, userRole, details = "") {
  const logs = JSON.parse(localStorage.getItem("audit_logs") || "[]");
  const newLog = {
    id: 'log-' + Date.now() + Math.random().toString(36).substr(2, 4),
    timestamp: new Date().toISOString(),
    action,
    role: userRole,
    details,
    ip: "197." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255) + "." + Math.floor(Math.random() * 255),
    userAgent: navigator.userAgent.split(')')[0] + ')'
  };
  logs.unshift(newLog);
  localStorage.setItem("audit_logs", JSON.stringify(logs.slice(0, 100))); // Limit to last 100 logs
  
  // Dispatch dynamic update event so other views reflect the log immediately
  window.dispatchEvent(new Event('audit_logs_updated'));
  return newLog;
}

/**
 * Simulated 2FA Modal Verification
 * Opens an overlay and waits for user interaction. Resolves true if code matches, false otherwise.
 */
export function simulate2FA(onConfirm, onCancel) {
  // Generate a random 6 digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Create 2FA modal markup
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay open";
  overlay.style.position = "fixed";
  overlay.style.zIndex = "9999";
  
  // Create a simulated sms popup
  setTimeout(() => {
    alert(`[حرفجي - محاكاة SMS 💬] رمز التحقق الثنائي (2FA) الخاص بك هو: ${code}`);
  }, 500);

  overlay.innerHTML = `
    <div class="modal-content" style="max-width: 360px; margin: auto; border-radius: 24px; padding: 2rem; direction: rtl; text-align: center;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">🔐</div>
      <h3 style="margin-bottom: 0.5rem; font-weight: 800;">التحقق الثنائي (2FA)</h3>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1.5rem;">
        لقد أرسلنا رمز تحقق مكون من 6 أرقام لهاتفك المسجل لإتمام هذه العملية الحساسة.
      </p>
      
      <div style="display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 1.5rem;" id="code-inputs">
        <input type="text" maxlength="6" id="twofa-code-input" placeholder="------" 
               style="width: 150px; height: 48px; text-align: center; font-size: 1.5rem; font-weight: 800; letter-spacing: 0.5rem; border: 2px solid var(--border-color); border-radius: 12px; background: var(--bg-app); color: var(--text-color); outline: none;">
      </div>
      
      <div style="display: flex; gap: 0.75rem;">
        <button class="btn-primary" id="btn-confirm-2fa" style="flex: 1;">تأكيد الرمز</button>
        <button class="btn-secondary" id="btn-cancel-2fa" style="flex: 1;">إلغاء</button>
      </div>
      <div id="twofa-error-msg" style="color: var(--rose); font-size: 0.75rem; margin-top: 0.75rem; display: none; font-weight: 700;">
        الرمز غير صحيح، يرجى المحاولة مرة أخرى!
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  const input = overlay.querySelector("#twofa-code-input");
  input.focus();
  
  overlay.querySelector("#btn-confirm-2fa").addEventListener("click", () => {
    if (input.value.trim() === code) {
      document.body.removeChild(overlay);
      if (onConfirm) onConfirm();
    } else {
      const errorMsg = overlay.querySelector("#twofa-error-msg");
      errorMsg.style.display = "block";
      input.value = "";
      input.focus();
    }
  });
  
  overlay.querySelector("#btn-cancel-2fa").addEventListener("click", () => {
    document.body.removeChild(overlay);
    if (onCancel) onCancel();
  });
}
