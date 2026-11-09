// Usage numbers for the owner's Usage page (brickcollect.app/admin), worked out every hour after the price sweep.
// Writes one document, admin/usage, that only admins can read (see firestore.rules).
// Privacy: no emails, names or account IDs leave this job. Each account gets a member number (10001, 10002, …, in
// sign-up order, kept in private/members so it never changes), and the page shows only counts per member.
// Each account has a type: user, admin or super user (see staff below). Totals and top lists leave out staff
// accounts (anyone in /admins), so they show real collectors.
import { getAuth } from 'firebase-admin/auth';
import { fs } from '../lib/common.mjs';

const DAY = 24 * 3600 * 1000;
const FIRST_MEMBER = 10001;
const MAX_ROWS = 2000;   // keeps the document well under Firestore's 1 MB limit
const MAX_ITEMS = 3000;  // most-owned sets and minifigures kept for the top lists
const sydneyDay = t => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date(t));
const BUCKETS = [['0', 0, 0], ['1–9', 1, 9], ['10–49', 10, 49], ['50–199', 50, 199], ['200+', 200, Infinity]];

const copiesOf = v => {
  if (!v?.owned) return 0;
  const q = v.qty && Object.values(v.qty).reduce((a, b) => a + (Number(b) || 0), 0);
  return q || 1;
};
const method = u => {
  const ids = (u.providerData || []).map(p => p.providerId);
  if (ids.includes('google.com')) return 'google';
  if (ids.includes('apple.com')) return 'apple';
  if (ids.includes('password') || u.email) return 'email';
  return 'other';
};

async function allUsers() {
  const out = []; let token;
  do { const r = await getAuth().listUsers(1000, token); out.push(...r.users); token = r.pageToken; } while (token);
  return out;
}

export default async ({ sweepTotal } = {}) => {
  const now = Date.now();
  const [users, adminSnap, membersSnap] = await Promise.all([
    allUsers(), fs.collection('admins').get(), fs.doc('private/members').get(),
  ]);
  // Staff accounts are listed in /admins by email. role 'admin' = admin; anything else (e.g. no role, as today) = super user.
  const staff = new Map(adminSnap.docs.map(d => [d.id.toLowerCase(), (d.data() || {}).role === 'admin' ? 'admin' : 'super']));

  // Member numbers: existing ones are kept; new accounts get the next number, oldest first.
  const mem = { next: FIRST_MEMBER, ids: {}, ...(membersSnap.data() || {}) };
  let added = 0;
  for (const u of [...users].sort((a, b) => Date.parse(a.metadata.creationTime) - Date.parse(b.metadata.creationTime))) {
    if (!mem.ids[u.uid]) { mem.ids[u.uid] = mem.next++; added++; }
  }
  if (added) await fs.doc('private/members').set(mem);

  // Everyone's collections, read in groups of 50.
  const cols = new Map();
  for (let i = 0; i < users.length; i += 50) {
    const snaps = await fs.getAll(...users.slice(i, i + 50).map(u => fs.doc(`data/users/${u.uid}/collection`)));
    snaps.forEach((s, k) => { if (s.exists) cols.set(users[i + k].uid, s.data()); });
  }

  const T = { accounts: 0, collectors: 0, new1: 0, new7: 0, new30: 0, active7: 0, active30: 0,
    sets: 0, copies: 0, figs: 0, wanted: 0, sale: 0, saleUsers: 0, tagUsers: 0, wantUsers: 0,
    methods: {}, sizes: Object.fromEntries(BUCKETS.map(b => [b[0], 0])), owners: 0 };
  const perDay = {};
  for (let d = 29; d >= 0; d--) perDay[sydneyDay(now - d * DAY)] = 0;
  const owned = new Map(), wantedBy = new Map();
  const rows = [];

  for (const u of users) {
    const type = (u.email && staff.get(u.email.toLowerCase())) || 'user';
    const isOwner = type !== 'user';
    const joined = Date.parse(u.metadata.creationTime);
    const active = Math.max(Date.parse(u.metadata.lastRefreshTime || 0) || 0, Date.parse(u.metadata.lastSignInTime || 0) || 0, joined);
    const col = cols.get(u.uid) || {};
    const items = col.items || {};
    let s = 0, f = 0, c = 0, w = 0, x = 0, t = 0;
    for (const [n, v] of Object.entries(items)) {
      const fig = n.startsWith('fig-');
      if (v.owned) { if (fig) f++; else { s++; c += copiesOf(v); } }
      if (v.wanted) w++;
      if (v.sale) x += Object.values(v.sale).reduce((a, b) => a + (Number(b) || 0), 0);
      if (v.mytags?.length) t++;
      if (!isOwner) {
        if (v.owned) owned.set(n, (owned.get(n) || 0) + 1);
        if (v.wanted) wantedBy.set(n, (wantedBy.get(n) || 0) + 1);
      }
    }
    rows.push({ m: mem.ids[u.uid], j: joined, a: active, u: col.updatedAt || null, p: method(u), s, f, c, w, x, t,
      y: type, ...(col.loc ? { r: String(col.loc).slice(0, 4) } : {}), ...(isOwner ? { o: true } : {}) });
    if (isOwner) { T.owners++; continue; }

    T.accounts++;
    T.methods[method(u)] = (T.methods[method(u)] || 0) + 1;
    if (s + f + w > 0) T.collectors++;
    if (now - joined < DAY) T.new1++;
    if (now - joined < 7 * DAY) T.new7++;
    if (now - joined < 30 * DAY) T.new30++;
    if (now - active < 7 * DAY) T.active7++;
    if (now - active < 30 * DAY) T.active30++;
    const day = sydneyDay(joined); if (day in perDay) perDay[day]++;
    T.sets += s; T.copies += c; T.figs += f; T.wanted += w; T.sale += x;
    if (x) T.saleUsers++;
    if (t) T.tagUsers++;
    if (w) T.wantUsers++;
    T.sizes[BUCKETS.find(b => s >= b[1] && s <= b[2])[0]]++;
  }

  const top = m => Object.fromEntries([...m].sort((a, b) => b[1] - a[1]).slice(0, MAX_ITEMS));
  rows.sort((a, b) => b.m - a.m);

  // Site health: price sweep progress, exchange rates and when prices were last saved.
  const [sweep, settings, rates, buckets] = await Promise.all([
    fs.doc('private/sweep').get(), fs.doc('private/settings').get(), fs.doc('meta/rates').get(),
    fs.collection('iteminfo').select('updatedAt').get(),
  ]);
  const sw = sweep.data() || {}, st = settings.data() || {};
  const health = {
    sweep: { round: sw.round ?? null, cursor: sw.cursor ?? null, total: sweepTotal ?? null, loops: sw.loops || 0,
      day: sw.day || null, used: sw.used || 0, updatedAt: sw.updatedAt || null, on: st.priceSweep !== false },
    jobsLive: st.jobsLive === true,
    ratesAt: rates.data()?.fetchedAt || null,
    pricesAt: Math.max(0, ...buckets.docs.map(d => Number(d.data().updatedAt) || 0)) || null,
  };

  await fs.doc('admin/usage').set({
    at: now, totals: T, perDay, rows: rows.slice(0, MAX_ROWS), moreRows: Math.max(0, rows.length - MAX_ROWS),
    owned: top(owned), wantedBy: top(wantedBy), health,
  });
  console.log(`usage: ${T.accounts} accounts (${T.collectors} with sets), ${T.new7} new this week, ${T.active7} active this week; ${T.owners} owner account(s) left out of the totals`);
};
