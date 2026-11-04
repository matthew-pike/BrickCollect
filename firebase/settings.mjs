// Switchover helper. `node settings.mjs check` prints live=true|false (whether switchover is done);
// `node settings.mjs live` marks it done: the price jobs run in full and the Supabase copy never runs again.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const ref = getFirestore().doc('private/settings');
const cur = (await ref.get()).data() || {};
if (process.argv[2] === 'live') {
  await ref.set({ jobsLive: true, switchedAt: cur.switchedAt || new Date().toISOString() }, { merge: true });
  console.log('::notice title=Switchover::Firebase is now the live database. Price jobs run in full; the Supabase copy is switched off.');
} else if (process.argv[2] === 'sweep') {
  // Progress of the hourly price sweep, as a notice on the GitHub run.
  const db = getFirestore(), sw = (await db.doc('private/sweep').get()).data() || {};
  const day = 2 * 24 * 3600 * 1000; let items = 0, au = 0, recent = 0, miss = 0, all5 = 0;
  for (const d of (await db.collection('iteminfo').get()).docs) for (const v of Object.values(d.data().items || {})) {
    items++; const loc = v.loc || {};
    if (loc.AU) au++;
    if (loc.AU?.at && Date.now() - Date.parse(loc.AU.at) < day) recent++;
    if (['US', 'UK', 'EU', 'CA'].every(l => loc[l])) all5++;
    if (v.sweepMissAt) miss++;
  }
  console.log(`::notice title=Price sweep::round ${sw.round} at ${sw.cursor}, loops ${sw.loops || 0}, today ${sw.day} used ${sw.used} requests, updated ${sw.updatedAt}. Items with prices info ${items}; with an Australian price ${au} (${recent} in the last 2 days); with US/UK/EU/CA ${all5}; not on BrickLink ${miss}.`);
} else {
  console.log(`live=${cur.jobsLive === true}`);
}
