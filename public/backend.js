/* BrickCollect backend: Supabase sign-in and storage, plus the Sync Prices function.
   The page talks to window.BC with the same small document API the prototype used,
   so the page code stays simple:
     BC.db.collection(name).onSnapshot(cb) / .doc(id).set(data) / .doc(id).delete()
     BC.db.doc('meta/rates') and BC.db.doc('data/users/<id>/collection')
     BC.user.id(), BC.user.isOwner(), BC.user.email()
     BC.auth.signInWithEmail(email), BC.auth.signInWithGoogle(), BC.auth.signOut()
     BC.syncPrices({ type, items: [{ n, bl }] }) */
(function () {
  const cfg = window.BC_CONFIG || {};
  const sb = (window.supabase && cfg.supabaseUrl && cfg.supabaseKey)
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
    : null;

  const err = (code, message) => Object.assign(new Error(message || code), { code });
  const toDbError = e => {
    if (!e) return err('unavailable');
    const status = e.status || e.code;
    if (status === 401 || status === 403 || status === '42501' || /row-level security|permission/i.test(e.message || '')) return err('invalid_argument', e.message);
    return err('unavailable', e.message);
  };

  let session = null;
  const ready = sb ? sb.auth.getSession().then(r => { session = r.data.session; }) : Promise.resolve();

  /* ---------- tiny document layer over two tables ---------- */
  const listeners = new Set(); // { kind: 'col'|'doc', key, fire }
  function snapCollection(rows) {
    const docs = rows.map(r => ({ id: r.id, exists: true, data: () => r.data, metadata: { fromCache: false, hasPendingWrites: false } }));
    return { docs, size: docs.length, empty: !docs.length, docChanges: () => docs.map(d => ({ type: 'added', doc: d })), metadata: { fromCache: false, hasPendingWrites: false } };
  }
  function snapDoc(row) {
    return { id: row ? row.id : null, exists: !!row, data: () => (row ? row.data : undefined), metadata: { fromCache: false, hasPendingWrites: false } };
  }
  function parsePath(path) {
    const parts = path.split('/');
    if (parts[0] === 'data' && parts[1] === 'users' && parts.length === 4) return { table: 'user_docs', userId: parts[2], id: parts[3] };
    if (parts.length === 2) return { table: 'shared_docs', collection: parts[0], id: parts[1] };
    throw err('invalid_argument', 'Unsupported path ' + path);
  }
  async function readCollection(name) {
    const { data, error } = await sb.from('shared_docs').select('id,data').eq('collection', name);
    if (error) throw toDbError(error);
    return data || [];
  }
  async function readDoc(p) {
    const q = p.table === 'user_docs'
      ? sb.from('user_docs').select('id,data').eq('user_id', p.userId).eq('id', p.id)
      : sb.from('shared_docs').select('id,data').eq('collection', p.collection).eq('id', p.id);
    const { data, error } = await q.maybeSingle();
    if (error) throw toDbError(error);
    return data;
  }
  async function writeDoc(p, data) {
    await ready;
    const now = new Date().toISOString();
    const row = p.table === 'user_docs'
      ? { user_id: p.userId, id: p.id, data, updated_at: now }
      : { collection: p.collection, id: p.id, data, updated_at: now };
    const { error } = await sb.from(p.table).upsert(row);
    if (error) throw toDbError(error);
  }
  async function deleteDoc(p) {
    await ready;
    const q = p.table === 'user_docs'
      ? sb.from('user_docs').delete().eq('user_id', p.userId).eq('id', p.id)
      : sb.from('shared_docs').delete().eq('collection', p.collection).eq('id', p.id);
    const { error } = await q;
    if (error) throw toDbError(error);
  }
  function docRef(path) {
    const p = parsePath(path);
    return {
      id: p.id, path,
      get: async () => snapDoc(await readDoc(p)),
      set: data => writeDoc(p, data),
      delete: () => deleteDoc(p),
      onSnapshot(next, onError) {
        const l = { fire: () => readDoc(p).then(r => next(snapDoc(r)), e => onError && onError(e)) };
        listeners.add(l); ready.then(l.fire);
        return () => listeners.delete(l);
      },
    };
  }
  const db = sb ? {
    doc: docRef,
    collection(name) {
      return {
        path: name,
        doc: id => docRef(`${name}/${id}`),
        onSnapshot(next, onError) {
          const l = { fire: () => readCollection(name).then(rows => next(snapCollection(rows)), e => onError && onError(e)) };
          listeners.add(l); ready.then(l.fire);
          return () => listeners.delete(l);
        },
      };
    },
  } : null;
  // Pick up changes made elsewhere (another tab, another device, the nightly price refresh)
  // when the visitor comes back to the page.
  let lastRefresh = Date.now();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastRefresh > 60000) { lastRefresh = Date.now(); listeners.forEach(l => l.fire()); }
  });

  /* ---------- who is viewing ---------- */
  let adminCache = null;
  const user = sb ? {
    id: async () => { await ready; return session ? session.user.id : null; },
    email: async () => { await ready; return session ? session.user.email : null; },
    isOwner: async () => {
      await ready;
      if (!session) return false;
      if (adminCache !== null) return adminCache;
      const { data, error } = await sb.rpc('is_admin');
      adminCache = !error && data === true;
      return adminCache;
    },
  } : null;

  /* ---------- sign in / out ---------- */
  const auth = {
    available: !!sb,
    async signInWithEmail(email) {
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) throw error;
    },
    async signInWith(provider) {
      const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + location.pathname } });
      if (error) throw error;
    },
    signInWithGoogle() { return this.signInWith('google'); },
    async signOut() { await sb.auth.signOut(); },
    // Call cb only when a different person signs in or out after the page has loaded.
    // INITIAL_SESSION fires straight away for every page load and TOKEN_REFRESHED every hour;
    // neither is a change of person, so they must not reload the page.
    onChange(cb) {
      if (!sb) return;
      ready.then(() => sb.auth.onAuthStateChange((event, s) => {
        const before = session ? session.user.id : null, after = s ? s.user.id : null;
        session = s;
        if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
        if (before !== after) cb(event);
      }));
    },
  };

  /* ---------- Sync Prices ---------- */
  async function syncPrices(body) {
    await ready;
    if (!session) throw err('signed_out', 'Sign in to sync prices.');
    const res = await fetch('/api/sync-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw err(out.code || `http_${res.status}`, out.message || `Price sync failed (HTTP ${res.status}).`);
    return out;
  }

  window.BC = { db, user, auth, syncPrices, ready };
})();
