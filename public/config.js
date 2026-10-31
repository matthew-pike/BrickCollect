// Public settings for the BrickCollect website.
// The Supabase publishable key is designed to be public: the database's access rules
// decide what it can do (read shared data, and each person's own collection once signed in).
// Never put the Supabase secret key or BrickLink keys here; they belong in Netlify's environment variables.
window.BC_CONFIG = {
  supabaseUrl: 'https://gsvoqohfznlhmyhmnnca.supabase.co',
  supabaseKey: 'sb_publishable_gDOxpyIJ3kXLThLdOhWH3Q_XrLpNnE5',
  // Turn on once Google sign-in is set up in Supabase (Authentication → Sign In / Providers → Google).
  googleSignIn: false,
  // "Buy" buttons. {num} is the set number (75192 for LEGO 75192-1), {name} the set name.
  // Swap in your affiliate links when you have them; a brand with no url shows no Buy button.
  buyLinks: {
    LEGO:       { label: 'Buy', title: 'Find it on LEGO.com', url: 'https://www.lego.com/en-au/search?q={num}' },
    LumiBricks: { label: 'Buy', title: 'Find it at LumiBricks', url: '' },
    Pantasy:    { label: 'Buy', title: 'Find it at Pantasy',    url: '' },
  },
};
