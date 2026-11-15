// One-off test: can a server (GitHub Actions) read prices from LEGO.com product pages, or is it blocked?
// Prints, for each page: HTTP status, page size, and any price fields found. No data is saved.
const SETS = ['75478', '75467', '75355', '10497', '42143', '76269', '10333', '21348', '75313', '40674'];
const LOCALES = ['en-au', 'en-us', 'en-gb'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const pick = (html, re, max = 3) => [...new Set([...html.matchAll(re)].map(m => m[0]))].slice(0, max);

for (const loc of LOCALES) {
  const sets = loc === 'en-au' ? SETS : SETS.slice(0, 3);
  for (const n of sets) {
    const url = `https://www.lego.com/${loc}/product/${n}`;
    try {
      const t = Date.now();
      const r = await fetch(url, { headers: { 'user-agent': UA, 'accept': 'text/html,application/xhtml+xml', 'accept-language': 'en-AU,en;q=0.9' }, redirect: 'follow' });
      const html = await r.text();
      const found = [
        ...pick(html, /"(?:formattedAmount|formattedValue)":"[^"]{1,20}"/g),
        ...pick(html, /"(?:centAmount|listPrice|price)":\{?"?[^,}]{1,30}/g),
        ...pick(html, /"priceCurrency":"[A-Z]{3}"/g, 1),
        ...pick(html, /data-test="product-price[^"]*"[^>]*>[^<]{1,30}/g),
      ];
      const title = (/<title>([^<]{0,80})/.exec(html) || [])[1] || '';
      console.log(`${loc} ${n}: ${r.status} ${html.length}B ${Date.now() - t}ms final=${r.url.replace('https://www.lego.com', '')} title="${title}"`);
      console.log(`   ${found.length ? found.join(' | ') : 'no price fields found'}`);
      if (r.status !== 200) console.log(`   server=${r.headers.get('server')} body: ${html.slice(0, 200).replace(/\s+/g, ' ')}`);
    } catch (e) { console.log(`${loc} ${n}: ERROR ${e.message}`); }
    await sleep(2000);
  }
}
