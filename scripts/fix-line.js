const fs = require('fs');
const content = fs.readFileSync('c:/Github/onyx/renderer/src/components/MenuBar.tsx', 'utf8');
const lines = content.split(/\r?\n/);
lines.splice(857, 1); // Remove line 858 (index 857)
fs.writeFileSync('c:/Github/onyx/renderer/src/components/MenuBar.tsx', lines.join('\n'));
console.log('Fixed line 858');
