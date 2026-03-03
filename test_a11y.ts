import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

const files = globSync('renderer/src/components/**/*.tsx');
let fixedCount = 0;

for (const file of files) {
  let content = readFileSync(file, 'utf-8');
  const original = content;

  // Find buttons that only contain an SVG and don't have aria-label
  // A simple regex approach that might catch some cases

  // We'll specifically look for the Close icon (M6 18L18 6M6 6l12 12) inside a button
  // and see if the button is missing aria-label="Close"
}
