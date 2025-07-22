const form = document.getElementById('searchForm');
const resultsContainer = document.getElementById('results');
const summaryContainer = document.getElementById('searchSummary');

let constituencyMap = [];

fetch('/districts.json')
  .then(res => res.json())
  .then(data => {
    for (const district in data) {
      data[district].forEach(c => {
        constituencyMap.push({ ...c, district });
      });
    }
  });

form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const firstName = document.getElementById('firstName').value;
  const lastName = document.getElementById('lastName').value;
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

  if (!matched || !matched.sheet_id) {
    resultsContainer.innerHTML = `No sheet found for ${constituency}`;
    return;
  }

  const sheetId = matched.sheet_id;
  const sheetName = booth; // Assuming sheet is named after constituency

  const results = await searchVoters(sheetId, sheetName, {
    firstName,
    lastName,
    gender,
    ageRange
  });

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
    <div class="p-4 border rounded mb-2 bg-white shadow-sm">
      <p><strong>Name:</strong> ${r.Name || ''}</p>
      <p><strong>First Name:</strong> ${r['FIRST NAME']}</p>
      <p><strong>Last Name:</strong> ${r['LAST NAME']}</p>
      <p><strong>Gender:</strong> ${r.Gender}</p>
      <p><strong>Age:</strong> ${r.Age}</p>
      <p><strong>EPIC:</strong> ${r['EPIC Number']}</p>
    </div>
  `).join('');
});
