// Daily: fetch retail prices from brands' own Shopify stores (LumiBricks and Pantasy) and save them
// as the "new" price for those sets, converted to AUD. Sets the store sells that aren't in
// BrickCollect yet are added to that brand's list (name and number; theme left as "Unsorted").
// Each set's exact product address is saved too, so the site's Buy button links straight to it.
//
// Shopify stores publish their product list at /products.json and the store currency at /cart.js.
// Product addresses end in the set number (e.g. /products/edinburgh-corner-15021).
import { env, sb, upsertShared, savePrices } from '../lib/common.mjs';

const BRANDS = [
  { brand: 'LumiBricks', shop: 'https://www.lumibricks.com' },
  { brand: 'Pantasy', shop: 'https://pantasy.com' },
];

// The set number is the last number in the address, optionally followed by a region (e.g. pantasy-t-800-87503-us-eu).
const numFromHandle = h => { const m = /-([a-z]?\d{4,6})(?:-[a-z]{2,3})*$/i.exec(h || ''); return m ? m[1].toUpperCase() : null; };
const cleanName = (title, num) => String(title || '').replace(new RegExp(`\\s*[-–|#]?\\s*${num}\\s*$`, 'i'), '').replace(/^\s*(LumiBricks|Pantasy)\b[\s:–-]*/i, '').trim() || num;

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'BrickCollect price updater (an Art of Bricks project)', Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

export async function updateBrand({ brand, shop }, rates) {
  let currency = 'USD';
  try { currency = (await fetchJson(`${shop}/cart.js`)).currency || currency; } catch { /* keep default */ }
  const perAud = currency === 'AUD' ? 1 : rates?.[currency];
  if (!perAud) throw new Error(`No exchange rate for ${currency}`);

  const products = [];
  for (let page = 1; page <= 20; page++) {
    const { products: list } = await fetchJson(`${shop}/products.json?limit=250&page=${page}`);
    if (!list?.length) break;
    products.push(...list);
    if (list.length < 250) break;
  }

  const catRows = await sb(`shared_docs?select=data&collection=eq.catalog&id=eq.${encodeURIComponent(brand)}`);
  const cat = catRows?.[0]?.data || { brand, items: {} };
  const items = { ...(cat.items || {}) };
  const updates = new Map(), now = new Date().toISOString();
  let added = 0, priced = 0, linked = 0;
  for (const p of products) {
    const num = numFromHandle(p.handle);
    if (!num) continue;
    const prices = (p.variants || []).map(v => Number(v.price)).filter(v => v > 0);
    if (!items[num]) { items[num] = { name: cleanName(p.title, num), theme: 'Unsorted', sub: '', year: null, pieces: null, img: '' }; added++; }
    const path = `/products/${p.handle}`;
    if (items[num].url !== path) { items[num] = { ...items[num], url: path }; linked++; }
    if (prices.length) {
      const aud = Math.round(Math.min(...prices) / perAud * 100) / 100;
      updates.set(`${brand}:${num}`, { new: aud, pricedAt: now, checkedAt: now, priceSource: brand });
      priced++;
    }
  }
  if (added || linked) await upsertShared('catalog', brand, { ...cat, brand, items, updatedAt: Date.now() });
  await savePrices(updates);
  return { brand, currency, products: products.length, priced, added, linked };
}

export default async () => {
  if (!env('SUPABASE_URL') || !env('SUPABASE_SECRET_KEY')) { console.log('brand-prices: database settings missing'); return; }
  const rateRows = await sb('shared_docs?select=data&collection=eq.meta&id=eq.rates');
  let rates = rateRows?.[0]?.data?.rates;
  if (!rates) {
    // The daily rates job hasn't run yet: fetch today's rates directly and save them for the site too.
    try {
      const d = await fetchJson('https://api.frankfurter.dev/v1/latest?base=AUD');
      rates = { AUD: 1, ...d.rates };
      await upsertShared('meta', 'rates', { base: 'AUD', date: d.date, fetchedAt: Date.now(), rates });
    } catch (e) { console.log('brand-prices: no exchange rates available:', e.message); return; }
  }
  for (const b of BRANDS) {
    try { console.log('brand-prices:', JSON.stringify(await updateBrand(b, rates))); }
    catch (e) { console.log(`brand-prices: ${b.brand} failed:`, e.message); }
  }
};

// 17:00 UTC: an hour after the nightly BrickLink refresh (4am Sydney in daylight saving).
export const config = { schedule: '0 17 * * *' };
