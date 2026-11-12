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
