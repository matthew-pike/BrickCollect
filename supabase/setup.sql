-- BrickCollect database setup
-- Paste this whole file into Supabase → SQL Editor → New query, then press Run.
-- Safe to run again: it only adds what's missing and never overwrites changes made on the site.

-- 1. Tables ---------------------------------------------------------------
-- Shared data everyone reads and only admins change:
--   subthemes, films, prices and BrickLink numbers (iteminfo), other brands (catalog), exchange rates (meta).
create table if not exists public.shared_docs (
  collection text not null,
  id         text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

-- Each person's own collection. Nobody else can read it.
create table if not exists public.user_docs (
  user_id    uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Who counts as an admin (by sign-in email).
create table if not exists public.admins (
  email text primary key
);

-- How many prices each person has synced today (used by the Sync Prices function).
create table if not exists public.sync_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  items   int  not null default 0,
  primary key (user_id, day)
);

-- 2. Admin check -----------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- 3. Access rules -----------------------------------------------------------
alter table public.shared_docs enable row level security;
alter table public.user_docs   enable row level security;
alter table public.admins      enable row level security;
alter table public.sync_log    enable row level security;

drop policy if exists "shared: anyone can read"     on public.shared_docs;
drop policy if exists "shared: admins can insert"   on public.shared_docs;
drop policy if exists "shared: admins can update"   on public.shared_docs;
drop policy if exists "shared: admins can delete"   on public.shared_docs;
create policy "shared: anyone can read"   on public.shared_docs for select to anon, authenticated using (true);
create policy "shared: admins can insert" on public.shared_docs for insert to authenticated with check (public.is_admin());
create policy "shared: admins can update" on public.shared_docs for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "shared: admins can delete" on public.shared_docs for delete to authenticated using (public.is_admin());

drop policy if exists "own collection only" on public.user_docs;
create policy "own collection only" on public.user_docs for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- admins and sync_log have no policies on purpose: the site can't read or change them directly.
-- The admin check above and the Netlify functions (with the secret key) use them.

-- 4. You are the admin -------------------------------------------------------
insert into public.admins (email) values ('m4ttpike@gmail.com') on conflict do nothing;

-- 5. Starter data from the BrickCollect prototype ----------------------------
insert into public.shared_docs (collection, id, data) values ('subthemes', 'Star-Wars', '{"brickset":{},"films":{"75458-1":"The Mandalorian and Grogu"},"manual":{"30727-1":"The Mandalorian and Grogu","30728-1":"The Mandalorian and Grogu","40917-1":"The Mandalorian and Grogu","5010305-1":"The Mandalorian and Grogu","6626047-1":"The Mandalorian and Grogu","6626049-1":"The Mandalorian and Grogu","6626053-1":"The Mandalorian and Grogu","6643541-1":"The Mandalorian and Grogu","6650266-1":"The Mandalorian and Grogu","6657699-1":"The Mandalorian and Grogu","66821-1":"The Mandalorian and Grogu","75420-1":"The Mandalorian and Grogu","75421-1":"The Mandalorian and Grogu","75422-1":"The Mandalorian and Grogu","75423-1":"The Mandalorian and Grogu","75424-1":"The Mandalorian and Grogu","75425-1":"The Mandalorian and Grogu","75426-1":"The Mandalorian and Grogu","75427-1":"The Mandalorian and Grogu","75436-1":"The Mandalorian and Grogu","75437-1":"The Mandalorian and Grogu","75438-1":"The Mandalorian and Grogu","75439-1":"The Mandalorian and Grogu","75440-1":"The Mandalorian and Grogu","75441-1":"The Mandalorian and Grogu","75442-1":"The Mandalorian and Grogu","75443-1":"The Mandalorian and Grogu","75444-1":"The Mandalorian and Grogu","75445-1":"The Mandalorian and Grogu","75446-1":"The Mandalorian and Grogu","75447-1":"The Mandalorian and Grogu","75448-1":"Mechs","75449-1":"The Mandalorian and Grogu","75451-1":"The Mandalorian and Grogu","75452-1":"The Mandalorian and Grogu","75453-1":"The Mandalorian and Grogu","75454-1":"The Mandalorian and Grogu","75455-1":"The Mandalorian and Grogu","75458-1":"Helmet Collection","75459-1":"The Mandalorian and Grogu","75460-1":"The Mandalorian and Grogu","75461-1":"The Mandalorian and Grogu","L0002232-1":"The Mandalorian and Grogu","L0002233-1":"The Mandalorian and Grogu","L0002234-1":"The Mandalorian and Grogu","L0002235-1":"The Mandalorian and Grogu","L0002236-1":"The Mandalorian and Grogu","L0002237-1":"The Mandalorian and Grogu","L0002238-1":"The Mandalorian and Grogu","L0002239-1":"The Mandalorian and Grogu","L0002245-1":"The Mandalorian and Grogu","L0002245-2":"The Mandalorian and Grogu"},"theme":"Star Wars","updatedAt":1793393986970}'::jsonb)
  on conflict (collection, id) do nothing;
insert into public.shared_docs (collection, id, data) values ('catalog', 'LumiBricks', '{"brand":"LumiBricks","items":{"10013":{"name":"Garden Cottage","pieces":null,"sub":"","theme":"Unsorted","year":null},"15010":{"name":"Italian Homestyle Restaurant Modular","pieces":null,"sub":"","theme":"Unsorted","year":null},"15011":{"name":"Greenway Clinic","pieces":null,"sub":"","theme":"Unsorted","year":null},"15012":{"name":"Pocket Garden","pieces":null,"sub":"","theme":"Unsorted","year":null},"15017":{"name":"Train Station","pieces":null,"sub":"","theme":"Unsorted","year":null},"17007":{"name":"Cyber Couture Galleria","pieces":null,"sub":"","theme":"Cyberpunk","year":null},"17008":{"name":"Cyberpunk Police Urban Convoy","pieces":null,"sub":"","theme":"Cyberpunk","year":null},"17009":{"name":"Cyberpunk Police HQ","pieces":null,"sub":"","theme":"Cyberpunk","year":null},"19012":{"name":"Barbershop","pieces":null,"sub":"","theme":"Unsorted","year":null},"19015":{"name":"Film Studio Tower","pieces":null,"sub":"","theme":"Unsorted","year":null},"19016":{"name":"Corner Photo Studio","pieces":null,"sub":"","theme":"Unsorted","year":null},"21001":{"name":"Wheat Field with Cypresses","pieces":null,"sub":"","theme":"Unsorted","year":null},"F9009":{"name":"House of Sweets","pieces":null,"sub":"","theme":"Unsorted","year":null},"F9016":{"name":"Farm Truck","pieces":null,"sub":"","theme":"Unsorted","year":null},"F9019":{"name":"Steampunk Vintage Car","pieces":null,"sub":"","theme":"Steampunk","year":null},"F9023":{"name":"Newsstand","pieces":null,"sub":"","theme":"Unsorted","year":null},"F9026":{"name":"Sheriff''s Office","pieces":null,"sub":"","theme":"Unsorted","year":null},"F9027":{"name":"Medieval Watchtower","pieces":null,"sub":"","theme":"Unsorted","year":null},"F9030":{"name":"Carpentry Van","pieces":null,"sub":"","theme":"Unsorted","year":null},"F9043":{"name":"Police Patrol Car","pieces":null,"sub":"","theme":"Unsorted","year":null},"F9044":{"name":"Old West Post Office","pieces":null,"sub":"","theme":"Unsorted","year":null},"F9047":{"name":"Steampunk City Bridge","pieces":null,"sub":"","theme":"Steampunk","year":null},"F9050":{"name":"Steampunk Flying Club","pieces":null,"sub":"","theme":"Steampunk","year":null},"F9052":{"name":"Western Stagecoach","pieces":null,"sub":"","theme":"Unsorted","year":null},"F9053":{"name":"Deer Crossing","pieces":null,"sub":"","theme":"Unsorted","year":null},"F9054":{"name":"Twilight Motel","pieces":null,"sub":"","theme":"Unsorted","year":null},"F9055":{"name":"Christmas Newsstand","pieces":null,"sub":"","theme":"Unsorted","year":null},"F9058":{"name":"Record Store","pieces":null,"sub":"","theme":"Unsorted","year":null},"F9067":{"name":"Steampunk Motorcycle Pursuit","pieces":null,"sub":"","theme":"Steampunk","year":null},"F9069":{"name":"Underground Dance Battle","pieces":null,"sub":"","theme":"Unsorted","year":null},"L9096":{"name":"Spa Cabin","pieces":null,"sub":"","theme":"Unsorted","year":null},"L9104":{"name":"Interstellar Drive-In","pieces":null,"sub":"","theme":"Unsorted","year":null}},"updatedAt":1793395100000}'::jsonb)
  on conflict (collection, id) do nothing;
insert into public.shared_docs (collection, id, data) values ('catalog', 'Pantasy', '{"brand":"Pantasy","items":{"11017":{"img":"","name":"Boeing 787","pieces":null,"sub":"","theme":"Boeing","year":null},"56001":{"img":"","name":"Food Street Series","pieces":null,"sub":"","theme":"Food Street","year":null},"56002":{"img":"","name":"Food Street Series","pieces":null,"sub":"","theme":"Food Street","year":null},"56003":{"img":"","name":"Food Street Series","pieces":null,"sub":"","theme":"Food Street","year":null},"56004":{"img":"","name":"Food Street Series","pieces":null,"sub":"","theme":"Food Street","year":null},"56005":{"img":"","name":"Food Street Series","pieces":null,"sub":"","theme":"Food Street","year":null},"56006":{"img":"","name":"Food Street Series","pieces":null,"sub":"","theme":"Food Street","year":null},"56007":{"img":"","name":"Food Street Series","pieces":null,"sub":"","theme":"Food Street","year":null},"56008":{"img":"","name":"Food Street Series","pieces":null,"sub":"","theme":"Food Street","year":null},"85001":{"img":"","name":"Retro Television","pieces":null,"sub":"","theme":"Retro Collection","year":null},"85003":{"img":"","name":"Forest Cabin","pieces":2010,"sub":"","theme":"Modular Buildings","year":2023},"85005":{"img":"","name":"Retro 90s PC","pieces":null,"sub":"","theme":"Retro Collection","year":null},"85009":{"img":"","name":"Retro Gramophone","pieces":null,"sub":"","theme":"Retro Collection","year":null},"85010":{"img":"","name":"Retro Projector","pieces":null,"sub":"","theme":"Retro Collection","year":null},"85013":{"img":"","name":"Bakery","pieces":2663,"sub":"","theme":"Modular Buildings","year":2023},"85014":{"img":"","name":"Baker Street 221B Apartment","pieces":null,"sub":"","theme":"Sherlock Holmes","year":null},"85016":{"img":"","name":"Gumball Machine","pieces":null,"sub":"","theme":"Retro Collection","year":null},"85018":{"img":"","name":"Retro Phone","pieces":null,"sub":"","theme":"Retro Collection","year":null},"85019":{"img":"","name":"The Opera","pieces":3518,"sub":"","theme":"Modular Buildings","year":2025},"85023":{"img":"","name":"Craft Brewery","pieces":null,"sub":"","theme":"Modular Buildings","year":null},"85024":{"img":"","name":"Motorcycle Restaurant","pieces":2994,"sub":"","theme":"Modular Buildings","year":2025},"85028":{"img":"","name":"Hand Crank Sewing Machine","pieces":null,"sub":"","theme":"Retro Collection","year":null},"85031":{"img":"","name":"Toy Store","pieces":null,"sub":"","theme":"Modular Buildings","year":null},"85032":{"img":"","name":"Blossom Cafe","pieces":2826,"sub":"","theme":"Modular Buildings","year":2025},"85033":{"img":"","name":"Summit Cabin","pieces":null,"sub":"","theme":"Modular Buildings","year":null},"85036":{"img":"","name":"School of Arts","pieces":null,"sub":"","theme":"Modular Buildings","year":null},"85038":{"img":"","name":"Bank","pieces":null,"sub":"","theme":"Modular Buildings","year":null},"85039":{"img":"","name":"Cassette Player","pieces":null,"sub":"","theme":"Retro Collection","year":null},"85041":{"img":"","name":"Architecture Firm","pieces":null,"sub":"","theme":"Modular Buildings","year":null},"85042":{"img":"","name":"Stained Glass Table Lamp","pieces":null,"sub":"","theme":"Retro Collection","year":null},"85043":{"img":"","name":"Gift Store","pieces":3143,"sub":"","theme":"Modular Buildings","year":2026},"85045":{"img":"","name":"Prague Astronomical Clock","pieces":null,"sub":"","theme":"Unsorted","year":null},"85046":{"img":"","name":"Popcorn Machine","pieces":null,"sub":"","theme":"Retro Collection","year":null},"85047":{"img":"","name":"Dinosaur Museum","pieces":3064,"sub":"","theme":"Modular Buildings","year":null},"85048":{"img":"","name":"Radio","pieces":811,"sub":"","theme":"Retro Collection","year":2026},"85049":{"img":"","name":"Bavarian Beer Hall","pieces":3246,"sub":"","theme":"Modular Buildings","year":2026},"85050":{"img":"","name":"Twin-Lens Reflex Camera","pieces":null,"sub":"","theme":"Retro Collection","year":null},"85054":{"img":"","name":"Telescope","pieces":1077,"sub":"","theme":"Retro Collection","year":2026},"85055":{"img":"","name":"Banker''s Lamp","pieces":523,"sub":"","theme":"Retro Collection","year":2026},"85056":{"img":"","name":"Kerosene Lamp","pieces":null,"sub":"","theme":"Retro Collection","year":null},"85058":{"img":"","name":"Moka Pot","pieces":null,"sub":"","theme":"Retro Collection","year":null},"85059":{"img":"","name":"Spring Picnic Bicycle","pieces":1079,"sub":"","theme":"Seasons","year":null},"85060":{"img":"","name":"Antique Clock Shop","pieces":null,"sub":"","theme":"Modular Buildings","year":null},"85061":{"img":"","name":"Tailor Shop","pieces":null,"sub":"","theme":"Modular Buildings","year":null},"85062":{"img":"","name":"Italian Street Corner","pieces":null,"sub":"","theme":"Modular Buildings","year":null},"85063":{"img":"","name":"Japanese Onsen","pieces":null,"sub":"","theme":"Modular Buildings","year":null},"85065":{"img":"","name":"Violin","pieces":null,"sub":"","theme":"Retro Collection","year":null},"85066":{"img":"","name":"Haunted Cinema","pieces":2441,"sub":"","theme":"Modular Buildings","year":2026},"85072":{"img":"","name":"Vinyl Turntable","pieces":null,"sub":"","theme":"Retro Collection","year":null},"85074":{"img":"","name":"BoomBox","pieces":993,"sub":"","theme":"Retro Collection","year":2026},"85078":{"img":"","name":"Saxophone","pieces":null,"sub":"","theme":"Retro Collection","year":null},"86203":{"img":"","name":"Astro Boy Mechanical Clear Version","pieces":null,"sub":"","theme":"Astro Boy","year":null},"86205":{"img":"","name":"Astro Boy Awakening Moment","pieces":null,"sub":"","theme":"Astro Boy","year":null},"86206":{"img":"","name":"Astro Boy Pure White Version","pieces":null,"sub":"","theme":"Astro Boy","year":null},"86212":{"img":"","name":"Astro Boy Mechanical Clear Version","pieces":null,"sub":"","theme":"Astro Boy","year":null},"86218":{"img":"","name":"221B Baker Street","pieces":null,"sub":"","theme":"Sherlock Holmes","year":null},"86301":{"img":"","name":"Hourglass","pieces":null,"sub":"","theme":"Le Petit Prince","year":null},"86303":{"img":"","name":"Le Petit Prince","pieces":null,"sub":"","theme":"Le Petit Prince","year":null},"86304":{"img":"","name":"Le Petit Prince","pieces":null,"sub":"","theme":"Le Petit Prince","year":null},"86305":{"img":"","name":"Le Petit Prince","pieces":null,"sub":"","theme":"Le Petit Prince","year":null},"86306":{"img":"","name":"Mini Le Petit Prince","pieces":null,"sub":"","theme":"Le Petit Prince","year":null},"86320":{"img":"","name":"The Only Rose and Time Travel","pieces":null,"sub":"","theme":"Le Petit Prince","year":null},"86402":{"img":"","name":"Treasure Hunt Steamship","pieces":null,"sub":"","theme":"Popeye","year":null},"86504":{"img":"","name":"Dragon Warrior Spring Festival","pieces":null,"sub":"","theme":"Kung Fu Panda","year":null},"86505":{"img":"","name":"Kung Fu Panda Mini Street View","pieces":null,"sub":"Mini Street View","theme":"Kung Fu Panda","year":null},"86506":{"img":"","name":"Kung Fu Panda Mini Street View","pieces":null,"sub":"Mini Street View","theme":"Kung Fu Panda","year":null},"86507":{"img":"","name":"Kung Fu Panda Mini Street View","pieces":null,"sub":"Mini Street View","theme":"Kung Fu Panda","year":null},"86508":{"img":"","name":"Kung Fu Panda Mini Street View","pieces":null,"sub":"Mini Street View","theme":"Kung Fu Panda","year":null},"86510":{"img":"","name":"Kung Fu Panda CosRiders","pieces":null,"sub":"CosRiders","theme":"Kung Fu Panda","year":null},"86511":{"img":"","name":"Kung Fu Panda CosRiders","pieces":null,"sub":"CosRiders","theme":"Kung Fu Panda","year":null},"86512":{"img":"","name":"Kung Fu Panda CosRiders","pieces":null,"sub":"CosRiders","theme":"Kung Fu Panda","year":null},"86513":{"img":"","name":"Kung Fu Panda CosRiders","pieces":null,"sub":"CosRiders","theme":"Kung Fu Panda","year":null},"86703":{"img":"","name":"G-Patton XT","pieces":null,"sub":"","theme":"G-Patton","year":null},"86805":{"img":"","name":"Garfield Foodie Series","pieces":null,"sub":"Foodie Series","theme":"Garfield","year":null},"86806":{"img":"","name":"Garfield Foodie Series","pieces":null,"sub":"Foodie Series","theme":"Garfield","year":null},"86807":{"img":"","name":"Garfield Foodie Series","pieces":null,"sub":"Foodie Series","theme":"Garfield","year":null},"86808":{"img":"","name":"Garfield Foodie Series","pieces":null,"sub":"Foodie Series","theme":"Garfield","year":null},"86809":{"img":"","name":"Garfield Fantastic Machines","pieces":null,"sub":"Fantastic Machines","theme":"Garfield","year":null},"86810":{"img":"","name":"Garfield Fantastic Machines","pieces":null,"sub":"Fantastic Machines","theme":"Garfield","year":null},"86811":{"img":"","name":"Garfield Fantastic Machines","pieces":null,"sub":"Fantastic Machines","theme":"Garfield","year":null},"86812":{"img":"","name":"Garfield Fantastic Machines","pieces":null,"sub":"Fantastic Machines","theme":"Garfield","year":null},"99124":{"img":"","name":"Po, Tigress, Shifu and Zhen","pieces":null,"sub":"","theme":"Kung Fu Panda","year":null},"99125":{"img":"","name":"Po, Tigress, Shifu and Zhen","pieces":null,"sub":"","theme":"Kung Fu Panda","year":null},"99126":{"img":"","name":"Po, Tigress, Shifu and Zhen","pieces":null,"sub":"","theme":"Kung Fu Panda","year":null},"99127":{"img":"","name":"Po, Tigress, Shifu and Zhen","pieces":null,"sub":"","theme":"Kung Fu Panda","year":null}},"updatedAt":1793406200000}'::jsonb)
  on conflict (collection, id) do nothing;

-- BrickLink numbers for minifigures, from the original BrickCollect mapping file
insert into public.shared_docs (collection, id, data) values ('iteminfo', 'b0', '{"items":{"fig-011942":{"bl":"sw1176"},"fig-002515":{"bl":"sw0636b"},"fig-003802":{"bl":"sw0969"},"fig-010435":{"bl":"sw0073a"},"fig-003912":{"bl":"sw0104"}}}'::jsonb)
  on conflict (collection, id) do nothing;
insert into public.shared_docs (collection, id, data) values ('iteminfo', 'b1', '{"items":{"fig-003935":{"bl":"sw0512"},"fig-003517":{"bl":"sw0004"}}}'::jsonb)
  on conflict (collection, id) do nothing;
insert into public.shared_docs (collection, id, data) values ('iteminfo', 'b10', '{"items":{"fig-004346":{"bl":"sw0975"},"fig-003785":{"bl":"sw0338"},"fig-010440":{"bl":"sw0146"}}}'::jsonb)
  on conflict (collection, id) do nothing;
insert into public.shared_docs (collection, id, data) values ('iteminfo', 'b11', '{"items":{"fig-004413":{"bl":"sw0585"},"fig-016249":{"bl":"sw1407"},"fig-004347":{"bl":"sw0973"},"fig-010441":{"bl":"sw0147"}}}'::jsonb)
  on conflict (collection, id) do nothing;
insert into public.shared_docs (collection, id, data) values ('iteminfo', 'b12', '{"items":{"fig-004348":{"bl":"sw0974"},"fig-004326":{"bl":"sw0942"},"fig-000124":{"bl":"sw0011a"},"fig-001257":{"bl":"sw0505"},"fig-003941":{"bl":"sw0513"}}}'::jsonb)
  on conflict (collection, id) do nothing;
insert into public.shared_docs (collection, id, data) values ('iteminfo', 'b13', '{"items":{"fig-016603":{"bl":"sw1427"},"fig-004349":{"bl":"sw0971"},"fig-010388":{"bl":"sw1104"},"fig-010861":{"bl":"sw1139"},"fig-010443":{"bl":"sw0527a"},"fig-004327":{"bl":"sw0940"},"fig-003865":{"bl":"sw0366"},"fig-003942":{"bl":"sw0510"}}}'::jsonb)
  on conflict (collection, id) do nothing;
insert into public.shared_docs (collection, id, data) values ('iteminfo', 'b14', '{"items":{"fig-014190":{"bl":"sw1273"},"fig-011940":{"bl":"sw1179"},"fig-002524":{"bl":"sw0585"},"fig-004328":{"bl":"sw0941"},"fig-003943":{"bl":"sw0451"},"fig-003536":{"bl":"sw0028"},"fig-003624":{"bl":"sw0036"},"fig-003910":{"bl":"sw0105"}}}'::jsonb)
  on conflict (collection, id) do nothing;
insert into public.shared_docs (collection, id, data) values ('iteminfo', 'b15', '{"items":{"fig-011941":{"bl":"sw1175"},"fig-002514":{"bl":"sw0700"},"fig-003812":{"bl":"sw0236"},"fig-003944":{"bl":"sw0511"},"fig-003515":{"bl":"sw0045"},"fig-003911":{"bl":"sw0103"}}}'::jsonb)
  on conflict (collection, id) do nothing;
insert into public.shared_docs (collection, id, data) values ('iteminfo', 'b2', '{"items":{"fig-016251":{"bl":"sw1406"},"fig-011944":{"bl":"sw1180"},"fig-001714":{"bl":"sw0532"},"fig-003936":{"bl":"sw0504"}}}'::jsonb)
  on conflict (collection, id) do nothing;
insert into public.shared_docs (collection, id, data) values ('iteminfo', 'b3', '{"items":{"fig-016593":{"bl":"sw1430"},"fig-011945":{"bl":"sw1178"},"fig-004350":{"bl":"sw0972"},"fig-003937":{"bl":"sw0509"},"fig-003904":{"bl":"sw0145"}}}'::jsonb)
  on conflict (collection, id) do nothing;
insert into public.shared_docs (collection, id, data) values ('iteminfo', 'b4', '{"items":{"fig-001529":{"bl":"sw0400"},"fig-017573":{"bl":"sw1528"},"fig-011946":{"bl":"sw1177"},"fig-011957":{"bl":"sw1181"},"fig-004252":{"bl":"sw0823"},"fig-004351":{"bl":"sw0958"},"fig-001408":{"bl":"sw0365"},"fig-003938":{"bl":"sw0508"},"fig-003509":{"bl":"sw0010"},"fig-003905":{"bl":"sw0141"}}}'::jsonb)
  on conflict (collection, id) do nothing;
insert into public.shared_docs (collection, id, data) values ('iteminfo', 'b5', '{"items":{"fig-004352":{"bl":"sw0976"},"fig-003906":{"bl":"sw0142"}}}'::jsonb)
  on conflict (collection, id) do nothing;
insert into public.shared_docs (collection, id, data) values ('iteminfo', 'b6', '{"items":{"fig-004342":{"bl":"sw0990"},"fig-003907":{"bl":"sw0140"}}}'::jsonb)
  on conflict (collection, id) do nothing;
insert into public.shared_docs (collection, id, data) values ('iteminfo', 'b7', '{"items":{"fig-016443":{"bl":"sw1417"},"fig-017554":{"bl":"sw1520"},"fig-004244":{"bl":"sw0831a"},"fig-003908":{"bl":"sw0107"}}}'::jsonb)
  on conflict (collection, id) do nothing;
insert into public.shared_docs (collection, id, data) values ('iteminfo', 'b8', '{"items":{"fig-002045":{"bl":"sw0762"},"fig-004344":{"bl":"sw0970"}}}'::jsonb)
  on conflict (collection, id) do nothing;
insert into public.shared_docs (collection, id, data) values ('iteminfo', 'b9', '{"items":{"fig-016588":{"bl":"sw1422"},"fig-004345":{"bl":"sw0977"},"fig-003861":{"bl":"sw0367"}}}'::jsonb)
  on conflict (collection, id) do nothing;
