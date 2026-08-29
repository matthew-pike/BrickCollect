import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import fs from 'fs'

async function importMapping() {
  const csvPath = path.resolve(process.cwd(), 'minifig_mapping_master.csv');
  if (!fs.existsSync(csvPath)) {
    console.error("❌ minifig_mapping_master.csv not found!");
    return;
  }

  const dbPath = path.resolve(process.cwd(), 'src/database/brick_collection.db')
  const db = await open({ filename: dbPath, driver: sqlite3.Database })

  const fileContent = fs.readFileSync(csvPath, 'utf8');
  const lines = fileContent.split('\n').filter(l => l.trim().length > 0);
  
  // Skip header row
  const rows = lines.slice(1);
  let updatedCount = 0;

  for (const line of rows) {
    // Basic CSV row parser handling quoted strings
    const match = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (!match || match.length < 5) continue;

    const figNum = match[1].replace(/"/g, '').trim();
    const minifigCode = match[4].replace(/"/g, '').trim();

    if (minifigCode && minifigCode !== '') {
      await db.run(
        "UPDATE minifigs SET minifigure_code = ? WHERE fig_num = ?",
        [minifigCode, figNum]
      );
      updatedCount++;
    }
  }

  console.log(`🎉 Successfully updated ${updatedCount} minifigures in SQLite from your spreadsheet!`);
}

importMapping().catch(console.error);