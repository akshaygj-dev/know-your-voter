document.addEventListener('DOMContentLoaded', () => {
  const analyseBtn = document.getElementById('analyseBtn');
  const summaryContainer = document.getElementById('searchSummary');

  analyseBtn?.addEventListener('click', async () => {
    if (!window.latestResults || !Array.isArray(window.latestResults)) {
      const params = new URLSearchParams(window.location.search);
      const constituency = params.get('constituency');
      const booth = params.get('booth');

      if (!constituency) {
        resultsContainer.innerHTML = "Constituency missing in URL.";
        return;
      }

      const matched = constituencyMap.find(entry =>
        entry.constituency.toLowerCase() === constituency.toLowerCase()
      );

      if (!matched || !matched.sheet_id) {
        resultsContainer.innerHTML = `No sheet found for ${constituency}`;
        return;
      }

      const sheetId = matched.sheet_id;
      const sheetName = booth;

      window.latestResults = await searchVoters(sheetId, sheetName);
      window.latestSearchParams = {}; // default to empty
    }

    const results = window.latestResults;

    // Normalize gender and age
    function normalizeGender(g) {
      const val = (g || '').toLowerCase();
      if (val === 'male') return 'Male';
      if (val === 'female') return 'Female';
      return 'Not Mentioned';
    }

    const genderGroups = ['Male', 'Female', 'Not Mentioned'];
    const ageRanges = ['18–25', '26–35', '36–45', '46–55', '56–65', '66–75', '76–85', '86–100'];
    const matrix = {};
    const rowTotals = {}; // totals per age group

    ageRanges.forEach(age => {
      matrix[age] = { 'Male': 0, 'Female': 0, 'Not Mentioned': 0 };
      rowTotals[age] = 0;
    });

    const colTotals = { 'Male': 0, 'Female': 0, 'Not Mentioned': 0 };

    results.forEach(r => {
      const age = parseInt(r.Age);
      const gender = normalizeGender(r.Gender);

      let ageGroup = null;
      if (!isNaN(age)) {
        if (age <= 25) ageGroup = '18–25';
        else if (age <= 35) ageGroup = '26–35';
        else if (age <= 45) ageGroup = '36–45';
        else if (age <= 55) ageGroup = '46–55';
        else if (age <= 65) ageGroup = '56–65';
        else if (age <= 75) ageGroup = '66–75';
        else if (age <= 85) ageGroup = '76–85';
        else if (age <= 100) ageGroup = '86–100';
      }

      if (ageGroup) {
        matrix[ageGroup][gender]++;
        rowTotals[ageGroup]++;
        colTotals[gender]++;
      }
    });

    // Update the uniqueEpic calculation
    const uniqueEpic = new Set(results.map(r => r['ID'])).size;

    // Params
    const params = new URLSearchParams(window.location.search);
    const constituency = params.get('constituency') || 'N/A';
    const booth = params.get('booth') || 'N/A';

    const { firstName, lastName, gender, ageRange } = window.latestSearchParams || {};
    const hasSearchParams = firstName || lastName || gender || ageRange;

    // Build UI
    summaryContainer.classList.remove('hidden');
    summaryContainer.innerHTML = `
    <div class="bg-white shadow-md rounded-xl p-6 border border-indigo-200 text-sm">
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-indigo-700">📍 <strong>${constituency}</strong> Constituency | Booth: <strong>${booth}</strong> | Total Voters: <strong>${results.length}</strong></h2>
      </div>

      ${hasSearchParams ? `
        <div class="mb-4">
          <p class="font-semibold mb-1">🔎 Search Parameters Used:</p>
          <ul class="list-disc ml-5 text-gray-700">
            ${firstName ? `<li>First Name: ${firstName}</li>` : ''}
            ${lastName ? `<li>Last Name: ${lastName}</li>` : ''}
            ${gender ? `<li>Gender: ${gender}</li>` : ''}
            ${ageRange ? `<li>Age Range: ${ageRange}</li>` : ''}
          </ul>
        </div>
      ` : ''}

      <div class="mb-4">
        <p class="font-semibold text-gray-800 mb-2">📊 Voter Count by Age & Gender</p>
        <div class="overflow-x-auto">
          <table class="w-full text-center text-sm border border-gray-300 rounded-md">
            <thead class="bg-indigo-100 text-gray-700">
              <tr>
                <th class="py-2 px-3 border">Age Range</th>
                ${genderGroups.map(g => `<th class="py-2 px-3 border">${g}</th>`).join('')}
                <th class="py-2 px-3 border bg-indigo-50">Total</th>
              </tr>
            </thead>
            <tbody>
              ${ageRanges.map(age => `
                <tr class="even:bg-gray-50">
                  <td class="py-2 px-3 border font-medium">${age}</td>
                  ${genderGroups.map(g => `<td class="py-2 px-3 border">${matrix[age][g]}</td>`).join('')}
                  <td class="py-2 px-3 border font-semibold bg-indigo-50">${rowTotals[age]}</td>
                </tr>
              `).join('')}
              <tr class="bg-gray-100 font-semibold">
                <td class="py-2 px-3 border">Total</td>
                ${genderGroups.map(g => `<td class="py-2 px-3 border">${colTotals[g]}</td>`).join('')}
                <td class="py-2 px-3 border">${results.length}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mb-4">
        <p class="font-semibold text-gray-800 mb-2">📋 Last Names (Count > 5)</p>
        <div class="overflow-x-auto">
          ${(() => {
            // Count last names
            const lastNameCount = {};
            results.forEach(r => {
              const lastName = r['Last Name']?.trim() || 'Not Mentioned';
              lastNameCount[lastName] = (lastNameCount[lastName] || 0) + 1;
            });

            // Filter and sort last names with count > 5
            const frequentLastNames = Object.entries(lastNameCount)
              .filter(([_, count]) => count > 5)
              .sort((a, b) => b[1] - a[1]); // Sort by count descending

            if (frequentLastNames.length === 0) {
              return '<p class="text-gray-600">No last names with more than 5 occurrences found.</p>';
            }

            return `
              <table class="w-full text-center text-sm border border-gray-300 rounded-md">
                <thead class="bg-indigo-100 text-gray-700">
                  <tr>
                    <th class="py-2 px-3 border">Last Name</th>
                    <th class="py-2 px-3 border">Count</th>
                    <th class="py-2 px-3 border">Last Name</th>
                    <th class="py-2 px-3 border">Count</th>
                    <th class="py-2 px-3 border">Last Name</th>
                    <th class="py-2 px-3 border">Count</th>
                  </tr>
                </thead>
                <tbody>
                  ${(() => {
                    const rows = [];
                    // Calculate number of rows needed (ceil to handle uneven division)
                    const rowsPerColumn = Math.ceil(frequentLastNames.length / 3);
                    
                    // Create rows
                    for (let i = 0; i < rowsPerColumn; i++) {
                      const row = [];
                      // Add items for each of the three columns
                      for (let col = 0; col < 3; col++) {
                        const index = col * rowsPerColumn + i;
                        const item = frequentLastNames[index];
                        if (item) {
                          row.push(`
                            <td class="py-2 px-3 border font-medium">${item[0]}</td>
                            <td class="py-2 px-3 border">${item[1]}</td>
                          `);
                        } else {
                          row.push(`
                            <td class="py-2 px-3 border"></td>
                            <td class="py-2 px-3 border"></td>
                          `);
                        }
                      }
                      rows.push(`<tr class="even:bg-gray-50">${row.join('')}</tr>`);
                    }
                    return rows.join('');
                  })()}
                </tbody>
              </table>
            `;
          })()}
        </div>
      </div>

      <div class="text-gray-700 mt-4">
        <p>Unique EPIC Numbers: <strong>${uniqueEpic}</strong></p>
      </div>
    </div>
    `;
  });
});
