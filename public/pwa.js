/* BrickCollect as an app: works offline, and can be installed to the home screen.
   - Registers the offline helper (sw.js) on the real site and the preview site only.
   - Shows "Install app" in the footer when the browser can install it (Android, Chromebook, desktop Chrome/Edge),
     or how-to steps on iPhone/iPad (Safari has no install button, so it's Share → Add to Home Screen).
   - Once, for returning phone visitors, a small bar offers the install. "Not now" hides it for good. */
(function () {
  const HOSTS = /^(brickcollect\.app|www\.brickcollect\.app|brickcollect-app(--[\w-]+)?\.web\.app|localhost|127\.0\.0\.1)$/;
  if (!HOSTS.test(location.hostname)) return;
  const KEY = 'bc-install';
  const store = { get() { try { return localStorage.getItem(KEY); } catch { return null; } },
                  set(v) { try { localStorage.setItem(KEY, v); } catch { /* ignore */ } } };
  const seenBefore = () => { try { return !!localStorage.getItem('bc-start'); } catch { return false; } };
  const gtag = (...a) => { try { window.gtag && window.gtag(...a); } catch { /* ignore */ } };

  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  gtag('set', 'user_properties', { display_mode: standalone ? 'app' : 'browser' });

  if ('serviceWorker' in navigator) {
    addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
  if (standalone) return;

  const ua = navigator.userAgent;
  const isIOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIOSSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|Instagram|FBAN|FBAV/.test(ua);
  const isPhone = matchMedia('(max-width: 640px)').matches;
  let deferred = null;

  const css = `
    #bcInstallBar{position:fixed;left:0;right:0;bottom:0;z-index:49;display:flex;gap:10px;align-items:center;justify-content:space-between;
      background:var(--panel,#0f192d);color:var(--fg,#e5ebf6);border-top:1px solid var(--line-2,#2a3a5c);
      padding:10px max(16px,env(safe-area-inset-right,0px)) calc(10px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));font:13px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif}
    #bcInstallBar img{width:36px;height:36px;border-radius:8px;flex:none}
    #bcInstallBar p{margin:0;flex:1;min-width:0}#bcInstallBar p b{display:block;font-size:14px}
    #bcInstallBar p span{color:var(--muted,#8693ae)}
    #bcInstallBar .b{display:flex;gap:6px;flex:none}
    .bcInst-btn{font:inherit;cursor:pointer;border-radius:7px;padding:7px 12px;border:1px solid var(--line-2,#2a3a5c);background:transparent;color:var(--fg,#e5ebf6)}
    .bcInst-btn.ok{background:var(--accent,#1fb3e5);border-color:var(--accent,#1fb3e5);color:var(--accent-ink,#04121b);font-weight:600}
    #bcInstallDlg{border:1px solid var(--line-2,#2a3a5c);border-radius:14px;background:var(--panel,#0f192d);color:var(--fg,#e5ebf6);
      padding:20px;max-width:min(360px,calc(100vw - 32px));font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
    #bcInstallDlg::backdrop{background:rgba(0,0,0,.5)}
    #bcInstallDlg h2{margin:0 0 8px;font-size:17px}#bcInstallDlg ol{margin:0 0 14px;padding-left:20px}#bcInstallDlg li{margin:4px 0}
    #bcInstallDlg .share{display:inline-block;vertical-align:-3px}`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  const SHARE = '<svg class="share" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Share"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8"/></svg>';
  function iosSteps() {
    let d = document.getElementById('bcInstallDlg');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'bcInstallDlg';
      d.innerHTML = `<h2>Add BrickCollect to your Home Screen</h2>
        <ol><li>Tap the Share button ${SHARE} in Safari’s toolbar.</li><li>Scroll down and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. BrickCollect opens full screen from its own icon.</li></ol>
        <button class="bcInst-btn ok" type="button">Got it</button>`;
      d.querySelector('button').addEventListener('click', () => d.close());
      document.body.appendChild(d);
    }
    d.showModal();
    store.set('helped'); // don't offer the bar again once they've seen the steps
    gtag('event', 'app_install_help', { platform: 'ios' });
  }
  async function install(from) {
    hideBar();
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice.catch(() => ({ outcome: 'dismissed' }));
      gtag('event', 'app_install_prompt', { outcome, from });
      if (outcome === 'accepted') store.set('installed');
      deferred = null; showLink();
    } else if (isIOS) iosSteps();
  }

  function showLink() {
    const a = document.getElementById('installLink');
    if (!a) return;
    a.hidden = !(deferred || isIOSSafari);
    a.onclick = e => { e.preventDefault(); install('footer'); };
  }
  function hideBar() { document.getElementById('bcInstallBar')?.remove(); }
  function maybeBar() {
    if (!isPhone || store.get() || !seenBefore() || document.getElementById('bcConsent') || document.getElementById('bcInstallBar')) return;
    if (!(deferred || isIOSSafari)) return;
    const bar = document.createElement('div'); bar.id = 'bcInstallBar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Install BrickCollect');
    bar.innerHTML = `<img src="/icon-192.png" alt=""><p><b>Get the BrickCollect app</b><span>Free, on your home screen, no app store.</span></p>
      <div class="b"><button class="bcInst-btn" type="button" data-v="no">Not now</button><button class="bcInst-btn ok" type="button" data-v="yes">Install</button></div>`;
    bar.addEventListener('click', e => {
      const v = e.target.closest('button')?.dataset.v; if (!v) return;
      if (v === 'no') { store.set('dismissed'); hideBar(); gtag('event', 'app_install_bar', { outcome: 'not_now' }); }
      else install('bar');
    });
    document.body.appendChild(bar);
  }

  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; showLink(); setTimeout(maybeBar, 4000); });
  addEventListener('appinstalled', () => { store.set('installed'); deferred = null; hideBar(); showLink(); gtag('event', 'app_installed'); });
  const ready = () => { showLink(); if (isIOSSafari) setTimeout(maybeBar, 4000); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
