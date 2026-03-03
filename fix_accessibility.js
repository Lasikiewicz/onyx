const fs = require('fs');
const glob = require('glob');

const files = glob.sync('renderer/src/components/**/*.tsx');

let modifiedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  const original = content;

  // Pattern to find <button> elements that don't have aria-label
  // and contain an SVG (typically close buttons or other icon-only buttons)
  // This is a naive regex replacement and might need manual tweaking.
  // Instead of a single regex, I'll do a targeted search/replace.

}
