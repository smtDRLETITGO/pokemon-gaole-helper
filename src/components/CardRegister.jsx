import React, { useState, useMemo, useRef, useCallback } from 'react';
import jsQR from "jsqr";
import { PRESET_POKEMON_DB, ACTIVE_PRESET_DB, updateLocalDbOverride } from '../data/pokemonDb';
import { matchTemplateCanvas, ensureReferenceHashes } from '../data/cardTemplateMatcher';

function cleanAndParseJson(text) {
  let cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;
  let endIdx = -1;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = cleaned.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = cleaned.lastIndexOf(']');
  }
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);

    // Attempt 1: Parse as-is
    try { return JSON.parse(cleaned); } catch (_) { /* fall through to repair */ }

    // Attempt 2: Repair common LLM JSON errors
    let repaired = cleaned
      .replace(/,\s*([}\]])/g, '$1')          // trailing commas: {a:1,} → {a:1}
      .replace(/'/g, '"')                       // single quotes → double quotes
      .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":') // unquoted keys: {hp: 1} → {"hp": 1}
      .replace(/:\s*"([^"]*?)"\s*或\s*"([^"]*?)"/g, ':"$1"'); // "front" 或 "back" → "front"
    try { return JSON.parse(repaired); } catch (_) { /* fall through */ }

    // Attempt 3: Strip non-ASCII control chars and retry
    repaired = repaired.replace(/[\x00-\x1f\x7f]/g, '');
    try { return JSON.parse(repaired); } catch (e) {
      throw new Error("大模型回傳了 JSON 格式，但語法不正確：" + e.message);
    }
  }
  const snippet = text.length > 50 ? text.substring(0, 50).replace(/\n/g, ' ') + "..." : text.replace(/\n/g, ' ');
  throw new Error("未能在畫面中辨識到有效的卡匣資訊，或大模型未按格式回答。(回傳內容: " + snippet + ")");
}




// ── 星等顯示 ──
const STAR_COLORS = { 6: '#FFD700', 5: '#C0A000', 4: '#9370DB', 3: '#4A9EFF', 2: '#50C878', 1: '#808080' };
const STAR_LABELS = { 6: '超級明星', 5: '明星', 4: '精選', 3: '普通', 2: '普通', 1: '普通' };

// 正規化卡號：去空白與尾端 TC（2-2-001 TC → 2-2-001）
const normalizeId = (s) => String(s || '').replace(/\s+/g, '').replace(/TC$/i, '');

// 卡號 OCR 確認：裁切左上角卡號區 → 迷你 VLM（僅問卡號）→ 回傳 cardId 或 null
async function ocrCardNumber(canvas) {
  const apiKey = localStorage.getItem('openrouter_api_key');
  if (!apiKey) return null;
  const cw = Math.max(1, Math.floor(canvas.width * 0.32));
  const ch = Math.max(1, Math.floor(canvas.height * 0.16));
  const cc = document.createElement('canvas');
  cc.width = cw; cc.height = ch;
  cc.getContext('2d').drawImage(canvas, 0, 0, cw, ch, 0, 0, cw, ch);
  const url = cc.toDataURL('image/jpeg', 0.9);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://smtDRLETITGO.github.io/pokemon-gaole-helper/",
        "X-Title": "MEZASTAR Battle Helper"
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        messages: [
          { role: "system", content: "你是一個卡號辨識器。請只看圖片左上角的卡匣編號（格式如 2-2-001 或 2-2-001 TC），回傳『只』該編號字串。若看不清楚回傳 null。不要任何其他文字。" },
          { role: "user", content: [
            { type: "text", text: "圖片左上角的卡號是？" },
            { type: "image_url", image_url: { url } }
          ] }
        ]
      })
    });
    if (!res.ok) return null;
    const j = await res.json();
    let t = j.choices?.[0]?.message?.content || '';
    t = t.replace(/^```json\s*/i, '').replace(/```$/i, '').trim().replace(/^["']|["']$/g, '');
    if (!t || t.toLowerCase() === 'null') return null;
    return t;
  } catch (e) { console.warn('ocrCardNumber failed', e); return null; }
}

function StarBadge({ stars }) {
  return (
    <span style={{ color: STAR_COLORS[stars] || '#888', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '-1px' }}>
      {'★'.repeat(stars)}
    </span>
  );
}

// ── 屬性徽章 ──
const TYPE_COLORS = {
  '一般':'#9E9E9E','火':'#FF6B35','水':'#4FC3F7','草':'#66BB6A','電':'#FFD54F',
  '冰':'#80DEEA','格鬥':'#EF5350','毒':'#AB47BC','地面':'#FFAB40','飛行':'#90CAF9',
  '超能力':'#F48FB1','蟲':'#AED581','岩石':'#BCAAA4','幽靈':'#7E57C2','龍':'#5C6BC0',
  '惡':'#5D4037','鋼':'#78909C','妖精':'#F06292',
};
function TypeBadge({ type }) {
  if (!type) return null;
  return (
    <span style={{
      background: TYPE_COLORS[type] || '#555',
      color: '#fff', borderRadius: '20px',
      padding: '1px 8px', fontSize: '0.7rem', fontWeight: 700,
      marginRight: '4px', display: 'inline-block',
      textShadow: '0 1px 2px rgba(0,0,0,0.4)',
    }}>{type}</span>
  );
}

// ── 卡片 miniCard UI ──
function MiniCard({ pokemon, onAdd, ownedCount }) {
  const isOwned = ownedCount > 0;
  return (
    <div style={{
      background: isOwned
        ? 'linear-gradient(135deg,rgba(100,220,120,0.18),rgba(30,40,60,0.85))'
        : 'linear-gradient(135deg,rgba(30,40,60,0.85),rgba(20,30,50,0.9))',
      border: isOwned ? '1.5px solid rgba(100,220,120,0.5)' : '1.5px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      position: 'relative',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    }} onClick={() => onAdd(pokemon)}>
      {/* 擁有標記 */}
      {isOwned && (
        <span style={{
          position: 'absolute', top: '6px', right: '6px',
          background: '#4CAF50', color: '#fff',
          borderRadius: '50%', width: '18px', height: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.6rem', fontWeight: 800, zIndex: 1,
        }}>
          {ownedCount > 1 ? ownedCount : '✓'}
        </span>
      )}
      {/* 卡號 */}
      <div style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.6rem', fontFamily:'monospace' }}>
        {pokemon.diskCode}
      </div>
      {/* 名稱 */}
      <div style={{ color:'#fff', fontWeight:700, fontSize:'0.85rem', lineHeight:1.2 }}>
        {pokemon.name}
      </div>
      {/* 星等 */}
      <StarBadge stars={pokemon.stars} />
      {/* 屬性 */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:'2px', marginTop:'2px' }}>
        <TypeBadge type={pokemon.type1} />
        <TypeBadge type={pokemon.type2} />
      </div>
      {/* 加入按鈕 */}
      <button style={{
        marginTop: '4px',
        background: isOwned
          ? 'rgba(76,175,80,0.3)'
          : 'linear-gradient(90deg,#4A90D9,#7B52D9)',
        border: 'none', borderRadius: '8px',
        color: '#fff', fontWeight: 700, fontSize: '0.75rem',
        padding: '4px 0', cursor: 'pointer',
        width: '100%',
      }}>
        {isOwned ? `再加一張（共 ${ownedCount}）` : '＋ 加入背包'}
      </button>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 主組件：三合一卡牌登錄
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function CardRegister({ collection, onAddCard, onClose }) {
  const [activeTab, setActiveTab] = useState('catalog');     // 'catalog' | 'search' | 'ocr'
  const [filterSeries, setFilterSeries] = useState('all');
  const [filterStars, setFilterStars] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [ocrStatus, setOcrStatus] = useState('idle');       // 'idle'|'loading'|'done'|'error'
  const [ocrResult, setOcrResult] = useState(null);
  const [ocrMatches, setOcrMatches] = useState([]);
  const [addedFlash, setAddedFlash] = useState(null);
  const [streamActive, setStreamActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Check if inside LINE / FB / Instagram WebView
  const isWebView = /Line|FBAN|FBAV|Instagram/i.test(navigator.userAgent);

  // 擁有數量 map
  const ownedCountMap = useMemo(() => {
    const map = {};
    collection.forEach(c => {
      map[c.cardId] = (map[c.cardId] || 0) + 1;
    });
    return map;
  }, [collection]);

  // 篩選後的圖鑑清單
  const catalogList = useMemo(() => {
    return ACTIVE_PRESET_DB.filter(p => {
      if (filterSeries !== 'all' && p.series !== filterSeries) return false;
      if (filterStars !== 'all' && String(p.stars) !== filterStars) return false;
      return true;
    });
  }, [filterSeries, filterStars]);

  // 搜尋自動完成
  const handleSearchInput = (val) => {
    setSearchQuery(val);
    if (!val.trim()) { setSuggestions([]); return; }
    const q = val.trim().toLowerCase();
    const matches = ACTIVE_PRESET_DB.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.diskCode.toLowerCase().includes(q) ||
      p.series.toLowerCase().includes(q)
    ).slice(0, 8);
    setSuggestions(matches);
  };

  // 加入背包
  const handleAdd = (pokemon) => {
    const newEntry = { ...pokemon, storageNote: '', quantity: 1 };
    
    // Asynchronously save to QR Cache if it was a new QR code
    // （FROZEN 後備路徑：實體卡背面 QR 為機台專用，一般掃描器掃不到，故此分支對自己的卡幾乎不觸發。
    //   保留以相容後端 QR_CACHE 防禦性後備，見 backend/google_apps_script.js 凍結說明。）
    if (pokemon._newQrCode) {
      const syncUrl = localStorage.getItem('gaole_sync_url');
      if (syncUrl) {
        // Strip out the internal tracking flag before saving
        const savePayload = { ...pokemon };
        delete savePayload._newQrCode;
        fetch(syncUrl, {
          method: 'POST',
          credentials: 'omit',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'saveQr', qrCode: pokemon._newQrCode, cardData: savePayload })
        }).catch(e => console.warn("saveQr failed", e));
      }
    }

    onAddCard(newEntry);
    setAddedFlash(pokemon.cardId);
    setTimeout(() => setAddedFlash(null), 800);
  };

  // ── OCR 相機 ──
  const startCamera = useCallback(async () => {
    try {
      const constraints = {
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.log("Video play pending:", e));
      }
      setOcrStatus('idle');
      setStreamActive(true);
    } catch (err) {
      console.warn("First camera constraint failed, trying basic fallback...", err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.log("Video play pending:", e));
        }
        setOcrStatus('idle');
        setStreamActive(true);
      } catch (fallbackErr) {
        console.error("Camera completely failed:", fallbackErr);
        setOcrResult('⚠️ 相機開啟失敗。請確認瀏覽器相機設定，或手動點選上方「啟用相機鏡頭」。');
        setOcrStatus('error');
        setStreamActive(false);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setStreamActive(false);
  }, []);

  const captureAndOCR = useCallback(async () => {
    if (!videoRef.current) return;
    
    const apiKey = localStorage.getItem('openrouter_api_key');
    const syncUrl = localStorage.getItem('gaole_sync_url');
    
    if (!apiKey) {
      alert('⚠️ 未設定 OpenRouter API Key！\n請先前往「連線設定 (⚙️)」填入您的免費 API Key，即可啟用精準的大模型相機掃描。');
      setOcrStatus('idle');
      return;
    }

    // Capture full video frame
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    setOcrStatus('loading');
    setOcrResult('分析影像中...');

    try {
      let resultObj = null;
      let qrPayload = null;
      let finalImageUrl = canvas.toDataURL('image/jpeg', 0.85);

      // 0. 模板比對（主路徑，離線、瞬時）：與官網正面圖感知雜湊比對
      //    參考庫已在進入相機時預熱（switchTab 內 ensureReferenceHashes）。
      try {
        setOcrResult('正在比對本地參考庫（模板比對）...');
        const tmpl = await matchTemplateCanvas(canvas);
        if (tmpl && tmpl.confidence >= 0.80) {
          // 高信心 → 直接命中，無需任何模型/網路
          const dbCard = ACTIVE_PRESET_DB.find(p => normalizeId(p.cardId) === normalizeId(tmpl.cardId));
          if (dbCard) {
            resultObj = { ...dbCard, _fromTemplate: true };
            setOcrResult(`模板比對命中：${dbCard.name}（信心 ${(tmpl.confidence * 100 | 0)}%）`);
          }
        } else if (tmpl && tmpl.confidence >= 0.55) {
          // 中信心 → 卡號 OCR 確認（只問卡號，便宜，避免慢速 VLM）
          setOcrResult('模板比對中置信，正在 OCR 卡號確認...');
          const ocrId = await ocrCardNumber(canvas);
          if (ocrId) {
            const dbCard = ACTIVE_PRESET_DB.find(p => normalizeId(p.cardId) === normalizeId(ocrId));
            if (dbCard) {
              resultObj = { ...dbCard, _fromTemplate: true };
              setOcrResult(`模板比對 + 卡號 OCR 確認：${dbCard.name}（${ocrId}）`);
            }
          }
        }
      } catch (tmplErr) {
        console.warn('模板比對失敗，降級至 QR/VLM：', tmplErr);
      }

      // 1. 若模板比對未命中，掃描 QR Code（機台敵卡 / 舊流程）
      if (!resultObj) {
        const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageDataObj.data, imageDataObj.width, imageDataObj.height);
        qrPayload = qrCode ? qrCode.data : null;

        // 2. If QR found, try to fetch from Cache
        if (qrPayload && syncUrl) {
          setOcrResult('QR Code 讀取成功，正在比對快取資料庫...');
          try {
            const qrRes = await fetch(syncUrl, {
              method: 'POST',
              credentials: 'omit',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify({ action: 'checkQr', qrCode: qrPayload })
            });
            const qrData = await qrRes.json();
            if (qrData.success && qrData.found) {
              resultObj = qrData.result;
              resultObj._fromCache = true;
            }
          } catch (e) { console.warn("QR Cache check failed:", e); }
        }

        // 3. Auto-Crop for VLM if not found in Cache
        if (!resultObj) {
          setOcrResult('正在裁切畫面並呼叫大模型深度解析...');
          const cropX = canvas.width * 0.05;
          const cropY = canvas.height * 0.10;
          const cropW = canvas.width * 0.90;
          const cropH = canvas.height * 0.80;
          const croppedCanvas = document.createElement('canvas');
          croppedCanvas.width = cropW;
          croppedCanvas.height = cropH;
          const croppedCtx = croppedCanvas.getContext('2d');
          croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          finalImageUrl = croppedCanvas.toDataURL('image/jpeg', 0.85);
        }
      }

      // GAS 代理 OCR：僅在模板比對 + QR 都未命中時才呼叫（避免覆蓋模板命中結果）
      if (syncUrl && !resultObj) {
        try {
          // Send request via Google Apps Script server-side proxy
          const response = await fetch(syncUrl, {
            method: 'POST',
            credentials: 'omit',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: 'ocr',
              imageBase64: finalImageUrl,
              openRouterApiKey: apiKey,
              mode: 'tag'
            })
          });

          if (response.ok) {
            const resData = await response.json();
            if (resData.success) {
              resultObj = resData.result;
            } else {
              console.warn("GAS proxy returned error, falling back to direct client call:", resData.error);
            }
          } else {
            console.warn("GAS proxy HTTP error, falling back to direct client call");
          }
        } catch (gasErr) {
          console.warn("GAS proxy exception, falling back to direct client call:", gasErr);
        }
      }

      // Fallback: Direct request to OpenRouter if GAS wasn't used or failed
      if (!resultObj) {
        const systemPrompt = "你是一個專業的寶可夢街機 MEZASTAR（星塵/銀河系列）卡匣辨識專家。\n你的任務是分析使用者上傳的卡匣圖片，並精準提取出所有的欄位資訊。\n\n請仔細辨識圖片中出現的以下實體資訊：\n\n【如果是卡匣背面 (Back of the Tag)】：\n1. 卡匣編號 (卡片左上角，格式通常為：X-X-XXX 後綴字母，例如：2-2-031 TC)\n2. 寶可夢名稱 (位於頂部中央，繁體中文，例如：狂歡浪舞鴨)\n3. 星等 (編號下方的星星數量，請仔細數，通常為 2 到 6 顆星，例如：4)\n4. 招式名稱 (位於粉紅色/綠色/藍色等招式欄中，例如：下盤踢)\n5. 招式屬性 (招式名稱右側的屬性圖標文字，例如：格鬥)\n6. 招式分類 (如果是拳頭圖標則為「物理」，如果是同心圓/星狀光芒圖標則為「特殊」)\n7. 六維數值 (這是最容易讀錯的地方，請嚴格按照以下顏色與上下左右相對位置讀取右側數值區塊)：\n   - 第一行（黃綠色底）：只有一項，即 HP (體力)\n   - 第二行（紅色底）：左邊是「攻擊」，右邊是「防禦」\n   - 第三行（藍色底）：左邊是「特攻」，右邊是「特防」\n   - 第四行（深綠色底）：只有一項，即「速度」\n   *請絕對不要將第一行的 HP 誤認為速度，也不要將第四行的速度誤認為 HP。*\n\n【如果是卡匣正面 (Front of the Tag)】：\n1. 卡匣編號 (卡片右下角)\n2. 寶可夢名稱 (位於下方中央偏左)\n3. 星等 (名稱上方的星星數量)\n4. 寶可能量 (右下角的紅色/橙色大數字，例如：118)\n5. 寶可夢屬性 (名稱下方的屬性圓圈圖標)\n\n【回傳格式要求】：\n請「只」回傳一個 JSON 格式的物件，不要包含 any markdown tags, no ```json formatting, no conversational text. 如果某個欄位在圖片中完全無法看清或不存在，請填入 null。\n\nJSON 格式欄位如下：\n{\n  \"cardSide\": \"front\" 或 \"back\",\n  \"cardId\": \"卡匣編號(字串)\",\n  \"name\": \"寶可夢名稱(字串)\",\n  \"stars\": 星等(整數),\n  \"pokeEne\": 寶可能量(整數，若無則為null),\n  \"type1\": \"主屬性(字串)\",\n  \"type2\": \"副屬性(字串)\",\n  \"moveName\": \"招式名稱(字串)\",\n  \"moveType\": \"招式屬性(字串)\",\n  \"moveCategory\": \"招式分類(物理 或 特殊)\",\n  \"hp\": HP值(整數),\n  \"attack\": 攻擊力(整數),\n  \"defense\": 防禦力(整數),\n  \"spAtk\": 特攻值(整數),\n  \"spDef\": 特防值(整數),\n  \"speed\": 速度值(整數)\n}";

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://smtDRLETITGO.github.io/pokemon-gaole-helper/",
            "X-Title": "MEZASTAR Battle Helper"
          },
          body: JSON.stringify({
            model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: "請分析這張裁切好的卡片圖片，找出對應資訊" },
                  { type: "image_url", image_url: { url: finalImageUrl } }
                ]
              }
            ]
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenRouter 伺服器回報狀態碼 ${response.status}: ${errText}`);
        }
        const resData = await response.json();
        let content = resData.choices[0].message.content;
        content = content.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        resultObj = cleanAndParseJson(content);
      }

      if (!resultObj || (!resultObj.name && !resultObj.cardId)) {
        throw new Error('無法從圖像中解析有效的寶可夢資料');
      }
      
      // If VLM was used and QR exists, tag it so we can save it later
      // （FROZEN 後備：背面 QR 機台專用、一般掃描器掃不到，qrPayload 通常為 null；此分支極少觸發）
      if (qrPayload && !resultObj._fromCache) {
        resultObj._newQrCode = qrPayload;
      }

      setOcrResult(`成功分析！寶可夢：${resultObj.name || '未知'}, 編號：${resultObj.cardId || '未知'}`);

      // Match the recognized card with ACTIVE_PRESET_DB if possible
      const matchedCode = resultObj.cardId || '';
      const matchedName = resultObj.name || '';
      
      let finalCard = null;
      
      // 1. Try exact match on BOTH Name and ID
      let dbMatch = ACTIVE_PRESET_DB.find(p => 
        (matchedCode && p.cardId.trim() === matchedCode.trim()) && 
        (matchedName && p.name.trim() === matchedName.trim())
      );

      // 2. If not found, Name is generally much more reliable in OCR than a single digit in ID
      if (!dbMatch && matchedName) {
        dbMatch = ACTIVE_PRESET_DB.find(p => p.name.trim() === matchedName.trim());
      }

      // 3. If still not found, fallback to ID match
      if (!dbMatch && matchedCode) {
        dbMatch = ACTIVE_PRESET_DB.find(p => p.cardId.trim() === matchedCode.trim());
      }

      if (dbMatch) {
        // Merge scanned stats into the verified preset card structure (prioritizing scanned values)
        finalCard = {
          ...dbMatch,
          // Trust the DB's cardId and name if we matched it, because OCR numbers are easily misread (e.g. 044 vs 034)
          cardId: dbMatch.cardId,
          name: dbMatch.name,
          _newQrCode: resultObj._newQrCode || undefined,
          hp: Number(resultObj.hp) || dbMatch.hp,
          attack: Number(resultObj.attack) || dbMatch.attack,
          defense: Number(resultObj.defense) || dbMatch.defense,
          spAtk: Number(resultObj.spAtk) || dbMatch.spAtk,
          spDef: Number(resultObj.spDef) || dbMatch.spDef,
          speed: Number(resultObj.speed) || dbMatch.speed,
          moveName: resultObj.moveName || dbMatch.moveName,
          moveType: resultObj.moveType || dbMatch.moveType,
          moveCategory: resultObj.moveCategory || dbMatch.moveCategory
        };
      } else {
        // Create custom card based on VLM output
        finalCard = {
          _newQrCode: resultObj._newQrCode || undefined,
          cardId: resultObj.cardId || `custom-${Date.now()}`,
          name: resultObj.name || "未命名卡匣",
          stars: Number(resultObj.stars) || 3,
          type1: resultObj.type1 || "一般",
          type2: resultObj.type2 || "",
          moveName: resultObj.moveName || "撞擊",
          moveType: resultObj.moveType || "一般",
          moveCategory: resultObj.moveCategory || "物理",
          hp: Number(resultObj.hp) || 100,
          attack: Number(resultObj.attack) || 60,
          defense: Number(resultObj.defense) || 60,
          spAtk: Number(resultObj.spAtk) || 60,
          spDef: Number(resultObj.spDef) || 60,
          speed: Number(resultObj.speed) || 60
        };
      }

      // Update/insert into the dynamic self-updating database overrides
      if (finalCard.cardId) {
        updateLocalDbOverride(finalCard);
      }

      setOcrMatches([finalCard]);
      setOcrStatus('done');

    } catch (err) {
      console.error(err);
      setOcrResult(`辨識失敗: ${err.message}`);
      setOcrStatus('error');
    }
  }, []);

  const switchTab = (tab) => {
    if (tab !== 'ocr') stopCamera();
    setActiveTab(tab);
    if (tab === 'ocr') {
      // 預熱參考庫雜湊（背景載入 73 張官網正面圖），首次拍照比對才不會卡
      ensureReferenceHashes().catch(() => {});
      setTimeout(startCamera, 300);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose?.();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,15,30,0.97)',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Noto Sans TC', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'linear-gradient(135deg,rgba(74,144,217,0.15),rgba(123,82,217,0.15))',
      }}>
        <div>
          <div style={{ color:'#fff', fontWeight:800, fontSize:'1.05rem' }}>📦 登錄卡匣</div>
          <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.7rem' }}>
            背包已有 {collection.length} 張
          </div>
        </div>
        <button onClick={handleClose} style={{
          background: 'rgba(255,255,255,0.1)', border: 'none',
          borderRadius: '50%', width: '32px', height: '32px',
          color: '#fff', fontSize: '1rem', cursor: 'pointer',
        }}>✕</button>
      </div>

      {/* Tab 切換 */}
      <div style={{
        display: 'flex', gap: '4px',
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.3)',
      }}>
        {[
          { id:'catalog', label:'📖 圖鑑清單' },
          { id:'search',  label:'🔍 關鍵字' },
          { id:'ocr',     label:'📷 相機辨識' },
        ].map(tab => (
          <button key={tab.id} onClick={() => switchTab(tab.id)} style={{
            flex: 1,
            background: activeTab === tab.id
              ? 'linear-gradient(90deg,#4A90D9,#7B52D9)'
              : 'rgba(255,255,255,0.06)',
            border: 'none', borderRadius: '8px',
            color: '#fff', fontWeight: activeTab === tab.id ? 700 : 400,
            fontSize: '0.75rem', padding: '8px 4px',
            cursor: 'pointer', transition: 'all 0.2s',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* 內容區 */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* ── 圖鑑清單 ── */}
        {activeTab === 'catalog' && (
          <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
            {/* 篩選列 */}
            <div style={{
              display: 'flex', gap: '8px', padding: '8px 12px',
              background: 'rgba(0,0,0,0.2)',
            }}>
              <select value={filterSeries} onChange={e => setFilterSeries(e.target.value)} style={{
                flex: 1, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)',
                borderRadius:'8px', color:'#fff', padding:'6px 8px', fontSize:'0.75rem',
              }}>
                <option value="all">全部彈數</option>
                {[...new Set(ACTIVE_PRESET_DB.map(p => p.series))].sort().map(s => (
                  <option key={s} value={s}>⭐ {s}</option>
                ))}
              </select>
              <select value={filterStars} onChange={e => setFilterStars(e.target.value)} style={{
                flex: 1, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)',
                borderRadius:'8px', color:'#fff', padding:'6px 8px', fontSize:'0.75rem',
              }}>
                <option value="all">全部星等</option>
                <option value="6">★★★★★★ 超級明星</option>
                <option value="5">★★★★★ 明星</option>
                <option value="4">★★★★ 精選</option>
                <option value="3">★★★ 普通</option>
                <option value="2">★★ 普通</option>
                <option value="1">★ 普通</option>
              </select>
            </div>
            {/* 卡片數量 */}
            <div style={{ padding:'4px 12px', color:'rgba(255,255,255,0.4)', fontSize:'0.7rem' }}>
              顯示 {catalogList.length} 種卡匣
            </div>
            {/* 卡片格 */}
            <div style={{
              flex:1, overflowY:'auto', padding:'8px 12px',
              display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'8px',
            }}>
              {catalogList.map(pokemon => (
                <div key={pokemon.cardId} style={{
                  transform: addedFlash === pokemon.cardId ? 'scale(0.95)' : 'scale(1)',
                  transition: 'transform 0.2s',
                }}>
                  <MiniCard
                    pokemon={pokemon}
                    onAdd={handleAdd}
                    ownedCount={ownedCountMap[pokemon.cardId] || 0}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 關鍵字搜尋 ── */}
        {activeTab === 'search' && (
          <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
            <div style={{ padding: '12px' }}>
              <div style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px',
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px',
              }}>
                <span style={{ fontSize:'1.1rem' }}>🔍</span>
                <input
                  value={searchQuery}
                  onChange={e => handleSearchInput(e.target.value)}
                  placeholder="輸入寶可夢名稱（如：超夢、狂歡）或卡號（如：1-2-028）"
                  style={{
                    flex:1, background:'transparent', border:'none',
                    color:'#fff', fontSize:'0.9rem',
                    outline:'none',
                  }}
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setSuggestions([]); }}
                    style={{ background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'1rem' }}>
                    ✕
                  </button>
                )}
              </div>
              <div style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.7rem', marginTop:'6px', padding:'0 4px' }}>
                💡 可搜尋名稱、卡號或彈次名稱
              </div>
            </div>
            {/* 搜尋結果 */}
            <div style={{ flex:1, overflowY:'auto', padding:'0 12px' }}>
              {!searchQuery && (
                <div style={{ textAlign:'center', padding:'40px 20px', color:'rgba(255,255,255,0.3)' }}>
                  <div style={{ fontSize:'3rem', marginBottom:'12px' }}>✏️</div>
                  <div>輸入關鍵字開始搜尋</div>
                </div>
              )}
              {searchQuery && suggestions.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 20px', color:'rgba(255,255,255,0.3)' }}>
                  <div style={{ fontSize:'3rem', marginBottom:'12px' }}>😔</div>
                  <div>找不到「{searchQuery}」</div>
                  <div style={{ fontSize:'0.75rem', marginTop:'8px' }}>請確認名稱或卡號是否正確</div>
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'8px', paddingBottom:'16px' }}>
                {suggestions.map(pokemon => (
                  <div key={pokemon.cardId} style={{
                    transform: addedFlash === pokemon.cardId ? 'scale(0.95)' : 'scale(1)',
                    transition: 'transform 0.2s',
                  }}>
                    <MiniCard
                      pokemon={pokemon}
                      onAdd={handleAdd}
                      ownedCount={ownedCountMap[pokemon.cardId] || 0}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── OCR 相機辨識 ── */}
        {activeTab === 'ocr' && (
          <div style={{ display:'flex', flexDirection:'column', height:'100%', alignItems:'center', padding:'12px' }}>
            {isWebView && (
              <div style={{ color: '#ff9f0a', fontSize: '11px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.2)', marginBottom: '10px', width: '100%', maxWidth: '400px', lineHeight: '1.4' }}>
                ⚠️ <b>偵測到 LINE/社群軟體內置瀏覽器</b><br />
                由於內建瀏覽器限制了相機權限，請點擊右上角 <b>「...」選單</b> 並選擇 <b>「以瀏覽器開啟 (Chrome 或 Safari)」</b>，即可順利拍照辨識卡匣！
              </div>
            )}
            
            <div style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.75rem', marginBottom:'8px', textAlign:'center' }}>
              對準卡匣正面（含寶可夢美術）即可秒速模板比對；辨識不確定時自動降級卡號 OCR / 大模型
            </div>

            {/* 預覽框 / 啟動相機按鈕 */}
            <div style={{ width: '100%', maxWidth: '400px', marginBottom: '12px' }}>
              {streamActive ? (
                <div style={{
                  width:'100%',
                  aspectRatio:'16/9',
                  background:'rgba(0,0,0,0.5)',
                  borderRadius:'12px', overflow:'hidden',
                  border:'2px solid rgba(74,144,217,0.4)',
                  position:'relative',
                }}>
                  <video ref={videoRef} style={{ width:'100%', height:'100%', objectFit:'cover' }} playsInline muted />
                  {/* 掃描框 (Ga-Olé 卡匣形狀) */}
                  <div style={{
                    position:'absolute', 
                    top:'10%', bottom:'10%', left:'5%', right:'5%',
                    border:'3px solid rgba(255, 255, 255, 0.8)',
                    borderRadius:'9999px',
                    boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.6)',
                    pointerEvents:'none',
                  }}>
                    <div style={{
                      position:'absolute', top:'50%', left:'8%', width:'22%', height:'50%',
                      border:'2px dashed rgba(255, 255, 255, 0.4)', borderRadius:'8px', transform:'translateY(-50%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}><span style={{fontSize:'10px', color:'rgba(255,255,255,0.6)', textAlign: 'center'}}>QR<br/>Code</span></div>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  aspectRatio: '16/9', 
                  background: 'rgba(255,255,255,0.03)', 
                  borderRadius: '12px', 
                  border: '2px dashed rgba(255,255,255,0.1)',
                  padding: '20px'
                }}>
                  <button 
                    onClick={startCamera} 
                    className="btn-primary" 
                    style={{ 
                      background: 'linear-gradient(to right, #34c759, #30b0c7)', 
                      width: 'auto', 
                      padding: '10px 24px',
                      borderRadius: '50px',
                      fontWeight: 'bold',
                      fontSize: '0.85rem'
                    }}
                  >
                    📷 啟用相機鏡頭
                  </button>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                    請點擊按鈕授權啟用相機鏡頭以進行大模型辨識
                  </span>
                </div>
              )}
            </div>

            {/* 拍照按鈕 */}
            {streamActive && (
              <button onClick={captureAndOCR} disabled={ocrStatus === 'loading'} style={{
                background: ocrStatus === 'loading'
                  ? 'rgba(100,100,100,0.5)'
                  : 'linear-gradient(90deg,#4A90D9,#7B52D9)',
                border:'none', borderRadius:'50px',
                color:'#fff', fontWeight:800, fontSize:'1rem',
                padding:'12px 32px', cursor: ocrStatus === 'loading' ? 'not-allowed' : 'pointer',
                marginBottom:'12px',
              }}>
                {ocrStatus === 'loading' ? '⏳ 辨識中...' : '📸 拍照辨識'}
              </button>
            )}

            {/* 辨識結果 */}
            {(ocrStatus === 'done' || ocrStatus === 'loading') && (
              <div style={{
                width:'100%', maxWidth:'400px',
                background:'rgba(255,255,255,0.06)',
                borderRadius:'12px', padding:'12px',
              }}>
                <div style={{ color:'rgba(255,255,255,0.8)', fontSize:'0.75rem', marginBottom:'8px', fontWeight: 'bold' }}>
                  📢 {ocrResult}
                </div>
                {ocrStatus === 'done' && (
                  ocrMatches.length > 0 ? (
                    <>
                      <div style={{ color:'#4FC3F7', fontWeight:700, fontSize:'0.85rem', marginBottom:'8px' }}>
                        ✅ 找到 {ocrMatches.length} 個匹配：
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'6px' }}>
                        {ocrMatches.map(p => (
                          <MiniCard key={p.cardId} pokemon={p} onAdd={handleAdd} ownedCount={ownedCountMap[p.cardId]||0} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ color:'rgba(255,255,255,0.4)', textAlign:'center', padding:'12px' }}>
                      😔 未能比對到卡匣，請改用關鍵字搜尋
                    </div>
                  )
                )}
              </div>
            )}
            {ocrStatus === 'error' && (
              <div style={{
                background:'rgba(244,67,54,0.15)', borderRadius:'12px',
                padding:'12px 16px', color:'#ef9a9a', fontSize:'0.8rem', textAlign:'center',
                maxWidth:'400px', width:'100%', wordBreak: 'break-all'
              }}>
                📢 {ocrResult}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
