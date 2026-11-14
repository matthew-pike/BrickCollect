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
      const b = $('authGoogle'); if (b.disabled) return;
      $('authErr').hidden = true; b.disabled = true; b.textContent = 'Opening Google…';
      // Phones and the installed app go to Google and come back here (to the page they were heading for, if any).
      lsSet('bc-auth-next', d.dataset.next || '');
      try { const BC = await loadFB(); await BC.auth.signInWithGoogle(); if (await signedIn(BC, 'google')) { lsSet('bc-auth-next', ''); if (d.dataset.next) location.href = d.dataset.next; else location.reload(); } }
      catch (err) { fail(err); track('login_failed', { method: 'google', code: err.code || '', from: location.pathname }); }
      setTimeout(() => { b.disabled = false; b.textContent = 'Continue with Google'; }, 400);
    };
    return d;
  }
  const openSignIn = (e, next) => { e.preventDefault(); const d = authDialog(); d.dataset.next = next || ''; d.showModal(); loadFB().catch(() => {}); track('signin_open', { from: location.pathname }); };
  if (ab && !acct) ab.addEventListener('click', e => openSignIn(e));
  // Home: "Sign in to view your collection" signs in here, then opens My collection.
  if (hb && !acct) hb.addEventListener('click', e => openSignIn(e, '/collection'));
  // Back from an email sign-in link (or a Google redirect on phones that block pop-ups): finish here.
  { const q = new URLSearchParams(location.search);
    let googleTry = false; try { googleTry = !!localStorage.getItem('bc.googleTry'); } catch { /* ignore */ }
    if ((q.get('mode') === 'signIn' && q.get('oobCode')) || googleTry || /firebase:pendingRedirect/.test(Object.keys(sessionStorage).join(' '))) {
      loadFB().then(async BC => {
        await BC.ready; const r = BC.auth.result ? await BC.auth.result() : null;
        if (await signedIn(BC, q.get('oobCode') ? 'email' : 'google')) {
          const next = lsGet('bc-auth-next'); lsSet('bc-auth-next', '');
          if (next && next !== location.pathname) location.replace(next); else location.replace(location.pathname + location.hash);
          return;
        }
        // Back from Google but not signed in: say so in the sign-in box, so it doesn't just look like a loop.
        if (r && !r.ok) {
          const d = authDialog(); d.dataset.next = lsGet('bc-auth-next') || ''; d.showModal();
          const el = $('authErr'); el.hidden = false; el.textContent = r.message;
          track('login_failed', { method: 'google', code: r.code || 'no_user', from: location.pathname });
        }
      }).catch(() => {});
    } }

  /* ☰ menu */
  const m = document.querySelector('details.hmenu');
  if (m) {
    document.addEventListener('click', e => { if (m.open && !m.contains(e.target)) m.open = false; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && m.open) { m.open = false; m.querySelector('summary').focus(); } });
    m.addEventListener('toggle', () => { if (m.open) track('menu_open'); });
    // NEW badge on links added recently (data-new="<release date>"), for 30 days until opened. Same as menuNewBadges in index.html.
    const seen = lsGet('bc-new-seen') || {};
    m.querySelectorAll('a[data-new]').forEach(a => {
      const key = 'menu:' + a.getAttribute('href'), mark = () => { const s = lsGet('bc-new-seen') || {}; if (!s[key]) { s[key] = Date.now(); lsSet('bc-new-seen', s); } };
      if (location.pathname === a.getAttribute('href')) mark();
      if (seen[key] || location.pathname === a.getAttribute('href') || !(Date.now() - Date.parse(a.dataset.new) < 30 * 864e5)) return;
      a.insertAdjacentHTML('beforeend', '<span class="mnew">NEW</span>');
      a.addEventListener('click', mark);
    });
  }

  /* What's new page: counts as seen, like opening it in the app */
  { const w = document.querySelector('[data-seen]'); if (w) lsSet('bc-seen-version', w.dataset.seen); }

  /* theme and brand pages: Year filter. Hides other years' sets, empty groups and their chips; ?year= keeps it in the address. */
  { const sel = $('yrSel');
    if (sel) {
      const chips = [...document.querySelectorAll('.jump a')].map(a => ({ a, n: a.querySelector('.muted'), id: decodeURIComponent(a.getAttribute('href').slice(1)) }));
      const apply = (from) => {
        const y = sel.value; let total = 0;
        document.querySelectorAll('.cards').forEach(g => {
          let n = 0; g.querySelectorAll('.card').forEach(c => { const on = !y || c.dataset.y === y; c.hidden = !on; if (on) n++; });
          total += n; g.hidden = !n; const h = g.previousElementSibling; if (h && h.tagName === 'H2') h.hidden = !n;
          const ch = h && chips.find(c => c.id === h.id); if (ch) { ch.a.hidden = !n; if (ch.n) ch.n.textContent = n; }
        });
        $('yrCount').textContent = y ? `${total.toLocaleString('en-AU')} set${total === 1 ? '' : 's'} from ${y}` : $('yrCount').dataset.all;
        if ($('yrRange')) $('yrRange').hidden = !!y;
        sel.classList.toggle('on', !!y);
        const u = new URL(location.href); if (y) u.searchParams.set('year', y); else u.searchParams.delete('year'); history.replaceState(null, '', u);
        if (from) track('theme_year', { year: y || 'all', page: location.pathname });
      };
      const want = new URLSearchParams(location.search).get('year');
      if (want && [...sel.options].some(o => o.value === want)) sel.value = want;
      sel.addEventListener('change', () => apply(true));
      if (sel.value) apply(false);
    }
  }

  if (document.querySelector('.az')) document.documentElement.classList.add('has-az'); // /sets: jumps leave room for the A–Z bar

  /* Pictures that are missing or don't load (new sets often have none for a few days): a brick and "No picture yet" */
  const NOPIC = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120" fill="#f3f5f9"/><g fill="#c9d2e0"><rect x="48" y="44" width="64" height="30" rx="5"/><rect x="58" y="37" width="14" height="9" rx="3"/><rect x="88" y="37" width="14" height="9" rx="3"/></g><text x="80" y="94" text-anchor="middle" font-family="Roboto,Arial,sans-serif" font-size="11" fill="#8592ab">No picture yet</text></svg>');
  const noPic = img => { if (!img || img.dataset.nopic) return; img.dataset.nopic = '1'; img.src = NOPIC; img.classList.add('nopic'); const z = img.closest('[data-zoom]'); if (z) { z.removeAttribute('data-zoom'); z.title = ''; z.style.cursor = 'default'; } };
  document.addEventListener('error', e => { if (e.target && e.target.tagName === 'IMG') noPic(e.target); }, true);
  // Pictures that failed before this script ran
  document.querySelectorAll('img').forEach(i => { if (i.complete && !i.naturalWidth && i.getAttribute('src')) noPic(i); });

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

  /* set page: today's price, in your currency. The page was built with the price in AUD; this reads the latest
     from Firestore (just this set's entry in its price bucket) and converts it with the app's exchange rates.
     LEGO: BrickLink's average of recent sales, from sellers in the location you've picked in My collection
     (or the one that goes with your currency), falling back to worldwide, as My collection does. */
  const pb = $('priceBox');
  if (pb && pb.dataset.fb) {
    const [proj, key] = pb.dataset.fb.split('|'), n = pb.dataset.n;
    const base = `https://firestore.googleapis.com/v1/projects/${proj}/databases/(default)/documents`;
    const plain = v => { if (!v) return null; if ('stringValue' in v) return v.stringValue; if ('integerValue' in v) return Number(v.integerValue); if ('doubleValue' in v) return Number(v.doubleValue); if ('booleanValue' in v) return v.booleanValue; if ('timestampValue' in v) return v.timestampValue; if ('mapValue' in v) { const o = {}; for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = plain(x); return o; } return null; };
    const get = async (path, fields) => { const r = await fetch(`${base}/${path}?key=${key}${fields.map(f => `&mask.fieldPaths=${encodeURIComponent(f)}`).join('')}`); if (!r.ok) throw new Error('HTTP ' + r.status); return plain({ mapValue: await r.json() }) || {}; };
    const bucketOf = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 'b' + (h % 16); };
    const LOCS = { AU: 'Australia', US: 'the United States', CA: 'Canada', EU: 'Europe (EU)', UK: 'the United Kingdom' };
    const LOC_FOR_CUR = { AUD: 'AU', USD: 'US', CAD: 'CA', EUR: 'EU', GBP: 'UK' };
    let item = null, figItems = null, setRead = false, readKeys = new Set(), rates = null, ratesP = null;
    const figCards = [...document.querySelectorAll('#figVals .fig[data-n]')];
    const curNow = () => (sel && sel.value) || prefs().currency || detect();
    const loadRates = () => ratesP || (ratesP = get('meta/rates', ['rates', 'date']).then(r => { rates = r; }).catch(() => {}));
    const fmtDay = d => { const t = Date.parse(d || ''); return isNaN(t) ? '' : new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
    const paintPrice = () => {
      if (!item) return;
      const want = curNow(), r = (rates && rates.rates) || {}, c = want === 'AUD' || r[want] ? want : 'AUD', k = c === 'AUD' ? 1 : r[c];
      let f; try { f = new Intl.NumberFormat(undefined, { style: 'currency', currency: c, currencyDisplay: 'narrowSymbol' }); } catch { f = new Intl.NumberFormat(undefined, { style: 'currency', currency: c }); }
      const src = item.priceSource || 'BrickLink', bl = src === 'BrickLink' && !item.manualPrice;
      const rg = prefs().region && (LOCS[prefs().region] || prefs().region === 'world') ? prefs().region : (LOC_FOR_CUR[c] || 'world');
      const lp = bl && rg !== 'world' ? (item.loc || {})[rg] : null, local = !!(lp && (lp.used != null || lp.new != null));
      const val = fld => local && lp[fld] != null ? lp[fld] : item[fld];
      // Minifigures: each one from sellers in your location when it has a local price, otherwise worldwide.
      if (figItems && figCards.length) {
        const tot = { new: 0, used: 0 }; let priced = 0;
        figCards.forEach(card => {
          const it = figItems[card.dataset.n] || {}, fl = rg !== 'world' && !it.manualPrice ? (it.loc || {})[rg] : null;
          const fLocal = !!(fl && (fl.used != null || fl.new != null)), fv = fld => fLocal && fl[fld] != null ? fl[fld] : it[fld];
          let has = false;
          card.querySelectorAll('.fv [data-f]').forEach(el => { const v = fv(el.dataset.f); if (v != null) { has = true; tot[el.dataset.f] += v; } el.textContent = v != null ? f.format(v * k) : '—'; });
          const box = card.querySelector('.fv'); if (box) box.toggleAttribute('data-none', !has);
          if (has) priced++;
        });
        const line = $('figTotalLine');
        if (line) {
          line.textContent = '';
          if (!priced) line.textContent = 'No minifigure prices yet.';
          else {
            const b = v => { const e = document.createElement('b'); e.textContent = f.format(v * k); return e; };
            line.append('Together: ', b(tot.new), ' new · ', b(tot.used), ' used');
            if (priced < figCards.length) { const m = document.createElement('span'); m.className = 'muted'; m.textContent = ` (${priced} of ${figCards.length} minifigures priced)`; line.append(' ', m); }
          }
        }
        if ($('figNoteMore')) $('figNoteMore').hidden = priced >= figCards.length;
        if ($('figNoteWhere')) $('figNoteWhere').textContent = `Minifigure values: average of the last 6 months’ sales on BrickLink, from sellers ${rg !== 'world' ? `in ${LOCS[rg]} where there are any, otherwise worldwide` : 'worldwide'}.`;
      }
      if (!setRead) return; // this set's bucket couldn't be read: keep the price the page was built with
      let any = false;
      pb.querySelectorAll('[data-f]').forEach(el => { const v = val(el.dataset.f); if (v != null) any = true; el.textContent = v != null ? f.format(v * k) : '—'; });
      const at = fmtDay(local && lp.at ? lp.at : item.pricedAt), when = at ? ` · ${at}` : '';
      $('priceNote').textContent = !any ? 'No price yet.' : item.manualPrice ? `Value set by BrickCollect${when}` : bl ? `Average of the last 6 months’ sales by sellers ${local ? 'in ' + LOCS[rg] : 'worldwide'} on BrickLink${when}` : `Price on the ${pb.dataset.brand} store${when}`;
      $('priceCur').textContent = c !== 'AUD' && rates && rates.date ? `${c}, converted from AUD at ${fmtDay(rates.date)} rates` : '';
    };
    (async () => {
      try {
        // One read per price bucket: this set plus its minifigures (each only its own entry).
        const keys = [n, ...figCards.map(c => c.dataset.n)], byB = new Map();
        for (const x of keys) { const bk = bucketOf(x); if (!byB.has(bk)) byB.set(bk, []); byB.get(bk).push(x); }
        const field = x => 'items.`' + x.replace(/[`\\]/g, '\\$&') + '`';
        const [docs] = await Promise.all([Promise.all([...byB].map(([bk, xs]) => get(`iteminfo/${bk}`, xs.map(field)).catch(e => { console.warn('price', bk, e); return null; }))), curNow() !== 'AUD' ? loadRates() : null]);
        const all = {}; let ok = false;
        [...byB].forEach(([bk, xs], i) => { const d = docs[i]; if (!d) return; ok = true; Object.assign(all, d.items || {}); xs.forEach(x => readKeys.add(x)); });
        setRead = readKeys.has(n);
        if (!ok) throw new Error('no price buckets read');
        item = all[n] || {};
        // Minifigures only when every bucket came back, so the total never mixes old and new prices.
        figItems = figCards.every(c => readKeys.has(c.dataset.n)) ? all : null;
        paintPrice();
      } catch (e) { console.warn('price', e); }
    })();
    if (sel) sel.addEventListener('change', () => { (sel.value !== 'AUD' ? loadRates() : Promise.resolve()).then(paintPrice); });
  }

  /* home page: tick sets here */
  const boxes = [...document.querySelectorAll('input[data-own]')];
  if (!boxes.length) return;
  const FREE = 10;
  // Signed in: the collection lives in the account, so leftover ticks saved in this browser (from before signing in) aren't shown here.
  const col = () => (acct ? null : lsGet('bc-collection')) || {};
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

// Article slideshow (/news/<slug>): ‹ › buttons, dots and the caption follow the picture in view; swipe works natively.
document.querySelectorAll('[data-slides]').forEach(w => {
  const track = w.querySelector('.slides-track'), name = w.querySelector('.slides-name'), dots = w.querySelector('.slides-dots');
  const prev = w.querySelector('.prev'), next = w.querySelector('.next');
  const slides = () => [...track.querySelectorAll('.slide')];
  const cur = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
  const go = i => { const l = slides(); i = Math.max(0, Math.min(l.length - 1, i)); track.scrollTo({ left: i * track.clientWidth }); };
  const paint = () => { const l = slides(), i = Math.min(cur(), l.length - 1);
    if (!l.length) { w.remove(); return; }
    w.classList.toggle('one', l.length < 2);
    name.textContent = l[i] ? l[i].dataset.cap : '';
    if (dots.children.length !== l.length) dots.innerHTML = l.map((_, k) => `<button type="button" aria-label="Picture ${k + 1} of ${l.length}"></button>`).join('');
    [...dots.children].forEach((d, k) => d.setAttribute('aria-current', k === i ? 'true' : 'false'));
    prev.disabled = i <= 0; next.disabled = i >= l.length - 1; };
  prev.addEventListener('click', () => go(cur() - 1));
  next.addEventListener('click', () => go(cur() + 1));
  dots.addEventListener('click', e => { const b = e.target.closest('button'); if (b) go([...dots.children].indexOf(b)); });
  track.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur() - 1); } if (e.key === 'ArrowRight') { e.preventDefault(); go(cur() + 1); } });
  let t; track.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(paint, 60); }, { passive: true });
  w.addEventListener('slideschange', paint);
  addEventListener('resize', paint);
  paint();
});
