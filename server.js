import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Locate database file across common possible folders
const possiblePaths = [
  path.join(__dirname, 'src', 'database', 'brick_collection.db'),
  path.join(__dirname, 'database', 'brick_collection.db'),
  path.join(__dirname, 'brick_collection.db')
];

let dbPath = possiblePaths.find(p => fs.existsSync(p));

if (!dbPath) {
  console.error("❌ CRITICAL ERROR: Could not find 'brick_collection.db' in any standard directory!");
  console.error("Searched paths:", possiblePaths);
  dbPath = possiblePaths[0]; // Fallback
} else {
  console.log(`📂 Found SQLite Database at: ${dbPath}`);
}

async function getDb() {
  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

// 1. Themes API with error protection
app.get('/api/themes', async (req, res) => {
  try {
    const db = await getDb();
    const themes = await db.all("SELECT DISTINCT name FROM themes WHERE name IS NOT NULL ORDER BY name ASC");
    res.json(themes.map(t => t.name));
  } catch (err) {
    console.error("Themes API Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 2. Sets API with parent/subtheme and direct matching
app.get('/api/sets', async (req, res) => {
  try {
    const { theme } = req.query;
    const db = await getDb();
    
    let query = `
      SELECT DISTINCT 
        s.set_num AS setNumber, 
        s.name, 
        s.year, 
        s.num_parts AS pieces, 
        COALESCE(parent_t.name, t.name, 'General') AS themeName,
        t.name AS subthemeName
      FROM sets s
      LEFT JOIN themes t ON s.theme_id = t.id
      LEFT JOIN themes parent_t ON t.parent_id = parent_t.id
    `;
    let params = [];

    if (theme && theme !== 'All' && theme !== 'Please select a theme') {
      query += ` WHERE LOWER(t.name) = LOWER(?) OR LOWER(parent_t.name) = LOWER(?) OR LOWER(t.name) LIKE LOWER(?)`;
      params.push(theme, theme, `%${theme}%`);
    }
    query += ` ORDER BY s.year DESC LIMIT 500`;

    const sets = await db.all(query, params);
    console.log(`📦 Served ${sets.length} sets for theme: "${theme}"`);
    res.json(sets);
  } catch (err) {
    console.error("Sets API Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/minifigs', (req, res) => res.json([]));
app.get('/api/bricklink-price', (req, res) => res.json({ used: { avg: 15, stock: 2 }, new: { avg: 30, stock: 1 } }));

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running stable on http://0.0.0.0:${PORT}`);
});