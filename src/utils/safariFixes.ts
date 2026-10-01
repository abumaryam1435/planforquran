/**
 * Safari on iOS (iPhone/iPad) Comprehensive Compatibility & PWA Recovery Layer
 * Addresses: Storage Quotas, Private Browsing DOMExceptions, ES Polyfills, Viewport Height 100vh bugs, and White Screen Recovery.
 */

// 1. ES2020 / ES2022 Polyfills for Safari 14/15/16
if (typeof Object.hasOwn !== 'function') {
  Object.hasOwn = function (obj: any, prop: string) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

if (typeof Array.prototype.at !== 'function') {
  Array.prototype.at = function (index: number) {
    const len = this.length;
    const relIndex = Math.trunc(index) || 0;
    if (relIndex < 0) {
      return relIndex + len < 0 ? undefined : this[relIndex + len];
    }
    return relIndex >= len ? undefined : this[relIndex];
  };
}

// Ensure TextEncoder / TextDecoder exist
if (typeof window !== 'undefined') {
  if (!window.TextEncoder || !window.TextDecoder) {
    console.warn('TextEncoder/TextDecoder not available in this Safari version.');
  }
}

// 2. Safe LocalStorage & SessionStorage Monkey-Patch for Safari Private Browsing & Quota Limits
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.get(String(key)) ?? null; }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string) { this.store.delete(String(key)); }
  setItem(key: string, val: string) { this.store.set(String(key), String(val)); }
}

function patchWebStorage() {
  if (typeof window === 'undefined') return;

  const testStorage = (storageType: 'localStorage' | 'sessionStorage'): boolean => {
    try {
      const storage = window[storageType];
      if (!storage) return false;
      const testKey = '__safari_storage_test__';
      storage.setItem(testKey, '1');
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  };

  if (!testStorage('localStorage')) {
    console.warn('Safari localStorage restricted (Private Browsing or Quota exceeded). Falling back to MemoryStorage.');
    try {
      Object.defineProperty(window, 'localStorage', { value: new MemoryStorage(), writable: true });
    } catch (e) {
      console.error('Failed to monkey-patch localStorage', e);
    }
  }

  if (!testStorage('sessionStorage')) {
    console.warn('Safari sessionStorage restricted. Falling back to MemoryStorage.');
    try {
      Object.defineProperty(window, 'sessionStorage', { value: new MemoryStorage(), writable: true });
    } catch (e) {
      console.error('Failed to monkey-patch sessionStorage', e);
    }
  }
}

patchWebStorage();

// 3. Viewport dvh Helper for Safari Bottom Address Bar
function updateSafariViewportHeight() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--safari-dvh', `${vh * 100}px`);
}

if (typeof window !== 'undefined') {
  updateSafariViewportHeight();
  window.addEventListener('resize', updateSafariViewportHeight, { passive: true });
  window.addEventListener('orientationchange', updateSafariViewportHeight, { passive: true });
}

// 4. Global Error Handler & White Screen Prevention
function showEmergencyRecoveryUI(errorMessage: string, stack?: string) {
  if (typeof document === 'undefined') return;
  
  // Do not show if UI is already loaded and functional, unless root is empty
  const rootEl = document.getElementById('root');
  const isRootEmpty = !rootEl || rootEl.innerHTML.trim() === '';
  
  if (!isRootEmpty && !errorMessage.includes('ChunkLoadError') && !errorMessage.includes('Loading chunk')) {
    return;
  }

  const existingModal = document.getElementById('__safari_emergency_recovery__');
  if (existingModal) return;

  const banner = document.createElement('div');
  banner.id = '__safari_emergency_recovery__';
  banner.style.cssText = `
    position: fixed; inset: 0; z-index: 999999; background: #1A2E1A; color: #FDFBF7;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 24px; font-family: system-ui, -apple-system, sans-serif; direction: rtl; text-align: center;
  `;

  banner.innerHTML = `
    <div style="max-width: 420px; background: rgba(255,255,255,0.08); border: 1px solid rgba(212,175,55,0.4); border-radius: 20px; padding: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
      <div style="font-size: 40px; margin-bottom: 16px;">⚠️</div>
      <h2 style="font-size: 20px; font-weight: bold; color: #D4AF37; margin: 0 0 12px 0;">تنبيه توافق متصفح Safari</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #E5E5E5; margin: 0 0 20px 0;">
        واجه المتصفح صعوبة في تحميل البيانات المخزنة أوفلاين أو تحديث النسخة الجديدة. يمكنك إعادة تحميل التطبيق أو مسح الذاكرة المؤقتة لحل المشكلة فوراً.
      </p>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <button id="__recovery_reload_btn__" style="background: #D4AF37; color: #1A2E1A; border: none; padding: 14px; border-radius: 12px; font-weight: bold; font-size: 15px; cursor: pointer;">
          🔄 إعادة تحميل التطبيق
        </button>
        <button id="__recovery_purge_btn__" style="background: rgba(255,255,255,0.15); color: #FDFBF7; border: 1px solid rgba(255,255,255,0.3); padding: 12px; border-radius: 12px; font-weight: bold; font-size: 14px; cursor: pointer;">
          🧹 مسح الذاكرة المؤقتة والإصلاح
        </button>
      </div>
      <details style="margin-top: 18px; text-align: right; font-size: 11px; color: #999; direction: ltr;">
        <summary style="cursor: pointer;">تفاصيل الخطأ التقني</summary>
        <pre style="white-space: pre-wrap; word-break: break-all; margin-top: 8px; max-height: 100px; overflow: auto; background: rgba(0,0,0,0.4); padding: 8px; border-radius: 6px;">${errorMessage}\n${stack || ''}</pre>
      </details>
    </div>
  `;

  document.body.appendChild(banner);

  document.getElementById('__recovery_reload_btn__')?.addEventListener('click', () => {
    window.location.reload();
  });

  document.getElementById('__recovery_purge_btn__')?.addEventListener('click', async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const k of keys) await caches.delete(k);
      }
      localStorage.clear();
      sessionStorage.clear();
    } catch (err) {
      console.error('Error during recovery purge:', err);
    } finally {
      window.location.href = '/';
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Safari Global Error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
    showEmergencyRecoveryUI(`${event.message} (${event.filename?.split('/').pop()}:${event.lineno})`, event.error?.stack);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Safari Unhandled Rejection:', event.reason);
    const reasonStr = event.reason instanceof Error ? event.reason.message : String(event.reason);
    const stack = event.reason instanceof Error ? event.reason.stack : undefined;
    showEmergencyRecoveryUI(`Promise Rejection: ${reasonStr}`, stack);
  });

  // Emergency global helper for debugging
  (window as any).__purgeSafariCaches = async () => {
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const k of keys) await caches.delete(k);
    }
    console.log('Safari Caches purged successfully.');
  };
}
