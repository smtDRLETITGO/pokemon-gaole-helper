// 用 OpenRouter VLM 批量讀取官網正面圖的卡牌參數（星等 + HP + 名字 + 可見數值）
// 用法: OPENROUTER_API_KEY=sk-... node scripts/vlm_read_cards.mjs [limit]
//  key 只從環境變數讀取，不寫入任何檔案
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CARDS_DIR = path.join(ROOT, 'public', 'cards', '11_small');
const OUT_JSON = path.join(__dirname, '_vlm_read.json');

const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) {
  console.error('缺少 OPENROUTER_API_KEY 環境變數');
  process.exit(1);
}

// 選一個對小字 OCR 準確的免費視覺模型
const MODEL = process.env.OPENROUTER_MODEL || 'qwen/qwen2.5-vl-72b-instruct:free';

function b64(filePath) {
  return fs.readFileSync(filePath).toString('base64');
}

async function readOne(file, attempt = 1) {
  const cardId = path.basename(file, '.png');
  const dataUrl = `data:image/png;base64,${b64(file)}`;
  const prompt = `這是一張寶可夢 MEZASTAR（加傲樂）卡牌的正面圖。請仔細辨識並只回傳 JSON，不要任何其他文字。
欄位說明：
- name: 卡牌名稱（繁體中文）
- stars: 數一下畫面中的金色五角星 ★ 數量（1~6）
- energy: 「寶可能量」後面的數字（注意：這不是 HP，是卡面能量值）
- cardIdHint: 若圖面底部有類似「2-2-026 TC」的編號請填，否則 null
請嚴格輸出：{"name":"", "stars":0, "energy":null, "cardIdHint":null}`;

  const body = {
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0,
    max_tokens: 400,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);

  let res;
  try {
    res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://localhost',
        'X-Title': 'Mezastar Card Reader',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 429) {
    if (attempt <= 5) {
      const wait = 5000 * attempt;
      console.log(`  [${cardId}] 429 限速，等待 ${wait}ms 重試 (${attempt})`);
      await new Promise((r) => setTimeout(r, wait));
      return readOne(file, attempt + 1);
    }
    throw new Error('rate limited');
  }
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || '';
  const m = content.match(/\{[\s\S]*\}/);
  if (!m) {
    // 空回傳（reasoning 模型偶發）→ 重試
    if (attempt <= 3) {
      console.log(`  [${cardId}] 空回傳，重試 (${attempt})`);
      await new Promise((r) => setTimeout(r, 2500 * attempt));
      return readOne(file, attempt + 1);
    }
    console.log(`  [${cardId}] 無法解析 JSON: ${content.slice(0, 120)}`);
    return { cardId, raw: content };
  }
  try {
    const parsed = JSON.parse(m[0]);
    parsed.cardId = cardId;
    return parsed;
  } catch (e) {
    if (attempt <= 3) {
      console.log(`  [${cardId}] JSON parse 失敗，重試 (${attempt})`);
      await new Promise((r) => setTimeout(r, 2500 * attempt));
      return readOne(file, attempt + 1);
    }
    console.log(`  [${cardId}] JSON parse 失敗: ${content.slice(0, 120)}`);
    return { cardId, raw: content };
  }
}

async function main() {
  const limit = process.argv[2] ? parseInt(process.argv[2], 10) : 999;
  const files = fs
    .readdirSync(CARDS_DIR)
    .filter((f) => f.endsWith('.jpg'))
    .sort()
    .slice(0, limit);

  console.log(`模型: ${MODEL}`);
  console.log(`待處理: ${files.length} 張 (limit=${limit})`);

  const results = [];
  for (let i = 0; i < files.length; i++) {
    const file = path.join(CARDS_DIR, files[i]);
    process.stdout.write(`[${i + 1}/${files.length}] ${files[i]} ... `);
    try {
      const r = await readOne(file);
      console.log(`stars=${r.stars} energy=${r.energy} name=${r.name}`);
      results.push(r);
    } catch (e) {
      console.log(`ERROR ${e.message}`);
      results.push({ cardId: files[i].replace('.jpg', ''), error: e.message });
    }
    // 避免觸發限速
    if (i < files.length - 1) await new Promise((r) => setTimeout(r, 1200));
  }

  fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
  console.log(`\n完成，結果寫入 ${OUT_JSON}`);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
