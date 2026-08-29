import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



export async function openDB() {
  return open({
    filename: path.join(__dirname, 'brick_collection.db'),
    driver: sqlite3.Database
  });
}

export async function setupDatabase() {
  const db = await openDB();
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS themes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE
    );

    CREATE TABLE IF NOT EXISTS sets (
      id TEXT PRIMARY KEY,
      set_number TEXT,
      name TEXT,
      theme TEXT,
      subtheme TEXT,
      year INTEGER,
      pieces INTEGER,
      minifig_count INTEGER,
      owned BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS minifigures (
      id TEXT PRIMARY KEY,
      name TEXT,
      set_id TEXT,
      theme TEXT,
      owned BOOLEAN DEFAULT 0,
      FOREIGN KEY(set_id) REFERENCES sets(id)
    );
  `);
  
  console.log("Database tables initialized successfully!");
}