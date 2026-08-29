import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import https from 'https'

const BL_CREDENTIALS = {
  consumerKey: "7AA9CF4CCBCC4B9FB2A3B7F31A64BF6C",
  consumerSecret: "6788167DF1114B96AA57107304BC682E",
  tokenValue: "C7638C9C7DAE44AD89D02CB96BDB5C88",
  tokenSecret: "6E0DBE7AF7A4468381C6AAD472B97090"
};

function percentEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function generateOAuthHeader(method, url) {
  const urlObj = new URL(url, 'https://api.bricklink.com');
  const queryParams = {};
  for (const [key, value] of urlObj.searchParams.entries()) {
    queryParams[key] = value;
  }

  const oauthParams = {
    oauth_consumer_key: BL_CREDENTIALS.consumerKey,
    oauth_token: BL_CREDENTIALS.tokenValue,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_version: "1.0"
  };

  const allParams = { ...oauthParams, ...queryParams };
  const sortedKeys = Object.keys(allParams).sort();
  const parameterString = sortedKeys
    .map(key => `${percentEncode(key)}=${percentEncode(allParams[key])}`)
    .join('&');

  const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  const signatureBaseString = `${method.toUpperCase()}&${percentEncode(baseUrl)}&${percentEncode(parameterString)}`;
  const signingKey = `${percentEncode(BL_CREDENTIALS.consumerSecret)}&${percentEncode(BL_CREDENTIALS.tokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64');
  
  oauthParams.oauth_signature = signature;

  const authHeaderKeys = Object.keys(oauthParams).sort();
  return "OAuth " + authHeaderKeys
    .map(key => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');
}

function fetchBrickLinkAPI(url) {
  return new Promise((resolve) => {
    const authHeader = generateOAuthHeader('GET', url);
    const options = {
      headers: {
        'Authorization': authHeader,
        'User-Agent': 'BrickCollect/1.0'
      },
      timeout: 5000
    };

    const req = https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ statusCode: 500, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ statusCode: 408, error: 'Request timeout' });
    });
  });
}

async function syncMinifigCodes() {
  const dbPath = path.resolve(process.cwd(), 'src/database/brick_collection.db')
  if (!fs.existsSync(dbPath)) {
    console.error("❌ Database not found at:", dbPath)
    return
  }

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  })

  // Ensure column exists
  await db.exec(`ALTER TABLE minifigs ADD COLUMN minifigure_code TEXT;`).catch(() => {});

  // Get all unique sets present in your inventory tables
  const sets = await db.all(`
    SELECT DISTINCT s.set_num 
    FROM sets s
    JOIN inventories inv ON s.set_num = inv.set_num
    JOIN inventory_minifigs im ON inv.id = im.inventory_id
    WHERE s.set_num LIKE '%-%'
  `);

  console.log(`📦 Found ${sets.length} sets with minifig inventories to process...`);

  for (const s of sets) {
    const setNum = s.set_num;
    console.log(`🔍 Fetching inventory for set: ${setNum}...`);

    const apiUrl = `https://api.bricklink.com/api/store/v1/items/set/${setNum}/inventory`;
    const result = await fetchBrickLinkAPI(apiUrl);

    if (result.statusCode === 200 && result.data && result.data.meta && result.data.meta.code === 200) {
      const items = result.data.data;
      const minifigsInSet = items.filter(i => i.item && i.item.type === 'MINIFIG');

      for (const mf of minifigsInSet) {
        const swCode = mf.item.no; // e.g., sw1250
        const blName = mf.item.name;

        console.log(`   ✨ Found Minifig: ${blName} -> Code: ${swCode}`);

        // Update matching minifigs in the database for this set
        await db.run(`
          UPDATE minifigs 
          SET minifigure_code = ? 
          WHERE fig_num IN (
            SELECT im.fig_num 
            FROM inventory_minifigs im
            JOIN inventories inv ON im.inventory_id = inv.id
            WHERE inv.set_num = ?
          ) AND (LOWER(name) = LOWER(?) OR minifigure_code IS NULL)
        `, [swCode, setNum, blName]);
      }
    } else {
      console.log(`   ⚠️ Could not fetch inventory for ${setNum} (Status: ${result.statusCode})`);
    }

    // Brief delay to respect rate limits
    await new Promise(r => setTimeout(r, 200));
  }

  console.log("🎉 Minifigure SW code syncing complete!");
}

syncMinifigCodes().catch(err => console.error("Sync Error:", err));