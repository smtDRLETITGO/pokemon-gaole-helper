import { PRESET_POKEMON_DB as G2 } from '../src/data/pokemonDb.cards.generated.js';
import { GALAXY_1_CARDS as G1 } from '../src/data/pokemonDb.cards.galaxy1.generated.js';
import { STARDUST_4_CARDS as S4 } from '../src/data/pokemonDb.cards.stardust4.generated.js';

function report(name, cards){
  const dist={};
  let emptyMove=0, emptyType=0, emptyStat=0, special=0;
  for(const c of cards){
    const s = c.category==='special' ? 'SPECIAL' : (c.stars??'?');
    dist[s]=(dist[s]||0)+1;
    if(!c.moveName) emptyMove++;
    if(!c.type1) emptyType++;
    if(!c.hp && !c.attack) emptyStat++;
    if(c.category==='special') special++;
  }
  console.log(`\n=== ${name} (n=${cards.length}) ===`);
  console.log('star dist:', JSON.stringify(dist));
  console.log(`emptyMove=${emptyMove} emptyType=${emptyType} emptyStat=${emptyStat} special=${special}`);
  console.log('sample[0]:', JSON.stringify(cards[0]));
}
report('galaxy2', G2);
report('galaxy1', G1);
report('stardust4', S4);
