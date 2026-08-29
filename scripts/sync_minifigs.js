/* ==========================================================================
   FILE: sync_minifigs.js
   VERSION: 2.3
   BLOCK HEADER: STAR WARS SYNC - CORRECTED THEME ID (158)
   ========================================================================== */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

const REBRICKABLE_API_KEY = '02d5a43bd7df650ef2793bf7e181e184';

function logMessage(message, isError = false) {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] ${message}`;
  if (isError) {
    console.error(formatted);
  } else {
    console.log(formatted);
  }
  
  try {
    fs.appendFileSync('sync.log', formatted + '\n');
  } catch (err) {
    console.error("Failed to write to sync.log:", err.message);
  }
}

async function openDB() {
  return open({
    filename: path.resolve('src/database/brick_collection.db'),
    driver: sqlite3.Database
  });
}

async function syncByStarWarsSets() {
  const db = await openDB();

  // Theme ID 158 is Star Wars on Rebrickable
  logMessage("Fetching Star Wars sets directly from Rebrickable API (Theme ID: 158)...");
  let swSets = [];
  
  try {
    const response = await fetch('https://rebrickable.com/api/v3/lego/sets/?theme_id=158&page_size=500', {
      headers: { 'Authorization': `key ${REBRICKABLE_API_KEY}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      swSets = data.results.map(s => ({ set_num: s.set_num }));
    } else {
      logMessage(`Failed to fetch sets from Rebrickable API. Status: ${response.status}`, true);
    }
  } catch (err) {
    logMessage(`Network error fetching sets: ${err.message}`, true);
    await db.close();
    return;
  }

  logMessage(`Found ${swSets.length} Star Wars sets to check for minifigures.`);
  let updatedCount = 0;
  let currentIndex = 0;

  for (const set of swSets) {
    currentIndex++;
    const setNum = set.set_num;
    logMessage(`[Progress ${currentIndex}/${swSets.length}] Checking set ${setNum}...`);

    try {
      const url = `https://rebrickable.com/api/v3/lego/sets/${setNum}/minifigs/`;
      const res = await fetch(url, {
        headers: { 'Authorization': `key ${REBRICKABLE_API_KEY}` }
      });

      if (res.ok) {
        const data = await res.json();
        
        for (const item of data.results) {
          const figNum = item.set_num; 
          const figName = item.set_name || 'Unknown Minifig';
          
          // Extract the proper 'sw' code from name or identifier
          const swMatch = figName.match(/sw\d+/i) || figNum.match(/sw\d+/i);
          const swCode = swMatch ? swMatch[0].toLowerCase() : null;

          if (swCode) {
            const result = await db.run(
              `UPDATE minifigs SET minifigure_code = ? WHERE fig_num = ? AND (minifigure_code NOT LIKE 'sw%' OR minifigure_code IS NULL)`,
              [swCode, figNum]
            );
            if (result.changes > 0) {
              updatedCount++;
              logMessage(`  -> [Synced] ${figName} (${figNum}) -> Code: ${swCode}`);
            }
          }
        }
      } else {
        logMessage(`  -> [Warning] Skipped set ${setNum} (API Status: ${res.status})`, true);
      }

      // Rate limit throttle (~1 request per second)
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      logMessage(`  -> [Error] Failed processing set ${setNum}: ${err.message}`, true);
    }
  }

  logMessage(`Sync complete! Successfully updated ${updatedCount} Star Wars minifigures.`);
  await db.close();
}

syncByStarWarsSets();