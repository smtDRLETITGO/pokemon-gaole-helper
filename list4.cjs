const fs = require('fs');
const files = [
  'src/data/pokemonDb.cards.galaxy1.generated.js',
  'src/data/pokemonDb.cards.stardust1.generated.js',
  'src/data/pokemonDb.cards.stardust2.generated.js',
  'src/data/pokemonDb.cards.stardust3.generated.js',
  'src/data/pokemonDb.cards.stardust4.generated.js'
];
let result = '';
files.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  result += '\n### ' + file.split('.')[2] + ' ###\n';
  
  const cards = content.match(/{\s*"cardId"[^}]+}/g) || content.match(/{\s*cardId[^}]+}/g);
  if (cards) {
    cards.forEach(card => {
      const gradeMatch = card.match(/"stars":\s*(\d+)/);
      const nameMatch = card.match(/"name":\s*"([^"]+)"/);
      const mechMatch = card.match(/"specialMechanic":\s*"([^"]+)"/);
      
      if (gradeMatch && nameMatch) {
        const grade = parseInt(gradeMatch[1]);
        if (grade >= 5) {
          let mech = mechMatch ? mechMatch[1] : '';
          result += `- [${grade}星] ${nameMatch[1]} ${mech ? '-> ' + mech : ''}\n`;
        }
      }
    });
  }
});
fs.writeFileSync('characters.md', result, 'utf8');
