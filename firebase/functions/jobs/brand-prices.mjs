// Daily: fetch retail prices from brands' own Shopify stores (LumiBricks and Pantasy) and save them
// as the "new" price for those sets, converted to AUD. Sets the store sells that aren't in
// BrickCollect yet are added to that brand's list (name and number; theme left as "Unsorted").
// Each set's exact product address is saved too, so the site's Buy button links straight to it,
// along with the store's product photo and the series it belongs to (as the set's theme).
//
// Shopify stores publish their product list at /products.json and the store currency at /cart.js.
// Product addresses end in the set number (e.g. /products/edinburgh-corner-15021).
import { fs, readShared, upsertShared, savePrices, readBuckets } from '../lib/common.mjs';

// series: the store's collections that are product lines, in priority order (a set in two takes the first).
// Their names become the set's theme on BrickCollect. Cross-cutting ones (X Series, Vehicle) come last.
const BRANDS = [
  { brand: 'LumiBricks', shop: 'https://www.lumibricks.com', series: [
    ['blade-runner-2049', 'Blade Runner 2049'], ['cyberpunk', 'Cyberpunk Neoncity'], ['town-life', 'Town Life'],
    ['street-fusion', 'Street Fusion'], ['lumibrickscanvas', 'LumiBricks Canvas'], ['the-old-west', 'The Old West'],
    ['retro-house', 'Retro House'], ['middle-ages', 'Middle Ages'], ['steampunk-world', 'Steampunk World'],
    ['road-trip', 'Road Trip'], ['vacation', 'Vacation'], ['farm-life', 'Farm Life'],
    ['x-series', 'X Series'], ['vehicle', 'Vehicle'],
  ] },
  { brand: 'Pantasy', shop: 'https://pantasy.com' },
  // Set numbers that aren't at the end of the product address are found in the address, title or SKU with numRe.
  { brand: 'CaDA', shop: 'https://decadastore.com', numRe: /\b(C\d{5}[A-Z]?)\b/i },
  { brand: 'Mould King', shop: 'https://mouldkingcorp.com', numRe: /\b(\d{5})\b/ },
  // JMBricklayer set numbers are 5 digits (e.g. 61031), usually in the product title or SKU.
  { brand: 'JMBricklayer', shop: 'https://jmbricklayer.com', numRe: /\b(\d{5})\b/ },
  // Brickcraft (US, licensed pop-culture sets): the SKU is the set number plus a licence code, e.g. 72772FTM.
  // MX = bundles of other sets, and bundles with no SKU don't match either, so neither is added.
  // The licence code becomes the theme (unknown codes stay Unsorted for the owner to sort).
  { brand: 'Brickcraft', shop: 'https://shopbrickcraft.com', numRe: /\b(\d{5})(?!MX)[A-Z]{2,3}\b/i, themeOf: p => BRICKCRAFT_LINES[skuCode(p)] },
  // Reobrix (Chinese brand, licensed World of Tanks, Maserati, Lambretta sets). Its store runs on UeeShop, not Shopify,
  // so products are read from the store's pages instead (ueeshopProducts below). Set numbers are on each product page
  // as "No.RB99009"; the store's collections (Car, Ship, Space, Train…) become the theme. Prices are in USD.
  // Barweer (Chinese store, barweer.com, Shopify). It also sells other brands' sets (DK, Xbert, Pantasy…), so only its own
  // sets are taken: numbered BWR + 3–4 digits (e.g. BWR302 Lion Castle), found in the address, title or SKU.
  // Its product types aren't checked yet, so new sets come in as Unsorted for the owner to sort.
  { brand: 'Barweer', shop: 'https://www.barweer.com', numRe: /\b(BWR\d{3,4})\b/i, themeOf: () => null },
  // Mattel Brick Shop (Mattel's own brick sets: Hot Wheels cars, Masters of the Universe, Xbox…), from the US Mattel store
  // (shop.mattel.com, Shopify), which sells all of Mattel's toys, so only its Mattel Brick Shop collection is read.
  // Set numbers are Mattel's product codes, 3 letters + 2 digits at the end of the address (…-audi-r8-lms-deluxe-version-jnm81).
  // The same set is listed again for Canada, Brazil and Mexico (…-jnm81-en-ca, -fr-ca, -pt-br, -es-mx) in other currencies,
  // so only the US listing (no region on the end) is taken. RRP = the full price (compare-at) when the store shows a sale price.
  { brand: 'Mattel Brick Shop', shop: 'https://shop.mattel.com', currency: 'USD', numRe: /\b([A-Z]{3}\d{2})$/i,
    products: async shop => (await allProducts(`${shop}/collections/mattel-brick-shop`)).filter(p => /-[a-z]{3}\d{2}$/i.test(p.handle || '')),
    themeOf: p => mattelLine(p.title), tidy: n => mattelName(n), rrpFull: true, piecesFromText: true },
  { brand: 'Reobrix', shop: 'https://reobrix.com', currency: 'USD', products: (shop, known) => ueeshopProducts(shop, known), imgSize: false },
];

const skuCode = p => { for (const v of p.variants || []) { const m = /^\d{5}([A-Z]{2,3})$/i.exec(String(v.sku || '').trim()); if (m) return m[1].toUpperCase(); } return ''; };
const BRICKCRAFT_LINES = {
  BBD: 'Breaking Bad', BEV: 'Beavis and Butt-Head', BFS: 'Brickcraft Originals', BRK: 'Brickcraft Originals',
  FMG: 'Family Guy', FTM: 'Futurama', GDG: 'The Golden Girls', GRD: 'Grateful Dead', GRI: 'The Grinch',
  HID: 'Mo Willems', JSN: 'Friday the 13th', KOH: 'King of the Hill', MTV: 'MTV', NCK: 'Nickelodeon',
  PPT: 'Poppy Playtime', RUD: 'Rudolph', SAN: 'Sanrio', SUS: 'Dr. Seuss', TYT: 'Toyota', YS: 'Yellowstone',
};

// Mattel Brick Shop: the theme is the line named in the title; names lose the line (it's the theme) and the store's "Building Toy Kit"-style endings.
export const mattelLine = t => /masters of the universe|\bmotu\b|he-man|skeletor/i.test(t || '') ? 'Masters of the Universe'
  : /\bxbox\b/i.test(t || '') ? 'Xbox' : /hot wheels/i.test(t || '') ? 'Hot Wheels' : null;
export const mattelName = n => String(n || '').replace(/^\s*Mattel Brick Shop\b[\s:–-]*/i, '').replace(/^\s*(?:Hot Wheels|Masters of the Universe)\s+/i, '')
  .replace(/\s+(?:Vehicle\s+)?(?:Building\s+(?:Toy\s+)?(?:Kit|Set)|Collector\s+Building\s+Set)\s*$/i, '').trim() || n;
// Piece count from the product description ("861 pieces", "3,509 pcs").
export const piecesIn = html => { const m = /(\d{1,2},?\d{3}|\d{2,4})\s*(?:-|\s)?(?:pieces|pcs|piece)\b/i.exec(String(html || '').replace(/<[^>]+>/g, ' ')); return m ? Number(m[1].replace(',', '')) : null; };

// The set number is the last number in the address, optionally followed by a region (e.g. pantasy-t-800-87503-us-eu).
const numFromHandle = h => { const m = /-([a-z]?\d{4,6})(?:-[a-z]{2,3})*$/i.exec(h || ''); return m ? m[1].toUpperCase() : null; };
const cleanName = (title, num) => String(title || '').replace(new RegExp(`\\s*[-–|#]?\\s*${num}\\s*$`, 'i'), '').replace(/^\s*(LumiBricks|Pantasy|JMBricklayer|JM\s?Bricklayer|Brickcraft|Reobrix|Barweer|Mattel\s+Brick\s+Shop)\b[\s:–-]*/i, '').replace(new RegExp(`^\\s*${num}\\b[\\s:–-]*`, 'i'), '').trim() || num;

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'BrickCollect price updater (an Art of Bricks project)', Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

async function allProducts(url) {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const { products: list } = await fetchJson(`${url}/products.json?limit=250&page=${page}`);
    if (!list?.length) break;
    out.push(...list);
    if (list.length < 250) break;
  }
  return out;
}

// ---------- UeeShop stores (Reobrix) ----------
// No product list in JSON, so: read the store's product list pages (/products?page=N) for the product addresses,
// then each product page for its name, set number, price and photo, and each collection's pages for the theme.
// Returns products shaped like Shopify's (handle, title, variants[{price, sku}], images[{src}], product_type).
const UA = { 'User-Agent': 'BrickCollect price updater (an Art of Bricks project)' };
// Each page gets 20 seconds, and one more try after a pause if the store is busy (429/5xx) or slow.
async function fetchHtml(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { ...UA, Accept: 'text/html' }, signal: AbortSignal.timeout(20e3) });
      if (res.ok) return await res.text();
      if (attempt >= 2 || !(res.status === 429 || res.status >= 500)) throw new Error(`HTTP ${res.status}`);
    } catch (e) { if (attempt >= 2 || /^HTTP 4/.test(e.message)) throw e; }
    await new Promise(r => setTimeout(r, 3000));
  }
}
const decodeEnt = s => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).trim();
const metaOf = (html, prop) => {
  const m = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${prop.replace(/[.:]/g, '\\$&')}["'][^>]*content=["']([^"']*)["']`, 'i').exec(html)
    || new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name|itemprop)=["']${prop.replace(/[.:]/g, '\\$&')}["']`, 'i').exec(html);
  return m ? decodeEnt(m[1]) : '';
};
// Product addresses on a page (decoded, so "bat-châtillon…" is one handle however the page writes it).
export function productHandles(html) {
  const out = [];
  for (const m of html.matchAll(/href=["'](?:https?:\/\/[^/"']+)?\/products\/([^"'?#/]+)\/?["'?#]/gi)) {
    let h = m[1]; try { h = decodeURIComponent(h); } catch { /* keep as written */ }
    if (h && !out.includes(h)) out.push(h);
  }
  return out;
}
// The store's collections from its menu: [handle, name]. Skips catch-alls like "All products", "New", "Sale".
export function collectionLinks(html) {
  const out = new Map();
  for (const m of html.matchAll(/<a[^>]+href=["'](?:https?:\/\/[^/"']+)?\/collections\/([a-z0-9-]+)\/?["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const name = decodeEnt(m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
    if (!name || name.length > 40 || /\b(all|new|hot|sale|best|deals?|discount|gift|clearance|pre-?order)\b/i.test(name)) continue;
    if (!out.has(m[1])) out.set(m[1], name);
  }
  return [...out];
}
// One product page → { title, num, price, currency, img }.
export function parseUeeshopProduct(html) {
  const title = metaOf(html, 'og:title') || decodeEnt((/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html) || [])[1]?.replace(/<[^>]+>/g, ''));
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ');
  const num = (/\bNo\.?\s*:?\s*RB\s?-?(\d{3,6})\b/i.exec(text) || /\bRB(\d{3,6})\b/.exec(metaOf(html, 'product:retailer_item_id')) || [])[1] || '';
  let price = Number(metaOf(html, 'product:price:amount') || metaOf(html, 'og:price:amount') || metaOf(html, 'price'));
  if (!(price > 0)) { const m = /"price"\s*:\s*"?([\d.]+)/.exec(html); price = m ? Number(m[1]) : 0; }
  const currency = (metaOf(html, 'product:price:currency') || metaOf(html, 'og:price:currency') || metaOf(html, 'priceCurrency')).toUpperCase();
  let img = metaOf(html, 'og:image');
  if (img.startsWith('//')) img = `https:${img}`;
  return { title, num, price: price > 0 ? price : 0, currency, img: /^https:\/\//.test(img) ? img : '' };
}
async function pagedHandles(url, maxPages = 40, until = Infinity) {
  const seen = [];
  for (let page = 1; page <= maxPages && Date.now() < until; page++) {
    const html = await fetchHtml(`${url}?page=${page}`);
    const fresh = productHandles(html).filter(h => !seen.includes(h));
    if (!fresh.length) break; // past the last page (UeeShop repeats the last page or shows none)
    seen.push(...fresh);
  }
  return seen;
}
async function inBatches(list, size, fn) { for (let i = 0; i < list.length; i += size) await Promise.all(list.slice(i, i + size).map(fn)); }
// known: product addresses already in BrickCollect. Pages not read yet go first, then the rest oldest-read first,
// so if the time runs out, the next day carries on where this one stopped.
export async function ueeshopProducts(shop, known = new Set(), budgetMs = 200e3) {
  const started = Date.now(), stop = started + budgetMs, fails = {};
  const handles = await pagedHandles(`${shop}/products`, 40, stop);
  // Theme: the first menu collection a product is in (menu order). At most 60 seconds on this.
  const typeOf = new Map();
  try {
    const menuStop = Math.min(stop, Date.now() + 60e3);
    for (const [handle, name] of collectionLinks(await fetchHtml(`${shop}/products`))) {
      if (Date.now() > menuStop) break;
      try { for (const h of await pagedHandles(`${shop}/collections/${handle}`, 15, menuStop)) if (!typeOf.has(h)) typeOf.set(h, name); }
      catch (e) { console.log(`brand-prices: ${shop} collection ${handle} skipped:`, e.message); }
    }
  } catch (e) { console.log(`brand-prices: ${shop} menu skipped:`, e.message); }
  const order = [...handles.filter(h => !known.has(`/products/${h}`)), ...handles.filter(h => known.has(`/products/${h}`))];
  const out = [];
  let i = 0;
  // Six at a time, each taking the next address until the list or the time runs out.
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (i < order.length && Date.now() < stop) {
      const h = order[i++];
      try {
        const p = parseUeeshopProduct(await fetchHtml(`${shop}/products/${encodeURIComponent(h)}`));
        if (!p.num) { fails['no set number'] = (fails['no set number'] || 0) + 1; continue; }
        out.push({ handle: h, num: p.num, title: p.title, product_type: typeOf.get(h) || '', variants: [{ price: p.price, sku: p.num }], images: p.img ? [{ src: p.img }] : [], currency: p.currency });
      } catch (e) { const k = e.name === 'TimeoutError' ? 'timed out' : e.message; fails[k] = (fails[k] || 0) + 1; }
    }
  }));
  console.log(`brand-prices: ${shop} ${handles.length} products listed, ${typeOf.size} with a theme, ${out.length} read (${order.filter(h => !known.has(`/products/${h}`)).length} new before this run) in ${Math.round((Date.now() - started) / 1000)}s; not read: ${JSON.stringify(fails)}${i < order.length ? `; ${order.length - i} left for tomorrow` : ''}`);
  return out;
}

function numFor(p, numRe) {
  if (p.num) return String(p.num).toUpperCase(); // read straight from the product page (UeeShop stores)
  if (!numRe) return numFromHandle(p.handle);
  for (const s of [String(p.handle || '').replace(/-/g, ' '), p.title, ...(p.variants || []).map(v => v.sku)]) {
    const m = numRe.exec(String(s || '')); if (m) return m[1].toUpperCase();
  }
  return null;
}

export async function updateBrand({ brand, shop, series = [], numRe, themeOf, currency: fixedCurrency, products: readProducts, imgSize = true, tidy = n => n, rrpFull = false, piecesFromText = false }, rates, manual = new Set()) {
  let currency = fixedCurrency || 'USD';
  if (!fixedCurrency) try { currency = (await fetchJson(`${shop}/cart.js`)).currency || currency; } catch { /* keep default */ }
  const perAud = currency === 'AUD' ? 1 : rates?.[currency];
  if (!perAud) throw new Error(`No exchange rate for ${currency}`);

  const cat = (await readShared('catalog', brand)) || { brand, items: {} };
  const known = new Set(Object.values(cat.items || {}).map(v => v?.url).filter(Boolean));
  const products = await (readProducts || allProducts)(shop, known);
  // Which series (theme) each product belongs to: the first matching collection in the brand's list.
  const seriesOf = new Map();
  for (const [handle, name] of series) {
    try { for (const p of await allProducts(`${shop}/collections/${handle}`)) if (!seriesOf.has(p.handle)) seriesOf.set(p.handle, name); }
    catch (e) { console.log(`brand-prices: ${brand} series ${handle} skipped:`, e.message); }
  }

  const items = { ...(cat.items || {}) };
  const updates = new Map(), now = new Date().toISOString();
  let added = 0, priced = 0, linked = 0, themed = 0, pictured = 0, counted = 0;
  // Sets whose number was corrected on the site (catalog moved: old -> new): the store's number maps to the right set,
  // so the old one isn't added back.
  const moved = cat.moved || {};
  const follow = n => { for (let i = 0; i < 10 && n && moved[n] && moved[n] !== n; i++) n = moved[n]; return n; };
  for (const p of products) {
    const num = follow(numFor(p, numRe));
    if (!num) continue;
    // Placeholder prices (some stores show $0.01 on coming-soon sets) don't count. rrpFull: the full price when on sale.
    const prices = (p.variants || []).map(v => Math.max(Number(v.price) || 0, rrpFull ? Number(v.compare_at_price) || 0 : 0)).filter(v => v >= 1);
    if (!items[num]) { items[num] = { name: tidy(cleanName(p.title, num)), theme: 'Unsorted', sub: '', year: null, pieces: null, img: '' }; added++; }
    if (piecesFromText && !items[num].pieces) { const pc = piecesIn(p.body_html); if (pc) { items[num] = { ...items[num], pieces: pc }; counted++; } }
    const path = `/products/${p.handle}`;
    if (items[num].url !== path) { items[num] = { ...items[num], url: path }; linked++; }
    // Set the theme from the store's series, unless you've set one yourself (themeAuto marks ones set here).
    // Product photo from the store, unless you've set a picture yourself (imgAuto marks ones set here).
    const src = p.images?.[0]?.src || p.image?.src;
    if (src) {
      const img = src.replace(/^\/\//, 'https://') + (imgSize ? (src.includes('?') ? '&' : '?') + 'width=640' : '');
      const cur = items[num];
      if (/^https:\/\//.test(img) && cur.img !== img && (!cur.img || cur.imgAuto)) { items[num] = { ...cur, img, imgAuto: true }; pictured++; }
    }
    // Theme: the store's series when it has them, else the brand's own rule (themeOf), otherwise the store's product type (e.g. "Technic").
    const ser = seriesOf.get(p.handle) || (themeOf ? themeOf(p) || null : series.length ? null : String(p.product_type || '').trim() || null), it = items[num];
    if (ser && it.theme !== ser && (!it.theme || it.theme === 'Unsorted' || it.themeAuto)) { items[num] = { ...it, theme: ser, themeAuto: true }; themed++; }
    if (prices.length) {
      const aud = Math.round(Math.min(...prices) / perAud * 100) / 100;
      // The store price is the set's RRP (the RRP column); New and Used are for BrickLink prices only.
      if (!manual.has(`${brand}:${num}`)) updates.set(`${brand}:${num}`, { rrp: aud, rrpAt: now, rrpSource: brand, checkedAt: now });
      priced++;
    }
  }
  if (added || linked || themed || pictured || counted) await upsertShared('catalog', brand, { ...cat, brand, items, updatedAt: Date.now() });
  await savePrices(updates);
  return { brand, currency, products: products.length, priced, added, linked, themed, pictured, ...(piecesFromText ? { counted } : {}) };
}

export default async () => {
  let rates = (await readShared('meta', 'rates'))?.rates;
  if (!rates) {
    // The daily rates job hasn't run yet: fetch today's rates directly and save them for the site too.
    try {
      const d = await fetchJson('https://api.frankfurter.dev/v1/latest?base=AUD');
      rates = { AUD: 1, ...d.rates };
      await upsertShared('meta', 'rates', { base: 'AUD', date: d.date, fetchedAt: Date.now(), rates });
    } catch (e) { console.log('brand-prices: no exchange rates available:', e.message); return; }
  }
  // Store prices saved before the RRP column sat in `new` (priceSource = the brand): move them to rrp first.
  try { console.log('brand-prices: moved to RRP:', await moveStorePricesToRrp()); } catch (e) { console.log('brand-prices: moving to RRP failed:', e.message); }
  // Prices the site owner typed in by hand are left alone.
  const manual = new Set();
  for (const items of (await readBuckets()).values()) for (const [n, v] of Object.entries(items)) if (v?.manualRrp || (v?.manualPrice && v.rrp == null && v.priceSource && v.priceSource !== 'BrickLink')) manual.add(n);
  for (const b of BRANDS) {
    try { console.log('brand-prices:', JSON.stringify(await updateBrand(b, rates, manual))); }
    catch (e) { console.log(`brand-prices: ${b.brand} failed:`, e.message); }
  }
};


// One-off move (safe to re-run; does nothing once done): entries whose store price is in `new` with priceSource = a brand
// get it as rrp / rrpSource / rrpAt (manualPrice becomes manualRrp), and lose new / priceSource / pricedAt / manualPrice.
export async function moveStorePricesToRrp() {
  let moved = 0;
  for (const s of (await fs.collection('iteminfo').get()).docs) {
    const needs = Object.values(s.data().items || {}).some(v => v && v.rrp == null && v.priceSource && v.priceSource !== 'BrickLink');
    if (!needs) continue;
    await fs.runTransaction(async tx => {
      const snap = await tx.get(s.ref), items = { ...((snap.exists && snap.data().items) || {}) };
      for (const [n, v] of Object.entries(items)) {
        if (!v || v.rrp != null || !v.priceSource || v.priceSource === 'BrickLink') continue;
        const { new: price, priceSource, pricedAt, manualPrice, ...rest } = v;
        items[n] = { ...rest, ...(price != null ? { rrp: price, rrpSource: priceSource, rrpAt: pricedAt || null, ...(manualPrice ? { manualRrp: true } : {}) } : {}) };
        moved++;
      }
      tx.set(s.ref, { items, updatedAt: Date.now() });
    });
  }
  return moved;
}
