// Owner data job: save LEGO RRPs (AUD, from saved LEGO.com Australia pages) as each set's RRP.
// File: one set per line, "75478 129.99  # name" (made by tools/lego_rrp.py); lines starting with # are notes.
// Usage: node set-rrp.mjs data/lego-au-rrp.txt
// RRPs typed in by hand (manualRrp) are left alone; unchanged prices aren't rewritten, so re-running is safe.
// Writes each bucket in a transaction (like the price jobs), so nothing they save at the same time is lost.
import { readFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const fs = getFirestore();
const bucketOf = n => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 'b' + (h % 16); };
const [file] = process.argv.slice(2);
const rows = new Map(), bad = [];
for (const line of readFileSync(file, 'utf8').split('\n')) {
  const l = line.replace(/#.*/, '').trim(); if (!l) continue;
  const m = /^(\d{3,7})(?:-(\d+))?\s+(\d+(?:\.\d{1,2})?)$/.exec(l);
  if (!m || !(Number(m[3]) > 0)) { bad.push(l); continue; }
  rows.set(`${m[1]}-${m[2] || 1}`, Math.round(Number(m[3]) * 100) / 100);
}
if (bad.length) throw new Error(`lines not understood: ${bad.slice(0, 10).join(' | ')}`);
// The date the list was last changed (git), else the file's date: shown as "RRP: price on LEGO.com Australia · <date>".
let at; try { at = new Date(execSync(`git log -1 --format=%cI -- "${file}"`, { encoding: 'utf8' }).trim()).toISOString(); } catch { at = statSync(file).mtime.toISOString(); }
const byBucket = new Map();
for (const n of rows.keys()) { const b = bucketOf(n); if (!byBucket.has(b)) byBucket.set(b, []); byBucket.get(b).push(n); }
let set = 0, same = 0, manual = 0;
for (const [b, list] of byBucket) {
  const ref = fs.doc(`iteminfo/${b}`);
  await fs.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const items = { ...((snap.exists && snap.data().items) || {}) };
    let dirty = false;
    for (const n of list) {
      const cur = items[n] || {}, v = rows.get(n);
      if (cur.manualRrp) { manual++; continue; }
      if (cur.rrp === v && cur.rrpSource === 'LEGO') { same++; continue; }
      items[n] = { ...cur, rrp: v, rrpSource: 'LEGO', rrpAt: at }; set++; dirty = true;
    }
    if (dirty) tx.set(ref, { items, updatedAt: Date.now() });
  });
}
console.log(`::notice title=LEGO RRP::${rows.size} sets in ${file}: ${set} saved, ${same} unchanged, ${manual} skipped (RRP set by hand).`);
