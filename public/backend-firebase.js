/* BrickCollect backend on Firebase: sign-in (Google and email link), Firestore, and Sync Prices.
   Same small API as backend.js (the Supabase version), so the page code doesn't change:
     BC.db.collection(name).onSnapshot(cb) / .doc(id).set(data) / .doc(id).delete()
     BC.db.doc('meta/rates') and BC.db.doc('data/users/<id>/collection')
     BC.user.id(), BC.user.role() ('super' | 'admin' | 'user'), BC.user.isOwner() (super admin), BC.user.email()
     BC.auth.signInWithEmail(email), BC.auth.signInWith('google'), BC.auth.signOut(), BC.auth.onChange(cb)
     BC.syncPrices({ type, items: [{ n, bl }] })
   Needs the Firebase compat scripts (app, auth, firestore) loaded before this file, and BC_CONFIG.firebase. */
(function () {
  const cfg = window.BC_CONFIG || {};
  const fb = window.firebase;
  if (!fb || !cfg.firebase) { window.BC = { db: null, user: null, auth: { available: false }, syncPrices: null, ready: Promise.resolve() }; return; }

  // Google sign-in goes through Firebase's helper page (/__/auth/handler). Firebase Hosting serves it on every one of
  // our own addresses, so use this site's address for it. With the default (brickcollect-app.firebaseapp.com) the
  // helper is on another site, and phones, Safari and the installed app block what it hands back: you come back from
  // Google still signed out (the sign-in loop, 14 Nov). Local testing keeps the default.
  const h = location.hostname;
  const ownHost = h === 'brickcollect.app' || h === 'www.brickcollect.app' || /\.(web\.app|firebaseapp\.com)$/.test(h);
  const app = fb.initializeApp({ ...cfg.firebase, authDomain: ownHost ? location.host : cfg.firebase.authDomain });
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
    if (!fauth.isSignInWithEmailLink(location.href)) {
      // "Open in Chrome" from an app's browser (Instagram etc.) carries the sets ticked there, so they aren't left behind.
      // Only used if this browser has nothing saved yet; then the address bar is tidied.
      const carry = new URLSearchParams(location.search).get('carry');
      if (carry) {
        try { if (!store.get('bc-collection') && carry.length < 3000) { const o = JSON.parse(carry); if (o && typeof o === 'object' && !Array.isArray(o)) store.set('bc-collection', JSON.stringify(o)); } } catch { /* ignore */ }
        const q = new URLSearchParams(location.search); q.delete('carry');
        history.replaceState(null, '', location.origin + location.pathname + (q.toString() ? '?' + q : '') + location.hash);
      }
      return;
    }
    let email = store.get(EMAIL_KEY);
    // Opened on a different device or browser: ask which email the link was sent to.
    if (!email) email = window.prompt('To finish signing in, enter the email address the link was sent to:');
    try {
      if (email) {
        markNew(await fauth.signInWithEmailLink(email.trim(), location.href));
        // The link can carry the few sets ticked before signing up (e.g. ticked in Instagram's browser, link opened in Safari).
        // They go where this browser's own ticks would be, so they move into the account the usual way (only if it's empty).
        const carry = new URLSearchParams(location.search).get('carry');
        if (carry && !store.get('bc-collection')) { const o = JSON.parse(carry); if (o && typeof o === 'object' && !Array.isArray(o)) store.set('bc-collection', JSON.stringify(o)); }
      }
    }
    catch (e) { console.warn('Email link sign-in failed:', e.code || e.message); }
    store.set(EMAIL_KEY, null);
    // Remove the one-time sign-in code from the address bar. A delete-confirmation link (?del=1) opens Delete again.
    const del = new URLSearchParams(location.search).get('del') === '1';
    history.replaceState(null, '', location.origin + location.pathname + (del ? '#delete' : location.hash));
  }
  let current = null;
  // Coming back from Google (phones and the installed app go to Google and back instead of a popup).
  // A marker is saved just before leaving, so on return we know whether it worked, and can say so instead of
  // quietly showing the sign-in box again.
  const TRY_KEY = 'bc.googleTry';
  let redirectErr = null, outcome = null;
  const redirected = fauth.getRedirectResult().then(markNew).catch(e => { redirectErr = e; console.warn('Google sign-in failed:', e.code || e.message); });
  const ready = Promise.all([finishEmailLink(), redirected]).then(() => new Promise(res => {
    const stop = fauth.onAuthStateChanged(u => {
      current = u; stop();
      const t = Number(store.get(TRY_KEY)) || 0;
      if (t) {
        store.set(TRY_KEY, null);
        if (u) outcome = { ok: true, how: 'google' };
        else if (redirectErr || Date.now() - t < 15 * 60 * 1000) outcome = { ok: false, how: 'google', code: redirectErr && redirectErr.code, message: friendly(redirectErr) };
      }
      res();
    });
  }));
  // Plain-English messages for the sign-in errors people can actually hit.
  function friendly(e) {
    const c = e && e.code;
    if (c === 'auth/network-request-failed') return 'Google sign-in couldn’t connect. Check your internet connection and try again.';
    if (c === 'auth/unauthorized-domain' || c === 'auth/invalid-auth-event' || c === 'auth/web-storage-unsupported')
      return 'Google sign-in didn’t finish in this browser. Use the email link instead: it works everywhere.';
    if (c === 'auth/user-disabled') return 'This account has been switched off. Email brickcollectapp@gmail.com for help.';
    if (c === 'auth/account-exists-with-different-credential') return 'You already have an account with this email. Use the email link to sign in.';
    if (c === 'auth/too-many-requests') return 'Too many tries. Wait a minute, then try again.';
    return 'Google sign-in didn’t finish. Try once more, or use the email link instead.';
  }
  // Phones and the installed app: go to Google and come back (popups there open in a separate window that often
  // can't report back). Computers: a popup, so the page stays as it is.
  const useRedirect = () => {
    const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    return standalone || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent || ''));
  };

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
    // 'super' (listed in /admins with no role), 'admin' (role: 'admin') or 'user'. What each can do is in meta/permissions.
    role: async () => {
      await ready;
      if (!current || !current.email || !current.emailVerified) return 'user';
      if (adminCache !== null) return adminCache;
      try { const d = await fstore.doc(`admins/${current.email.toLowerCase()}`).get(); adminCache = d.exists ? ((d.data() || {}).role === 'admin' ? 'admin' : 'super') : 'user'; }
      catch { adminCache = 'user'; }
      return adminCache;
    },
    isOwner: async () => (await user.role()) === 'super',
    // A fresh sign-in token for calls to BrickCollect's own functions (e.g. the Admin page's Sync button).
    token: async () => { await ready; return current ? current.getIdToken() : null; },
    // Calls cb(newRole) when this person's entry in /admins changes after the page has loaded (e.g. made super admin).
    watchRole(cb) {
      ready.then(() => {
        if (!current || !current.email || !current.emailVerified) return;
        fstore.doc(`admins/${current.email.toLowerCase()}`).onSnapshot(d => {
          const r = d.exists ? ((d.data() || {}).role === 'admin' ? 'admin' : 'super') : 'user';
          if (adminCache !== null && r !== adminCache) { adminCache = r; cb(r); } else adminCache = r;
        }, () => {});
      });
    },
  };

  /* ---------- sign in / out ---------- */
  const providers = { google: () => new fb.auth.GoogleAuthProvider() };
  const auth = {
    available: true,
    async signInWithEmail(email, carry) {
      const q = carry && carry.length < 3000 ? `?carry=${encodeURIComponent(carry)}` : '';
      await fauth.sendSignInLinkToEmail(email, { url: location.origin + location.pathname + q, handleCodeInApp: true });
      store.set(EMAIL_KEY, email);
    },
    async signInWith(name) {
      const make = providers[name];
      if (!make) throw err('unsupported', `Sign-in with ${name} isn't set up.`);
      const p = make(); p.setCustomParameters({ prompt: 'select_account' });
      const viaRedirect = () => { store.set(TRY_KEY, String(Date.now())); return fauth.signInWithRedirect(p); };
      if (useRedirect()) return viaRedirect();
      try { markNew(await fauth.signInWithPopup(p)); }
      catch (e) {
        // Popups blocked: go to Google and come back instead.
        if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return viaRedirect();
        if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
        throw Object.assign(new Error(friendly(e)), { code: e.code });
      }
    },
    signInWithGoogle() { return this.signInWith('google'); },
    // After coming back from Google: { ok: true } or { ok: false, message }, once; null if no Google sign-in was under way.
    async result() { await ready; const o = outcome; outcome = null; return o; },
    // True while coming back from Google (before `ready`), so a page can show "Signing you in…".
    returning: () => !!store.get(TRY_KEY),
    async signOut() { await fauth.signOut(); },
    // Deletes the signed-in person's saved collection and their account. Firebase only allows this soon after
    // signing in, so Google users confirm with Google again; email-link users are asked to sign in again first.
    async deleteAccount() {
      const u = fauth.currentUser;
      if (!u) throw err('signed_out', 'You’re not signed in.');
      // How long since the last sign-in, by Firebase's own clock (the token's auth_time and issue time), not this device's.
      let fresh = false;
      try { const t = await u.getIdTokenResult(true); fresh = Date.parse(t.issuedAtTime) - Date.parse(t.authTime) < 4 * 60 * 1000; } catch { /* treat as not fresh */ }
      if (!fresh) {
        if (u.providerData.some(p => p.providerId === 'google.com')) {
          const p = new fb.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account', login_hint: u.email || '' });
          try { await u.reauthenticateWithPopup(p); }
          catch (e) {
            if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') throw err('cancelled', 'Account not deleted.');
            if (e.code === 'auth/popup-blocked') throw err('popup_blocked', 'Allow pop-ups for BrickCollect so Google can confirm it’s you, then try again.');
            throw e;
          }
        } else {
          // Email-link accounts: email a confirmation link that signs in again and comes straight back to Delete.
          if (!u.email) throw err('recent_login', 'Sign out, sign in again, then delete your account within a few minutes.');
          await fauth.sendSignInLinkToEmail(u.email, { url: location.origin + '/collection?del=1', handleCodeInApp: true });
          store.set(EMAIL_KEY, u.email);
          throw err('link_sent', `To confirm it’s you, we’ve emailed a link to ${u.email}. Open it on this device, then press Delete permanently.`);
        }
      }
      // A shared sale or trade list (public page) goes too, then its settings.
      try {
        const sh = await fstore.doc(`data/users/${u.uid}/share`).get();
        const id = sh.exists && (sh.data() || {}).id;
        if (id) await fstore.doc(`shops/${id}`).delete().catch(() => {});
        if (sh.exists) await fstore.doc(`data/users/${u.uid}/share`).delete();
      } catch (e) { console.warn('share delete', e); }
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
