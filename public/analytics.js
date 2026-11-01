/* BrickCollect visitor counting with Google Analytics 4 (measurement ID below is public by design).
   - Runs only on the live site (brickcollect.app), so preview testing isn't counted.
   - No advertising features: ad storage and personalisation are always off.
   - UK, Europe and Switzerland: analytics cookies stay off until the visitor says OK in a small bar
     (Google's consent mode still sends anonymous, cookie-free pings). Elsewhere it's on, as the privacy page explains.
   - Anyone can change their choice on the privacy page (window.bcAnalytics.set('granted' | 'denied')). */
(function () {
  const ID = 'G-M97TY760H1';
  const LIVE = ['brickcollect.app', 'www.brickcollect.app'];
  const KEY = 'bc.analytics';
  const store = {
    get() { try { return localStorage.getItem(KEY); } catch { return null; } },
    set(v) { try { localStorage.setItem(KEY, v); } catch { /* private mode: choice lasts this visit */ } },
  };
  const ASK_REGIONS = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'LV', 'LI', 'LT',
    'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'CH'];

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  const ads = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
  gtag('consent', 'default', { ...ads, analytics_storage: 'granted' });
  gtag('consent', 'default', { ...ads, analytics_storage: 'denied', region: ASK_REGIONS });
  const saved = store.get();
  if (saved === 'granted' || saved === 'denied') gtag('consent', 'update', { analytics_storage: saved });

  window.bcAnalytics = {
    choice: () => store.get(),
    set(v) {
      if (v !== 'granted' && v !== 'denied') return;
      store.set(v);
      gtag('consent', 'update', { analytics_storage: v });
      document.getElementById('bcConsent')?.remove();
    },
  };

  if (!LIVE.includes(location.hostname)) return;

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${ID}`;
  document.head.appendChild(s);
  gtag('js', new Date());
  gtag('config', ID, { allow_google_signals: false, allow_ad_personalization_signals: false });

  // Ask only visitors in Europe (judged by their device's time zone) who haven't chosen yet.
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { /* unknown */ }
  if (saved || !/^(Europe\/|Atlantic\/(Reykjavik|Canary|Madeira|Faroe))/.test(tz)) return;

  function showBar() {
    if (document.getElementById('bcConsent')) return;
    const bar = document.createElement('div');
    bar.id = 'bcConsent';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Visit counting');
    bar.innerHTML = `
      <style>
        #bcConsent{position:fixed;left:0;right:0;bottom:0;z-index:50;background:var(--panel,#0f192d);color:var(--fg,#e5ebf6);
          border-top:1px solid var(--line-2,#2a3a5c);padding:10px max(16px,env(safe-area-inset-right,0px)) calc(10px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));
          display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;font:13px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif}
        #bcConsent p{margin:0;max-width:62ch;color:var(--muted,#8693ae)}
        #bcConsent a{color:var(--accent,#1fb3e5)}
        #bcConsent .b{display:flex;gap:8px}
        #bcConsent button{font:inherit;cursor:pointer;border-radius:7px;padding:6px 12px;border:1px solid var(--line-2,var(--line,#2a3a5c));background:transparent;color:var(--fg,#e5ebf6)}
        #bcConsent button.ok{background:var(--accent,#1fb3e5);border-color:var(--accent,#1fb3e5);color:var(--accent-ink,#04121b)}
      </style>
      <p>BrickCollect uses Google Analytics to count visits. No ads, nothing sold. <a href="/privacy">Privacy</a></p>
      <div class="b"><button type="button" data-v="denied">No thanks</button><button type="button" class="ok" data-v="granted">OK</button></div>`;
    bar.addEventListener('click', e => { const v = e.target.closest('button')?.dataset.v; if (v) window.bcAnalytics.set(v); });
    document.body.appendChild(bar);
  }
  if (document.body) showBar(); else document.addEventListener('DOMContentLoaded', showBar);
})();
