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
} else {
  console.log(`live=${cur.jobsLive === true}`);
}
