/* Shared script for the static pages (home, set, theme and brand pages, /sets), built by firebase/build-pages.mjs.
   The header works like the app's: theme switch, currency, account button, ☰ menu, search (goes to My collection).
   On the home page, ticking a set saves it in this browser the same way the app does (bc-collection),
   so it's there when My collection opens; signed-in collectors (and anyone past the 10 free items) go to My collection instead. */
(() => {
  const $ = id => document.getElementById(id);
  const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const track = (name, p = {}) => { try { if (typeof window.gtag === 'function') window.gtag('event', name, p); } catch {} };
  const prefs = () => lsGet('bc-prefs') || {};
  const setPref = (k, v) => { const p = prefs(); p[k] = v; lsSet('bc-prefs', p); };

  /* theme: dark / mid / light, shared with the app */
  const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
  const MOON = '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>';
  const HALF = '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>';
  const THEMES = ['dark', 'mid', 'light'], NAME = { dark: 'Dark', mid: 'Mid', light: 'Light' }, ICON = { dark: MOON, mid: HALF, light: SUN };
  const curTheme = () => document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const paintTheme = () => { const t = curTheme(), nx = THEMES[(THEMES.indexOf(t) + 1) % 3], b = $('themeBtn'); if (!b) return; $('themeIcon').innerHTML = ICON[t]; b.title = `${NAME[t]} mode · click for ${NAME[nx]}`; b.setAttribute('aria-label', `Theme: ${NAME[t]}. Switch to ${NAME[nx]}`); };
  if ($('themeBtn')) $('themeBtn').onclick = () => { const t = THEMES[(THEMES.indexOf(curTheme()) + 1) % 3]; document.documentElement.setAttribute('data-theme', t); setPref('theme', t); paintTheme(); track('theme_mode', { mode: t }); };
  paintTheme();

  /* currency: same choice as the app (prices show in My collection) */
  const REGION_CUR = { AU: 'AUD', US: 'USD', GB: 'GBP', UK: 'GBP', CA: 'CAD', NZ: 'NZD', JP: 'JPY', CH: 'CHF', IE: 'EUR', DE: 'EUR', FR: 'EUR', NL: 'EUR', ES: 'EUR', IT: 'EUR', BE: 'EUR', AT: 'EUR', FI: 'EUR', PT: 'EUR' };
  const detect = () => { for (const l of (navigator.languages || [navigator.language || ''])) { const m = /-([A-Z]{2})\b/i.exec(l); if (m && REGION_CUR[m[1].toUpperCase()]) return REGION_CUR[m[1].toUpperCase()]; } return 'AUD'; };
  const sel = $('curSel');
  if (sel) {
    const c = prefs().currency || detect();
    if (![...sel.options].some(o => o.value === c)) sel.add(new Option(c, c));
    sel.value = c;
    sel.onchange = () => { setPref('currency', sel.value); track('currency', { currency: sel.value }); };
  }

  /* account button: your initial once you've signed in on this browser (saved by the app), else Sign in */
  const acct = lsGet('bc-acct'), ab = $('acctBtn');
  if (ab && acct && acct.n) { ab.classList.add('in'); ab.innerHTML = `<span class="full"></span><span class="short" aria-hidden="true"></span>`; ab.querySelector('.full').textContent = acct.n.slice(0, 14); ab.querySelector('.short').textContent = acct.n.slice(0, 1).toUpperCase(); ab.title = 'My account'; ab.href = '/account'; }

  /* home: the main button opens My collection once you're signed in */
  const hb = $('heroBtn'); if (hb && acct) { hb.textContent = 'Open My collection'; hb.href = '/collection'; }

  /* notice bar (copied from the app): shown until you hide it, on any page */
  const nb = $('blNotice');
  if (nb && nb.dataset.key) {
    let gone = false; try { gone = !!localStorage.getItem(nb.dataset.key); } catch {}
    if (!gone) {
      if (nb.dataset.back) try { const back = new Date(nb.dataset.back); const t = $('blBack'); if (t && !isNaN(back)) t.textContent = back.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', ...(back.getMinutes() ? { minute: '2-digit' } : {}) }).replace(/,(?= \d+ )/, ''); } catch {}
      nb.hidden = false;
      const x = $('hideBlNotice'); if (x) x.onclick = () => { nb.hidden = true; lsSet(nb.dataset.key, 1); track('notice_hide', { id: nb.dataset.key }); };
    }
  }

  /* Admin in the menu, for accounts that can open it (remembered by the app) */
  if (lsGet('bc-admin')) document.querySelectorAll('.hm-admin').forEach(x => { x.hidden = false; });
  if (acct) document.querySelectorAll('.hm-in').forEach(x => { x.hidden = false; }); // Sign out, when signed in on this browser

  /* Sign in on any page: a pop-up like the one in My collection, so you stay where you are.
     The sign-in code (Firebase) loads only when it's needed: when the pop-up opens, or when an email
     sign-in link brings you back to this page (the link returns to the page you started on). */
  const FB_SRC = ['app', 'auth', 'firestore'].map(m => `https://www.gstatic.com/firebasejs/11.10.0/firebase-${m}-compat.js`).concat(['/config.js', '/backend-firebase.js']);
  let fbLoading = null;
  const loadFB = () => fbLoading || (fbLoading = (async () => {
    if (window.BC && window.BC.auth) return window.BC;
    for (const src of FB_SRC) await new Promise((ok, bad) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const t = document.createElement('script'); t.src = src; t.onload = ok; t.onerror = bad; document.head.appendChild(t); });
    return window.BC;
  })());
  const IN_APP = (() => { const ua = navigator.userAgent || '';
    if (/Instagram/i.test(ua)) return 'Instagram'; if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return 'Facebook';
    if (/musical_ly|TikTok|BytedanceWebview/i.test(ua)) return 'TikTok'; if (/Snapchat/i.test(ua)) return 'Snapchat';
    if (/LinkedInApp/i.test(ua)) return 'LinkedIn'; return ''; })();
  // After signing in here: remember your initial for the header (like the app), count a new account once, then refresh this page.
  const signedIn = async (BC, how) => {
    const email = await BC.user.email(); if (!email) return false;
    lsSet('bc-acct', { n: email.split('@')[0] });
    try { if (await BC.user.isNew()) track('sign_up', { method: how, from: location.pathname }); else track('login', { method: how, from: location.pathname }); } catch {}
    return true;
  };
  function authDialog() {
    let d = $('authDlg'); if (d) return d;
    d = document.createElement('dialog'); d.className = 'dlg authdlg'; d.id = 'authDlg'; d.setAttribute('aria-labelledby', 'authTitle');
    d.innerHTML = `<div class="dhead"><h2 id="authTitle">Sign in or create an account</h2><button type="button" class="icon-btn" data-close aria-label="Close" title="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
<div class="authbody" id="authIn"><p><b>New here?</b> Signing in creates your free account, so your collection is on every device where you sign in.</p>
<form id="authForm" autocomplete="on"><label for="authEmail">Email</label><input class="inp" id="authEmail" type="email" required autocomplete="email" placeholder="you@example.com"><button class="btn primary" type="submit" id="authSend">Email me a sign-in link</button></form>
<div class="or" id="authOr"><span>or</span></div><button class="btn" type="button" id="authGoogle">Continue with Google</button>
<p class="fine" id="authInApp" hidden></p>
<p class="fine">Anything you’ve added in this browser moves into your account. By signing in you agree to our <a href="/privacy">privacy policy</a>.</p><p class="fine err" id="authErr" hidden></p></div>
<div class="authbody" id="authSent" hidden><p>We’ve sent a sign-in link to <b id="authSentTo"></b>. Open it on this device to finish signing in: it brings you back to this page.</p><p class="fine">Not there after a minute? Check your spam or promotions folder. It comes from BrickCollect.</p></div>`;
    document.body.appendChild(d);
    if (IN_APP) { $('authGoogle').hidden = $('authOr').hidden = true; const n = $('authInApp'); n.hidden = false; n.textContent = `Google sign-in doesn’t work inside ${IN_APP}’s browser: use your email, or open this page in Safari or Chrome.`; }
    const fail = e => { const el = $('authErr'); el.hidden = false; el.textContent = (e && e.message) || 'That didn’t work. Please try again.'; };
    $('authForm').onsubmit = async e => {
      e.preventDefault(); $('authErr').hidden = true; const email = $('authEmail').value.trim(); if (!email) return;
      $('authSend').disabled = true; $('authSend').textContent = 'Sending…';
      try {
        const BC = await loadFB(); const local = lsGet('bc-collection') || {};
        await BC.auth.signInWithEmail(email, Object.keys(local).length ? JSON.stringify(local) : '');
        $('authIn').hidden = true; $('authSent').hidden = false; $('authSentTo').textContent = email; $('authTitle').textContent = 'Check your email';
        track('login_link_sent', { from: location.pathname });
      } catch (err) { fail(err); }
      $('authSend').disabled = false; $('authSend').textContent = 'Email me a sign-in link';
    };
    $('authGoogle').onclick = async () => {
      $('authErr').hidden = true;
      try { const BC = await loadFB(); await BC.auth.signInWithGoogle(); if (await signedIn(BC, 'google')) { if (d.dataset.next) location.href = d.dataset.next; else location.reload(); } } catch (err) { fail(err); }
    };
    return d;
  }
  const openSignIn = (e, next) => { e.preventDefault(); const d = authDialog(); d.dataset.next = next || ''; d.showModal(); loadFB().catch(() => {}); track('signin_open', { from: location.pathname }); };
  if (ab && !acct) ab.addEventListener('click', e => openSignIn(e));
  // Home: "Sign in to view your collection" signs in here, then opens My collection.
  if (hb && !acct) hb.addEventListener('click', e => openSignIn(e, '/collection'));
  // Back from an email sign-in link (or a Google redirect on phones that block pop-ups): finish here.
  { const q = new URLSearchParams(location.search);
    if ((q.get('mode') === 'signIn' && q.get('oobCode')) || sessionStorage.getItem('firebase:pendingRedirect') || /firebase:pendingRedirect/.test(Object.keys(sessionStorage).join(' '))) {
      loadFB().then(async BC => { await BC.ready; if (await signedIn(BC, q.get('oobCode') ? 'email' : 'google')) location.replace(location.pathname + location.hash); }).catch(() => {});
    } }

  /* ☰ menu */
  const m = document.querySelector('details.hmenu');
  if (m) {
    document.addEventListener('click', e => { if (m.open && !m.contains(e.target)) m.open = false; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && m.open) { m.open = false; m.querySelector('summary').focus(); } });
    m.addEventListener('toggle', () => { if (m.open) track('menu_open'); });
  }

  /* What's new page: counts as seen, like opening it in the app */
  { const w = document.querySelector('[data-seen]'); if (w) lsSet('bc-seen-version', w.dataset.seen); }

  if (document.querySelector('.az')) document.documentElement.classList.add('has-az'); // /sets: jumps leave room for the A–Z bar

  /* clicks worth counting */
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[data-cta]'); if (a) track('set_page_cta', { cta: a.dataset.cta, page: location.pathname }); });

  /* larger picture (set picture, minifigures): click to open, close with ×, Esc or a click outside */
  document.addEventListener('click', e => {
    const z = e.target.closest && e.target.closest('[data-zoom]');
    if (z) { const d = $('zoomDlg'); if (d && d.showModal) { $('zoomImg').src = z.dataset.zoom; $('zoomImg').alt = z.dataset.cap || ''; $('zoomCap').textContent = z.dataset.cap || ''; $('zoomMeta').textContent = z.dataset.meta || ''; d.showModal(); track('set_page_zoom', { what: z.classList.contains('fig') ? 'minifigure' : 'set' }); } return; }
    const d = e.target.closest && e.target.closest('dialog');
    if (d && (e.target === d || e.target.closest('[data-close]'))) d.close();
  });

  /* LEGO.com in the visitor's own country */
  { const mp = { AU: 'en-au', GB: 'en-gb', CA: 'en-ca', NZ: 'en-nz', IE: 'en-ie' }; const c = (navigator.language || '').split('-')[1]; const l = mp[(c || '').toUpperCase()]; if (l) document.querySelectorAll('a[href*="lego.com/en-us/"]').forEach(a => { a.href = a.href.replace('/en-us/', `/${l}/`); }); }

  /* home page: tick sets here */
  const boxes = [...document.querySelectorAll('input[data-own]')];
  if (!boxes.length) return;
  const FREE = 10;
  const col = () => lsGet('bc-collection') || {};
  const owned = () => Object.entries(col()).filter(([, v]) => v && v.owned);
  const bar = $('tickBar');
  const paint = () => {
    const c = col(); boxes.forEach(b => { b.checked = !!(c[b.dataset.own] || {}).owned; b.closest('.tcard')?.classList.toggle('on', b.checked); });
    const n = owned().length;
    if (bar) { bar.hidden = !n; $('tickN').textContent = `${n} set${n === 1 ? '' : 's'}`; }
  };
  boxes.forEach(b => b.addEventListener('change', () => {
    const n = b.dataset.own;
    // Signed in, or past the free items: tick it in My collection (it saves to your account / asks you to sign up).
    if (acct || (b.checked && owned().length >= FREE)) { location.href = `/collection?set=${encodeURIComponent(n)}&add=own`; return; }
    const c = col(), me = { ...(c[n] || {}) };
    if (b.checked) { me.owned = true; me.wanted = false; delete me.wanted; if (!me.cond) me.cond = prefs().lastCond || 'used'; c[n] = me; track('set_ticked', { item_type: 'set', from: 'home' }); }
    else { delete me.owned; delete me.cond; delete me.qty; if (Object.keys(me).length) c[n] = me; else delete c[n]; track('set_unticked', { item_type: 'set', from: 'home' }); }
    lsSet('bc-collection', c); paint();
  }));
  addEventListener('storage', paint);
  addEventListener('pageshow', paint);
  paint();
})();
