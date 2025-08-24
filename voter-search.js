// voter-search.js

/**
 * Fetches and filters voter data from a specific Google Sheet endpoint based on query params.
 * @param {string} sheetId - The Google Sheet ID (from the mapping JSON).
 * @param {Object} filters - { firstName, lastName, gender, age }
 * @returns {Promise<Array>} - Filtered rows
 */
async function searchVoters(sheetId, sheetName, filters = {}) {
  const SHEET_URL = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${sheetName}`;

  try {
    const res = await fetch(SHEET_URL);
    const text = await res.text();
    const jsonText = text.match(/(?<=\{)(.*)(?=\}\);)/s);
    const parsed = JSON.parse(`{${jsonText[0]}}`);

    const cols = parsed.table.cols.map(c => c.label);
    const rows = parsed.table.rows.map(row => {
      const obj = {};
      row.c.forEach((cell, i) => {
        obj[cols[i]] = cell?.v?.toString().trim() || '';
      });
      return obj;
    });

    // Apply filters
    const filtered = rows.filter(row => {
      const age = parseInt(row['Age'], 10);
      const [minAge, maxAge] = filters.ageRange ? filters.ageRange.split('-').map(Number) : [null, null];

      return (
        (!filters.firstName || row['First Name'].toLowerCase().includes(filters.firstName.toLowerCase())) &&
        (!filters.lastName || row['Last Name'].toLowerCase().includes(filters.lastName.toLowerCase())) &&
        (!filters.gender || row['Gender'].toLowerCase() === filters.gender.toLowerCase()) &&
        (!filters.ageRange || (age >= minAge && age <= maxAge))
      );
    });

    return filtered;
  } catch (err) {
    console.error('Error fetching voter data:', err);
    return [];
  }
}

/**
 * Fetches unique last names from a specific Google Sheet endpoint.
 * @param {string} sheetId - The Google Sheet ID (from the mapping JSON).
 * @returns {Promise<Array>} - Sorted array of unique last names
 */
async function fetchUniqueLastNames(sheetId, sheetName) {
  const SHEET_URL = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${sheetName}`;

  try {
    const res = await fetch(SHEET_URL);
    const text = await res.text();
    const jsonText = text.match(/(?<=\{)(.*)(?=\}\);)/s);
    const parsed = JSON.parse(`{${jsonText[0]}}`);

    const cols = parsed.table.cols.map(c => c.label);
    const rows = parsed.table.rows.map(row => {
      const obj = {};
      row.c.forEach((cell, i) => {
        obj[cols[i]] = cell?.v?.toString().trim() || '';
      });
      return obj;
    });

    // Count occurrences of each last name
    const lastNameCounts = rows.reduce((acc, row) => {
      const lastName = row['Last Name'].trim();
      if (lastName) {
        acc[lastName] = (acc[lastName] || 0) + 1;
      }
      return acc;
    }, {});

    // Filter for names appearing 5 or more times and sort them
    const frequentLastNames = Object.entries(lastNameCounts)
      .filter(([_, count]) => count >= 5)
      .map(([name]) => name)
      .sort();

    return frequentLastNames;
  } catch (err) {
    console.error('Error fetching last names:', err);
    return [];
  }
}

