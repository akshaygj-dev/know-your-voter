// seachHandler.js
const form = document.getElementById('searchForm');
const resultsContainer = document.getElementById('results');
const summaryContainer = document.getElementById('searchSummary');
const lastNameSelect = document.getElementById('lastName');

let constituencyMap = [];


fetch('districts.json')
    .then(res => res.json())
    .then(async data => {
        for (const district in data) {
            data[district].forEach(c => {
                constituencyMap.push({ ...c, district });
            });
        }

        // Get constituency and booth from URL
        const params = new URLSearchParams(window.location.search);
        const constituency = params.get('constituency');
        const booth = params.get('booth');

        if (constituency) {
            const matched = constituencyMap.find(entry =>
                entry.constituency.toLowerCase() === constituency.toLowerCase()
            );

            if (matched) {
                    // Resolve sheet id based on booth ranges (backwards compatible)
                    const sheetId = getSheetIdForBooth(matched, booth);
                    if (sheetId) {
                        // Fetch and populate last names
                        const lastNames = await fetchUniqueLastNames(sheetId, booth);
                        lastNameSelect.innerHTML = `
                            <option value="">Any Last Name</option>
                            ${lastNames.map(name => `<option value="${name}">${name}</option>`).join('')}
                        `;
                    }
                }
        }
    });

form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value;
    const lastName = lastNameSelect.value;
    const gender = document.getElementById('gender').value;
    const ageRange = document.getElementById('ageRange').value;

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

    if (!matched) {
        resultsContainer.innerHTML = `No constituency found for ${constituency}`;
        return;
    }

    const sheetId = getSheetIdForBooth(matched, booth);
    if (!sheetId) {
        resultsContainer.innerHTML = `No sheet found for ${constituency} (booth ${booth})`;
        return;
    }

    const sheetName = booth; // Assuming sheet is named after booth

    const results = await searchVoters(sheetId, sheetName, {
        firstName,
        lastName,
        gender,
        ageRange
    });

    window.latestResults = results;
    window.latestSearchParams = { firstName, lastName, gender, ageRange };

    // Show analytics
    summaryContainer.classList.remove('hidden');
    summaryContainer.innerHTML = `
    <p><strong>Search Parameters:</strong></p>
    <ul class="list-disc ml-4">
      ${firstName ? `<li>First Name: ${firstName}</li>` : ''}
      ${lastName ? `<li>Last Name: ${lastName}</li>` : ''}
      ${gender ? `<li>Gender: ${gender}</li>` : ''}
      ${ageRange ? `<li>Age Range: ${ageRange}</li>` : ''}
    </ul>
    <p class="mt-2 font-medium">Total Voters Found: ${results.length}</p>
  `;

    if (results.length === 0) {
        resultsContainer.innerHTML = "<p>No records found.</p>";
        return;
    }

    resultsContainer.innerHTML = results.map(r => `
  <div class="p-4 border rounded-xl bg-white shadow-sm hover:shadow-md transition duration-300">
    <h2 class="text-lg font-semibold text-blue-700 mb-2">${r['First Name']} ${r['Last Name'] || ''}</h2>
    <ul class="space-y-1 text-sm text-gray-700">
      <li><strong>Gender:</strong> ${r['Gender']}</li>
      <li><strong>Age:</strong> ${r['Age']}</li>
      <li><strong>EPIC:</strong> ${r['ID']}</li>
    </ul>
  </div>
`).join('');
});
