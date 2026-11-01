// Public settings for the BrickCollect website.
// The Supabase publishable key is designed to be public: the database's access rules
// decide what it can do (read shared data, and each person's own collection once signed in).
// Never put the Supabase secret key or BrickLink keys here; they belong in Netlify's environment variables.
window.BC_CONFIG = {
  supabaseUrl: 'https://gsvoqohfznlhmyhmnnca.supabase.co',
  supabaseKey: 'sb_publishable_gDOxpyIJ3kXLThLdOhWH3Q_XrLpNnE5',
  // Firebase web settings (public by design; Firestore rules protect the data). Used by backend-firebase.js after the move.
  firebase: {
    apiKey: 'AIzaSyChfx0G1V9x4cChemhLl3lP4H_qYI4A3Ow',
    authDomain: 'brickcollect-app.firebaseapp.com',
    projectId: 'brickcollect-app',
    storageBucket: 'brickcollect-app.firebasestorage.app',
    messagingSenderId: '689224539006',
    appId: '1:689224539006:web:1c5556e5bf1b77622ab12f',
  },
  // Social sign-in buttons, in this order. Add a provider here only after it's switched on in
  // Supabase (Authentication → Sign In / Providers). Options: google, discord, facebook, apple, twitter, github, azure.
  socialSignIn: ['google'],
  // "Buy" buttons. {num} is the set number (75192 for LEGO 75192-1), {name} the set name,
  // {lego} LEGO.com's store for the visitor's price location (en-au, en-us, en-gb…). name = shown on the Wanted list ("Buy at …").
  // Swap in your affiliate links when you have them; a brand with no url shows no Buy button.
  buyLinks: {
    LEGO:       { label: 'LE', name: 'LEGO', title: 'Find it on LEGO.com', url: 'https://www.lego.com/{lego}/product/{num}' },
    // product: exact product page ({path} is the set's store address, saved nightly). url: search page when the address isn't known yet.
    LumiBricks: { label: 'LU', name: 'LumiBricks', title: 'Buy at LumiBricks', product: 'https://www.lumibricks.com{path}?ref=opizuyuw', url: 'https://www.lumibricks.com/search?q={num}&ref=opizuyuw' },
    Pantasy:    { label: 'PA', name: 'Pantasy', title: 'Buy at Pantasy',    product: 'https://pantasy.com{path}?ref=fsolyowf',          url: 'https://pantasy.com/search?q={num}&ref=fsolyowf' },
    // No affiliate codes yet: add ?ref=… (or the brand's own parameter) to both addresses when you join their programme.
    CaDA:         { label: 'CA', name: 'CaDA', title: 'Buy at CaDA',       product: 'https://decadastore.com{path}',  url: 'https://decadastore.com/search?q={num}' },
    'Mould King': { label: 'MK', name: 'Mould King', title: 'Buy at Mould King', product: 'https://mouldkingcorp.com{path}', url: 'https://mouldkingcorp.com/search?q={num}' },
  },
};
