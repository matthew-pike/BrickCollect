import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import fs from 'fs'

async function exportFullCatalog() {
  const dbPath = path.resolve(process.cwd(), 'src/database/brick_collection.db')
  const db = await open({ filename: dbPath, driver: sqlite3.Database })

  // Ensure view exists
  await db.exec(`
    CREATE VIEW IF NOT EXISTS v_minifig_mapping AS
    SELECT 
        m.name AS Minifig_Name,
        m.fig_num AS Rebrickable_ID,
        s.name AS Set_Attached_Name,
        s.set_num AS Set_Number,
        m.minifigure_code AS Minifigure_Code
    FROM minifigs m
    JOIN inventory_minifigs im ON m.fig_num = im.fig_num
    JOIN inventories inv ON im.inventory_id = inv.id
    JOIN sets s ON inv.set_num = s.set_num;
  `);

  const rows = await db.all("SELECT DISTINCT Minifig_Name, Rebrickable_ID, Set_Attached_Name, Set_Number, Minifigure_Code FROM v_minifig_mapping ORDER BY Set_Number DESC");
  
  let csv = "Minifig_Name,Rebrickable_ID,Set_Attached_Name,Set_Number,Minifigure_Code\n";
  for (const r of rows) {
    const name = `"${(r.Minifig_Name || '').replace(/"/g, '""')}"`;
    const id = `"${r.Rebrickable_ID}"`;
    const setName = `"${(r.Set_Attached_Name || '').replace(/"/g, '""')}"`;
    const setNum = `"${r.Set_Number}"`;
    const code = `"${r.Minifigure_Code || ''}"`;
    csv += `${name},${id},${setName},${setNum},${code}\n`;
  }

  const outputPath = path.resolve(process.cwd(), 'minifig_mapping_master.csv');
  fs.writeFileSync(outputPath, csv, 'utf8');
  console.log(`✅ Exported ${rows.length} records to minifig_mapping_master.csv`);
}

exportFullCatalog().catch(console.error);