// cardTemplateMatcher.js — 離線感知雜湊（perceptual hash）模板比對。
// 用途：使用者拍攝自己的卡 → 與 public/cards/<series>/ 的 73 張官網正面圖比對 → 瞬間命中。
// 不依賴任何外部模型 / 網路，純前端 canvas 計算。
import { PRESET_POKEMON_DB, getActiveGeneration, getAllCards } from './pokemonDb';

const SIZE = 16;            // 雜湊尺寸 16x16
const CENTRAL = 0.72;       // 取中央 72% 區域（聚焦寶可夢卡面美術，忽略邊框/背景）

let refHashes = null; // Map<cardId, {name, aHash[], dHash[], imgUrl}>
let _cachedGen = null; // 目前建立雜湊的代別 cassette，切代時自動重建

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
  const SERIES_DIR = getActiveGeneration().cassette;
  if (refHashes && _cachedGen === SERIES_DIR) return refHashes;
  _cachedGen = SERIES_DIR;
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

// ═══════════════════════════════════════════════════════
// 星等偵測：數上尖端（直立式）
// ═══════════════════════════════════════════════════════
//
// 卡片正面佈局（以實卡 2-2-026 蒂蕾喵 為準）：
//   ★★★  ← 左下角，金黃色填實五角星
//   蒂蕾喵  ← 星星下方，黑字白底橫幅
//
// 演算法：
//   1. 裁切左下角區域（排除右側 HP/黃可能量）
//   2. 金黃色通道閾值二值化（R>G 且 G>B，排除粉紅 HP）
//   3. 沿垂直軸掃描，找每列局部最高點 → 上尖端
//   4. 尖端數量 = 星等
//

/** 裁切卡片左下角的星等+名字區域 */
export function cropStarRegion(canvas) {
  const w = canvas.width, h = canvas.height;
  // 左下角：水平 5%~42%（含星星+名字），垂直 68%~96%
  const sx = Math.floor(w * 0.05);
  const sy = Math.floor(h * 0.68);
  const sw = Math.max(1, Math.floor(w * 0.37));
  const sh = Math.max(1, Math.floor(h * 0.28));
  const c = document.createElement('canvas');
  c.width = sw; c.height = sh;
  c.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return c;
}

/**
 * 從裁切後的星等區域畫布中，數金黃色星星的上尖端數。
 * @param {HTMLCanvasElement} starCanvas - cropStarRegion() 的輸出
 * @returns {{ count: number, confidence: number }} count=星等(0~6), confidence=可信度(0~1)
 */
export function countStarsByTips(starCanvas) {
  const ctx = starCanvas.getContext('2d');
  const w = starCanvas.width, h = starCanvas.height;
  if (w < 4 || h < 4) return { count: 0, confidence: 0 };

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // Step 1: 金黃色閾值二值化
  // 金黃色特徵：R 很高(>180), G 中高(>120), B 低(<100), R > G > B
  // 排除粉紅色（HP 數字：R 高但 B 也高）
  const binary = new Uint8Array(w * h); // 1 = 可能是星星像素
  let totalYellowPixels = 0;
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const r = d[o], g = d[o + 1], b = d[o + 2];
    // 金黃色：亮、偏暖、不偏藍
    if (r > 160 && g > 100 && b < 110 && r > g && r - b > 60) {
      binary[i] = 1;
      totalYellowPixels++;
    }
  }

  // 如果幾乎沒有金黃色像素 → 可能是暗場/對焦失敗/裁切偏了
  const minAreaThreshold = w * h * 0.003; // 至少佔 0.3% 面積
  if (totalYellowPixels < minAreaThreshold) {
    return { count: 0, confidence: 0 };
  }

  // Step 2: 沿垂直軸掃描，每行找「連續金黃像素段」的最高點（上尖端候選）
  //
  // 策略：
  // - 從上往下逐行掃描
  // - 在每個 x 座標上，記錄該 column 第一次遇到金黃像素的 y 座標（= 該列的上邊界）
  // - 把這些上邊界點做水平聚類（相鄰的 x 屬於同一顆星）
  // - 每個 cluster 的最低 y 點就是一顆星的「上尖端」

  // 先建立每個 x column 的「最頂部金黃像素 y 座標」
  const colTopY = new Int16Array(w); // -1 表示該列無金黃像素
  for (let x = 0; x < w; x++) colTopY[x] = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (colTopY[x] === -1 && binary[y * w + x] === 1) {
        colTopY[x] = y; // 記錄此 x 的第一個金黃像素（最高點）
      }
    }
  }

  // Step 3: 把有值的 colTopY 做水平聚類（gap > 3px = 不同星星）
  const clusters = []; // 每個 cluster = [minX, maxX, tipY]
  let curStart = -1, curMinY = h;

  for (let x = 0; x < w; x++) {
    if (colTopY[x] >= 0) {
      if (curStart < 0) { curStart = x; curMinY = colTopY[x]; }
      else { curMinY = Math.min(curMinY, colTopY[x]); }
    } else {
      if (curStart >= 0) {
        clusters.push({ startX: curStart, endX: x - 1, tipY: curMinY });
        curStart = -1;
      }
    }
  }
  if (curStart >= 0) {
    clusters.push({ startX: curStart, endX: w - 1, tipY: curMinY });
  }

  // Step 4: 過濾 — 太窄的 cluster 是雜訊（星星至少要 ~4px 寬）
  const MIN_STAR_WIDTH = Math.max(3, Math.floor(w * 0.06)); // 至少 6% 區域寬度
  const validClusters = clusters.filter(c => (c.endX - c.startX + 1) >= MIN_STAR_WIDTH);

  const starCount = Math.min(validClusters.length, 6); // MEZASTAR 最大 6 星

  // Confidence: 基於金黃面積占比 + cluster 整齊度
  const areaRatio = totalYellowPixels / (w * h);
  const avgWidth = validClusters.length > 0
    ? validClusters.reduce((s, c) => s + (c.endX - c.startX + 1), 0) / validClusters.length
    : 0;
  const widthConsistency = validClusters.length > 1
    ? 1 - (validClusters.reduce((s, c) => s + Math.abs((c.endX - c.startX + 1) - avgWidth), 0) / validClusters.length / avgWidth)
    : 1;
  const confidence = Math.min(1, areaRatio * 8 * widthConsistency); // 面積×8 做歸一化

  console.log(`[StarDetect] count=${starCount} clusters=${validClusters.length} areaRatio=${areaRatio.toFixed(3)} conf=${confidence.toFixed(2)}`);
  return { count: starCount, confidence };
}

/**
 * 根據星等從 DB 中預篩候選卡。
 * @param {number} starCount - 偵測到的星等
 * @param {number} starConfidence - 星等可信度
 * @returns {Array} 預範後的候選卡列表；若 confidence 過低則回傳全部（不預篩）
 */
export function filterByStars(starCount, starConfidence) {
  const db = getAllCards();
  if (!db || db.length === 0) return db;
  // 可信度太低 → 不預篩，交給下游處理
  if (starConfidence < 0.25 || starCount <= 0) return db;
  // 寬鬆匹配：±1 顆星容忍誤差（手機拍攝可能有漏檢）
  return db.filter(c => {
    const s = c.stars | 0;
    return Math.abs(s - starCount) <= 1;
  });
}

// ═══════════════════════════════════════════════════════
// 模板比對（原有功能）
// ═══════════════════════════════════════════════════════

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
