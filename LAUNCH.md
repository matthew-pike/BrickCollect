# Launching BrickCollect

Everything here can be done in Chrome on your Chromebook. Allow about 30 minutes.
Visitors never need a Claude account: the site runs on your Netlify and Supabase accounts.

## What's in this folder

| Path | What it is |
|---|---|
| `public/index.html` | The BrickCollect site |
| `public/catalog.json` | The LEGO catalog from your Rebrickable files (28,150 sets, 17,162 minifigures) |
| `public/config.js` | Your Supabase address and publishable key (safe to be public) |
| `public/backend.js` | Sign-in and saving |
| `public/privacy.html` | Privacy policy (needed for sign-in, and for ads later) |
| `netlify/functions/sync-prices.mjs` | The Sync Prices button |
| `netlify/functions/nightly-prices.mjs` | Refreshes prices of the most-owned sets every night |
| `netlify/functions/rates.mjs` | Refreshes exchange rates every day |
| `supabase/setup.sql` | Creates the database, access rules, you as admin, and your current subthemes, LumiBricks and Pantasy |

This replaces the earlier "brickcollect-connector" zip; you don't need that any more.

---

## 1. Set up the database (Supabase)

1. Open your project at supabase.com → **SQL Editor** → **New query**.
2. Open `supabase/setup.sql`, copy everything, paste it in, and press **Run**. You should see "Success. No rows returned".
3. Go to **Project Settings → API Keys** and find the **Secret key** (starts `sb_secret_`). Click to reveal and copy it.
   Keep it private: it goes only into Netlify in step 3. Don't paste it in chat or in any file.

## 2. Put the site on GitHub

1. On github.com, create a new **private** repository called `brickcollect`.
2. Choose **uploading an existing file** and drag in everything from this folder: `netlify.toml`, `LAUNCH.md`, and the `public`, `netlify` and `supabase` folders. Commit.

(If you connect GitHub to Claude, I can do this step and future updates for you.)

## 3. Deploy on Netlify

1. Netlify → **Add new site → Import an existing project → GitHub** → pick `brickcollect` → **Deploy**. The default settings are fine; `netlify.toml` tells Netlify what to do.
2. **Site configuration → Environment variables** → add:

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | `https://gsvoqohfznlhmyhmnnca.supabase.co` |
   | `SUPABASE_SECRET_KEY` | the secret key from step 1.3 |
   | `BRICKLINK_CONSUMER_KEY` | your BrickLink Consumer Key |
   | `BRICKLINK_CONSUMER_SECRET` | your BrickLink Consumer Secret |
   | `BRICKLINK_TOKEN_VALUE` | your BrickLink Token Value |
   | `BRICKLINK_TOKEN_SECRET` | your BrickLink Token Secret |
   | `SYNC_DAILY_ITEMS` | optional, default `60`: price lookups each signed-in person can trigger per day |

   The BrickLink access token must allow IP `0.0.0.0` (any IP), because Netlify's servers don't have a fixed address.
   Use a **new** consumer secret if the old one was ever shared.
3. **Deploys → Trigger deploy → Deploy site** so the variables take effect.
4. Note your site address, e.g. `https://brickcollect.netlify.app` (you can rename it under **Site configuration → Change site name**).

## 4. Tell Supabase your site address (for sign-in links)

Supabase → **Authentication → URL Configuration**:
- **Site URL:** your Netlify address (later, your own domain).
- **Redirect URLs:** add the same address with `/**` on the end, e.g. `https://brickcollect.netlify.app/**`.

## 5. Check it works

1. Open your site. Pick a theme, tick a set: the badge says "Saved in this browser".
2. Click **Sign in**, enter `m4ttpike@gmail.com`, and open the link in the email **on the same device**.
3. You're signed in as admin: **Bulk edit** and **Add set** appear, and your subthemes, LumiBricks and Pantasy are there.
4. Pick a theme and press **Sync Prices**. Prices appear with "BrickLink" and today's date.
   If it says BrickLink refused the request, check the four keys and the token's IP setting.
5. Exchange rates and the nightly price refresh run on their own. To run them now: Netlify → **Functions** → `rates` → **Run now**.

## 6. Before you tell people about it

- **Email sending:** Supabase's built-in email is only meant for testing and sends a small number of sign-in emails per hour. Before launch, connect a free email service such as Resend under **Authentication → Emails → SMTP Settings**, so sign-in links always arrive.
- **Sign in with Google (optional):** needs a free Google Cloud "OAuth client". Supabase → **Authentication → Sign In / Providers → Google** shows the steps. Then change `googleSignIn: false` to `true` in `public/config.js`. Until then the Google button stays hidden and email sign-in works.
- **Domain:** buy it (e.g. at Porkbun), then Netlify → **Domain management → Add a domain** and follow the steps. Update the Supabase URLs in step 4 to the new domain.
- **BrickLink's API terms:** confirm showing their price guide data on a public site is allowed, especially once there are ads.

## How it fits together

- **Visitors who don't sign in:** everything works; their collection is kept in their browser.
- **Signed-in visitors:** their collection is saved to their own private row in Supabase and follows them across devices. Anything ticked before signing in moves into the account.
- **You (admin, by email):** subthemes, Film / Series, Bulk edit, Add set and BrickLink minifigure numbers save for everyone. Your Sync Prices has no daily limit.
- **Sync Prices:** prices checked in the last 24 hours come from the database for free; older ones are fetched from BrickLink and saved for everyone.
- **Nightly:** the most-owned sets with prices older than 3 days are refreshed automatically.

To add another admin, run in the SQL Editor: `insert into public.admins (email) values ('their@email.com');`
