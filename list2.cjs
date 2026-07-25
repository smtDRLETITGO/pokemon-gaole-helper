const fs = require('fs');
const content = fs.readFileSync('src/data/pokemonDb.cards.galaxy1.generated.js', 'utf8');
const lines = content.split('\n');
let currentName = '';
let currentGrade = 0;
lines.forEach(line => {
  if (line.includes('nameZh:')) {
    const match = line.match(/nameZh:\s*['"]([^'"]+)['"]/);
    if (match) currentName = match[1];
  }
  if (line.includes('grade:')) {
    const match = line.match(/grade:\s*(\d+)/);
    if (match) currentGrade = parseInt(match[1]);
    if (currentGrade >= 5) {
      console.log(currentName + ' (Grade ' + currentGrade + ')');
    }
  }
});
