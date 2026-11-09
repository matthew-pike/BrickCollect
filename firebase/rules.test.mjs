// Checks firestore.rules against the Firestore emulator.
// Run: npx firebase emulators:exec --only firestore "node --test rules.test.mjs"
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

let env;
const ADMIN = { email: 'm4ttpike@gmail.com', email_verified: true };

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-brickcollect',
    firestore: { rules: readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'admins/m4ttpike@gmail.com'), { at: 1 });
    await setDoc(doc(db, 'iteminfo/b0'), { items: { '75364-1': { used: 100 } } });
    await setDoc(doc(db, 'meta/rates'), { AUD: 1.5 });
    await setDoc(doc(db, 'data/users/alice/collection'), { items: { '75364-1': { owned: true } } });
    await setDoc(doc(db, 'private/sync-log'), { n: 1 });
    await setDoc(doc(db, 'admin/usage'), { at: 1, totals: {} });
    await setDoc(doc(db, 'admins/helper@example.com'), { role: 'admin' });
  });
});

const anon = () => env.unauthenticatedContext().firestore();
const alice = () => env.authenticatedContext('alice', { email: 'alice@example.com', email_verified: true }).firestore();
const bob = () => env.authenticatedContext('bob', { email: 'bob@example.com', email_verified: true }).firestore();
const admin = () => env.authenticatedContext('matt', ADMIN).firestore();

test('anyone can read shared data', async () => {
  await assertSucceeds(getDoc(doc(anon(), 'iteminfo/b0')));
  await assertSucceeds(getDocs(collection(anon(), 'subthemes')));
  await assertSucceeds(getDoc(doc(anon(), 'meta/rates')));
});

test('only an admin can change shared data', async () => {
  await assertFails(setDoc(doc(anon(), 'iteminfo/b0'), { items: {} }));
  await assertFails(setDoc(doc(alice(), 'iteminfo/b0'), { items: {} }));
  await assertFails(setDoc(doc(alice(), 'subthemes/Star-Wars'), { manual: {} }));
  await assertFails(deleteDoc(doc(alice(), 'catalog/Pantasy')));
  await assertSucceeds(setDoc(doc(admin(), 'subthemes/Star-Wars'), { manual: {} }));
  await assertSucceeds(setDoc(doc(admin(), 'iteminfo/b0'), { items: {} }));
});

test('admin email must be verified, and matches regardless of case', async () => {
  const unverified = env.authenticatedContext('x', { email: 'm4ttpike@gmail.com', email_verified: false }).firestore();
  await assertFails(setDoc(doc(unverified, 'meta/rates'), {}));
  const upper = env.authenticatedContext('y', { email: 'M4ttPike@Gmail.com', email_verified: true }).firestore();
  await assertSucceeds(setDoc(doc(upper, 'meta/rates'), {}));
});

test('each person reads and writes only their own collection', async () => {
  await assertSucceeds(getDoc(doc(alice(), 'data/users/alice/collection')));
  await assertSucceeds(setDoc(doc(alice(), 'data/users/alice/collection'), { items: {} }));
  await assertFails(getDoc(doc(bob(), 'data/users/alice/collection')));
  await assertFails(setDoc(doc(bob(), 'data/users/alice/collection'), { items: {} }));
  await assertFails(getDoc(doc(anon(), 'data/users/alice/collection')));
  await assertFails(getDoc(doc(admin(), 'data/users/alice/collection')));
});

test('people can look up only their own admin entry', async () => {
  await assertSucceeds(getDoc(doc(admin(), 'admins/m4ttpike@gmail.com')));
  await assertSucceeds(getDoc(doc(alice(), 'admins/alice@example.com'))); // reads as "not there"
  await assertFails(getDoc(doc(alice(), 'admins/m4ttpike@gmail.com')));
  await assertFails(getDocs(collection(admin(), 'admins')));
  await assertFails(getDoc(doc(anon(), 'admins/m4ttpike@gmail.com')));
});

test('admin list and private job data are off limits', async () => {
  await assertFails(setDoc(doc(admin(), 'admins/someone@example.com'), {}));
  await assertFails(setDoc(doc(alice(), 'admins/alice@example.com'), {}));
  await assertFails(getDoc(doc(admin(), 'private/sync-log')));
  await assertFails(setDoc(doc(anon(), 'somethingelse/x'), {}));
});

test('only an admin can read the usage numbers, and nobody can change them', async () => {
  await assertSucceeds(getDoc(doc(admin(), 'admin/usage')));
  await assertFails(getDoc(doc(alice(), 'admin/usage')));
  await assertFails(getDoc(doc(anon(), 'admin/usage')));
  const unverified = env.authenticatedContext('x', { email: 'm4ttpike@gmail.com', email_verified: false }).firestore();
  await assertFails(getDoc(doc(unverified, 'admin/usage')));
  await assertFails(getDocs(collection(admin(), 'admin')));
  await assertFails(setDoc(doc(admin(), 'admin/usage'), { at: 2 }));
  await assertFails(setDoc(doc(alice(), 'admin/usage'), { at: 2 }));
  await assertFails(getDoc(doc(admin(), 'private/members')));
});

const helper = () => env.authenticatedContext('h', { email: 'helper@example.com', email_verified: true }).firestore();
const grant = perms => env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'meta/permissions'), perms));

test('an admin (role: admin) can do nothing until a permission is ticked', async () => {
  await assertFails(setDoc(doc(helper(), 'subthemes/Star-Wars'), { manual: {} }));
  await assertFails(setDoc(doc(helper(), 'iteminfo/b0'), { items: {} }));
  await assertFails(getDoc(doc(helper(), 'admin/usage')));
  await grant({ admin: { subthemes: true, usage: true }, user: {} });
  await assertSucceeds(setDoc(doc(helper(), 'subthemes/Star-Wars'), { manual: {} }));
  await assertSucceeds(getDoc(doc(helper(), 'admin/usage')));
  await assertFails(setDoc(doc(helper(), 'iteminfo/b0'), { items: {} }));
  await assertFails(setDoc(doc(helper(), 'catalog/Pantasy'), { items: {} }));
});

test('a user gets only what is ticked for users', async () => {
  await grant({ admin: {}, user: { sets: true } });
  await assertSucceeds(setDoc(doc(alice(), 'catalog/Pantasy'), { items: {} }));
  await assertFails(setDoc(doc(alice(), 'subthemes/Star-Wars'), { manual: {} }));
  await assertFails(setDoc(doc(anon(), 'catalog/Pantasy'), { items: {} }));
  const unverified = env.authenticatedContext('u', { email: 'u@example.com', email_verified: false }).firestore();
  await assertFails(setDoc(doc(unverified, 'catalog/Pantasy'), { items: {} }));
});

test('only a super admin can change permissions; the super admin keeps everything', async () => {
  await grant({ admin: { items: true, subthemes: true, sets: true, sync: true, usage: true }, user: {} });
  await assertFails(setDoc(doc(helper(), 'meta/permissions'), { user: { items: true } }));
  await assertFails(setDoc(doc(alice(), 'meta/permissions'), { user: { items: true } }));
  await assertSucceeds(setDoc(doc(admin(), 'meta/permissions'), { admin: {}, user: {} }));
  await assertSucceeds(getDoc(doc(anon(), 'meta/permissions')));
  await assertSucceeds(setDoc(doc(admin(), 'iteminfo/b0'), { items: {} }));
  await assertSucceeds(getDoc(doc(admin(), 'admin/usage')));
  await assertSucceeds(setDoc(doc(helper(), 'meta/rates'), { AUD: 1 }));
});

test('sale lists: anyone with the link reads one, only its owner writes it', async () => {
  const shop = (owner, extra = {}) => ({ owner, v: 1, name: 'Alice', place: 'Sydney', ig: 'alice', contact: '', cur: 'AUD', items: [{ n: '75192', c: 'new', q: 1 }], updatedAt: 1, ...extra });
  await assertSucceeds(setDoc(doc(alice(), 'shops/abc123'), shop('alice')));
  await assertSucceeds(getDoc(doc(anon(), 'shops/abc123')));
  await assertFails(getDocs(collection(anon(), 'shops')));
  await assertFails(setDoc(doc(anon(), 'shops/zzz'), shop('alice')));
  await assertFails(setDoc(doc(bob(), 'shops/zzz'), shop('alice')));
  await assertFails(setDoc(doc(bob(), 'shops/abc123'), shop('bob')));
  await assertFails(deleteDoc(doc(bob(), 'shops/abc123')));
  await assertFails(setDoc(doc(alice(), 'shops/abc123'), shop('alice', { email: 'a@b.c' })));
  await assertFails(setDoc(doc(alice(), 'shops/abc123'), shop('alice', { name: 'x'.repeat(41) })));
  await assertSucceeds(setDoc(doc(alice(), 'shops/abc123'), shop('alice', { items: [] })));
  await assertSucceeds(deleteDoc(doc(alice(), 'shops/abc123')));
});
