// Builds the Firebase Hosting copy of the site: public/ with the page switched from Supabase to Firebase.
import { cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
const out = new URL('./hosting/', import.meta.url);
rmSync(out, { recursive: true, force: true });
cpSync(new URL('../public/', import.meta.url), out, { recursive: true });
const page = new URL('index.html', out);
let s = readFileSync(page, 'utf8');
const from = [
  '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>',
  '<script src="/backend.js"></script>',
];
for (const f of from) if (!s.includes(f)) throw new Error('index.html changed; update build-hosting.mjs: ' + f);
const V = '11.10.0';
s = s.replace(from[0], ['app', 'auth', 'firestore'].map(m => `<script src="https://www.gstatic.com/firebasejs/${V}/firebase-${m}-compat.js"></script>`).join('\n'))
     .replace(from[1], '<script src="/backend-firebase.js"></script>');
writeFileSync(page, s);
rmSync(new URL('backend.js', out));
console.log('Built firebase/hosting with Firebase sign-in and database');
