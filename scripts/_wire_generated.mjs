// Phase 1 wiring: make pokemonDb.js import the reconciled array instead of the inline literal.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const F = join(__dirname, '..', 'src', 'data', 'pokemonDb.js');
let s = readFileSync(F, 'utf8');

const re = /export const PRESET_POKEMON_DB\s*=\s*\[[\s\S]*?\n\];/;
if (!re.test(s)) { console.error('[wire] inline PRESET_POKEMON_DB array not found'); process.exit(1); }

// replace inline array with a pointer comment
s = s.replace(re,
  '// PRESET_POKEMON_DB is now imported from ./pokemonDb.cards.generated.js\n' +
  '// (reconciled: official-site identity+photo + existing pokemonDb.js stats; ' + new Date().toISOString() + ')');

// prepend the import (ESM hoists; valid at top level)
s = `import { PRESET_POKEMON_DB } from './pokemonDb.cards.generated.js';\n` + s;

writeFileSync(F, s);
console.log('[wire] rewired', F, '-> imports ./pokemonDb.cards.generated.js');
