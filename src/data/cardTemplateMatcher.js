// cardTemplateMatcher.js — 離線感知雜湊（perceptual hash）模板比對。
// 用途：使用者拍攝自己的卡 → 與 public/cards/<series>/ 的 73 張官網正面圖比對 → 瞬間命中。
// 不依賴任何外部模型 / 網路，純前端 canvas 計算。
import { PRESET_POKEMON_DB } from './pokemonDb';

const SERIES_DIR = '11'; // 銀河第二彈 cassette id
const SIZE = 16;            // 雜湊尺寸 16x16
const CENTRAL = 0.72;       // 取中央 72% 區域（聚焦寶可夢卡面美術，忽略邊框/背景）

let refHashes = null; // Map<cardId, {name, aHash[], dHash[], imgUrl}>

function makeGrayCanvas(src, size) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0, size, size);
  const d = ctx.getImageData(0, 0, size, size).data;
  const gray = new Array(size * size);
  for (let i = 0; i < size * size; i++) {
    const o = i * 4;
    gray[i] = (d[o] * 0.299 + d[o + 1] * 0.587 + d[o + 2] * 0.114) | 0;
  }
  return gray;
}

function toHashes(gray, size) {
  let sum = 0;
  for (let i = 0; i < gray.length; i++) sum += gray[i];
  const mean = sum / gray.length;
  const aHash = gray.map(v => (v > mean ? 1 : 0));
  const dHash = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size - 1; x++) {
      const i = y * size + x;
      dHash.push(gray[i] > gray[i + 1] ? 1 : 0);
    }
  }
  return { aHash, dHash };
}

function hamming(a, b) {
  let c = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) c++;
  return c;
}

function centralCrop(srcCanvas, frac = CENTRAL) {
  const w = srcCanvas.width, h = srcCanvas.height;
  const cw = Math.max(1, Math.floor(w * frac));
  const ch = Math.max(1, Math.floor(h * frac));
  const cx = Math.floor((w - cw) / 2), cy = Math.floor((h - ch) / 2);
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  c.getContext('2d').drawImage(srcCanvas, cx, cy, cw, ch, 0, 0, cw, ch);
  return c;
}

export async function ensureReferenceHashes() {
  if (refHashes) return refHashes;
  refHashes = new Map();
  const list = PRESET_POKEMON_DB.map(c => ({
    cardId: c.cardId,
    name: c.name,
    imgUrl: `/cards/${SERIES_DIR}/${c.cardId}.png`,
  }));
  await Promise.all(list.map(async (it) => {
    try {
      const res = await fetch(it.imgUrl);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const img = await new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = url;
      });
      const gray = makeGrayCanvas(img, SIZE);
      const { aHash, dHash } = toHashes(gray, SIZE);
      refHashes.set(it.cardId, { name: it.name, aHash, dHash, imgUrl: it.imgUrl });
      URL.revokeObjectURL(url);
    } catch (e) { /* 跳過該張 */ }
  }));
  return refHashes;
}

// 傳入拍攝的 video canvas → 回傳最佳吻合 {cardId, name, distance, confidence}
// confidence: 1 - 正規化距離（0~1，越高越像）
export async function matchTemplateCanvas(srcCanvas) {
  await ensureReferenceHashes();
  if (!refHashes || refHashes.size === 0) return null;
  const cropped = centralCrop(srcCanvas);
  const gray = makeGrayCanvas(cropped, SIZE);
  const { aHash, dHash } = toHashes(gray, SIZE);
  const total = aHash.length + dHash.length;
  let best = null;
  for (const [cardId, ref] of refHashes) {
    const da = hamming(aHash, ref.aHash);
    const dd = hamming(dHash, ref.dHash);
    const dist = (da + dd) / total; // 0(完全相同) ~ 1(完全不同)
    if (!best || dist < best.dist) best = { cardId, name: ref.name, dist };
  }
  if (!best) return null;
  return { cardId: best.cardId, name: best.name, distance: best.dist, confidence: 1 - best.dist };
}
