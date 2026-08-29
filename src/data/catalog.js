export const BRANDS = {
  LEGO: "LEGO",
  LUMIBRICKS: "LumiBricks"
};

export const THEMES = {
  STAR_WARS: "Star Wars",
  SPEED_CHAMPIONS: "Speed Champions",
  IDEAS: "Ideas",
  CYBERPUNK: "Cyberpunk",
  ARCHITECTURE: "Architecture"
};

export const SUBTHEMES = {
  BAD_BATCH: "The Bad Batch",
  SOLO: "Solo: A Star Wars Story",
  AHSOKA: "Ahsoka",
  SKELETON_CREW: "Skeleton Crew",
  REBUILD_GALAXY: "LEGO Star Wars: Rebuild the Galaxy",
  MANDALORIAN: "The Mandalorian",
  MANDALORIAN_GROGU: "The Mandalorian and Grogu",
  ORIGINAL_TRILOGY: "Episode IV / V / VI",
  CLONE_WARS: "The Clone Wars",
  GENERAL: "General",
  CYBER_CITY: "Cyber City & Neon"
};

export const THEME_TIMELINES = {
  [THEMES.STAR_WARS]: {
    "The Bad Batch": {
      era: "Reign of the Empire",
      year: "19 BBY – 17 BBY",
      status: "Canon",
      summary: "Begins with Order 66 following Clone Force 99 as the Galactic Republic collapses."
    },
    "Solo: A Star Wars Story": {
      era: "Reign of the Empire",
      year: "13 BBY – 10 BBY",
      status: "Canon",
      summary: "Exploring the galactic criminal underworld and syndicates."
    },
    "Ahsoka": {
      era: "The New Republic",
      year: "9 ABY – 10 ABY",
      status: "Canon",
      summary: "Following Ahsoka Tano and Sabine Wren tracking Grand Admiral Thrawn."
    },
    "Skeleton Crew": {
      era: "The New Republic",
      year: "~9 ABY",
      status: "Canon",
      summary: "Four kids navigate wild space aboard The Onyx Cinder."
    },
    "LEGO Star Wars: Rebuild the Galaxy": {
      era: "Alternate Reality Remix",
      year: "Non-Canon / What If?",
      status: "Legends / Remix",
      summary: "Sig Greebling scrambles the galaxy into an alternate timeline of Sith Jar Jar and Jedi Vader."
    },
    "The Mandalorian": {
      era: "The New Republic",
      year: "9 ABY+",
      status: "Canon",
      summary: "Adventures of Din Djarin and Grogu across the outer rim after the fall of the Empire."
    },
    "Episode IV / V / VI": {
      era: "Galactic Civil War",
      year: "0 BBY – 4 ABY",
      status: "Classic Canon",
      summary: "The legendary conflict between the Rebel Alliance and the Galactic Empire."
    }
  },
  [THEMES.SPEED_CHAMPIONS]: {
    "General": {
      era: "Motorsport & Supercars",
      year: "2015 – Present",
      status: "Official Licensed",
      summary: "Authentic recreations of iconic supercars, classic muscle, and championship-winning racing machines."
    }
  },
  [THEMES.IDEAS]: {
    "General": {
      era: "Fan-Designed Masterpieces",
      year: "2008 – Present",
      status: "Crowdsourced",
      summary: "Crowdsourced sets conceived by passionate fan designers and voted on by the global AFOL community."
    }
  }
};

export const MINIFIGS_CATALOG = [
  // --- THE BAD BATCH ---
  { id: "sw1148", name: "Hunter (Clone Commando)", set: "The Bad Batch Attack Shuttle (75314)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, owned: false },
  { id: "sw1149", name: "Wrecker (Clone Commando)", set: "The Bad Batch Attack Shuttle (75314)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, owned: false },
  { id: "sw1150", name: "Tech (Clone Commando)", set: "The Bad Batch Attack Shuttle (75314)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, owned: false },
  { id: "sw1151", name: "Echo (ARC Trooper Corporal)", set: "The Bad Batch Attack Shuttle (75314)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, owned: false },
  { id: "sw1152", name: "Crosshair (Imperial Elite Squad)", set: "The Bad Batch Attack Shuttle (75314)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, owned: false },
  { id: "sw1153", name: "Gonky (GNK Power Droid)", set: "The Bad Batch Attack Shuttle (75314)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, owned: false },
  { id: "sw1214", name: "Omega", set: "The Justifier (75323)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, owned: false },
  { id: "sw1215", name: "Todo 360", set: "The Justifier (75323)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, owned: false },
  { id: "sw1219", name: "Cad Bane (Pearl Dark Gray Head)", set: "The Justifier (75323)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, owned: false },

  // --- SOLO: A STAR WARS STORY ---
  { id: "sw0915", name: "Han Solo (White Jacket, Corellia)", set: "Han Solo's Landspeeder (75209)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: true },
  { id: "sw0916", name: "Qi'ra (Jacket with Collar)", set: "Han Solo's Landspeeder (75209)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: true },
  { id: "37286pb01", name: "Corellian Hound", set: "Han Solo's Landspeeder (75209)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: true },
  { id: "sw0940", name: "Enfys Nest", set: "Cloud-Rider Swoop Bikes (75215)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: true },
  { id: "sw0941", name: "Tobias Beckett (Dark Tan Coat)", set: "Cloud-Rider Swoop Bikes (75215)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: true },
  { id: "sw0942", name: "Weazel", set: "Cloud-Rider Swoop Bikes (75215)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: true },

  // --- AHSOKA ---
  { id: "sw1300", name: "Ahsoka Tano (Pearl Dark Gray Robe)", set: "Ahsoka Tano's T-6 Jedi Shuttle (75362)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1299", name: "Professor Huyang", set: "Ahsoka Tano's T-6 Jedi Shuttle (75362)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1301", name: "Marrok, Inquisitor", set: "Ahsoka Tano's T-6 Jedi Shuttle (75362)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1302", name: "Sabine Wren", set: "Ahsoka Tano's T-6 Jedi Shuttle (75362)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },

  // --- SKELETON CREW ---
  { id: "sw1353", name: "Jod Na Nawood", set: "The Onyx Cinder (75374)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SKELETON_CREW, owned: false },
  { id: "sw1349", name: "Wim", set: "The Onyx Cinder (75374)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SKELETON_CREW, owned: false },

  // --- REBUILD THE GALAXY ---
  { id: "sw1363", name: "Jedi Vader (White Armor)", set: "The Dark Falcon (75389)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, owned: false },
  { id: "sw1436", name: "Darth Dev (Darth Devastator)", set: "The Force Burner Snowspeeder (75414)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, owned: false },
  { id: "sw1437", name: "Sig Greebling", set: "The Force Burner Snowspeeder (75414)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, owned: false },

  // --- SPEED CHAMPIONS & IDEAS ---
  { id: "sc-drv01", name: "Ford GT Driver", set: "2016 Ford GT & 1966 Ford GT40 (75881)", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, owned: false },
  { id: "ideas-m01", name: "NASA Astronaut", set: "NASA Apollo Saturn V (21309)", brand: BRANDS.LEGO, theme: THEMES.IDEAS, subtheme: SUBTHEMES.GENERAL, owned: false }
];

export const SETS_CATALOG = [
  // --- THE BAD BATCH & IMPERIAL ---
  { id: "75314-1", setNumber: "75314", name: "The Bad Batch Attack Shuttle", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, year: 2021, pieces: 969, minifigCount: 5, owned: false },
  { id: "75323-1", setNumber: "75323", name: "The Justifier", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, year: 2022, pieces: 1022, minifigCount: 4, owned: false },
  { id: "75311-1", setNumber: "75311", name: "Imperial Armored Marauder", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, year: 2021, pieces: 478, minifigCount: 4, owned: false },

  // --- SOLO: A STAR WARS STORY ---
  { id: "75207-1", setNumber: "75207", name: "Imperial Patrol Battle Pack", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, year: 2018, pieces: 99, minifigCount: 4, owned: false },
  { id: "75209-1", setNumber: "75209", name: "Han Solo's Landspeeder", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, year: 2018, pieces: 345, minifigCount: 2, owned: true },
  { id: "75210-1", setNumber: "75210", name: "Moloch's Landspeeder", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, year: 2018, pieces: 464, minifigCount: 2, owned: false },
  { id: "75211-1", setNumber: "75211", name: "Imperial TIE Fighter", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, year: 2018, pieces: 519, minifigCount: 4, owned: false },
  { id: "75212-1", setNumber: "75212", name: "Kessel Run Millennium Falcon", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, year: 2018, pieces: 1414, minifigCount: 6, owned: false },
  { id: "75215-1", setNumber: "75215", name: "Cloud-Rider Swoop Bikes", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, year: 2018, pieces: 355, minifigCount: 3, owned: true },
  { id: "75217-1", setNumber: "75217", name: "Imperial Conveyex Transport", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, year: 2018, pieces: 622, minifigCount: 5, owned: false },
  { id: "75219-1", setNumber: "75219", name: "Imperial AT-Hauler", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, year: 2018, pieces: 829, minifigCount: 5, owned: false },

  // --- AHSOKA ---
  { id: "75357-1", setNumber: "75357", name: "Ghost & Phantom II", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, year: 2023, pieces: 1394, minifigCount: 5, owned: false },
  { id: "75362-1", setNumber: "75362", name: "Ahsoka Tano's T-6 Jedi Shuttle", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, year: 2023, pieces: 601, minifigCount: 4, owned: false },
  { id: "75364-1", setNumber: "75364", name: "New Republic E-Wing vs. Shin Hati's Starfighter", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, year: 2023, pieces: 1056, minifigCount: 4, owned: false },

  // --- SKELETON CREW ---
  { id: "75374-1", setNumber: "75374", name: "The Onyx Cinder", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SKELETON_CREW, year: 2024, pieces: 1325, minifigCount: 5, owned: false },

  // --- REBUILD THE GALAXY ---
  { id: "75388-1", setNumber: "75388", name: "Jedi Bob's Starfighter", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, year: 2024, pieces: 305, minifigCount: 2, owned: false },
  { id: "75389-1", setNumber: "75389", name: "The Dark Falcon", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, year: 2024, pieces: 1579, minifigCount: 6, owned: false },
  { id: "75393-1", setNumber: "75393", name: "TIE Fighter & X-Wing Mash-up", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, year: 2024, pieces: 1063, minifigCount: 4, owned: false },
  { id: "75414-1", setNumber: "75414", name: "The Force Burner Snowspeeder", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, year: 2025, pieces: 349, minifigCount: 3, owned: false },

  // ==========================================
  // --- OFFICIAL 2026 STAR WARS SETS ---
  // ==========================================
  { id: "75420-1", setNumber: "75420", name: "Luke's Landspeeder", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.ORIGINAL_TRILOGY, year: 2026, pieces: 195, minifigCount: 3, owned: false },
  { id: "75421-1", setNumber: "75421", name: "Darth Vader's TIE Fighter", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.ORIGINAL_TRILOGY, year: 2026, pieces: 463, minifigCount: 2, owned: false },
  { id: "75422-1", setNumber: "75422", name: "Yoda's Hut and Jedi Training", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.ORIGINAL_TRILOGY, year: 2026, pieces: 431, minifigCount: 3, owned: false },
  { id: "75423-1", setNumber: "75423", name: "Luke's Red Five X-Wing", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.ORIGINAL_TRILOGY, year: 2026, pieces: 561, minifigCount: 5, owned: false },
  { id: "75424-1", setNumber: "75424", name: "AT-ST Attack on Endor", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.ORIGINAL_TRILOGY, year: 2026, pieces: 337, minifigCount: 3, owned: false },
  { id: "75425-1", setNumber: "75425", name: "Mos Eisley Cantina", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.ORIGINAL_TRILOGY, year: 2026, pieces: 650, minifigCount: 5, owned: false },
  { id: "75426-1", setNumber: "75426", name: "Millennium Falcon", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.ORIGINAL_TRILOGY, year: 2026, pieces: 875, minifigCount: 4, owned: false },
  { id: "75427-1", setNumber: "75427", name: "Throne Room Duel & A-Wing", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.ORIGINAL_TRILOGY, year: 2026, pieces: 936, minifigCount: 6, owned: false },
  { id: "75436-1", setNumber: "75436", name: "The Mandalorian & Grogu's Speeder Bike", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.MANDALORIAN, year: 2026, pieces: 51, minifigCount: 2, owned: false },
  { id: "75437-1", setNumber: "75437", name: "Cobb Vanth's Speeder", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.MANDALORIAN, year: 2026, pieces: 196, minifigCount: 2, owned: false },
  { id: "75443-1", setNumber: "75443", name: "Grogu's Homestead", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.MANDALORIAN, year: 2026, pieces: 107, minifigCount: 1, owned: false },
  { id: "75444-1", setNumber: "75444", name: "AT-RT Attack", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.MANDALORIAN_GROGU, year: 2026, pieces: 286, minifigCount: 3, owned: false },
  { id: "75445-1", setNumber: "75445", name: "Anzellan Starship", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.MANDALORIAN_GROGU, year: 2026, pieces: 697, minifigCount: 3, owned: false },
  { id: "75447-1", setNumber: "75447", name: "The Razor Crest", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.MANDALORIAN_GROGU, year: 2026, pieces: 911, minifigCount: 5, owned: false },
  { id: "75449-1", setNumber: "75449", name: "Siege of Mandalore Battle Pack", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.CLONE_WARS, year: 2026, pieces: 98, minifigCount: 4, owned: false },
  { id: "75451-1", setNumber: "75451", name: "Hutt Palace Sentry Droid Showdown", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.MANDALORIAN_GROGU, year: 2026, pieces: 403, minifigCount: 3, owned: false },
  { id: "75453-1", setNumber: "75453", name: "Offworld Sandcrawler and Mudhorn", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.MANDALORIAN, year: 2026, pieces: 1660, minifigCount: 6, owned: false },
  { id: "75454-1", setNumber: "75454", name: "Imperial Remnant AT-AT with INT-4", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.MANDALORIAN_GROGU, year: 2026, pieces: 1426, minifigCount: 7, owned: false },
  { id: "75459-1", setNumber: "75459", name: "Imperial Lambda-Class Shuttle", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.MANDALORIAN, year: 2026, pieces: 939, minifigCount: 5, owned: false },
  { id: "75460-1", setNumber: "75460", name: "New Republic X-Wing Starfighter", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.MANDALORIAN_GROGU, year: 2026, pieces: 546, minifigCount: 3, owned: false },

  // --- SPEED CHAMPIONS (Including 2026 Wave) ---
  { id: "75899-1", setNumber: "75899", name: "LaFerrari", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2015, pieces: 164, minifigCount: 1, owned: false },
  { id: "75908-1", setNumber: "75908", name: "Ferrari 458 Italia GT2", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2015, pieces: 153, minifigCount: 1, owned: false },
  { id: "75909-1", setNumber: "75909", name: "McLaren P1", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2015, pieces: 168, minifigCount: 1, owned: false },
  { id: "75910-1", setNumber: "75910", name: "Porsche 918 Spyder", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2015, pieces: 151, minifigCount: 1, owned: false },
  { id: "75870-1", setNumber: "75870", name: "Chevrolet Corvette Z06", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2016, pieces: 173, minifigCount: 1, owned: false },
  { id: "75871-1", setNumber: "75871", name: "Ford Mustang GT", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2016, pieces: 185, minifigCount: 1, owned: false },
  { id: "75877-1", setNumber: "75877", name: "Mercedes-AMG GT3", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2017, pieces: 196, minifigCount: 1, owned: false },
  { id: "75878-1", setNumber: "75878", name: "Bugatti Chiron", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2017, pieces: 181, minifigCount: 1, owned: false },
  { id: "75881-1", setNumber: "75881", name: "2016 Ford GT & 1966 Ford GT40", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2017, pieces: 366, minifigCount: 2, owned: false },
  { id: "75884-1", setNumber: "75884", name: "1968 Ford Mustang Fastback", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2018, pieces: 183, minifigCount: 1, owned: false },
  { id: "75887-1", setNumber: "75887", name: "Porsche 919 Hybrid", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2018, pieces: 163, minifigCount: 1, owned: false },
  { id: "75890-1", setNumber: "75890", name: "Ferrari F40 Competizione", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2019, pieces: 198, minifigCount: 1, owned: false },
  { id: "75892-1", setNumber: "75892", name: "McLaren Senna", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2019, pieces: 219, minifigCount: 1, owned: false },
  { id: "75895-1", setNumber: "75895", name: "1974 Porsche 911 Turbo 3.0", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2019, pieces: 180, minifigCount: 1, owned: false },
  { id: "76895-1", setNumber: "76895", name: "Ferrari F8 Tributo", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2020, pieces: 275, minifigCount: 1, owned: false },
  { id: "76896-1", setNumber: "76896", name: "Nissan GT-R NISMO", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2020, pieces: 298, minifigCount: 1, owned: false },
  { id: "76897-1", setNumber: "76897", name: "1985 Audi Sport quattro S1", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2020, pieces: 250, minifigCount: 1, owned: false },
  { id: "76900-1", setNumber: "76900", name: "Koenigsegg Jesko", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2021, pieces: 280, minifigCount: 1, owned: false },
  { id: "76901-1", setNumber: "76901", name: "Toyota GR Supra", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2021, pieces: 299, minifigCount: 1, owned: false },
  { id: "76902-1", setNumber: "76902", name: "McLaren Elva", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2021, pieces: 263, minifigCount: 1, owned: false },
  { id: "76906-1", setNumber: "76906", name: "1970 Ferrari 512 M", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2022, pieces: 291, minifigCount: 1, owned: false },
  { id: "76907-1", setNumber: "76907", name: "Lotus Evija", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2022, pieces: 247, minifigCount: 1, owned: false },
  { id: "76908-1", setNumber: "76908", name: "Lamborghini Countach", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2022, pieces: 262, minifigCount: 1, owned: false },
  { id: "76914-1", setNumber: "76914", name: "Ferrari 812 Competizione", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2023, pieces: 261, minifigCount: 1, owned: false },
  { id: "76915-1", setNumber: "76915", name: "Pagani Utopia", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2023, pieces: 249, minifigCount: 1, owned: false },
  { id: "76916-1", setNumber: "76916", name: "Porsche 963", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2023, pieces: 280, minifigCount: 1, owned: false },
  { id: "76919-1", setNumber: "76919", name: "2023 McLaren Formula 1 Race Car", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2024, pieces: 245, minifigCount: 1, owned: false },
  { id: "76920-1", setNumber: "76920", name: "Ford Mustang Dark Horse Sports Car", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2024, pieces: 344, minifigCount: 1, owned: false },
  { id: "76921-1", setNumber: "76921", name: "Audi S1 e-tron quattro Race Car", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2024, pieces: 274, minifigCount: 1, owned: false },
  { id: "76923-1", setNumber: "76923", name: "Lamborghini Lambo V12 Vision GT", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2024, pieces: 230, minifigCount: 1, owned: false },
  { id: "77252-1", setNumber: "77252", name: "APXGP Team Race Car (F1 The Movie)", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2026, pieces: 268, minifigCount: 2, owned: false },
  { id: "77253-1", setNumber: "77253", name: "Bugatti Vision Gran Turismo", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2026, pieces: 284, minifigCount: 1, owned: false },
  { id: "77254-1", setNumber: "77254", name: "Ferrari SF90 XX Stradale", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2026, pieces: 334, minifigCount: 1, owned: false },
  { id: "77255-1", setNumber: "77255", name: "Lightning McQueen (Cars 20th Anniversary)", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2026, pieces: 270, minifigCount: 0, owned: false },
  { id: "77256-1", setNumber: "77256", name: "Time Machine from Back to the Future", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2026, pieces: 357, minifigCount: 2, owned: false },
  { id: "77257-1", setNumber: "77257", name: "McLaren W1", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2026, pieces: 282, minifigCount: 1, owned: false },
  { id: "77258-1", setNumber: "77258", name: "F1 ACADEMY LEGO Race Car", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2026, pieces: 201, minifigCount: 1, owned: false },
  { id: "77259-1", setNumber: "77259", name: "Audi Revolut F1 Team R26", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2026, pieces: 212, minifigCount: 1, owned: false },
  { id: "77260-1", setNumber: "77260", name: "Fast & Furious Toyota Supra MK4", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2026, pieces: 292, minifigCount: 1, owned: false },
  { id: "77261-1", setNumber: "77261", name: "Ferrari 499P", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2026, pieces: 310, minifigCount: 1, owned: false },
  { id: "77262-1", setNumber: "77262", name: "Ken Block's 1965 Ford Mustang Hoonicorn", brand: BRANDS.LEGO, theme: THEMES.SPEED_CHAMPIONS, subtheme: SUBTHEMES.GENERAL, year: 2026, pieces: 340, minifigCount: 1, owned: false },

  // --- LEGO IDEAS (Including 2026 Wave) ---
  { id: "21301-1", setNumber: "21301", name: "Birds", brand: BRANDS.LEGO, theme: THEMES.IDEAS, subtheme: SUBTHEMES.GENERAL, year: 2015, pieces: 580, minifigCount: 0, owned: false },
  { id: "21309-1", setNumber: "21309", name: "NASA Apollo Saturn V", brand: BRANDS.LEGO, theme: THEMES.IDEAS, subtheme: SUBTHEMES.GENERAL, year: 2017, pieces: 1969, minifigCount: 3, owned: false },
  { id: "21318-1", setNumber: "21318", name: "Tree House", brand: BRANDS.LEGO, theme: THEMES.IDEAS, subtheme: SUBTHEMES.GENERAL, year: 2019, pieces: 3036, minifigCount: 4, owned: false },
  { id: "21325-1", setNumber: "21325", name: "Medieval Blacksmith", brand: BRANDS.LEGO, theme: THEMES.IDEAS, subtheme: SUBTHEMES.GENERAL, year: 2021, pieces: 2164, minifigCount: 4, owned: false },
  { id: "21327-1", setNumber: "21327", name: "The Typewriter", brand: BRANDS.LEGO, theme: THEMES.IDEAS, subtheme: SUBTHEMES.GENERAL, year: 2021, pieces: 2079, minifigCount: 1, owned: false },
  { id: "21330-1", setNumber: "21330", name: "Home Alone", brand: BRANDS.LEGO, theme: THEMES.IDEAS, subtheme: SUBTHEMES.GENERAL, year: 2021, pieces: 3955, minifigCount: 5, owned: false },
  { id: "21334-1", setNumber: "21334", name: "Jazz Quartet", brand: BRANDS.LEGO, theme: THEMES.IDEAS, subtheme: SUBTHEMES.GENERAL, year: 2022, pieces: 1606, minifigCount: 4, owned: false },
  { id: "21341-1", setNumber: "21341", name: "Hocus Pocus: The Sanderson Sisters' Cottage", brand: BRANDS.LEGO, theme: THEMES.IDEAS, subtheme: SUBTHEMES.GENERAL, year: 2023, pieces: 2316, minifigCount: 6, owned: false },
  { id: "21350-1", setNumber: "21350", name: "Jaws", brand: BRANDS.LEGO, theme: THEMES.IDEAS, subtheme: SUBTHEMES.GENERAL, year: 2024, pieces: 1497, minifigCount: 3, owned: false },
  { id: "21365-1", setNumber: "21365", name: "Love Birds", brand: BRANDS.LEGO, theme: THEMES.IDEAS, subtheme: SUBTHEMES.GENERAL, year: 2026, pieces: 650, minifigCount: 0, owned: false },
  { id: "21366-1", setNumber: "21366", name: "Floating Sea Otters", brand: BRANDS.LEGO, theme: THEMES.IDEAS, subtheme: SUBTHEMES.GENERAL, year: 2026, pieces: 820, minifigCount: 0, owned: false },
  { id: "21367-1", setNumber: "21367", name: "Tintin Moon Rocket", brand: BRANDS.LEGO, theme: THEMES.IDEAS, subtheme: SUBTHEMES.GENERAL, year: 2026, pieces: 1283, minifigCount: 2, owned: false },
  { id: "21368-1", setNumber: "21368", name: "Peanuts: Snoopy's Doghouse", brand: BRANDS.LEGO, theme: THEMES.IDEAS, subtheme: SUBTHEMES.GENERAL, year: 2026, pieces: 950, minifigCount: 2, owned: false },
  { id: "21370-1", setNumber: "21370", name: "E.T. the Extra-Terrestrial", brand: BRANDS.LEGO, theme: THEMES.IDEAS, subtheme: SUBTHEMES.GENERAL, year: 2026, pieces: 1100, minifigCount: 2, owned: false },
  { id: "21372-1", setNumber: "21372", name: "La Catrina", brand: BRANDS.LEGO, theme: THEMES.IDEAS, subtheme: SUBTHEMES.GENERAL, year: 2026, pieces: 1450, minifigCount: 1, owned: false }
];