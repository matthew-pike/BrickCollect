// Owner data job: mark the sets listed in a file as "retiring soon" (same as Bulk edit → Mark retiring soon).
// One set number per line (with or without -1); lines starting with # are notes.
// Usage: node mark-retiring.mjs data/retiring-soon.txt [YYYY-MM-DD exit date | none]
// Sets already hand-marked retiring soon keep their exit date unless one is given here. Writes each bucket in a
// transaction (like the price jobs), so nothing they save at the same time is lost.
import { readFileSync } from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp({ credential: applicationDefault() });
const fs = getFirestore();
const bucketOf = n => { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 'b' + (h % 16); };
const [file, exitArg] = process.argv.slice(2);
const exit = exitArg && exitArg !== 'none' ? exitArg : null;
if (exit && !/^\d{4}-\d{2}-\d{2}$/.test(exit)) throw new Error('exit date must be YYYY-MM-DD');
const lines = readFileSync(file, 'utf8').split('\n').map(l => l.replace(/#.*/, ''));
const toks = lines.flatMap(l => l.split(/[\s,;]+/)).filter(Boolean);
const bad = toks.filter(t => !/^\d{3,7}(-\d+)?$/.test(t));
if (bad.length) throw new Error(`not set numbers: ${bad.slice(0, 10).join(', ')}`);
const nums = [...new Set(toks.map(s => /-\d+$/.test(s) ? s : `${s}-1`))];
const byBucket = new Map();
for (const n of nums) { const b = bucketOf(n); if (!byBucket.has(b)) byBucket.set(b, []); byBucket.get(b).push(n); }
let marked = 0, already = 0;
for (const [b, list] of byBucket) {
  const ref = fs.doc(`iteminfo/${b}`);
  await fs.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const items = { ...((snap.exists && snap.data().items) || {}) };
    for (const n of list) {
      const cur = { ...(items[n] || {}) };
      if (cur.ret === 'S' && cur.manualRet && !exit) { already++; continue; }
      cur.ret = 'S'; cur.manualRet = true;
      if (exit) cur.exit = exit; else delete cur.exit;
      items[n] = cur; marked++;
    }
    tx.set(ref, { items, updatedAt: Date.now() });
  });
}
console.log(`::notice title=Retiring soon::${nums.length} sets in ${file}: ${marked} marked retiring soon${exit ? ` (by ${exit})` : ' (no date)'}, ${already} already marked.`);
