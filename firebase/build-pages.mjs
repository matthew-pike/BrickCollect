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
  return m[1];
})();
const CURS = ['AUD', 'USD', 'EUR', 'GBP', 'CAD', 'NZD', 'JPY', 'CHF'];
const HEADER = `<header class="top"><div class="wrap">
<div class="brand"><a href="/" class="brandmark" aria-hidden="true" tabindex="-1">${MARK}</a><div><p class="bname"><a href="/">BrickCollect</a> <span class="beta">BETA</span></p><p class="tag">Collect. Track. Value. Export. In one place.</p></div></div>
<form class="search" action="/collection" role="search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input name="q" type="search" placeholder="Search name, set #, subtheme or tag…" autocomplete="off" aria-label="Search by set name, number, subtheme or tag"></form>
<div class="top-actions">
<a class="btn acct" id="acctBtn" href="/collection#signin" title="Sign in to save your collection to a free account">Sign in</a>
<select id="curSel" class="cur" aria-label="Currency" title="Currency">${CURS.map(c => `<option>${c}</option>`).join('')}</select>
<button class="icon-btn" id="themeBtn" type="button" title="Switch between dark, mid and light" aria-label="Switch theme"><svg id="themeIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"></svg></button>
<a class="icon-btn" id="showWelcome" href="/about" title="About BrickCollect" aria-label="About BrickCollect"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg></a>
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
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    const { initializeApp, applicationDefault } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    initializeApp({ credential: applicationDefault(), projectId: 'brickcollect-app' });
    const db = getFirestore();
    const [info, cat, subs] = await Promise.all([db.collection('iteminfo').get(), db.collection('catalog').get(), db.collection('subthemes').get()]);
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
function shell({ path, title, desc, img, h1, crumbs, body, robots, head = '' }) {
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
${crumbs.length ? `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span class="sep">›</span>${crumbs.map((c, i) => i === crumbs.length - 1 ? `<span>${esc(c[0])}</span>` : `<a href="${esc(c[1])}">${esc(c[0])}</a>`).join('<span class="sep">›</span>')}</nav>` : ''}
${h1 ? `<h1>${h1}</h1>\n` : ''}${body}
</main>
<footer class="foot"><div class="wrap">
<div class="promo"><b>BrickCollect</b> is the free collection tracker for LEGO and other brick brands. Tick the sets you own, keep a Wanted list, see what your collection is worth, and share or sell it. <a href="/collection" data-cta="footer">Open My collection</a></div>
<p class="fine">LEGO® is a trademark of the LEGO Group, which does not sponsor, authorise or endorse this site. LEGO set and minifigure data © <a href="https://rebrickable.com/" rel="noopener">Rebrickable</a>, used under their terms. Other brands are listed by hand from public set information, and their names and trademarks belong to their owners. Some store links are affiliate links: if you buy through them, The Art of Bricks may earn a small commission at no extra cost to you. <a href="/privacy">Privacy</a></p>
</div></footer>
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
    figs.length ? ['Minifigures', String(figs.length)] : null,
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
<div class="pic">${imgUrl(x) ? `<img src="${esc(imgUrl(x))}" alt="${esc(`${x.brand} ${num} ${x.name}`)}">` : '<span class="noimg big"></span>'}</div>
<div>
<div class="track"><b>Got this set?</b><span class="muted">Tick it in BrickCollect to keep count of your sets, pieces and minifigures. Free, no password needed.</span>
<div class="row"><a class="btn primary" href="${esc(app)}&amp;add=own" rel="nofollow" data-cta="own">✓ I own it</a><a class="btn" href="${esc(app)}&amp;add=want" rel="nofollow" data-cta="want">☆ I want it</a></div></div>
<dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
${links ? `<div class="row links">${links}</div>` : ''}
</div>
</div>
${figs.length ? `<h2>Minifigures in this set (${figs.length})</h2>
<div class="figs">${figs.map(f => `<div class="fig"><img src="${esc(figImg(f))}" alt="" loading="lazy" width="80" height="80"><span class="cn">${esc(f.name)}</span><span class="cm">${esc(bl.figs[f.n] || f.n)}</span></div>`).join('')}</div>` : ''}
${near.length ? `<h2>More ${esc(x.sub || x.theme)} sets</h2>
<div class="cards">${near.map(card).join('')}</div>
<p><a href="${esc(groupPath(x))}">All ${esc(groupName(x))} sets →</a></p>` : ''}`;
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
    desc: `Every ${crumbName} set (${fmt(list.length)}) with year, pieces, minifigures and retired status. Tick the ones you own and track your collection free in BrickCollect.`,
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
const popular = POPULAR.map(n => byN.get(n)).filter(Boolean);
const thisYear = now.getFullYear();
const retiring = sets.filter(x => (retState(x) || {}).s === 'S').sort((a, b) => (Date.parse((shared.get(a.n) || {}).exit || '9999') - Date.parse((shared.get(b.n) || {}).exit || '9999')) || (b.pieces || 0) - (a.pieces || 0)).slice(0, 12);
const newest = sets.filter(x => x.brand === 'LEGO' && x.year >= thisYear).sort((a, b) => (b.pieces || 0) - (a.pieces || 0)).slice(0, 12);
// Same themes and pictures as the theme row in My collection.
const THEME_TILES = (() => { const m = readFileSync(new URL('index.html', PUB), 'utf8').match(/const THEME_TILES = \[([\s\S]*?)\];/); return m ? [...m[1].matchAll(/\['([^']+)', '([^']+)', '([^']+)'\]/g)].map(x => ({ label: x[1], theme: x[2], pic: x[3] })) : []; })();
const bigTheme = THEME_TILES.filter(t => legoThemes.has(t.theme)).map(t => ({ ...t, list: legoThemes.get(t.theme) }));
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
  desc: `Track your LEGO collection free: tick the sets you own, see pieces, minifigures and what it's worth, keep a Wanted list and see what's retiring soon. ${fmt(sets.length)} sets from LEGO${brands.size ? `, ${[...brands.keys()].join(', ')}` : ''}.`,
  h1: '', crumbs: [],
  body: `<section class="hero"><div><h1>Your brick collection, all in one place</h1>
<p class="lead">The free collection tracker for LEGO and other brick brands. Tick the sets you own, keep a Wanted list, see what your collection is worth, and share or sell it. No password needed.</p>
<div class="row"><a class="btn primary" href="/collection" data-cta="hero">Open My collection</a><a class="btn" href="/sets" data-cta="hero_sets">Browse all ${fmt(sets.length)} sets</a></div></div></section>
${section('Tick the sets you own', '<a href="/collection" data-cta="more_popular">Find more in My collection →</a>', popular)}
${section('Retiring soon', '<a href="/collection?ret=S" data-cta="more_retiring">All retiring soon →</a>', retiring)}
${section(`New in ${thisYear}`, '', newest)}
<section class="hsec"><div class="hhead"><h2>Themes</h2><a href="/sets">All themes →</a></div><div class="ttiles">${bigTheme.map(themeTile).join('')}</div></section>
${brands.size ? `<section class="hsec"><div class="hhead"><h2>Other brands</h2><a href="/sets#brands">All brands →</a></div><div class="ttiles">${[...brands].sort((a, b) => b[1].length - a[1].length).map(brandTile).join('')}</div></section>` : ''}
<div class="tickbar" id="tickBar" hidden><span>✓ <b id="tickN"></b> ticked, saved in this browser</span><a class="btn primary" href="/collection" data-cta="tickbar">Open My collection →</a></div>`,
}));

/* ---------- About and Privacy: their text from public/about.html and public/privacy.html, in the site's page ---------- */
for (const [file, path, crumb] of [['about.html', '/about', 'About'], ['privacy.html', '/privacy', 'Privacy']]) {
  const src = readFileSync(new URL(file, PUB), 'utf8');
  const main = (src.match(/<main>([\s\S]*?)<\/main>/) || [])[1];
  if (!main) throw new Error(`No <main> in ${file}; update build-pages.mjs`);
  const title = (src.match(/<title>([^<]*)<\/title>/) || [])[1] || `${crumb} · BrickCollect`;
  const desc = (src.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const h1 = (main.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1] || crumb;
  const scripts = [...src.slice(src.indexOf('</main>')).matchAll(/<script>[\s\S]*?<\/script>/g)].map(m => m[0]).join('\n');
  const body = `<div class="prose">${main.replace(/<a class="back"[^>]*>[\s\S]*?<\/a>/, '').replace(/<h1>[\s\S]*?<\/h1>/, '')}</div>\n${scripts}`;
  write(`.${path}.html`, shell({ path, title, desc, h1, crumbs: [[crumb, path]], body }));
}

/* ---------- sitemaps ---------- */
const urlset = paths => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(p => `  <url><loc>${SITE}${p}</loc></url>`).join('\n')}\n</urlset>\n`;
write('./sitemap-pages.xml', urlset(['/', '/collection', '/sets', '/about', '/privacy', ...[...legoThemes.keys()].map(themePath), ...[...brands.keys()].map(brandPath)]));
write('./sitemap-sets.xml', urlset(sets.map(x => x.path)));
const day = now.toISOString().slice(0, 10);
write('./sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>${SITE}/sitemap-pages.xml</loc><lastmod>${day}</lastmod></sitemap>\n  <sitemap><loc>${SITE}/sitemap-sets.xml</loc><lastmod>${day}</lastmod></sitemap>\n</sitemapindex>\n`);

console.log(`Built the home page (app moved to /collection), ${fmt(sets.length)} set pages, ${legoThemes.size} theme pages, ${brands.size} brand pages, /sets and the sitemaps`);
