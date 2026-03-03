const fs = require('fs');

const file = fs.readFileSync('renderer/src/components/LibraryGrid.tsx', 'utf8');

console.log(file.includes('const callbacksRef'));
