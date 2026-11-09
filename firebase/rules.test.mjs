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
