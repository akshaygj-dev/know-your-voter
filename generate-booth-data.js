// generate-booth-data.js
// Run: node generate-booth-data.js
// This script fetches voter data from multiple Google Sheets for a constituency
// and generates a pre-processed JSON with booth-wise last names (count > 8)

const fs = require('fs');

// Configuration: Update with your actual sheet IDs and booth ranges
const CONFIG = {
  kudachi: {
    name: 'Kudachi',
    sheets: [
      { sheet_id: '1rUarWCRvDqQr0C0GI5sgClUnfqWTOEK02noM-KsIhPo', booth_range: [1, 73] },
      { sheet_id: '1qTCTuIKwivJ1wJDDXBRffnN9hO-7HsqSes5RIVtuBps', booth_range: [74, 146] },
      { sheet_id: '1uzV23EyS_YtZZYOeSvj8NqrnFy9NZQc12tU7hexUqXA', booth_range: [147, 219] }
    ]
  }
};

async function fetchSheetData(sheetId, booth) {
  const SHEET_URL = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${booth}`;
  
  try {
    const res = await fetch(SHEET_URL);
    const text = await res.text();
    const jsonText = text.match(/(?<=\{)(.*)(?=\}\);)/s);
    
    if (!jsonText) {
      console.warn(`No data found for sheet ${sheetId}, booth ${booth}`);
      return [];
    }
    
    const parsed = JSON.parse(`{${jsonText[0]}}`);
    const cols = parsed.table.cols.map(c => c.label);
    const rows = parsed.table.rows.map(row => {
      const obj = {};
      row.c.forEach((cell, i) => {
        obj[cols[i]] = cell?.v?.toString().trim() || '';
      });
      return obj;
    });

    return rows;
  } catch (err) {
    console.error(`Error fetching sheet ${sheetId}, booth ${booth}:`, err.message);
    return [];
  }
}

async function processBoothData(constituency) {
  const result = {};
  
  for (const sheetConfig of constituency.sheets) {
    const { sheet_id, booth_range } = sheetConfig;
    const [startBooth, endBooth] = booth_range;
    
    console.log(`\nProcessing sheet ${sheet_id} (booths ${startBooth}-${endBooth})...`);
    
    for (let booth = startBooth; booth <= endBooth; booth++) {
      console.log(`  Fetching booth ${booth}...`);
      const rows = await fetchSheetData(sheet_id, booth);
      
      if (rows.length === 0) continue;
      
      // Count last names
      const lastNameCounts = {};
      rows.forEach(row => {
        const lastName = row['Last Name']?.trim();
        if (lastName) {
          lastNameCounts[lastName] = (lastNameCounts[lastName] || 0) + 1;
        }
      });
      
      // Filter for names with count >= 8 and sort by count descending
      const frequentLastNames = Object.entries(lastNameCounts)
        .filter(([_, count]) => count >= 8)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));
      
      result[booth] = {
        total_voters: rows.length,
        last_names: frequentLastNames
      };
      
      console.log(`    Found ${rows.length} voters, ${frequentLastNames.length} last names with count >= 8`);
    }
  }
  
  return result;
}

async function generateBoothDataJSON() {
  console.log('Starting booth data generation...\n');
  
  try {
    const kudachiData = await processBoothData(CONFIG.kudachi);
    
    const output = {
      constituency: 'Kudachi',
      generated_at: new Date().toISOString(),
      booths: kudachiData
    };
    
    // Write to file
    const filePath = './kudachi-booths.json';
    fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
    
    console.log(`\n✅ Successfully generated ${filePath}`);
    console.log(`Total booths processed: ${Object.keys(kudachiData).length}`);
  } catch (err) {
    console.error('❌ Error generating booth data:', err);
    process.exit(1);
  }
}

generateBoothDataJSON();
