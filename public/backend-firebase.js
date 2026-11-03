/* BrickCollect backend on Firebase: sign-in (Google and email link), Firestore, and Sync Prices.
   Same small API as backend.js (the Supabase version), so the page code doesn't change:
     BC.db.collection(name).onSnapshot(cb) / .doc(id).set(data) / .doc(id).delete()
     BC.db.doc('meta/rates') and BC.db.doc('data/users/<id>/collection')
     BC.user.id(), BC.user.isOwner(), BC.user.email()
     BC.auth.signInWithEmail(email), BC.auth.signInWith('google'), BC.auth.signOut(), BC.auth.onChange(cb)
     BC.syncPrices({ type, items: [{ n, bl }] })
   Needs the Firebase compat scripts (app, auth, firestore) loaded before this file, and BC_CONFIG.firebase. */
(function () {
  const cfg = window.BC_CONFIG || {};
  const fb = window.firebase;
  if (!fb || !cfg.firebase) { window.BC = { db: null, user: null, auth: { available: false }, syncPrices: null, ready: Promise.resolve() }; return; }

  const app = fb.initializeApp(cfg.firebase);
  const fauth = app.auth();
  const fstore = app.firestore();
  // Keep a copy of your collection on this device, so the installed app opens with it even when offline.
  try { fstore.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch { /* not supported here */ }
  const err = (code, message) => Object.assign(new Error(message || code), { code });
  const EMAIL_KEY = 'bc.signInEmail';
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } },
                  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };

  /* ---------- finish an email sign-in link, then wait for the first sign-in state ---------- */
  // Firebase says when a sign-in created a brand-new account; remember it for this tab so it's counted once as a sign-up.
  function markNew(r) { try { if (r && r.additionalUserInfo && r.additionalUserInfo.isNewUser) sessionStorage.setItem('bc-new', '1'); } catch { /* ignore */ } }
  async function finishEmailLink() {
    if (!fauth.isSignInWithEmailLink(location.href)) return;
    let email = store.get(EMAIL_KEY);
    // Opened on a different device or browser: ask which email the link was sent to.
    if (!email) email = window.prompt('To finish signing in, enter the email address the link was sent to:');
    try { if (email) markNew(await fauth.signInWithEmailLink(email.trim(), location.href)); }
    catch (e) { console.warn('Email link sign-in failed:', e.code || e.message); }
    store.set(EMAIL_KEY, null);
    // Remove the one-time sign-in code from the address bar.
    history.replaceState(null, '', location.origin + location.pathname + location.hash);
  }
  let current = null;
  // Coming back from a Google redirect sign-in (phones that block popups).
  const redirected = fauth.getRedirectResult().then(markNew).catch(() => {});
  const ready = Promise.all([finishEmailLink(), redirected]).then(() => new Promise(res => {
    const stop = fauth.onAuthStateChanged(u => { current = u; stop(); res(); });
  }));

  /* ---------- database: Firestore already speaks the page's document API ---------- */
  const translate = e => err(e && e.code === 'permission-denied' ? 'invalid_argument' : 'unavailable', e && e.message);
  function docRef(path) {
    const ref = fstore.doc(path);
    return {
      id: ref.id, path,
      get: () => ref.get().catch(e => { throw translate(e); }),
      set: data => ready.then(() => ref.set(data)).catch(e => { throw translate(e); }),
      delete: () => ready.then(() => ref.delete()).catch(e => { throw translate(e); }),
      onSnapshot(next, onError) {
        let stop = null, cancelled = false;
        ready.then(() => { if (!cancelled) stop = ref.onSnapshot(next, e => onError && onError(translate(e))); });
        return () => { cancelled = true; stop && stop(); };
      },
    };
  }
  const db = {
    doc: docRef,
    collection(name) {
      const ref = fstore.collection(name);
      return {
        path: name,
        doc: id => docRef(`${name}/${id}`),
        onSnapshot(next, onError) {
          let stop = null, cancelled = false;
          ready.then(() => { if (!cancelled) stop = ref.onSnapshot(next, e => onError && onError(translate(e))); });
          return () => { cancelled = true; stop && stop(); };
        },
      };
    },
  };

  /* ---------- who is viewing ---------- */
  let adminCache = null;
  const user = {
    id: async () => { await ready; return current ? current.uid : null; },
    email: async () => { await ready; return current ? current.email : null; },
    // True on an account's first sign-in (created within the last couple of minutes).
    isNew: async () => { await ready; let n = false; try { n = sessionStorage.getItem('bc-new') === '1'; sessionStorage.removeItem('bc-new'); } catch { /* ignore */ } return n; },
    isOwner: async () => {
      await ready;
      if (!current || !current.email || !current.emailVerified) return false;
      if (adminCache !== null) return adminCache;
      try { adminCache = (await fstore.doc(`admins/${current.email.toLowerCase()}`).get()).exists; }
      catch { adminCache = false; }
      return adminCache;
    },
  };

  /* ---------- sign in / out ---------- */
  const providers = { google: () => new fb.auth.GoogleAuthProvider() };
  const auth = {
    available: true,
    async signInWithEmail(email) {
      await fauth.sendSignInLinkToEmail(email, { url: location.origin + location.pathname, handleCodeInApp: true });
      store.set(EMAIL_KEY, email);
    },
    async signInWith(name) {
      const make = providers[name];
      if (!make) throw err('unsupported', `Sign-in with ${name} isn't set up.`);
      const p = make(); p.setCustomParameters({ prompt: 'select_account' });
      try { markNew(await fauth.signInWithPopup(p)); }
      catch (e) {
        // Popups blocked (some phones and in-app browsers): go to Google and come back instead.
        if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return fauth.signInWithRedirect(p);
        if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
        throw e;
      }
    },
    signInWithGoogle() { return this.signInWith('google'); },
    async signOut() { await fauth.signOut(); },
    // Deletes the signed-in person's saved collection and their account. Firebase only allows this soon after
    // signing in, so Google users confirm with Google again; email-link users are asked to sign in again first.
    async deleteAccount() {
      const u = fauth.currentUser;
      if (!u) throw err('signed_out', 'You’re not signed in.');
      const fresh = Date.now() - Date.parse(u.metadata.lastSignInTime || 0) < 4 * 60 * 1000;
      if (!fresh) {
        if (u.providerData.some(p => p.providerId === 'google.com')) {
          const p = new fb.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account', login_hint: u.email || '' });
          try { await u.reauthenticateWithPopup(p); }
          catch (e) { if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') throw err('cancelled', 'Account not deleted.'); throw e; }
        } else throw err('recent_login', 'For your security, sign out, sign in again with a new email link, then delete your account within a few minutes.');
      }
      await fstore.doc(`data/users/${u.uid}/collection`).delete();
      await u.delete();
    },
    // Call cb only when a different person signs in or out after the page has loaded
    // (token refreshes and the first state on load are not a change of person).
    onChange(cb) {
      ready.then(() => fauth.onAuthStateChanged(u => {
        const before = current ? current.uid : null, after = u ? u.uid : null;
        current = u; adminCache = null;
        if (before !== after) cb(after ? 'SIGNED_IN' : 'SIGNED_OUT');
      }));
    },
  };

  /* ---------- Sync Prices (admin only; the function checks again) ---------- */
  async function syncPrices(body) {
    await ready;
    if (!current) throw err('signed_out', 'Sign in to sync prices.');
    const token = await current.getIdToken();
    const res = await fetch(cfg.syncPricesUrl || '/api/sync-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw err(out.code || `http_${res.status}`, out.message || `Price sync failed (HTTP ${res.status}).`);
    return out;
  }

  window.BC = { db, user, auth, syncPrices, ready };
})();
