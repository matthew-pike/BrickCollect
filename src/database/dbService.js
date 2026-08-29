import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Open connection to brick_collection.db
export async function openDB() {
  return open({
    filename: path.join(__dirname, 'brick_collection.db'),
    driver: sqlite3.Database
  });
}

// 1. Fetch all themes
export async function getThemes() {
  const db = await openDB();
  const themes = await db.all(`SELECT DISTINCT name FROM themes WHERE name IS NOT NULL ORDER BY name ASC`);
  return themes.map(t => t.name);
}

// 2. Exported alias to match App.jsx import requirements
export async function getAllSetsWithThemes(themeFilter) {
  return getSets(themeFilter);
}

// 3. Fetch all sets with themes and subthemes
export async function getSets(themeFilter) {
  const db = await openDB();
  let query = `
    SELECT 
      s.set_num AS setNumber,
      s.name,
      s.year,
      s.num_parts AS pieces,
      COALESCE(t.name, 'General') AS themeName,
      COALESCE(st.sub_theme_name, 'General') AS subthemeName
    FROM sets s
    LEFT JOIN themes t ON s.theme_id = t.id
    LEFT JOIN sub_theme st ON s.set_num = st.set_id
  `;

  let params = [];
  if (themeFilter && themeFilter !== 'All' && themeFilter !== 'Please select a theme') {
    query += ` WHERE t.name = ?`;
    params.push(themeFilter);
  }
  query += ` ORDER BY s.year DESC`;

  return db.all(query, params);
}

// 4. Search sets by name or set number
export async function searchSets(queryText) {
  const db = await openDB();
  const query = `
    SELECT 
      s.set_num AS setNumber,
      s.name,
      s.year,
      s.num_parts AS pieces,
      COALESCE(t.name, 'General') AS themeName,
      COALESCE(st.sub_theme_name, 'General') AS subthemeName
    FROM sets s
    LEFT JOIN themes t ON s.theme_id = t.id
    LEFT JOIN sub_theme st ON s.set_num = st.set_id
    WHERE s.name LIKE ? OR s.set_num LIKE ?
    ORDER BY s.year DESC
  `;
  const searchTerm = `%${queryText}%`;
  return db.all(query, [searchTerm, searchTerm]);
}

// 5. Fetch all minifigures
export async function getMinifigs(themeFilter) {
  const db = await openDB();
  let query = `
    SELECT DISTINCT
      m.fig_num AS id,
      m.name,
      s.set_num AS setNumber,
      s.name AS setName,
      COALESCE(t.name, 'General') AS themeName,
      COALESCE(st.sub_theme_name, 'General') AS subthemeName
    FROM sets s
    JOIN inventories i ON s.set_num = i.set_num
    JOIN inventory_minifigs im ON im.inventory_id = i.id
    JOIN minifigs m ON m.fig_num = im.fig_num
    LEFT JOIN themes t ON s.theme_id = t.id
    LEFT JOIN sub_theme st ON s.set_num = st.set_id
  `;

  let params = [];
  if (themeFilter && themeFilter !== 'All' && themeFilter !== 'Please select a theme') {
    query += ` WHERE t.name = ?`;
    params.push(themeFilter);
  }
  query += ` LIMIT 1500`;

  return db.all(query, params);
}

// 6. Fetch minifigures specific to a given set number
export async function getMinifigsForSet(setNum) {
  const db = await openDB();
  return db.all(`
    SELECT 
      m.fig_num AS id, 
      m.name, 
      im.quantity
    FROM inventory_minifigs im
    JOIN inventories i ON im.inventory_id = i.id
    JOIN minifigs m ON im.fig_num = m.fig_num
    WHERE i.set_num = ?
  `, [setNum]);
}