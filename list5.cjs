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
      const gradeMatch = card.match(/"stars":\s*(\d+)/) || card.match(/stars:\s*(\d+)/);
      const nameMatch = card.match(/"name":\s*"([^"]+)"/) || card.match(/name:\s*'([^']+)'/);
      const mechMatch = card.match(/"specialMechanic":\s*"([^"]+)"/) || card.match(/specialMechanic:\s*'([^']+)'/);
      const idMatch = card.match(/"cardId":\s*"([^"]+)"/) || card.match(/cardId:\s*'([^']+)'/);
      
      if (gradeMatch && nameMatch && idMatch) {
        const grade = parseInt(gradeMatch[1]);
        const isSpecial = idMatch[1].startsWith('R') || idMatch[1].includes('SP') || card.includes('特別卡') || grade === 0 || card.includes('special');
        if (isSpecial) {
          let mech = mechMatch ? mechMatch[1] : '';
          result += `- [Special] ${nameMatch[1]} ${mech ? '-> ' + mech : ''} (${idMatch[1]})\n`;
        }
      }
    });
  }
});
fs.writeFileSync('specials.md', result, 'utf8');
