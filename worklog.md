# worklog.md — Pokémon MEZASTAR 卡牌辨識重構（WorkBuddy ↔ Antigravity 同步日誌）
> 每完成一個 Phase 由 WorkBuddy append 一筆，供 Antigravity 無縫接手。

## [2026-07-16 22:13] Phase 0 完成：官網結構探測
- 狀態：done
- 做了什麼：寫 `scripts/probe-mezastar.mjs` 抓 `https://www.pokemonmezastar.com.tw/cassette/11` 原始 HTML（264KB, 200 OK）並分析；另寫 `scripts/_inspect_li.mjs` 檢視單張 `<li>` 區塊。
- 關鍵發現：
  1. 網站為 Nuxt(Vue) SSR；主列表每張卡只渲染 `<img>`（卡片正面圖）+ `<p>卡號 中文名</p>`。**數值/星級/招式不是文字**，是印在卡片圖上 → 無法從官網爬出結構化數值。
  2. 73 張卡號全在 HTML（2-2-001..070 + R-2-1/2/3），中文名、橫式/直式分組齊全。
  3. 卡片圖 URL：`https://pokemonmezastar.com.tw/uploads/images/<hash>.png`（每卡一張，即卡面正面，含數值/星級視覺資訊）。
  4. 無獨立詳情頁（僅 2 個 cassette 連結）→ 全部資料在同頁。
  5. `window.__NUXT__` 僅 848 字元初始化物件，非資料載荷；資料不在 JSON 載荷。
- 異動檔案：新增 `scripts/probe-mezastar.mjs`、`scripts/_inspect_li.mjs`、`scripts/_probe_cassette11.html`（原始 HTML 留存備查）。
- 關鍵決策：**Phase 1 原假設「從官網爬 6 項數值」不成立**。改為 **對齊（reconcile）**：
  - 官網 = 權威「身分」來源（cardId 去 `TC`、中文名、正面圖）。
  - 現有 `src/data/pokemonDb.js` 已含 65 張卡的完整正確數值（表頭註明「實體卡匣背面官方印製真實參數」、且感謝玩家提供 2-2-031/024 實體數據）→ 數值以現有 DB 為準，**不重 OCR**。
- 下一步：Phase 1 寫 `scripts/scrape-mezastar.mjs`：(a) 解析官網 `<li>` 得 73 張 `{cardId, name, type(橫/直由分組), frontPhotoUrl}` 並下載圖到 `public/cards/11/`；(b) 讀現有 `PRESET_POKEMON_DB` 得數值；(c) 以 `normalize(cardId)` 對齊合併，產出統一 DB（73 張、canonical 去 TC、附照片路徑）；(d) 標註「DB 缺數值」的卡（推測 R-2-1/2/3 等）待補。
- 待 Antigravity 注意：
  - 數值來源是現有 `pokemonDb.js`（非官網）；若你那邊改了數值請同步。
  - 官網圖為卡片正面（含數值視覺），模板比對用；背面 QR 仍不可掃（機台專用）。
  - 爬取請加 delay，勿高頻率轟炸官網。

## [2026-07-16 22:20] Phase 1 完成：參考庫對齊合併（reconcile）
- 狀態：done（8 張卡待補數值，見下）
- 做了什麼：寫 `scripts/scrape-mezastar.mjs` 並執行。
  - 解析已存 HTML `_probe_cassette11.html` → 73 張卡 `{cardId(去TC), name, layout(橫/直), frontPhotoUrl}`。
  - 下載 73 張正面圖到 `public/cards/11/`（0 失敗）。
  - `loadExistingDb()` 用正則擷取 `pokemonDb.js` 的 `PRESET_POKEMON_DB` 陣列字面 → `new Function` eval（避開瀏覽器端 `localStorage` 副作用），得 65 張數值。
  - 以 `normalize(cardId)` 對齊合併 → 產出 `src/data/pokemonDb.cards.generated.js`（73 張，canonical 去 TC，附 `frontPhoto:/cards/11/<id>.png`、`layout`）。
  - 寫 `scripts/_wire_generated.mjs`：把 `pokemonDb.js` 內聯陣列移除，改 `import { PRESET_POKEMON_DB } from './pokemonDb.cards.generated.js'`。
- 異動檔案：新增 `scripts/scrape-mezastar.mjs`、`scripts/_wire_generated.mjs`、`scripts/_generated_cards.json`、`src/data/pokemonDb.cards.generated.js`、`public/cards/11/*.png`(73)；修改 `src/data/pokemonDb.js`（改 import）。
- 關鍵結果：
  - 73 張卡身分+圖齊全；65 張帶完整數值（來自現有 DB，即實體卡背面真實參數）。
  - **8 張缺數值（已標 `needsStats:true`）**：`2-2-066 電擊怪`、`2-2-067 電擊獸`、`2-2-068 電擊魔獸`、`2-2-069 伽勒爾喵喵`、`2-2-070 喵頭目`、`R-2-1 皮卡丘`、`R-2-2 噴火龍`、`R-2-3 耿鬼`。
  - 兩個檔案 `node --check` 語法 OK；`PRESET_POKEMON_DB` 長度 73。
- 下一步：Phase 2 重構 `CardRegister.jsx`：模板比對（主，用 `frontPhoto`）+ 卡號 OCR 確認 + VLM 備援；保留 auto-crop；查詢 `normalize` 去 TC。
- 待 Antigravity 注意：
  - 8 張 `needsStats` 卡無數值 → 推薦引擎對它們會缺參數。來源是卡片圖上印的數值（官網非文字），需「實體卡讀數」或「一次性離線 OCR 卡片圖」補。要不要補由你/使用者定。
  - `pokemonDb.js` 現只留 `POKEMON_TYPES` / `TYPE_MATCHUPS` / 推薦邏輯，數值陣列已外包到 `pokemonDb.cards.generated.js`。
  - 其他代數：腳本參數化 `cassetteId`，未來 `node scripts/scrape-mezastar.mjs 10` 等即可複用。

## [2026-07-16 22:30] Phase 2 完成：CardRegister 辨識管線重構（模板比對為主）
- 狀態：done
- 做了什麼：
  - 重構 `captureAndOCR`，辨識順序改為：(0) 模板比對（主、離線）→ (0.5 中置信) 卡號 OCR 確認 → (1) QR 快取 → (2) 自動裁切 → (3) GAS 代理 VLM → (4) 直接 VLM。後四者在 `if (!resultObj)` 內，模板命中即短路。
  - 模板比對信心閾值：≥0.80 直接命中（離線、瞬時，無網路/模型）；0.55–0.80 再叫 `ocrCardNumber()` 只問卡號確認；<0.55 才降級 QR/VLM。
  - `switchTab` 進入 ocr 頁時預熱 `ensureReferenceHashes()`（背景載入 73 張官網正面圖），首次拍照不再卡。
  - 修復關鍵 bug：原 GAS 代理 OCR 區塊未受 `!resultObj` 閘控，會用慢速 VLM 覆蓋模板命中結果 → 改為 `if (syncUrl && !resultObj)`。
  - 更新相機提示文案（明確「對準正面→秒速模板比對；不確定時自動降級 OCR/VLM」）。
- 異動檔案：修改 `src/components/CardRegister.jsx`（import 增 `ensureReferenceHashes`；重構 `captureAndOCR`；`switchTab` 預熱；凍結 QR 路徑加註；提示文案）。
- 關鍵決策：
  - 模板比對用官網正面圖 `aHash+dHash`（16×16、中央 72% 裁切、hamming 距離）。閾值為初版經驗值，實機拍攝後可能需微調。
  - VLM 僅作「機台敵卡 / 模板+QR 都失敗」最後備援 → 解決 nvidia/nemotron 免費模型過慢痛點。
- 下一步：實機測試模板比對命中率；若 0.80 過嚴導致大量降到 OCR/VLM，下調至 ~0.70。
- 待 Antigravity 注意：
  - `ocrCardNumber()` 與直接 VLM 仍走 OpenRouter 免費 nemotron；換模型請同步 `model` 字串（CardRegister 兩處 + ScreenOcr + backend）。
  - 模板比對目前只涵蓋銀河第二彈（SERIES_DIR='11'）；多代數需在 `cardTemplateMatcher.js` 參數化 series 並載入對應 `public/cards/<id>/`。

## [2026-07-16 22:35] Phase 3 完成：ScreenOcr 機台敵卡 VLM 保留（不動）
- 狀態：done（無程式異動）
- 做了什麼：確認 `src/components/ScreenOcr.jsx` 仍為「整張機台螢幕 → VLM 辨識對手」的 VLM-only 路徑，符合規劃（機台敵卡無可掃描 QR/卡號，只能用 VLM）。未改動其邏輯。
- 異動檔案：無。
- 關鍵決策：機台敵卡暫不納入模板比對（參考庫只有自己的卡正面圖，對手螢幕無對應模板）。若要做敵卡快識，需另建「對手名稱→推薦」離線快查表。
- 待 Antigravity 注意：
  - ScreenOcr 使用者文案寫「Gemma 4」但實際模型是 `nvidia/nemotron-3-nano-omni-30b`（前後不一致，預存 wording 問題，非本 Phase 範圍，可擇日修）。
  - 若優化 ScreenOcr 的 VLM prompt/模型，注意 `mode='screen'` 對應 backend `handleOcrAnalysis` 的 screen 分支。

## [2026-07-16 22:40] Phase 4 完成：QR_CACHE 凍結 + 死依賴確認 + 修復匯出斷鏈
- 狀態：done
- 做了什麼：
  - 凍結 `checkQr`/`saveQr`/`QR_CACHE`：在 `backend/google_apps_script.js` 的 `doPost` QR 分支、兩個 handler、`setupSheetIfNeeded` 建表處各加「FROZEN (Phase 4, 2026-07-16)」註解，說明「實體卡背面 QR 為機台專用、一般掃描器掃不到 → 此路徑對自己的卡幾乎不觸發，僅留作防禦性後備」。前端 `CardRegister.jsx` 的 `handleAdd` 存 QR 與 `captureAndOCR` 的 `_newQrCode` 標記也加同等凍結註解。
  - 確認死依賴已清理：`package.json` 已無 `tesseract.js`（deps 僅 `jsqr`/`react`/`react-dom`）；`src/components/QrScanner.jsx` 孤立檔案不存在（components 目錄無此檔）。
  - **修復 Phase 1 遺留匯出斷鏈 bug**：`pokemonDb.js` 第 1 行 `import { PRESET_POKEMON_DB }` 後未 re-export，導致 `cardTemplateMatcher.js` / `ScreenOcr.jsx` / `CardRegister.jsx` 匯入 `PRESET_POKEMON_DB` 失敗、`npm run build` 報 `MISSING_EXPORT`。已加 `export { PRESET_POKEMON_DB };` 重新匯出（保留本地 import 供 `reloadActiveDb` 使用）。
- 異動檔案：修改 `backend/google_apps_script.js`（凍結註解）、`src/components/CardRegister.jsx`（凍結註解）、`src/data/pokemonDb.js`（補 re-export）。
- 關鍵結果：`npm run build` 通過（26 modules transformed，dist 產出正常）。這是首次完整建置成功（Phase 1 只做過 `node --check` 語法檢查，未發現此匯出斷鏈）。
- 下一步：可部署 dist；視需要補 8 張 `needsStats` 卡數值；未來多代數擴充。
- 待 Antigravity 注意：
  - 若改 `pokemonDb.js` 匯出結構，務必保留 `PRESET_POKEMON_DB` 的 re-export，否則模板比對與 ScreenOcr 會再斷。
  - QR 凍結路徑保留即可，無需移除；若要徹底移除需同步改 backend + CardRegister 三處。

## [2026-07-16 23:17] 補充：如何實機測試（手機相機）
- 狀態：done（運行說明）
- 說明：專案 `vite.config.js` 已內建 `basicSsl()` + `server.host:true` + `server.https:true`，dev server 本身就是 HTTPS + 允許 LAN 連線，手機相機可直接用，無須改 scripts。
- 啟動：`npm run dev`（背景跑，task 5vKUn2）。
- 網址：
  - 手機（同 Wi-Fi）：`https://<本機LAN-IP>:5175/`（本次為 `https://192.168.0.196:5175/`；因 5173/5174 被舊 dev server 佔用，故跳到 5175）。
  - 電腦本機：`https://localhost:5175/`（用筆電 webcam 測）。
- 手機注意：自簽憑證會跳「非私人連線」→ 點 進階/Advanced → 繼續前往/Proceed 即可；每次重開要再點一次。
- 驗證：`curl -sk https://localhost:5175/ -o /dev/null -w "%{http_code}"` 回傳 200。
- 待 Antigravity 注意：舊 dev server 佔用 5173/5174，必要時清掉殘留 node 程序讓埠號固定；若要正式 HTTPS 免警告網址，可部署到 cloudstudio / GitHub Pages。
