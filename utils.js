// utils.js
// Shared helpers for the Know Your Voter app

/*
 getSheetIdForBooth(matched, booth)
 - matched: constituency entry from districts.json
 - booth: booth number (string or number)

 Supports these formats on the `matched` object:
 1) matched.sheet_id as a string -> returned directly
 2) matched.sheet_map as an array of { start, end, sheet_id }
 3) matched.sheet_id as an object with keys like "1-73": "sheetId"
 4) matched.default_sheet_id as fallback

Returns sheet_id string or null.
*/
window.getSheetIdForBooth = function (matched, booth) {
  if (!matched) return null;
  const b = parseInt(booth, 10);

  if (typeof matched.sheet_id === 'string') return matched.sheet_id;

  if (Array.isArray(matched.sheet_map)) {
    for (const m of matched.sheet_map) {
      const s = Number(m.start);
      const e = Number(m.end);
      if (!isNaN(b) && b >= s && b <= e) return m.sheet_id;
    }
  }

  if (matched.sheet_id && typeof matched.sheet_id === 'object') {
    for (const [range, id] of Object.entries(matched.sheet_id)) {
      const parts = range.split('-').map(x => Number(x.trim()));
      if (parts.length === 2) {
        const [s, e] = parts;
        if (!isNaN(b) && b >= s && b <= e) return id;
      }
    }
  }

  if (matched.default_sheet_id) return matched.default_sheet_id;
  return null;
};
