export const BRANDS = {
  LEGO: "LEGO",
  LUMIBRICKS: "LumiBricks"
};

export const THEMES = {
  STAR_WARS: "Star Wars",
  ARCHITECTURE: "Architecture",
  CYBERPUNK: "Cyberpunk"
};

export const SUBTHEMES = {
  BAD_BATCH: "The Bad Batch",
  SOLO: "Solo: A Star Wars Story",
  AHSOKA: "Star Wars: Ahsoka",
  SKELETON_CREW: "Star Wars: Skeleton Crew",
  REBUILD_GALAXY: "LEGO Star Wars: Rebuild the Galaxy",
  MODULAR: "Modular & Lighting",
  CYBER_CITY: "Cyberpunk City"
};

export const STAR_WARS_TIMELINE = {
  "The Bad Batch": {
    era: "Reign of the Empire",
    year: "19 BBY – 17 BBY",
    status: "Canon",
    summary: "Begins with Order 66 following Clone Force 99 as the Galactic Republic collapses and the stormtrooper program replaces the clones."
  },
  "Solo: A Star Wars Story": {
    era: "Reign of the Empire",
    year: "13 BBY – 10 BBY",
    status: "Canon",
    summary: "Set a decade before A New Hope, exploring the galactic criminal underworld, syndicates, and the legendary Kessel Run."
  },
  "Star Wars: Ahsoka": {
    era: "The New Republic",
    year: "9 ABY – 10 ABY",
    status: "Canon",
    summary: "Set 5 years after Return of the Jedi, following Ahsoka Tano and Sabine Wren tracking Grand Admiral Thrawn across hyperspace to Peridea."
  },
  "Star Wars: Skeleton Crew": {
    era: "The New Republic",
    year: "~9 ABY",
    status: "Canon",
    summary: "During the New Republic peace, four kids from At Attin become lost in wild space and navigate home aboard The Onyx Cinder."
  },
  "LEGO Star Wars: Rebuild the Galaxy": {
    era: "Alternate Reality Remix",
    year: "Non-Canon / What If?",
    status: "Legends / Remix",
    summary: "Sig Greebling activates the Jedi Cornerstone, scrambling the galaxy into an alternate timeline of Sith Jar Jar and Jedi Vader."
  }
};

export const MINIFIG_DATABASE = [
  // THE BAD BATCH
  { id: "sw1148", name: "Hunter (Clone Commando)", set: "The Bad Batch Attack Shuttle (75314)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, owned: false },
  { id: "sw1149", name: "Wrecker (Clone Commando)", set: "The Bad Batch Attack Shuttle (75314)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, owned: false },
  { id: "sw1150", name: "Tech (Clone Commando)", set: "The Bad Batch Attack Shuttle (75314)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, owned: false },
  { id: "sw1151", name: "Echo (ARC Trooper Corporal)", set: "The Bad Batch Attack Shuttle (75314)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, owned: false },
  { id: "sw1152", name: "Crosshair (Imperial Elite Squad)", set: "The Bad Batch Attack Shuttle (75314)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, owned: false },
  { id: "sw1153", name: "Gonky (GNK Power Droid)", set: "The Bad Batch Attack Shuttle (75314)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, owned: false },
  { id: "sw1214", name: "Omega", set: "The Justifier (75323)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, owned: false },
  { id: "sw1215", name: "Todo 360", set: "The Justifier (75323)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, owned: false },
  { id: "sw1219", name: "Cad Bane (Pearl Dark Gray Head)", set: "The Justifier (75323)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, owned: false },

  // SOLO: A STAR WARS STORY
  { id: "sw0915", name: "Han Solo (White Jacket, Corellia)", set: "Han Solo's Landspeeder (75209)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: true },
  { id: "sw0916", name: "Qi'ra (Jacket with Collar)", set: "Han Solo's Landspeeder (75209)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: true },
  { id: "37286pb01", name: "Corellian Hound", set: "Han Solo's Landspeeder (75209)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: true },
  { id: "sw0917", name: "Moloch", set: "Moloch's Landspeeder (75210)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0918", name: "Rebolt", set: "Moloch's Landspeeder (75210)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0914", name: "Imperial Patrol Trooper", set: "Imperial Patrol Battle Pack (75207)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0912", name: "Imperial Emigration Officer", set: "Imperial Patrol Battle Pack (75207)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0913", name: "Imperial Recruitment Officer", set: "Imperial Patrol Battle Pack (75207)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0921", name: "Han Solo (Brown Jacket / Vandor)", set: "Kessel Run Millennium Falcon (75212)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0920", name: "Qi'ra (Tan Jacket / Kessel)", set: "Kessel Run Millennium Falcon (75212)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0922", name: "Chewbacca (Crossed Bandoliers)", set: "Kessel Run Millennium Falcon (75212)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0923", name: "Lando Calrissian, Young (Short Cape)", set: "Kessel Run Millennium Falcon (75212)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0924", name: "Quay Tolsite", set: "Kessel Run Millennium Falcon (75212)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0928", name: "DD-BD", set: "Kessel Run Millennium Falcon (75212)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0929", name: "Kessel Operations Droid (S1D6-SA-5)", set: "Kessel Run Millennium Falcon (75212)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0925", name: "Han Solo (Imperial Mudtrooper)", set: "Imperial TIE Fighter (75211)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0919", name: "Tobias Beckett (Mudtrooper Disguise)", set: "Imperial TIE Fighter (75211)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0927", name: "Mimban Stormtrooper", set: "Imperial TIE Fighter (75211)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0603", name: "Imperial TIE Fighter Pilot", set: "Imperial TIE Fighter (75211)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0940", name: "Enfys Nest", set: "Cloud-Rider Swoop Bikes (75215)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: true },
  { id: "sw0941", name: "Tobias Beckett (Dark Tan Coat)", set: "Cloud-Rider Swoop Bikes (75215)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: true },
  { id: "sw0942", name: "Weazel", set: "Cloud-Rider Swoop Bikes (75215)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: true },
  { id: "sw0949", name: "Han Solo (Fur Coat & Goggles)", set: "Imperial Conveyex Transport (75217)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0946", name: "Qi'ra (Fur Coat / Vandor)", set: "Imperial Conveyex Transport (75217)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0948", name: "Chewbacca (Bandoliers & Goggles)", set: "Imperial Conveyex Transport (75217)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0950", name: "Range Trooper", set: "Imperial Conveyex Transport (75217)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0951", name: "Imperial Conveyex Gunner", set: "Imperial Conveyex Transport (75217)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0953", name: "Val", set: "Imperial AT-Hauler (75219)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0955", name: "Rio Durant", set: "Imperial AT-Hauler (75219)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0945", name: "Dryden's Guard (Hylobon - Open Mouth)", set: "Imperial AT-Hauler (75219)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0954", name: "Dryden's Guard (Hylobon - Closed Mouth)", set: "Imperial AT-Hauler (75219)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0934", name: "Han Solo (Mudtrooper Polybag)", set: "Han Solo Mudtrooper Polybag (40300)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw0935", name: "Kessel Mine Worker", set: "Kessel Mine Worker Polybag (40299)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },
  { id: "sw1091", name: "Darth Maul (Crimson Dawn)", set: "DK Character Encyclopedia (2020)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, owned: false },

  // AHSOKA
  { id: "sw1289", name: "Captain Porter", set: "New Republic E-Wing vs. Shin Hati's Starfighter (75364)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1290", name: "Morgan Elsbeth (Black Skirt)", set: "New Republic E-Wing vs. Shin Hati's Starfighter (75364)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1291", name: "Astromech Droid, New Republic", set: "New Republic E-Wing vs. Shin Hati's Starfighter (75364)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1292", name: "Shin Hati", set: "New Republic E-Wing vs. Shin Hati's Starfighter (75364)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1293", name: "Baylan Skoll", set: "New Republic E-Wing vs. Shin Hati's Starfighter (75364)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1299", name: "Professor Huyang", set: "Ahsoka Tano's T-6 Jedi Shuttle (75362)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1300", name: "Ahsoka Tano (Pearl Dark Gray Robe)", set: "Ahsoka Tano's T-6 Jedi Shuttle (75362)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1301", name: "Marrok, Inquisitor", set: "Ahsoka Tano's T-6 Jedi Shuttle (75362)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1302", name: "Sabine Wren (Dark Brown Armor, Helmet)", set: "Ahsoka Tano's T-6 Jedi Shuttle (75362)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1395", name: "Sabine Wren (Dark Purple Hair)", set: "Ahsoka Tano's T-6 Jedi Shuttle (75362)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1307", name: "Lt. Beyta (Lieutenant)", set: "Ghost & Phantom II (75357)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1308", name: "Chopper (C1-10P) - White Body", set: "Ghost & Phantom II (75357)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1309", name: "Jacen Syndulla", set: "Ghost & Phantom II (75357)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1310", name: "First Officer Hawkins", set: "Ghost & Phantom II (75357)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1311", name: "Hera Syndulla (Dark Brown Arms)", set: "Ghost & Phantom II (75357)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1354", name: "Ahsoka Tano (Dark Bluish Gray Vest)", set: "Ahsoka Tano's Duel on Peridea (75385)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1355", name: "Ezra Bridger (Dark Red Robe)", set: "Ahsoka Tano's Duel on Peridea (75385)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1356", name: "Grand Admiral Thrawn (Medium Blue Skin)", set: "Ahsoka Tano's Duel on Peridea (75385)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1357", name: "Morgan Elsbeth (Black Legs)", set: "Ahsoka Tano's Duel on Peridea (75385)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1358", name: "Night Trooper (White Helmet)", set: "Ahsoka Tano's Duel on Peridea (75385)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1416", name: "Imperial Death Trooper (Gold Cracks)", set: "Ahsoka Tano's Duel on Peridea (75385)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },
  { id: "sw1417", name: "Night Trooper (Dark Bluish Gray Helmet)", set: "Ahsoka Tano's Duel on Peridea (75385)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, owned: false },

  // SKELETON CREW
  { id: "sw1370", name: "Jod Na Nawood", set: "The Onyx Cinder (75374)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SKELETON_CREW, owned: false },
  { id: "sw1371", name: "Wim", set: "The Onyx Cinder (75374)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SKELETON_CREW, owned: false },
  { id: "sw1372", name: "Fern", set: "The Onyx Cinder (75374)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SKELETON_CREW, owned: false },
  { id: "sw1373", name: "KB", set: "The Onyx Cinder (75374)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SKELETON_CREW, owned: false },
  { id: "sw1374", name: "Neel", set: "The Onyx Cinder (75374)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SKELETON_CREW, owned: false },

  // REBUILD THE GALAXY
  { id: "sw1359", name: "Rebel Pilot (Mash-up Helmet)", set: "TIE Fighter & X-Wing Mash-up (75393)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, owned: false },
  { id: "sw1360", name: "Yesi Scala", set: "TIE Fighter & X-Wing Mash-up (75393)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, owned: false },
  { id: "sw1361", name: "Sig Greebling (Dark Tan Jacket)", set: "TIE Fighter & X-Wing Mash-up (75393)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, owned: false },
  { id: "sw1362", name: "L3-GO Astromech Droid", set: "TIE Fighter & X-Wing Mash-up (75393)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, owned: false },
  { id: "sw1363", name: "Jedi Vader (White Armor)", set: "The Dark Falcon (75389)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, owned: false },
  { id: "sw1364", name: "Darth Rey", set: "The Dark Falcon (75389)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, owned: false },
  { id: "sw1365", name: "Beach Luke Skywalker", set: "The Dark Falcon (75389)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, owned: false },
  { id: "sw1366", name: "Darth Dev (Darth Devastator)", set: "The Dark Falcon (75389)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, owned: false },
  { id: "sw1367", name: "Darth Jar Jar", set: "The Dark Falcon (75389)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, owned: false },
  { id: "sw1368", name: "Bounty Hunter C-3PO", set: "The Dark Falcon (75389)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, owned: false },
  { id: "sw1378", name: "Ackbar Trooper", set: "Star Wars Advent Calendar 2024 (75395)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, owned: false },
  { id: "sw1379", name: "Jedi Bob (Bobarian Afol)", set: "Jedi Bob's Starfighter (75388)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, owned: false },
  { id: "sw1380", name: "Servo (SR-V0) Gonk Droid", set: "Jedi Bob's Starfighter (75388)", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, owned: false }
];

export const SETS_DATABASE = [
  // THE BAD BATCH
  { id: "75314-1", setNumber: "75314", name: "The Bad Batch Attack Shuttle", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, year: 2021, pieces: 969, minifigCount: 5, owned: false },
  { id: "75323-1", setNumber: "75323", name: "The Justifier", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.BAD_BATCH, year: 2022, pieces: 1022, minifigCount: 4, owned: false },

  // SOLO: A STAR WARS STORY
  { id: "75209-1", setNumber: "75209", name: "Han Solo's Landspeeder", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, year: 2018, pieces: 345, minifigCount: 2, owned: true },
  { id: "75210-1", setNumber: "75210", name: "Moloch's Landspeeder", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, year: 2018, pieces: 464, minifigCount: 2, owned: false },
  { id: "75207-1", setNumber: "75207", name: "Imperial Patrol Battle Pack", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, year: 2018, pieces: 99, minifigCount: 4, owned: false },
  { id: "75211-1", setNumber: "75211", name: "Imperial TIE Fighter", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, year: 2018, pieces: 519, minifigCount: 4, owned: false },
  { id: "75212-1", setNumber: "75212", name: "Kessel Run Millennium Falcon", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, year: 2018, pieces: 1414, minifigCount: 6, owned: false },
  { id: "75215-1", setNumber: "75215", name: "Cloud-Rider Swoop Bikes", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, year: 2018, pieces: 355, minifigCount: 3, owned: true },
  { id: "75217-1", setNumber: "75217", name: "Imperial Conveyex Transport", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, year: 2018, pieces: 622, minifigCount: 5, owned: false },
  { id: "75219-1", setNumber: "75219", name: "Imperial AT-Hauler", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, year: 2018, pieces: 829, minifigCount: 5, owned: false },
  { id: "40300-1", setNumber: "40300", name: "Han Solo Mudtrooper Polybag", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, year: 2018, pieces: 22, minifigCount: 1, owned: false },
  { id: "40299-1", setNumber: "40299", name: "Kessel Mine Worker Polybag", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SOLO, year: 2018, pieces: 22, minifigCount: 1, owned: false },

  // AHSOKA
  { id: "75357-1", setNumber: "75357", name: "Ghost & Phantom II", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, year: 2023, pieces: 1394, minifigCount: 5, owned: false },
  { id: "75362-1", setNumber: "75362", name: "Ahsoka Tano's T-6 Jedi Shuttle", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, year: 2023, pieces: 601, minifigCount: 4, owned: false },
  { id: "75364-1", setNumber: "75364", name: "New Republic E-Wing vs. Shin Hati's Starfighter", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, year: 2023, pieces: 1056, minifigCount: 5, owned: false },
  { id: "75385-1", setNumber: "75385", name: "Ahsoka Tano's Duel on Peridea", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.AHSOKA, year: 2024, pieces: 382, minifigCount: 5, owned: false },

  // SKELETON CREW
  { id: "75374-1", setNumber: "75374", name: "The Onyx Cinder", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.SKELETON_CREW, year: 2024, pieces: 1325, minifigCount: 5, owned: false },

  // REBUILD THE GALAXY
  { id: "75388-1", setNumber: "75388", name: "Jedi Bob's Starfighter", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, year: 2024, pieces: 305, minifigCount: 2, owned: false },
  { id: "75389-1", setNumber: "75389", name: "The Dark Falcon", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, year: 2024, pieces: 1579, minifigCount: 6, owned: false },
  { id: "75393-1", setNumber: "75393", name: "TIE Fighter & X-Wing Mash-up", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, year: 2024, pieces: 1063, minifigCount: 4, owned: false },
  { id: "75395-1", setNumber: "75395", name: "Star Wars Advent Calendar 2024", brand: BRANDS.LEGO, theme: THEMES.STAR_WARS, subtheme: SUBTHEMES.REBUILD_GALAXY, year: 2024, pieces: 368, minifigCount: 6, owned: false },

  // SAMPLE LUMIBRICKS
  { id: "LB-8801", setNumber: "LB-8801", name: "Cyberpunk Ramen Bar (LED Integrated)", brand: BRANDS.LUMIBRICKS, theme: THEMES.CYBERPUNK, subtheme: SUBTHEMES.CYBER_CITY, year: 2024, pieces: 1250, minifigCount: 3, owned: false }
];