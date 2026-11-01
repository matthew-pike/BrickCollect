// Daily: fetch exchange rates from AUD (European Central Bank, via frankfurter.dev)
// and save them for the site to convert prices into each visitor's currency.
import { upsertShared } from '../lib/common.mjs';

export default async () => {
  const res = await fetch('https://api.frankfurter.dev/v1/latest?base=AUD');
  if (!res.ok) { console.log('rates: fetch failed', res.status); return; }
  const d = await res.json();
  if (!d?.rates) { console.log('rates: no rates in response'); return; }
  await upsertShared('meta', 'rates', { base: 'AUD', date: d.date, fetchedAt: Date.now(), rates: { AUD: 1, ...d.rates } });
  console.log('rates: saved', d.date, Object.keys(d.rates).length, 'currencies');
};

