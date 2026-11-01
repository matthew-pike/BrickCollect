// Copies BrickCollect data from Supabase into Firestore. Safe to run again: each run overwrites with the latest.
//  - shared_docs (prices, subthemes and tags, other brands, exchange rates, job state) -> /<collection>/<id>
//  - admins -> /admins/<email>
//  - each account: a Firebase account with the SAME user id and email (marked verified), and their
//    collection -> /data/users/<id>/<doc>. Signing in with the same email (link or Google) lands in that account.
// Needs: GOOGLE_APPLICATION_CREDENTIALS (Firebase service account file), SUPABASE_URL, SUPABASE_SECRET_KEY.
// DRY_RUN=1 reads and checks everything but writes nothing.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SECRET_KEY, DRY = process.env.DRY_RUN === '1';
if (!URL_ || !KEY) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are needed');
const note = (title, msg) => console.log(`::notice title=${title}::${String(msg).replace(/\n/g, ' ')}`);
const warn = (title, msg) => console.log(`::warning title=${title}::${String(msg).replace(/\n/g, ' ')}`);

async function sb(path) {
  const tries = [{ apikey: KEY }, { apikey: KEY, Authorization: `Bearer ${KEY}` }];
  let last;
  for (const h of tries) {
    const res = await fetch(`${URL_}${path}`, { headers: h });
    if (res.ok) return res.json();
    last = `${res.status} ${(await res.text()).slice(0, 150)}`;
  }
  throw new Error(`Supabase ${path}: ${last}`);
}
async function all(table, select) {
  const out = [];
  for (let off = 0; ; off += 500) {
    const rows = await sb(`/rest/v1/${table}?select=${select}&limit=500&offset=${off}`);
    out.push(...rows);
    if (rows.length < 500) return out;
  }
}

// Firestore can't store empty-string keys or nested arrays; report anything like that instead of failing late.
function problems(v, path = '') {
  const out = [];
  if (Array.isArray(v)) v.forEach((x, i) => { if (Array.isArray(x)) out.push(`${path}[${i}] nested array`); else out.push(...problems(x, `${path}[${i}]`)); });
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) {
    if (k === '' || /^__.*__$/.test(k)) out.push(`${path} bad key "${k}"`); else out.push(...problems(x, path ? `${path}.${k}` : k));
  }
  return out;
}
const LIMIT = 1_000_000; // Firestore's per-document cap is 1 MiB; leave a little room
const size = d => Buffer.byteLength(JSON.stringify(d));

initializeApp({ credential: applicationDefault() });
const fs = getFirestore(), auth = getAuth();

// 1. Shared data
const shared = await all('shared_docs', 'collection,id,data');
const sizes = {};
let biggest = ['', 0], sharedOk = 0;
for (const r of shared) {
  const bytes = size(r.data); sizes[r.collection] = (sizes[r.collection] || 0) + bytes;
  if (bytes > biggest[1]) biggest = [`${r.collection}/${r.id}`, bytes];
  const p = problems(r.data);
  if (p.length) { warn('Unstorable data', `${r.collection}/${r.id}: ${p.slice(0, 3).join('; ')}`); continue; }
  if (bytes > LIMIT) { warn('Too big for one document', `${r.collection}/${r.id} is ${(bytes / 1e6).toFixed(2)} MB`); continue; }
  if (!DRY) await fs.doc(`${r.collection}/${r.id}`).set(r.data);
  sharedOk++;
}
note('Shared data', `${sharedOk} of ${shared.length} documents copied. Totals: ${Object.entries(sizes).map(([c, b]) => `${c} ${(b / 1e3).toFixed(0)} kB`).join(', ')}. Largest: ${biggest[0]} ${(biggest[1] / 1e3).toFixed(0)} kB of 1,000 kB.`);

// 2. Admins
const admins = await all('admins', 'email');
for (const a of admins) if (!DRY) await fs.doc(`admins/${a.email.toLowerCase()}`).set({ role: 'admin' });
note('Admins', admins.map(a => a.email).join(', ') || 'none');

// 3. Accounts and their collections
const users = [];
for (let page = 1; ; page++) {
  const r = await sb(`/auth/v1/admin/users?page=${page}&per_page=500`);
  const list = r.users || [];
  users.push(...list);
  if (list.length < 500) break;
}
const docs = await all('user_docs', 'user_id,id,data');
let made = 0, kept = 0, copied = 0, skipped = 0;
for (const u of users) {
  if (!u.email) { skipped++; continue; }
  if (!DRY) {
    try { await auth.getUser(u.id); kept++; }
    catch (e) {
      if (e.code !== 'auth/user-not-found') throw e;
      try { await auth.createUser({ uid: u.id, email: u.email.toLowerCase(), emailVerified: true }); made++; }
      catch (e2) { warn('Account not created', `${u.email}: ${e2.code || e2.message}`); skipped++; continue; }
    }
  }
}
for (const d of docs) {
  const bytes = size(d.data), p = problems(d.data);
  if (p.length || bytes > LIMIT) { warn('Collection not copied', `user ${d.user_id.slice(0, 8)}…/${d.id}: ${p[0] || `${(bytes / 1e6).toFixed(2)} MB`}`); continue; }
  if (!DRY) await fs.doc(`data/users/${d.user_id}/${d.id}`).set(d.data);
  copied++;
}
note('Accounts', `${users.length} in Supabase: ${made} created in Firebase, ${kept} already there, ${skipped} skipped. ${copied} of ${docs.length} collections copied.${DRY ? ' (dry run: nothing written)' : ''}`);
