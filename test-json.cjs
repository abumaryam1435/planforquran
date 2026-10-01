const fs = require('fs');
const d = JSON.parse(fs.readFileSync('public/quran-search.json', 'utf8'));
console.log('length', d.length);
