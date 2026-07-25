const fs = require('fs');
const files = ['src/data/pokemonDb.cards.galaxy1.generated.js'];
let output = '';
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const regex = /id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*nameZh:\s*'([^']+)',\s*grade:\s*(\d+)/g;
  let match;
  output += '--- ' + file + ' ---\n';
  while ((match = regex.exec(content)) !== null) {
    if (parseInt(match[4]) >= 5) {
      output += match[1] + ' - ' + match[3] + ' (Grade ' + match[4] + ')\n';
    }
  }
});
console.log(output);
