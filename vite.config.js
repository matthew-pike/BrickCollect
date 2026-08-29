/* ==========================================================================
   FILE: vite.config.js
   VERSION: 2.38
   BLOCK HEADER: THEME-GATED SQLITE API MIDDLEWARES
   ========================================================================== */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import crypto from 'crypto';

const BL_CREDENTIALS = {
  consumerKey: '7AA9CF4CCBCC4B9FB2A3B7F31A64BF6C',
  consumerSecret: '6788167DF1114B96AA57107304BC682E',
  tokenValue: 'C7638C9C7DAE44AD89D02CB96BDB5C88',
  tokenSecret: '6E0DBE7AF7A4468381C6AAD472B97090'
};

function generateOAuthHeader(method, url, params = {}, credentials) {
  const oauthParams = {
    oauth_consumer_key: credentials.consumerKey,
    oauth_token: credentials.tokenValue,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_version: '1.0',
    ...params
  };

  const sortedKeys = Object.keys(oauthParams).sort();
  const parameterString = sortedKeys
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key])}`)
    .join('&');

  const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(parameterString)}`;
  const signingKey = `${encodeURIComponent(credentials.consumerSecret)}&${encodeURIComponent(credentials.tokenSecret)}`;
  
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
  oauthParams.oauth_signature = signature;

  return 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');
}

async function openDB() {
  return open({
    filename: path.resolve(import.meta.dirname, 'src/database/brick_collection.db'),
    driver: sqlite3.Database
  });
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'brick-collect-api',
      configureServer(server) {
        
        /* ==================================================================
           API BLOCK: /api/themes (Dynamic Database Themes per Brand)
           ================================================================== */
        server.middlewares.use('/api/themes', async (req, res) => {
          try {
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            const brand = urlObj.searchParams.get('brand');
            const db = await openDB();

            let query = `
              SELECT DISTINCT COALESCE(parent_t.name, t.name, 'General') AS themeName
              FROM sets s
              LEFT JOIN themes t ON s.theme_id = t.id
              LEFT JOIN themes parent_t ON t.parent_id = parent_t.id
              LEFT JOIN brands b ON s.brand_id = b.id
              WHERE t.name IS NOT NULL
            `;
            const params = [];
            if (brand && brand !== 'All') {
              query += ` AND COALESCE(b.name, s.brand, 'LEGO') = ?`;
              params.push(brand);
            }
            query += ` ORDER BY themeName ASC`;

            const rows = await db.all(query, params);
            const themes = rows.map(r => r.themeName).filter(Boolean);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(themes));
          } catch (err) {
            console.error("Themes API Error:", err);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([]));
          }
        });

        /* ==================================================================
           API BLOCK: /api/brands (Database-Driven Brands List)
           ================================================================== */
        server.middlewares.use('/api/brands', async (req, res) => {
          try {
            const db = await openDB();
            const brandRows = await db.all(`
              SELECT DISTINCT COALESCE(b.name, s.brand, 'LEGO') AS brandName 
              FROM sets s 
              LEFT JOIN brands b ON s.brand_id = b.id
              UNION
              SELECT DISTINCT COALESCE(b2.name, m.brand, 'LEGO') AS brandName 
              FROM minifigs m
              LEFT JOIN inventory_minifigs im ON m.fig_num = im.fig_num
              LEFT JOIN inventories i ON im.inventory_id = i.id
              LEFT JOIN sets s2 ON i.set_num = s2.set_num
              LEFT JOIN brands b2 ON s2.brand_id = b2.id
              WHERE COALESCE(b2.name, m.brand, 'LEGO') IS NOT NULL
            `);
            const brands = brandRows.map(r => r.brandName).filter(Boolean).sort();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(brands));
          } catch (err) {
            console.error("Brands API Error:", err);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(["LEGO"]));
          }
        });

        /* ==================================================================
           API BLOCK: /api/sets (Theme-Gated Catalog)
           ================================================================== */
        server.middlewares.use('/api/sets', async (req, res) => {
          try {
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            const theme = urlObj.searchParams.get('theme');
            const subtheme = urlObj.searchParams.get('subtheme');
            const brand = urlObj.searchParams.get('brand');

            const hasTheme = theme && theme !== 'Please select a theme' && theme !== 'All';

            // Products only load when a valid theme is selected
            if (!hasTheme) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify([]));
              return;
            }

            const db = await openDB();
            let query = `
              SELECT DISTINCT 
                s.set_num AS setNumber, 
                s.name, 
                s.year, 
                s.num_parts AS pieces, 
                COALESCE(parent_t.name, t.name, 'General') AS themeName,
                COALESCE(t.name, 'General') AS subthemeName,
                COALESCE(b.name, s.brand, 'LEGO') AS brand
              FROM sets s
              LEFT JOIN themes t ON s.theme_id = t.id
              LEFT JOIN themes parent_t ON t.parent_id = parent_t.id
              LEFT JOIN brands b ON s.brand_id = b.id
              WHERE (parent_t.name = ? OR t.name = ?)
            `;

            const params = [theme, theme];
            if (subtheme && subtheme !== 'Please select a theme' && subtheme !== 'All') {
              query += ` AND t.name = ?`;
              params.push(subtheme);
            }
            if (brand && brand !== 'All') {
              query += ` AND COALESCE(b.name, s.brand, 'LEGO') = ?`;
              params.push(brand);
            }
            query += ` ORDER BY s.year DESC`;

            const sets = await db.all(query, params);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(sets || []));
          } catch (err) {
            console.error("Sets API Error:", err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([]));
          }
        });

        /* ==================================================================
           API BLOCK: /api/minifigs (Theme-Gated Minifigures Catalog)
           ================================================================== */
        server.middlewares.use('/api/minifigs', async (req, res) => {
          try {
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            const theme = urlObj.searchParams.get('theme');
            const subtheme = urlObj.searchParams.get('subtheme');
            const brand = urlObj.searchParams.get('brand');

            const hasTheme = theme && theme !== 'Please select a theme' && theme !== 'All';

            if (!hasTheme) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify([]));
              return;
            }

            const db = await openDB();

            let officialQuery = `
              SELECT DISTINCT 
                m.fig_num AS id,
                m.fig_num AS figNum,
                m.name,
                m.img_url AS imageUrl,
                m.minifigure_code AS minifigureCode,
                s.name AS setName,
                s.set_num AS setNumber,
                s.year,
                COALESCE(parent_t.name, t.name, 'General') AS themeName,
                COALESCE(t.name, 'General') AS subthemeName,
                COALESCE(b.name, s.brand, 'LEGO') AS brand
              FROM minifigs m
              JOIN inventory_minifigs im ON m.fig_num = im.fig_num
              JOIN inventories i ON im.inventory_id = i.id
              JOIN sets s ON i.set_num = s.set_num
              JOIN themes t ON s.theme_id = t.id
              LEFT JOIN themes parent_t ON t.parent_id = parent_t.id
              LEFT JOIN brands b ON s.brand_id = b.id
              WHERE (parent_t.name = ? OR (parent_t.name IS NULL AND t.name = ?))
            `;
            let officialParams = [theme, theme];
            if (subtheme && subtheme !== 'Please select a theme' && subtheme !== 'All') {
              officialQuery += ` AND t.name = ?`;
              officialParams.push(subtheme);
            }
            if (brand && brand !== 'All') {
              officialQuery += ` AND COALESCE(b.name, s.brand, 'LEGO') = ?`;
              officialParams.push(brand);
            }

            let customQuery = `
              SELECT DISTINCT 
                m.fig_num AS id,
                m.fig_num AS figNum,
                m.name,
                m.img_url AS imageUrl,
                m.minifigure_code AS minifigureCode,
                COALESCE(s.name, 'Custom Set') AS setName,
                COALESCE(s.set_num, m.minifigure_code, '') AS setNumber,
                COALESCE(s.year, 2025) AS year,
                COALESCE(parent_t.name, t.name, 'General') AS themeName,
                COALESCE(t.name, 'General') AS subthemeName,
                COALESCE(b.name, s.brand, m.brand, 'LEGO') AS brand
              FROM minifigs m
              LEFT JOIN sets s ON s.set_num = SUBSTR(m.minifigure_code, 1, CASE WHEN INSTR(m.minifigure_code, '.') > 0 THEN INSTR(m.minifigure_code, '.') - 1 ELSE LENGTH(m.minifigure_code) END)
              LEFT JOIN themes t ON s.theme_id = t.id
              LEFT JOIN themes parent_t ON t.parent_id = parent_t.id
              LEFT JOIN brands b ON s.brand_id = b.id
              WHERE (parent_t.name = ? OR t.name = ?)
            `;
            let customParams = [theme, theme];
            if (subtheme && subtheme !== 'Please select a theme' && subtheme !== 'All') {
              customQuery += ` AND t.name = ?`;
              customParams.push(subtheme);
            }
            if (brand && brand !== 'All') {
              customQuery += ` AND COALESCE(b.name, s.brand, m.brand, 'LEGO') = ?`;
              customParams.push(brand);
            }

            const officialFigs = await db.all(officialQuery, officialParams);
            const customFigs = await db.all(customQuery, customParams);

            const allFigs = [...officialFigs, ...customFigs];
            const uniqueFigs = Array.from(new Map(allFigs.map(item => [item.figNum, item])).values());

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(uniqueFigs));
          } catch (err) {
            console.error("Minifigs API Error:", err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify([]));
          }
        });

        /* ==================================================================
           API BLOCK: /api/bricklink-price (Official BrickLink Store Pricing)
           ================================================================== */
        server.middlewares.use('/api/bricklink-price', async (req, res) => {
          try {
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            const itemNo = urlObj.searchParams.get('itemNo');
            const itemType = urlObj.searchParams.get('itemType');
            const currency = urlObj.searchParams.get('currency') || 'AUD';
            const country = urlObj.searchParams.get('country') || 'AU';

            let usedAvg = null;
            let newAvg = null;

            if (itemNo) {
              const blItemType = itemType === 'S' ? 'SET' : 'MINIFIG';
              const apiUrl = `https://api.bricklink.com/api/store/v1/items/${blItemType}/${itemNo}/price`;

              async function fetchCondition(condition) {
                try {
                  const queryParams = {
                    new_or_used: condition,
                    currency_code: currency,
                    country_code: country,
                    guide_type: 'stock'
                  };

                  const authHeader = generateOAuthHeader('GET', apiUrl, queryParams, BL_CREDENTIALS);
                  const queryString = new URLSearchParams(queryParams).toString();
                  const fullUrl = `${apiUrl}?${queryString}`;

                  const response = await fetch(fullUrl, {
                    method: 'GET',
                    headers: {
                      'Authorization': authHeader,
                      'Content-Type': 'application/json'
                    },
                    signal: AbortSignal.timeout(8000)
                  });

                  if (response.ok) {
                    const json = await response.json();
                    if (json.meta && json.meta.code === 200 && json.data) {
                      return json.data.avg_price ? parseFloat(json.data.avg_price) : null;
                    }
                  }
                } catch (e) {
                  console.error(`[BrickLink API Exception]:`, e.message);
                }
                return null;
              }

              [usedAvg, newAvg] = await Promise.all([
                fetchCondition('U'),
                fetchCondition('N')
              ]);
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              used: { avg: usedAvg },
              new: { avg: newAvg }
            }));
          } catch (err) {
            console.error("BrickLink API Outer Error:", err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ used: { avg: null }, new: { avg: null } }));
          }
        });
      }
    }
  ]
});