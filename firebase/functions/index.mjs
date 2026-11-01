// BrickCollect jobs on Firebase. Sydney region and Sydney times.
// Only three scheduled jobs, so they stay inside Cloud Scheduler's free allowance.
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';
import nightly from './jobs/nightly-prices.mjs';
import rates from './jobs/rates.mjs';
import brandPrices from './jobs/brand-prices.mjs';
import minifigNumbers from './jobs/minifig-numbers.mjs';
import syncPricesHandler from './jobs/sync-prices.mjs';
import { readShared } from './lib/common.mjs';

const BL = ['BRICKLINK_CONSUMER_KEY', 'BRICKLINK_CONSUMER_SECRET', 'BRICKLINK_TOKEN_VALUE', 'BRICKLINK_TOKEN_SECRET'].map(defineSecret);
// Guard rails against runaway costs: one copy of each job at a time, small machines, short time limits.
setGlobalOptions({ region: 'australia-southeast1', maxInstances: 1, memory: '256MiB' });
const TZ = 'Australia/Sydney';
// Until switchover the Netlify jobs still run, and BrickLink allows about 5,000 calls a day in total.
// So unless private/settings has jobsLive: true, the BrickLink jobs do a tiny run (3 items) just to prove they work.
async function trialLimits() {
  const live = (await readShared('private', 'settings'))?.jobsLive === true;
  process.env.NIGHTLY_MAX_ITEMS = live ? '' : '3';
  process.env.MINIFIG_SETS_PER_RUN = live ? '' : '3';
  if (!live) console.log('trial mode: BrickLink jobs limited to 3 items (set private/settings jobsLive: true at switchover)');
}
const sched = (schedule, fn, timeoutSeconds = 60) => onSchedule({ schedule, timeZone: TZ, secrets: BL, timeoutSeconds, retryCount: 0 }, async () => { await trialLimits(); await fn(); });

// BrickLink prices for owned and wanted sets: 3am and 3pm Sydney.
export const nightlyPrices = sched('0 3,15 * * *', nightly);
// Exchange rates, then the brands' own store prices: 4am Sydney.
export const dailyStores = sched('0 4 * * *', async () => { await rates(); await brandPrices(); }, 300);
// BrickLink numbers for minifigures: every hour at :20.
export const minifigNumbersHourly = sched('20 * * * *', minifigNumbers);

// The Sync Prices button (admin only). The site reaches it at /api/sync-prices.
export const syncPrices = onRequest({ secrets: BL, timeoutSeconds: 30, invoker: 'public', maxInstances: 2 }, async (req, res) => {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
  const request = new Request(`https://brickcollect.app${req.originalUrl || req.url}`, {
    method: req.method, headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : (req.rawBody ?? JSON.stringify(req.body ?? {})),
  });
  const out = await syncPricesHandler(request);
  res.status(out.status);
  out.headers.forEach((v, k) => res.set(k, v));
  res.send(await out.text());
});
