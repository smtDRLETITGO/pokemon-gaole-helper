import json
import re

file_path = 'src/data/pokemonDb.cards.generated.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Match the export const PRESET_POKEMON_DB = [...]
match = re.search(r'export const PRESET_POKEMON_DB = (\[.*?\]);', content, re.DOTALL)
if not match:
    print("Could not find PRESET_POKEMON_DB array")
    exit(1)

cards = json.loads(match.group(1))

# Mapping of special mechanics for Galaxy 2 (6-stars and key 5-stars)
mechanics_map = {
    "2-2-001": "chain_attack", # 蒼響
    "2-2-002": "chain_attack", # 藏瑪然特
    "2-2-003": "giantmax",     # 鋁鋼龍
    "2-2-004": "giantmax",     # 噴火龍
    "2-2-005": "chain_attack", # 薩戮德
    "2-2-006": "mega",         # 路卡利歐
    "2-2-007": "mega",         # 烈空坐
    "2-2-008": "mega",         # 拉帝亞斯
    "2-2-009": "mega",         # 拉帝歐斯
    "2-2-010": "zmove",        # 四顎針龍
}

for card in cards:
    if card['cardId'] in mechanics_map:
        card['specialMechanic'] = mechanics_map[card['cardId']]
    elif card.get('_meta', {}).get('hasGigantamax', False):
        if not 'specialMechanic' in card:
            card['specialMechanic'] = 'dynamax' # Fallback for 5 stars if not specified

new_array_str = json.dumps(cards, indent=2, ensure_ascii=False)
new_content = content[:match.start(1)] + new_array_str + content[match.end(1):]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Added specialMechanic to pokemonDb.cards.generated.js")
