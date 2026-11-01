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
  const err = (code, message) => Object.assign(new Error(message || code), { code });
  const EMAIL_KEY = 'bc.signInEmail';
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } },
                  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };

  /* ---------- finish an email sign-in link, then wait for the first sign-in state ---------- */
  async function finishEmailLink() {
    if (!fauth.isSignInWithEmailLink(location.href)) return;
    let email = store.get(EMAIL_KEY);
    // Opened on a different device or browser: ask which email the link was sent to.
    if (!email) email = window.prompt('To finish signing in, enter the email address the link was sent to:');
    try { if (email) await fauth.signInWithEmailLink(email.trim(), location.href); }
    catch (e) { console.warn('Email link sign-in failed:', e.code || e.message); }
    store.set(EMAIL_KEY, null);
    // Remove the one-time sign-in code from the address bar.
    history.replaceState(null, '', location.origin + location.pathname + location.hash);
  }
  let current = null;
  const ready = finishEmailLink().then(() => new Promise(res => {
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
      try { await fauth.signInWithPopup(p); }
      catch (e) {
        // Popups blocked (some phones and in-app browsers): go to Google and come back instead.
        if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return fauth.signInWithRedirect(p);
        if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
        throw e;
      }
    },
    signInWithGoogle() { return this.signInWith('google'); },
    async signOut() { await fauth.signOut(); },
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
