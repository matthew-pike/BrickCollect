#!/usr/bin/env python3
"""LEGO RRPs from saved LEGO.com Australia pages.

LEGO.com blocks servers (a Cloudflare check on every page), so prices come from pages saved in a browser:
theme or category pages (e.g. lego.com/en-au/themes/star-wars, after "Show more" until every set is listed)
or single product pages. Save them as "Webpage, Single File" (.mhtml) or "Webpage, Complete" (.html).

Usage:
  python3 tools/lego_rrp.py SAVED_PAGE [SAVED_PAGE ...]

Writes firebase/data/lego-au-rrp.txt (merged with what's already there: newer pages win), one set per line:
  75478 129.99  # Rebel Y-Wing Starfighter
The Data workflow then saves them as each set's RRP (firebase/set-rrp.mjs).

RRP = the full price. When a set is on sale the page shows the full price struck through next to the sale price;
the higher of the two is the RRP.
"""
import email, html as htmllib, json, os, re, sys
from email import policy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'firebase', 'data', 'lego-au-rrp.txt')
CATALOG = os.path.join(ROOT, 'public', 'catalog.json')

MONEY = re.compile(r'(?:A?\$|AU\$)\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)')
PRODUCT_LINK = re.compile(r'href="(?:https://www\.lego\.com)?/en-au/product/([a-z0-9-]*?)-?(\d{4,7})(?:[?#"])', re.I)


def read_page(path):
    """The HTML of a saved page (.html, or .mhtml / .mht from "Webpage, Single File")."""
    raw = open(path, 'rb').read()
    if path.lower().endswith(('.mhtml', '.mht')) or raw[:200].lower().find(b'mime-version') >= 0:
        msg = email.message_from_bytes(raw, policy=policy.default)
        for part in msg.walk():
            if part.get_content_type() == 'text/html':
                body = part.get_payload(decode=True)
                return body.decode(part.get_content_charset() or 'utf-8', 'replace')
        raise SystemExit(f'{path}: no HTML inside this saved page')
    return raw.decode('utf-8', 'replace')


def text_of(fragment):
    t = re.sub(r'<(script|style)\b.*?</\1>', ' ', fragment, flags=re.S | re.I)
    t = re.sub(r'<[^>]+>', ' ', t)
    return re.sub(r'\s+', ' ', htmllib.unescape(t))


def amounts(text):
    return [float(m.replace(',', '')) for m in MONEY.findall(text)]


def from_json_ld(page):
    """Single product pages: schema.org Product data (sku / productID and offers.price)."""
    out = {}
    for block in re.findall(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', page, flags=re.S | re.I):
        try:
            data = json.loads(htmllib.unescape(block))
        except ValueError:
            continue
        for d in data if isinstance(data, list) else [data]:
            if not isinstance(d, dict) or d.get('@type') != 'Product':
                continue
            num = str(d.get('sku') or d.get('productID') or d.get('mpn') or '')
            offers = d.get('offers') or {}
            offers = offers[0] if isinstance(offers, list) and offers else offers
            price = offers.get('price') if isinstance(offers, dict) else None
            cur = offers.get('priceCurrency') if isinstance(offers, dict) else None
            if re.fullmatch(r'\d{4,7}', num) and price and (cur in (None, 'AUD')):
                out[num] = (float(price), d.get('name') or '')
    return out


def from_cards(page):
    """Listing pages: each product card links to /en-au/product/<name>-<number>; its prices follow the link,
    up to the next product's link. The highest amount in a card is the full price."""
    out = {}
    links = list(PRODUCT_LINK.finditer(page))
    for i, m in enumerate(links):
        num = m.group(2)
        if num in out:
            continue  # the image and the title both link to the product: the first card chunk is enough
        nxt = next((l.start() for l in links[i + 1:] if l.group(2) != num), len(page))
        chunk = page[m.start():min(nxt, m.start() + 20000)]
        got = amounts(text_of(chunk))
        if not got:
            continue
        name = m.group(1).replace('-', ' ').strip().title()
        out[num] = (max(got), name)
    return out


def main(paths):
    if not paths:
        raise SystemExit(__doc__)
    known = set()
    try:
        known = {s[0] for s in json.load(open(CATALOG))['sets']}
    except (OSError, ValueError, KeyError):
        pass
    found = {}
    for p in paths:
        page = read_page(p)
        if 'lego.com' not in page.lower():
            print(f'! {os.path.basename(p)}: doesn\'t look like a LEGO.com page')
        if '/en-au/' not in page:
            print(f'! {os.path.basename(p)}: not the Australian LEGO.com (prices must be en-au, in AUD)')
        got = {**from_cards(page), **from_json_ld(page)}
        print(f'{os.path.basename(p)}: {len(got)} sets with a price')
        found.update(got)
    # Merge with the list so far (newer pages win).
    rows = {}
    if os.path.exists(OUT):
        for line in open(OUT, encoding='utf-8'):
            m = re.match(r'\s*(\d{4,7})\s+(\d+(?:\.\d+)?)\s*(?:#\s*(.*))?$', line)
            if m:
                rows[m.group(1)] = (float(m.group(2)), (m.group(3) or '').strip())
    changed = sum(1 for n, (v, _) in found.items() if n not in rows or rows[n][0] != v)
    rows.update(found)
    unknown = sorted(n for n in found if known and f'{n}-1' not in known)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('# LEGO RRPs in AUD from saved LEGO.com Australia pages (tools/lego_rrp.py). One set per line: number price # name\n')
        for n in sorted(rows, key=lambda x: int(x)):
            v, name = rows[n]
            f.write(f'{n} {v:.2f}' + (f'  # {name}' if name else '') + '\n')
    print(f'{len(found)} sets read, {changed} new or changed; {len(rows)} in {os.path.relpath(OUT, ROOT)}')
    if unknown:
        print(f'{len(unknown)} not in the catalog yet (kept; priced once the catalog has them): {", ".join(unknown[:20])}{" …" if len(unknown) > 20 else ""}')


if __name__ == '__main__':
    main(sys.argv[1:])
