# BrickCollect

A free collection tracker for LEGO and other brick brands (LumiBricks, Pantasy). Tick what you own, see what's left to collect, and what it's worth in your own currency. An Art of Bricks project.

- **Site:** static files in `public/`, hosted on Netlify.
- **Accounts and saved collections:** Supabase (`supabase/setup.sql`).
- **Prices and exchange rates:** Netlify functions in `netlify/functions/`.

See [LAUNCH.md](LAUNCH.md) for setup.

Keys and secrets live only in Netlify's environment variables. Never commit a `.env` file.
