// Builds the public set pages into firebase/hosting/ (run after build-hosting.mjs):
//   /set/<number>      one page per set (LEGO from catalog.json; other brands from Firestore)
//   /theme/<name>      every LEGO set in a theme, by subtheme
//   /brand/<name>      every set of another brand, by theme
//   /sets              the directory: brands and LEGO themes
//   sitemap.xml        index of sitemap-pages.xml and sitemap-sets.xml
// Plain HTML that search engines can read, with an "I own it" / "I want it" link into the app.
// With GOOGLE_APPLICATION_CREDENTIALS set it also reads Firestore (other brands, retired status, BrickLink numbers);
// without it (or if that fails) it builds the LEGO pages only.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const SITE = 'https://brickcollect.app';
const OUT = new URL('./hosting/', import.meta.url);
const PUB = new URL('../public/', import.meta.url);
const RET_AGE = 5;
const THEME_NAMES = { 'LEGO Ideas and CUUSOO': 'Ideas' };
const CUUSOO_SETS = new Set(['21100-1', '21101-1', '21102-1', '21103-1', '21104-1', '21108-1']);
const now = new Date();

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
const fmt = n => Number(n).toLocaleString('en-US');
const monthYear = d => { const t = Date.parse(d || ''); return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : ''; };
const write = (path, html) => { const u = new URL(path, OUT); mkdirSync(new URL('./', u), { recursive: true }); writeFileSync(u, html); };

// Buy links, the same ones the app uses (config.js).
const cfg = (() => { const sb = { window: {} }; vm.runInNewContext(readFileSync(new URL('config.js', PUB), 'utf8'), sb); return sb.window.BC_CONFIG || {}; })();
const BUY = cfg.buyLinks || {};
// The shared style and script get a version from their content, so browsers never use an old copy after a release.
const ver = f => createHash('sha1').update(readFileSync(new URL(f, PUB))).digest('hex').slice(0, 10);
const CSS_V = ver('pages.css'), JS_V = ver('pages.js');
// The app's logo, taken from index.html so the pages keep matching it.
const MARK = (readFileSync(new URL('index.html', PUB), 'utf8').match(/class="brandmark[^>]*>(<svg[\s\S]*?<\/svg>)<\/a>/) || [])[1] || '';
if (!MARK) throw new Error('Logo not found in index.html; update build-pages.mjs');
// The app's ☰ menu is the template: same links; About opens it in My collection.
const MENU = (() => {
  const m = readFileSync(new URL('index.html', PUB), 'utf8').match(/<details class="hmenu"[\s\S]*?<nav aria-label="Menu">([\s\S]*?)<\/nav><\/details>/);
  if (!m) throw new Error('Menu not found in index.html; update build-pages.mjs');
  return m[1].replace('<a href="#" data-hm="signOutBtn"', '<a href="/collection#signout"');
})();
// The notice bar under the header (e.g. BrickLink is offline) comes from the app too, shown by pages.js.
const NOTICE = (readFileSync(new URL('index.html', PUB), 'utf8').match(/<section class="notice" id="blNotice"[\s\S]*?<\/section>/) || [''])[0];
// The app's footer is the template too. What's new opens in My collection; Install app only works inside the app.
const FOOTER = (() => {
  const m = readFileSync(new URL('index.html', PUB), 'utf8').match(/<footer class="foot-site">[\s\S]*?<\/footer>/);
  if (!m) throw new Error('Footer not found in index.html; update build-pages.mjs');
  return m[0].replace(/\s*<a href="#" id="installLink"[^>]*>[\s\S]*?<\/a>/, '').replace('<a href="#" id="newsLink">', '<a href="/whats-new">').replace(/<span id="ratesNote"><\/span>/, '');
})();
const CURS = ['AUD', 'USD', 'EUR', 'GBP', 'CAD', 'NZD', 'JPY', 'CHF'];
const HEADER = `<header class="top"><div class="wrap">
<div class="brand"><a href="/" class="brandmark" aria-hidden="true" tabindex="-1">${MARK}</a><div><p class="bname"><a href="/">BrickCollect</a> <span class="beta">BETA</span></p><p class="tag">Collect. Track. Value. Export. In one place.</p></div></div>
<form class="search" action="/collection" role="search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input name="q" type="search" placeholder="Search name, set #, subtheme or tag…" autocomplete="off" aria-label="Search by set name, number, subtheme or tag"></form>
<div class="top-actions">
<a class="btn acct" id="acctBtn" href="/collection#signin" title="Sign in to save your collection to a free account">Sign in</a>
<select id="curSel" class="cur" aria-label="Currency" title="Currency">${CURS.map(c => `<option>${c}</option>`).join('')}</select>
<button class="icon-btn" id="themeBtn" type="button" title="Switch between dark, mid and light" aria-label="Switch theme"><svg id="themeIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"></svg></button>
<details class="hmenu"><summary class="icon-btn" title="Menu" aria-label="Menu"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></summary>
<nav aria-label="Menu">${MENU}</nav></details>
</div>
</div></header>`;

/* ---------- data ---------- */
const raw = JSON.parse(readFileSync(new URL('catalog.json', PUB), 'utf8'));
const bl = JSON.parse(readFileSync(new URL('bl-numbers.json', PUB), 'utf8'));
const themes = new Map(raw.themes.map(([id, name, parent]) => [id, { name: THEME_NAMES[name] || name, parent }]));
const place = new Map();
for (const id of themes.keys()) {
  const chain = []; let t = id, g = 0;
  while (t && themes.has(t) && g++ < 8) { chain.unshift(themes.get(t).name); t = themes.get(t).parent; }
  place.set(id, { theme: chain[0], sub: chain[1] || '' });
}
const lego = raw.sets.map(([n, name, year, tid, pieces]) => {
  let p = place.get(tid) || { theme: 'Other', sub: '' };
  if (CUUSOO_SETS.has(n) && !p.sub) p = { theme: p.theme, sub: 'CUUSOO' };
  return { n, name, year, pieces, theme: p.theme, sub: p.sub, brand: 'LEGO', figs: [] };
});
for (const [fn, name, , si] of raw.figs) for (const i of si) if (lego[i]) lego[i].figs.push({ n: fn, name });

const shared = new Map();   // n -> { ret, exit, bl }
const extras = [];
const subOv = new Map();   // n -> subtheme
let mostOwned = {};       // n -> how many collectors own it (Admin page numbers)
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    const { initializeApp, applicationDefault } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    initializeApp({ credential: applicationDefault(), projectId: 'brickcollect-app' });
    const db = getFirestore();
    const [info, cat, subs, usage] = await Promise.all([db.collection('iteminfo').get(), db.collection('catalog').get(), db.collection('subthemes').get(), db.doc('admin/usage').get()]);
    mostOwned = (usage.exists && usage.data().owned) || {};
    // Subthemes as the app shows them: the automatic layer, then the owner's hand edits.
    for (const d of subs.docs) { const v = d.data() || {}; for (const [k, sub] of Object.entries(v.brickset || {})) subOv.set(k, sub); for (const [k, sub] of Object.entries(v.manual || {})) subOv.set(k, sub); }
    for (const d of info.docs) for (const [n, v] of Object.entries((d.data() || {}).items || {})) shared.set(n, { ret: v.ret, exit: v.exit, bl: v.bl });
    for (const d of cat.docs) {
      const v = d.data() || {};
      for (const [num, it] of Object.entries(v.items || {})) extras.push({ n: `${d.id}:${num}`, disp: num, name: it.name || num, year: it.year ?? null, pieces: it.pieces ?? null, img: it.img || '', url: it.url || '', theme: it.theme || 'Unsorted', sub: it.sub || '', brand: v.brand || d.id, figs: [] });
    }
    console.log(`Firestore: ${shared.size} item records, ${subOv.size} subthemes, ${extras.length} sets of other brands`);
  } catch (e) { console.warn('::warning title=Set pages::Firestore not read, LEGO pages only:', e.message); }
} else console.log('No Firestore credentials: LEGO pages only');
for (const x of [...lego, ...extras]) if (subOv.has(x.n)) x.sub = subOv.get(x.n) || '';

// Pages for real sets: LEGO entries with pieces (leaves out gear, books and keyrings), every set of other brands.
const sets = [...lego.filter(x => x.pieces > 0), ...extras];
const used = new Set();
for (const x of sets) {
  let p = x.brand === 'LEGO' ? slug(x.n) : `${slug(x.brand)}-${slug(x.disp)}`;
  if (used.has(p)) { let i = 2; while (used.has(`${p}-${i}`)) i++; p = `${p}-${i}`; }
  used.add(p); x.path = `/set/${p}`;
}
{ const dup = sets.filter(x => /-\d+$/.test(x.path) && x.brand !== 'LEGO' && !x.path.endsWith(slug(x.disp))); if (dup.length) console.warn(`::warning title=Set pages::${dup.length} other-brand sets share an address with another set and got a -2 ending; My collection's link for them goes to the first one: ${dup.slice(0, 5).map(x => x.n).join(', ')}`); }
const shownNum = x => x.disp || (x.brand === 'LEGO' ? x.n.replace(/-1$/, '') : x.n);
const imgUrl = x => x.img || (x.brand === 'LEGO' ? `https://cdn.rebrickable.com/media/sets/${encodeURIComponent(x.n.toLowerCase())}.jpg` : '');
const figImg = f => `https://cdn.rebrickable.com/media/sets/${encodeURIComponent(f.n.toLowerCase())}.jpg`;
function retState(x) {
  const sh = shared.get(x.n) || {};
  if (sh.ret === 'A') return null;
  if (sh.ret === 'S') return sh.exit && Date.parse(sh.exit) <= now ? { s: 'R', hand: true } : { s: 'S', exit: sh.exit };
  if (sh.ret === 'R') return { s: 'R', hand: true };
  return x.brand === 'LEGO' && x.year && x.year <= now.getFullYear() - RET_AGE ? { s: 'R' } : null;
}
function buyHref(x) {
  const b = BUY[x.brand]; if (!b || !(b.url || b.product)) return '';
  const num = x.brand === 'LEGO' ? x.n.replace(/-\d+$/, '') : (x.disp || x.n);
  if (x.url && b.product && /^\/products\/[A-Za-z0-9._~-]+$/.test(x.url)) return b.product.replace('{path}', x.url);
  return (b.url || '').replace(/\{num\}/g, encodeURIComponent(num)).replace(/\{name\}/g, encodeURIComponent(x.name)).replace(/\{lego\}/g, 'en-us');
}
const themePath = t => `/theme/${slug(t)}`, brandPath = b => `/brand/${slug(b)}`;
const groupPath = x => x.brand === 'LEGO' ? themePath(x.theme) : brandPath(x.brand);
const groupName = x => x.brand === 'LEGO' ? `LEGO ${x.theme}` : x.brand;

/* ---------- page shell ---------- */
function shell({ path, title, desc, img, h1, crumbs, body, robots, head = '', notice = true }) {
  const url = SITE + path;
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['Home', '/'], ...crumbs].map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: SITE + c[1] })) };
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${robots ? `<meta name="robots" content="${robots}">\n` : ''}<link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="BrickCollect">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(url)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img || SITE + '/og-image.png?v=3')}">
<meta name="twitter:card" content="${img ? 'summary' : 'summary_large_image'}">
<meta name="theme-color" content="#0a1120">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script>try{const t=(JSON.parse(localStorage.getItem('bc-prefs')||'{}')||{}).theme;if(t==='dark'||t==='mid'||t==='light')document.documentElement.dataset.theme=t}catch{}</script>
<script src="/analytics.js"></script>
${head}<link rel="stylesheet" href="/pages.css?v=${CSS_V}">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body>
${HEADER}
<main class="wrap">
${notice ? NOTICE : ''}
${crumbs.length ? `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span class="sep">›</span>${crumbs.map((c, i) => i === crumbs.length - 1 ? `<span>${esc(c[0])}</span>` : `<a href="${esc(c[1])}">${esc(c[0])}</a>`).join('<span class="sep">›</span>')}</nav>` : ''}
${h1 ? `<h1>${h1}</h1>\n` : ''}${body}
</main>
<div class="wrap">${FOOTER}</div>
<script src="/pages.js?v=${JS_V}"></script>
</body>
</html>
`;
}

const card = x => `<a class="card" href="${esc(x.path)}">${imgUrl(x) ? `<img src="${esc(imgUrl(x))}" alt="" loading="lazy" width="72" height="54">` : '<span class="noimg"></span>'}<span class="cb"><span class="cn">${esc(x.name)}</span><span class="cm">${esc(shownNum(x))}${x.year ? ` · ${x.year}` : ''}${x.pieces ? ` · ${fmt(x.pieces)} pcs` : ''}</span></span></a>`;
const byNewest = (a, b) => (b.year || 0) - (a.year || 0) || String(a.n).localeCompare(String(b.n), 'en', { numeric: true });

/* ---------- set pages ---------- */
const byGroup = new Map();
for (const x of sets) { const k = `${x.brand}|${x.theme}|${x.sub}`; if (!byGroup.has(k)) byGroup.set(k, []); byGroup.get(k).push(x); }
for (const a of byGroup.values()) a.sort(byNewest);

for (const x of sets) {
  const num = shownNum(x), ret = retState(x), buy = buyHref(x);
  const blNum = (shared.get(x.n) || {}).bl || (x.brand === 'LEGO' ? (bl.sets[x.n] || x.n) : '');
  const statusTxt = !ret ? '' : ret.s === 'S' ? `Retiring soon${ret.exit ? `: LEGO plans to retire it by ${monthYear(ret.exit)}` : ''}` : ret.hand ? 'Retired' : `Retired (released ${RET_AGE}+ years ago)`;
  const figs = x.figs;
  const facts = [
    ['Brand', x.brand === 'LEGO' ? 'LEGO' : `<a href="${esc(brandPath(x.brand))}">${esc(x.brand)}</a>`],
    ['Set number', esc(num)],
    x.year ? ['Released', String(x.year)] : null,
    x.pieces ? ['Pieces', fmt(x.pieces)] : null,
    ['Theme', `<a href="${esc(groupPath(x))}">${esc(x.theme)}</a>${x.sub ? ` › ${esc(x.sub)}` : ''}`],
    figs.length ? ['Minifigures', `<a href="#minifigures">${figs.length}</a>`] : null,
    statusTxt ? ['Status', `<span class="pill${ret.s === 'S' ? ' soon' : ''}">${esc(statusTxt)}</span>`] : null,
  ].filter(Boolean);
  const app = `/collection?set=${encodeURIComponent(x.n)}`;
  const related = (byGroup.get(`${x.brand}|${x.theme}|${x.sub}`) || []).filter(y => y !== x);
  const i = Math.max(0, related.findIndex(y => (y.year || 0) <= (x.year || 0)));
  const near = related.slice(Math.max(0, i - 4), Math.max(0, i - 4) + 8);
  const links = [
    buy && !(ret && ret.s === 'R' && x.brand === 'LEGO') ? `<a class="btn" href="${esc(buy)}" target="_blank" rel="sponsored noopener" data-cta="buy">${esc((BUY[x.brand] || {}).title || 'Buy')} ↗</a>` : '',
    blNum ? `<a class="btn" href="https://www.bricklink.com/v2/catalog/catalogitem.page?S=${encodeURIComponent(blNum)}" target="_blank" rel="noopener" data-cta="bricklink">BrickLink ↗</a>` : '',
    x.brand === 'LEGO' ? `<a class="btn" href="https://rebrickable.com/sets/${encodeURIComponent(x.n)}/" target="_blank" rel="noopener" data-cta="rebrickable">Parts on Rebrickable ↗</a>` : '',
  ].filter(Boolean).join('');
  const label = x.brand === 'LEGO' ? `LEGO ${x.theme} ${num}` : `${x.brand} ${num}`;
  const desc = `${label} ${x.name}${x.year ? ` (${x.year})` : ''}: ${x.pieces ? `${fmt(x.pieces)} pieces` : 'set details'}${figs.length ? `, ${figs.length} minifigure${figs.length === 1 ? '' : 's'}` : ''}${statusTxt ? `. ${statusTxt.replace(/:.*/, '')}` : ''}. Track it free in BrickCollect, the collection tracker for LEGO and other brick brands.`;
  const body = `<p class="sub">${esc(x.brand)} ${esc(num)}${x.year ? ` · ${x.year}` : ''}${x.pieces ? ` · ${fmt(x.pieces)} pieces` : ''}${statusTxt ? ` · <span class="pill${ret.s === 'S' ? ' soon' : ''}">${esc(ret.s === 'S' ? 'Retiring soon' : 'Retired')}</span>` : ''}</p>
<div class="setgrid">
<div class="pic">${imgUrl(x) ? `<button type="button" class="picbtn" data-zoom="${esc(imgUrl(x))}" data-cap="${esc(x.name)}" data-meta="${esc(`${x.brand} ${num}${x.year ? ` · ${x.year}` : ''}`)}" title="See a larger picture"><img src="${esc(imgUrl(x))}" alt="${esc(`${x.brand} ${num} ${x.name}`)}"></button>` : '<span class="noimg big"></span>'}</div>
<div class="side">
<div class="track"><b>Got this set?</b><span class="muted">Select “I own it” to add it to your collection and keep count of your sets, pieces and minifigures. It’s free.</span>
<div class="row"><a class="btn primary" href="${esc(app)}&amp;add=own" rel="nofollow" data-cta="own">✓ I own it</a><a class="btn" href="${esc(app)}&amp;add=want" rel="nofollow" data-cta="want">☆ I want it</a></div></div>
<dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
${links ? `<div class="row links">${links}</div>` : ''}
</div>
</div>
${figs.length ? `<h2 id="minifigures">Minifigures in this set (${figs.length})</h2>
<div class="figs">${figs.map(f => `<button type="button" class="fig" data-zoom="${esc(figImg(f))}" data-cap="${esc(f.name)}" data-meta="${esc(bl.figs[f.n] || f.n)}" title="See a larger picture"><img src="${esc(figImg(f))}" alt="" loading="lazy" width="160" height="160"><span class="cn">${esc(f.name)}</span><span class="cm">${esc(bl.figs[f.n] || f.n)}</span></button>`).join('')}</div>` : ''}
<dialog class="dlg zoomdlg" id="zoomDlg" aria-label="Larger picture"><div class="dhead"><div><b id="zoomCap"></b><span id="zoomMeta" class="cm"></span></div><button type="button" class="icon-btn" data-close aria-label="Close" title="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="zoombody"><img id="zoomImg" alt=""></div></dialog>
${near.length ? `<section class="hsec"><div class="hhead"><h2>More ${esc(x.sub || x.theme)} sets</h2><a href="${esc(groupPath(x))}">All ${esc(groupName(x))} sets →</a></div>
<div class="cards">${near.map(card).join('')}</div></section>` : ''}`;
  write(`.${x.path}.html`, shell({
    path: x.path, img: imgUrl(x),
    title: `${label} ${x.name}${x.year ? ` (${x.year})` : ''} | BrickCollect`,
    desc, h1: esc(x.name),
    crumbs: [['All sets', '/sets'], [groupName(x), groupPath(x)], [`${num} ${x.name}`, x.path]],
    body,
  }));
}

/* ---------- theme and brand pages ---------- */
function listPage(path, name, list, by, crumbName, intro) {
  const groups = new Map();
  for (const x of list) { const k = x[by] || ''; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); }
  const order = [...groups.keys()].sort((a, b) => (a === '') - (b === '') || groups.get(b).length - groups.get(a).length || a.localeCompare(b));
  const ret = list.filter(x => (retState(x) || {}).s === 'S');
  const years = list.map(x => x.year).filter(Boolean);
  const body = `<p class="sub">${fmt(list.length)} set${list.length === 1 ? '' : 's'}${years.length ? ` · ${Math.min(...years)}–${Math.max(...years)}` : ''}${ret.length ? ` · <span class="pill soon">${ret.length} retiring soon</span>` : ''}</p>
${order.length > 1 ? `<nav class="jump">${order.map(k => `<a href="#${slug(k || 'other')}">${esc(k || 'Other')} <span class="muted">${groups.get(k).length}</span></a>`).join('')}</nav>` : ''}
${order.map(k => `${order.length > 1 ? `<h2 id="${slug(k || 'other')}">${esc(k || 'Other')}</h2>` : ''}<div class="cards">${groups.get(k).sort(byNewest).map(card).join('')}</div>`).join('\n')}`;
  write(`.${path}.html`, shell({
    path, title: `${crumbName} sets: all ${fmt(list.length)}, with pieces and minifigures | BrickCollect`,
    desc: `Every ${crumbName} set (${fmt(list.length)}) with year, pieces, minifigures and retired status. Select “I own it” to add them to your collection, free in BrickCollect.`,
    h1: `${esc(crumbName)} sets`, crumbs: [['All sets', '/sets'], [crumbName, path]], body,
  }));
}
const legoThemes = new Map(), brands = new Map();
for (const x of sets) {
  const m = x.brand === 'LEGO' ? legoThemes : brands, k = x.brand === 'LEGO' ? x.theme : x.brand;
  if (!m.has(k)) m.set(k, []); m.get(k).push(x);
}
for (const [t, list] of legoThemes) listPage(themePath(t), t, list, 'sub', `LEGO ${t}`, `Collect LEGO ${t}?`);
for (const [b, list] of brands) listPage(brandPath(b), b, list, 'theme', b, `Collect ${b}?`);

/* ---------- directory ---------- */
const tile = (path, name, n) => `<a class="tile" href="${esc(path)}"><span class="cn">${esc(name)}</span><span class="cm">${fmt(n)} sets</span></a>`;
write('./sets.html', shell({
  path: '/sets', title: 'All LEGO and brick sets by theme and brand | BrickCollect',
  desc: `Browse ${fmt(sets.length)} sets from LEGO${brands.size ? `, ${[...brands.keys()].join(', ')}` : ''} by theme, with pieces, minifigures and retired status. Track your collection free.`,
  h1: 'All sets', crumbs: [['All sets', '/sets']],
  body: `<p class="sub">${fmt(sets.length)} sets from ${brands.size + 1} brand${brands.size ? 's' : ''}</p>
${brands.size ? `<h2 id="brands">Brands</h2><div class="tiles">${[...brands].sort((a, b) => b[1].length - a[1].length).map(([b, l]) => tile(brandPath(b), b, l.length)).join('')}</div>` : ''}
<h2>LEGO themes</h2><div class="tiles">${[...legoThemes].sort((a, b) => a[0].localeCompare(b[0])).map(([t, l]) => tile(themePath(t), t, l.length)).join('')}</div>`,
}));

/* ---------- home page (/) ---------- */
// The app moves to /collection (My collection); / becomes a page of sets you can tick straight away.
{
  const app = new URL('index.html', OUT);
  let a = readFileSync(app, 'utf8');
  a = a.replace('<link rel="canonical" href="https://brickcollect.app/">', '<link rel="canonical" href="https://brickcollect.app/collection">')
       .replace('<meta property="og:url" content="https://brickcollect.app/">', '<meta property="og:url" content="https://brickcollect.app/collection">');
  writeFileSync(new URL('collection.html', OUT), a);
}
const POPULAR = (() => { const m = readFileSync(new URL('index.html', PUB), 'utf8').match(/const POPULAR = \[([^\]]*)\]/); return m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : []; })();
const byN = new Map(sets.map(x => [x.n, x]));
const tcard = x => `<div class="tcard"><a href="${esc(x.path)}" class="tpic">${imgUrl(x) ? `<img src="${esc(imgUrl(x))}" alt="" loading="lazy" width="96" height="72">` : '<span class="noimg"></span>'}</a><div class="cb"><a class="cn" href="${esc(x.path)}">${esc(x.name)}</a><span class="cm">${esc(x.brand === 'LEGO' ? shownNum(x) : `${x.brand} ${shownNum(x)}`)}${x.year ? ` · ${x.year}` : ''}</span><label class="tick"><input type="checkbox" data-own="${esc(x.n)}"> I own it</label></div></div>`;
// Same themes and pictures as the theme row in My collection.
const THEME_TILES = (() => { const m = readFileSync(new URL('index.html', PUB), 'utf8').match(/const THEME_TILES = \[([\s\S]*?)\];/); return m ? [...m[1].matchAll(/\['([^']+)', '([^']+)', '([^']+)'\]/g)].map(x => ({ label: x[1], theme: x[2], pic: x[3] })) : []; })();
const bigTheme = THEME_TILES.filter(t => legoThemes.has(t.theme)).map(t => ({ ...t, list: legoThemes.get(t.theme) }));
// Popular sets: the ones most collectors own in BrickCollect (Admin numbers, 2+ collectors), topped up with
// the biggest recent sets from the favourite themes, one per theme, then the app's own POPULAR list.
const popular = (() => {
  const out = [], seen = new Set(), add = x => { if (x && !seen.has(x.n) && out.length < 12) { seen.add(x.n); out.push(x); } };
  Object.entries(mostOwned).filter(([n, c]) => c >= 2 && byN.has(n)).sort((a, b) => b[1] - a[1]).forEach(([n]) => add(byN.get(n)));
  const recent = now.getFullYear() - 2;
  for (const t of THEME_TILES) { const l = legoThemes.get(t.theme) || []; add(l.filter(x => x.year >= recent && /^\d{4,5}-1$/.test(x.n)).sort((a, b) => (b.pieces || 0) - (a.pieces || 0))[0]); }
  POPULAR.forEach(n => add(byN.get(n)));
  return out;
})();
const thisYear = now.getFullYear();
const retiring = sets.filter(x => (retState(x) || {}).s === 'S').sort((a, b) => (Date.parse((shared.get(a.n) || {}).exit || '9999') - Date.parse((shared.get(b.n) || {}).exit || '9999')) || (b.pieces || 0) - (a.pieces || 0)).slice(0, 12);
const newest = sets.filter(x => x.brand === 'LEGO' && x.year >= thisYear).sort((a, b) => (b.pieces || 0) - (a.pieces || 0)).slice(0, 12);
const themeTile = t => { const pic = byN.get(t.pic) || t.list.slice().sort((a, b) => (b.pieces || 0) - (a.pieces || 0))[0]; return `<a class="ttile" href="${esc(themePath(t.theme))}">${pic ? `<img src="${esc(imgUrl(pic))}" alt="" loading="lazy" width="120" height="80">` : ''}<span class="cn">${esc(t.label)}</span><span class="cm">${fmt(t.list.length)} sets</span></a>`; };
const brandTile = ([b, l]) => { const pic = l.find(x => x.img); return `<a class="ttile" href="${esc(brandPath(b))}">${pic ? `<img src="${esc(pic.img)}" alt="" loading="lazy" width="120" height="80">` : ''}<span class="cn">${esc(b)}</span><span class="cm">${fmt(l.length)} sets</span></a>`; };
const section = (title, more, list) => list.length ? `<section class="hsec"><div class="hhead"><h2>${title}</h2>${more || ''}</div><div class="tcards">${list.map(tcard).join('')}</div></section>` : '';
const REDIRECT = `<script>/* Collectors who already have sets (or are signed in) go straight to My collection, and old links like /?set=… keep working. Coming from another BrickCollect page (Home in the menu) stays here. */
(()=>{try{const qs=new URLSearchParams(location.search),r=document.referrer,same=!!r&&new URL(r).origin===location.origin;
const go=['set','carry','apiKey','oobCode','mode','q','source'].some(k=>qs.has(k))||location.hash==='#about'||location.hash==='#signin';
const has=!!localStorage.getItem('bc-acct')||Object.keys(JSON.parse(localStorage.getItem('bc-collection')||'{}')||{}).length>0;
if(go||(has&&!same&&!qs.has('home')))location.replace('/collection'+location.search+location.hash)}catch{}})();</script>\n`;
write('./index.html', shell({
  path: '/', head: REDIRECT,
  title: 'BrickCollect: the free collection tracker for LEGO and other brick brands',
  desc: `Track your LEGO collection free: select “I own it” to add sets to your collection, see pieces, minifigures and what it's worth, keep a Wanted list and see what's retiring soon. ${fmt(sets.length)} sets from LEGO${brands.size ? `, ${[...brands.keys()].join(', ')}` : ''}.`,
  h1: '', crumbs: [],
  body: `<section class="hero"><div><h1>Your brick collection, all in one place</h1>
<p class="lead">The free collection tracker for LEGO and other brick brands. Select “I own it” to add sets to your collection, keep a Wanted list, see what your collection is worth, and share or sell it.</p>
<div class="row"><a class="btn primary" href="/collection#signin" id="heroBtn" data-cta="hero">Sign in to view your collection</a><a class="btn" href="/sets" data-cta="hero_sets">Browse all ${fmt(sets.length)} sets</a></div></div></section>
${section('Popular sets', '<a href="/collection" data-cta="more_popular">Find more in My collection →</a>', popular)}
${section('Retiring soon', '<a href="/collection?ret=S" data-cta="more_retiring">All retiring soon →</a>', retiring)}
${section(`New in ${thisYear}`, '', newest)}
<section class="hsec"><div class="hhead"><h2>Themes</h2><a href="/sets">All themes →</a></div><div class="ttiles">${bigTheme.map(themeTile).join('')}</div></section>
${brands.size ? `<section class="hsec"><div class="hhead"><h2>Other brands</h2><a href="/sets#brands">All brands →</a></div><div class="ttiles">${[...brands].sort((a, b) => b[1].length - a[1].length).map(brandTile).join('')}</div></section>` : ''}
<div class="tickbar" id="tickBar" hidden><span>✓ <b id="tickN"></b> added to your collection</span><a class="btn primary" href="/collection" data-cta="tickbar">Open My collection →</a></div>`,
}));

/* ---------- About and Privacy: their text from public/about.html and public/privacy.html, in the site's page ---------- */
for (const [file, path, crumb] of [['about.html', '/about', 'About'], ['privacy.html', '/privacy', 'Privacy'], ['getting-started.html', '/getting-started', 'Getting started']]) {
  const src = readFileSync(new URL(file, PUB), 'utf8');
  const main = (src.match(/<main>([\s\S]*?)<\/main>/) || [])[1];
  if (!main) throw new Error(`No <main> in ${file}; update build-pages.mjs`);
  const title = (src.match(/<title>([^<]*)<\/title>/) || [])[1] || `${crumb} · BrickCollect`;
  const desc = (src.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const h1 = (main.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1] || crumb;
  const scripts = [...src.slice(src.indexOf('</main>')).matchAll(/<script>[\s\S]*?<\/script>/g)].map(m => m[0]).join('\n');
  // Each part (the intro, then every heading and its text) in its own white box, like the app.
  const inner = main.replace(/<a class="back"[^>]*>[\s\S]*?<\/a>/, '').replace(/<h1>[\s\S]*?<\/h1>/, '');
  const parts = inner.split(/(?=<h2>)/).map(x => x.trim()).filter(Boolean);
  const body = `<div class="prose">${parts.map(x => `<section class="box">${x}</section>`).join('\n')}</div>\n${scripts}`;
  write(`.${path}.html`, shell({ path, title, desc, h1, crumbs: [[crumb, path]], body, notice: false }));
}

/* ---------- What's new: the app's own release notes (RELEASES in index.html) ---------- */
{
  const src = readFileSync(new URL('index.html', PUB), 'utf8');
  const a = src.indexOf('const RELEASES = ['), b = src.indexOf('\n];', a);
  if (a < 0 || b < 0) throw new Error('RELEASES not found in index.html; update build-pages.mjs');
  const rel = vm.runInNewContext(`(${src.slice(a + 'const RELEASES = '.length, b + 2)})`);
  const body = `<div class="prose" data-seen="${esc(rel[0].v)}">${rel.map(r => `<section class="box rel"><h2><span class="v">v${esc(r.v)}</span> ${esc(r.title)} <span class="d">${esc(r.date)}</span></h2><ul>${r.items.map(([t, d]) => `<li><b>${esc(t)}</b>: ${esc(d)}</li>`).join('')}</ul></section>`).join('\n')}</div>`;
  write('./whats-new.html', shell({ path: '/whats-new', title: 'What’s new · BrickCollect', desc: 'New features and improvements in BrickCollect, the free collection tracker for LEGO and other brick brands.', h1: 'What’s new', crumbs: [['What’s new', '/whats-new']], body, notice: false }));
}

/* ---------- Admin page: same header, menu and footer as the other pages ----------
   public/admin.html keeps its own styles for the numbers; it gets chrome.css (the shared part of pages.css:
   colours, header, menu, notice, footer) and pages.js, and its old header is swapped for the site's. */
{
  const css = readFileSync(new URL('pages.css', PUB), 'utf8');
  const cut = css.indexOf('/* ===== page content');
  if (cut < 0) throw new Error('pages.css lost its "page content" marker; update build-pages.mjs');
  const chrome = css.slice(0, cut), CHROME_V = createHash('sha1').update(chrome).digest('hex').slice(0, 10);
  writeFileSync(new URL('chrome.css', OUT), chrome);
  const f = new URL('admin.html', OUT);
  let a = readFileSync(f, 'utf8');
  const hs = a.indexOf('<header>'), he = a.indexOf('</header>');
  if (hs < 0 || he < 0) throw new Error('Admin page header not found; update build-pages.mjs');
  a = a.slice(0, hs) + HEADER + a.slice(he + '</header>'.length);
  a = a.replace('<style>', `<link rel="stylesheet" href="/chrome.css?v=${CHROME_V}">\n<style>`)
       // its own old header rules would style the new header: drop them
       .replace(/^header[^\n]*\n/gm, '')
       .replace(/\s*header\{padding:12px 14px\}header h1\{font-size:17px\}header \.back\{padding:5px 9px\}/, '')
       .replace(/\s*header \.wide\{display:none\}/, '')
       .replace('main{max-width:1180px;margin:0 auto;padding:18px 20px 60px}', 'main{max-width:1320px;margin:0 auto;padding:18px max(16px,env(safe-area-inset-right,0px)) 60px max(16px,env(safe-area-inset-left,0px))}\n.crumbs{margin:0 0 16px;font-size:13px;color:var(--muted)}.crumbs a{color:var(--muted);text-decoration:none}.crumbs a:hover{color:var(--accent)}.crumbs .sep{margin:0 6px;color:var(--faint)}\n.adm-h1{font-size:30px;font-weight:500;margin:0 0 16px;line-height:1.2}')
       .replace('<main>', '<main>\n  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span class="sep">›</span><span>Admin</span></nav>\n  <h1 class="adm-h1">Admin</h1>')
       .replace('</main>', `</main>\n<div class="wrap">${FOOTER}</div>`)
       .replace('</body>', `<script src="/pages.js?v=${JS_V}"></script>\n</body>`);
  writeFileSync(f, a);
}

/* ---------- sale pages (/sale/<id>): the site's header and footer too ---------- */
{
  const css = readFileSync(new URL('pages.css', PUB), 'utf8'), chrome = css.slice(0, css.indexOf('/* ===== page content'));
  const CHROME_V = createHash('sha1').update(chrome).digest('hex').slice(0, 10);
  const f = new URL('sale.html', OUT);
  let a = readFileSync(f, 'utf8');
  const hs = a.indexOf('<header class="top">'), he = a.indexOf('</header>', hs);
  const fs = a.indexOf('<footer class="bot">'), fe = a.indexOf('</footer>', fs);
  if (hs < 0 || he < 0 || fs < 0 || fe < 0) throw new Error('Sale page header/footer not found; update build-pages.mjs');
  const report = '<p class="report"><a href="#" id="report">Report this list</a></p>';
  a = a.slice(0, hs) + HEADER + a.slice(he + 9, fs) + `<div class="wrap">${FOOTER}</div>` + a.slice(fe + 9);
  a = a.replace('</main>', `${report}\n</main>`)
       .replace('<style>', `<link rel="stylesheet" href="/chrome.css?v=${CHROME_V}">\n<style>`)
       .replace(/^header\.top[^\n]*\n/gm, '').replace(/^\.brand[^\n]*\n/gm, '').replace(/^\.top \.cta[^\n]*\n/gm, '')
       .replace('.wrap{max-width:1180px;margin:0 auto;padding:0 20px}', '.wrap{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));max-width:1320px;margin:0 auto}\n.report{margin:24px 0 0;font-size:13px}')
       .replace('</body>', `<script src="/pages.js?v=${JS_V}"></script>\n</body>`);
  writeFileSync(f, a);
}

/* ---------- signed-in pages: /selling (your sale or trade list) and /account ---------- */
const FB = ['app', 'auth', 'firestore'].map(m => `<script src="https://www.gstatic.com/firebasejs/11.10.0/firebase-${m}-compat.js"></script>`).join('\n') + '\n<script src="/config.js"></script>\n<script src="/backend-firebase.js"></script>\n';
const userPage = (path, title, h1, crumb, body, script) => write(`.${path}.html`, shell({ path, title, desc: '', h1, crumbs: [[crumb, path]], robots: 'noindex', notice: false, head: FB,
  body: `<div class="prose" id="pg"><section class="box" id="pgWait"><p>Loading…</p></section>${body}</div>\n<script>\n(async () => {\n  const $ = id => document.getElementById(id);\n  const show = id => { document.querySelectorAll('#pg > .box').forEach(b => { b.hidden = !b.matches(id); }); };\n  const BC = window.BC || {}; const uid = BC.user ? await BC.user.id() : null;\n  if (!uid) { show('.out'); return; }\n${script}\n})();\n</script>` }));

userPage('/selling', 'My sale or trade list · BrickCollect', 'My sale or trade list', 'My sale or trade list',
  `<section class="box out" hidden><h2>Sign in to see your sale or trade list</h2><p>Your sale or trade list is the page buyers see when you share it: everything you’re letting go, with pictures, condition and prices, from any brand.</p><p><a class="btn primary" href="/collection#signin">Sign in</a></p></section>
<section class="box none" hidden><h2>You haven’t shared a sale or trade list yet</h2><p>Post your whole list in one go: one link instead of a post for every set.</p><ol><li>In My collection, open <b>Sell or trade</b> and mark the copies you’re letting go.</li><li>Choose <b>Share your list</b>, say how buyers can reach you, and create your link.</li><li>Share the link or Copy a post into Facebook groups. Buyers message you directly.</li></ol><p><a class="btn primary" href="/collection#sell">Open Sell or trade</a></p></section>`,
  `  try { const s = await BC.db.doc('data/users/' + uid + '/share').get(); const v = s.exists ? s.data() : null; if (v && v.on && v.id) { location.replace('/sale/' + v.id + '?mine=1'); return; } } catch (e) { console.warn(e); }
  show('.none');`);

userPage('/account', 'My account · BrickCollect', 'My account', 'My account',
  `<section class="box out" hidden><h2>Sign in to your account</h2><p>Save your collection to a free account and see it on your phone and computer.</p><p><a class="btn primary" href="/collection#signin">Sign in</a></p></section>
<section class="box in" hidden><h2>Your account</h2><dl class="kv"><dt>Email</dt><dd id="aEmail">—</dd><dt>Member since</dt><dd id="aSince">—</dd><dt>Signed in with</dt><dd id="aHow">—</dd><dt id="aRoleK" hidden>Account type</dt><dd id="aRole" hidden></dd></dl></section>
<section class="box in" hidden><h2>Your collection</h2><div class="stats"><div class="stat"><div class="k">Sets</div><div class="v" id="aSets">—</div></div><div class="stat"><div class="k">Minifigures</div><div class="v" id="aFigs">—</div></div><div class="stat"><div class="k">Wanted</div><div class="v" id="aWant">—</div></div><div class="stat"><div class="k">For sale or trade</div><div class="v" id="aSale">—</div></div></div><p class="row"><a class="btn primary" href="/collection">Open My collection</a><a class="btn" href="/collection#export">Export</a></p></section>
<section class="box in" hidden><h2>Your sale or trade list</h2><p id="aShare">—</p><p class="row"><a class="btn" href="/selling">My sale or trade list</a></p></section>
<section class="box in" hidden><h2>Sign out</h2><p>Your collection stays safe in your account. Sign in again any time to see it.</p><p class="row"><button class="btn" type="button" id="aOut">Sign out</button></p></section>
<section class="box in danger" hidden><h2>Delete your account</h2><p>This removes your collection, your shared sale or trade list and your sign-in for good. It can’t be undone, so export your collection first if you might want it later.</p><p class="row"><a class="btn" href="/collection#export">Export first</a><a class="btn warn" href="/collection#account">Delete my account…</a></p></section>`,
  `  show('.in');
  const fmt = n => Number(n || 0).toLocaleString();
  const u = window.firebase && firebase.auth().currentUser;
  $('aEmail').textContent = (u && u.email) || (await BC.user.email()) || '—';
  if (u && u.metadata && u.metadata.creationTime) $('aSince').textContent = new Date(u.metadata.creationTime).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  const how = u && (u.providerData || []).map(p => p.providerId === 'google.com' ? 'Google' : p.providerId === 'password' || p.providerId === 'emailLink' ? 'Email link' : p.providerId).join(', ');
  $('aHow').textContent = how || 'Email link';
  // Account type only for staff (Admin / Super admin); everyone else is a User, which says nothing.
  try { const r = BC.user.role ? await BC.user.role() : 'user'; if (r === 'super' || r === 'admin') { $('aRole').textContent = r === 'super' ? 'Super admin' : 'Admin'; $('aRole').hidden = $('aRoleK').hidden = false; } } catch {}
  try {
    const c = await BC.db.doc('data/users/' + uid + '/collection').get(); const it = (c.exists && c.data().items) || {};
    let sets = 0, figs = 0, want = 0, sale = 0;
    for (const [n, v] of Object.entries(it)) { if (!v) continue; if (v.owned) { if (n.startsWith('fig-')) figs++; else sets++; } if (v.wanted) want++; for (const q of Object.values(v.sale || {})) sale += Number(q) || 0; }
    $('aSets').textContent = fmt(sets); $('aFigs').textContent = fmt(figs); $('aWant').textContent = fmt(want); $('aSale').textContent = fmt(sale);
  } catch (e) { console.warn(e); }
  try { const s = await BC.db.doc('data/users/' + uid + '/share').get(); const v = s.exists ? s.data() : null;
    $('aShare').innerHTML = v && v.on && v.id ? 'Shared at <a href="/sale/' + v.id + '">brickcollect.app/sale/' + v.id + '</a>' + (v.idx ? ' · search engines can find it' : ' · hidden from search engines') + '.' : 'Not shared yet.'; } catch (e) { console.warn(e); }
  $('aOut').onclick = async () => { try { await BC.auth.signOut(); } catch {} try { localStorage.removeItem('bc-acct'); localStorage.removeItem('bc-admin'); } catch {} location.href = '/'; };`);

/* ---------- 404: unknown addresses get the site's page with a way back ---------- */
write('./404.html', shell({ path: '/404', title: 'Page not found · BrickCollect', desc: '', h1: 'Page not found', crumbs: [], robots: 'noindex', notice: false,
  body: `<div class="prose"><section class="box"><p>That page doesn’t exist, or the link was copied only in part. Try searching above, or:</p><p class="row"><a class="btn primary" href="/">Home</a><a class="btn" href="/collection">My collection</a><a class="btn" href="/sets">All sets</a></p></section></div>` }));

/* ---------- sitemaps ---------- */
const urlset = paths => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(p => `  <url><loc>${SITE}${p}</loc></url>`).join('\n')}\n</urlset>\n`;
write('./sitemap-pages.xml', urlset(['/', '/collection', '/sets', '/about', '/getting-started', '/privacy', '/whats-new', ...[...legoThemes.keys()].map(themePath), ...[...brands.keys()].map(brandPath)]));
write('./sitemap-sets.xml', urlset(sets.map(x => x.path)));
const day = now.toISOString().slice(0, 10);
write('./sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${SITE}/sitemap-pages.xml</loc><lastmod>${day}</lastmod></sitemap>\n  <sitemap><loc>${SITE}/sitemap-sets.xml</loc><lastmod>${day}</lastmod></sitemap>\n</sitemapindex>\n`);

console.log(`Built the home page (app moved to /collection), ${fmt(sets.length)} set pages, ${legoThemes.size} theme pages, ${brands.size} brand pages, /sets and the sitemaps`);
