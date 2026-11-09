// Works out the Admin page numbers now (same job as the hourly run), e.g. right after an account type change.
// Usage: node refresh-usage.mjs   (needs GOOGLE_APPLICATION_CREDENTIALS)
import { getFirestore } from 'firebase-admin/firestore';
import usageStats from './functions/jobs/usage-stats.mjs';
const prev = (await getFirestore().doc('admin/usage').get()).data();
await usageStats({ sweepTotal: prev?.health?.sweep?.total ?? null });
console.log('::notice title=Admin numbers::Refreshed');
