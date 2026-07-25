import { PRESET_POKEMON_DB } from '../src/data/pokemonDb.cards.generated.js';
const m = {};
for (const c of PRESET_POKEMON_DB) {
  m[c.cardId] = {
    stars: c.stars, name: c.name, type1: c.type1, type2: c.type2,
    hp: c.hp, attack: c.attack, defense: c.defense, spAtk: c.spAtk, spDef: c.spDef, speed: c.speed,
    moveName: c.moveName, moveType: c.moveType, moveCategory: c.moveCategory,
    move2Name: c.move2Name, move2Type: c.move2Type, move2Category: c.move2Category,
    layout: c.layout,
  };
}
console.log(JSON.stringify(m));
