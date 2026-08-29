/* ==========================================================================
   FILE: test_single_set.js
   DESCRIPTION: Tests Rebrickable API response and parsing for a single set
   ========================================================================== */

const REBRICKABLE_API_KEY = '02d5a43bd7df650ef2793bf7e181e184';
const TEST_SET_NUM = '75222-1'; // Example: Betrayal at Cloud City

async function testSingleSet() {
  console.log(`🧪 Fetching minifigures for set ${TEST_SET_NUM} from Rebrickable API...`);
  
  const url = `https://rebrickable.com/api/v3/lego/sets/${TEST_SET_NUM}/minifigs/`;

  try {
    const response = await fetch(url, {
      headers: { 
        'Authorization': `key ${REBRICKABLE_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    console.log(`📦 Success! Found ${data.results.length} minifigure(s) in set ${TEST_SET_NUM}.\n`);

    for (const item of data.results) {
      console.log('--------------------------------------------------');
      console.log('📄 Raw API Object Keys:', Object.keys(item));
      console.log('📄 Full Minifig Payload:', JSON.stringify(item, null, 2));

      const figNum = item.set_num; 
      const figName = item.set_name || '';
      
      // Extract the proper 'sw' code
      const swMatch = figName.match(/sw\d+/i) || figNum.match(/sw\d+/i);
      const swCode = swMatch ? swMatch[0].toLowerCase() : null;

      console.log(`\n🔍 Parsing Results:`);
      console.log(`   - Fig Identifier (set_num): ${figNum}`);
      console.log(`   - Fig Description (set_name): ${figName}`);
      console.log(`   - ✨ Extracted Code: ${swCode ? swCode.toUpperCase() : '❌ NO SW CODE FOUND'}`);
      console.log('--------------------------------------------------\n');
    }

  } catch (err) {
    console.error(`❌ Network or Execution Error:`, err.message);
  }
}

testSingleSet();