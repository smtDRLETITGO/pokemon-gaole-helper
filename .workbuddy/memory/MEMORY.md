# MEMORY.md — pokemon-gaole-helper 專案長期筆記

## 數據來源架構（2026-07-17 確認，07-17 更正）
- 官網 `https://www.pokemonmezastar.com.tw/cassette/N` 列表頁：每卡只有 `<img>`+`<p>ID NAME</p>`，**無詳情頁、無 stats API**。
- 所有代別共用圖床 `/uploads/images/<hash>.png`，按 `cassette/N` 分頁；多代擴充 = 參數化 N 跑現有 reconcile scraper。
- **官網提供**：cardId、名字、正面圖（模板比對參考庫）、版型（直/橫）、星等（印在正面左下，金黃★，可從圖讀）。
- **官網提供（已更正！）背面圖 + 六維數值**：
  - 來源：cassette/N 頁面 Nuxt payload 的 `back_image` 欄位（HTML 內嵌 JSON）
  - 腳本 `scripts/extract-backs.mjs` 可批量提取
  - 背面圖含完整六維：HP/攻擊/防禦/特攻/特防/速度（大字白色，固定右側位置）
  - **easyocr OCR 可可靠讀取（73/73=100%）**
  - ⚠️ 之前記錄的「官網不提供六維」是錯誤假設
- 星等像素計數在高清渲染圖上因光暈黏連不穩；一次性 VLM 讀圖（正面或背面）才可靠。
- **⚠️ AGY Flash 星等讀取不完美**（銀河2 驗證）：73 張中 2 張錯誤（010 四顎針龍 5★漏→6★、020 炎武王 5★→4★）。**必須用官網總表 PDF 做最終交叉驗證**——官網 PDF 按星等區段排列，是星等的最高權威來源。
- **官方銀河2 星等分佈（PDF 確認）**：6★×10(001–010) / 5×15 / 4×17 / 3×14 / 2×14 / 1×3(R系列)。

## 第三方資料集與混合管線決策（2026-07-18 AGY gemini-offload 深搜 + 驗證）
- **AGY 深搜結果**：首次呼叫 `gemini_status: UNAVAILABLE`(180s 超時)，重試成功。挖到：
  - **walbertus/mezastar-helper** GitHub → `data/mezatags.json`：1325 筆 / 544 唯一名（含跨代重複）。每筆：`name`(英)、`types`[type1,type2]、`energy`(≈PokéEne)、`stats`{hp,attack,defense,spAtk,spDef,speed}、`move`{name,type}、`imageUrl`(Bulbapedia，檔名 `_Set-X-YYY.png` 含代別但僅 208/1325 有)。抓取源=Bulbapedia+PokeAPI。
  - **Bulbapedia**：日本全 19 彈卡表，每卡 Grade 1-6 + 六維。
  - **kwcomm.tw**：台灣社群，覆蓋**星塵1-4 + 銀河1-2**（我們的目標代別）。
- **walbertus 驗證（Galaxy2 蒼響 2-2-001 錨點）**：walbertus Zacian Set3 六維 `hp194/atk226/def154/spa109/spd154/spe197` 與我們官方 back_image easyocr **完全一致**；type(妖精/鋼)、move(巨獸斬/鋼) 也**完全吻合** → 證明 walbertus 是機台真值、非 base stat。
- **混合管線決策（取代純 AGY 逐卡掃）**：
  - ✅ `types` + `moveName` + `moveType`：**代別無關、按英文名字匹配即可靠**，直接從 walbertus 填（省去 AGY 逐卡讀 type/move → 每代 VLM 從 73 次降到 ~1 次，只留 PDF 星等讀區）。
  - ⚠️ `六維`：**代別相關**（Zacian Set1/3/4 = 152/194/220），**不能純名字匹配**；仍由官方 `back_image` easyocr 按代取（100% 證明）。
  - ⚠️ `星等`：仍由官網卡表 PDF 權威裁判（AGY 讀圖仍會錯 2/73）。
  - ⚠️ `moveCategory`(物理/特殊/變化)：walbertus **未提供**；須用 move→category 查表（種子：Galaxy2 已驗證 73 筆 + PokeAPI）。
- **每代混合管線步驟**：①官網卡表 PDF → AGY VLM 讀星等區段名單(1 call) ②官網 back_image → easyocr 六維 ③walbertus 按英文名填 types+moveName+moveType ④moveCategory 查表 ⑤寫 `<gen>.ground_truth.json` → 生成器重跑 → `generations.js` 啟用 → build → push。
- **待確認**：PING 授權後才開始建混合管線（6 代可各跑一遍；galaxy1/cassette10、stardust4/cassette9 舊自動星等初值仍須以此法重建）。

## 辨識管線（Phase 2/5 完成）
- 順序：星等預篩 → 模板比對(感知雜湊,主) → QR/VLM 備援。
- QR 路徑已凍結（背面 QR 機台專用，一般掃描器掃不到）。
- 卡號 OCR 已從主路徑移除（小字難辨），改星等+模板組合。

## 資料重建原則（PING 確立，2026-07-17）
- **核心原則**：掃描圖是唯一權威來源；舊 DB 的自動辨識初值一律廢棄，資料檔要從圖「重新長出」，不是去補舊錯值。
- **標準管線（銀河2 已落成為模板，Phase 5.10 升級）**：
  1. **AGY/Gemini VLM 兩階段辨識**（`scripts/agy_recognize.py v2`）：
     - 正面圖 → stars/name/type1/type2/hp_front/layout/hasSuperStar/hasGigantamax
     - 背面圖 → hp(六維)/attack/defense/spAtk/spDef/speed + moveName/moveType/moveCategory [+move2*]
     - 結果寫入 `scripts/_agy_results/<cardId>.json`
  2. 合併 → `scripts/<gen>.ground_truth.json`（含 provenance 註記：source=agy_gemini_vlm_v2）
  3. 生成器 `scripts/gen_<gen>.mjs` 只從 ground-truth JSON 重生成 `src/data/pokemonDb.cards.<gen>.generated.js`
  4. `.generated.js` 是「生成物」，**勿直接手改**；要改資料改 JSON 後重跑生成器
  - ⚠️ Phase 5.9 的「Read 工具人工複讀」已被證明不可靠，AGY VLM 結果將取代之
- **SPECIAL 卡資料慣例（2026-07-18 確立）**：R 系列精選卡匣（皮卡丘/噴火龍/耿鬼等）**不是 1★，是 SPECIAL**。資料模型：設 `stars:0` + `category:"special"`（語意：special 卡無星等）。顯示層（StarBadge/CardAlbum 星等徽章+disk-grade-special 漸層+詳情頁 `(SPECIAL)`+篩選 tab）與評分（pokemonDb getRecommendations `category==='special'?0`）、override（pokemonDb updateLocalDbOverride）全部需感知 `category`。
  - **⚠️ GAS Sheets 同步（backend/google_apps_script.js）**：原 `card.stars || 1` 會把 special 卡 stars:0 強轉成 1★，且 Sheet 無 category 欄 → sync round-trip 失真。修正後：`syncCollection` 對 special 卡 stars 欄寫 `"SPECIAL"` 字串 + 新增 `category` 欄寫 `"special"`（含既有 Sheet 遷移補 header）；`App.jsx handleFetchCollection` 偵測 `category==='special' || stars==='SPECIAL'` → 還原 `stars:0, category:'special'`。**修改後須手動 redeploy Apps Script web app 才生效（不能從 repo 自動部署）**。`agy_recognize.py --validate` 把 SPECIAL 單獨計數。
- **銀河2 最終星等分佈（官網 PDF 權威）**：6★×10(001–010) / 5★×15 / 4★×17 / 3★×14 / 2★×14 / **SPECIAL×3(R-2-1/2/3)**。
- **銀河1(cassette/10)/星塵4(cassette/9) 仍背錯的自動星等初值**（分布異常：無 1★/6★），須同法重建。
- 未來新增代別統一走此管線。

## 官網多代別結構（2026-07-17 枚舉確認）
- 圖床 `/uploads/images/<64-hex>.png` 是**跨代別共用的扁平 bucket**（非真實資料夾，不能列目錄，只能靠掃 `cassette/N` 頁面還原）。
- 用 `scripts/enum_all_images.mjs` 掃 cassette/1..30，發現 **7 個有資料的代別**：
  | cassette | 圖片數 | 卡數(正+背) |
  |---|---|---|
  | 2  | 146 | 73 |
  | 6  | 34  | 17 |
  | 7  | 146 | 73 |
  | 8  | 153 | 76 |
  | 9  | 153 | 76 |
  | 10 | 146 | 73 |
  | 11 | 146 | 73 |
- **總計：918 張不重複圖 / 458 張不重複卡**（3 張卡跨 2 代重複）。
- ⚠️ **「146」只是「單一代別」的數量（73 卡 × 正面+背面）**，不是 bucket 總數。
- **全站爬蟲修正（2026-07-17 二次枚舉）**：`scripts/enum_bucket_refs.mjs` 掃 sitemap(11頁)+cassette/1..40+首頁，regex 抓所有 `/uploads/images/<hash>.*` 去重 → **1009 張不重複引用**（996 png + 13 jpg）。
  - 其中 981 張來自 7 個有資料的 cassette 代別（G2=154/G6=35/G7=155/G8=160/G9=164/G10=156/G11=157），28 張來自網站頁（gameplay/首頁/events/product UI 素材）。
  - **這是「被引用」的下限；bucket 真實總數未知（開放 404 無法列目錄），可能更多（有孤兒檔）**。
  - 之前 enum_all_images.mjs 的 918 是只數 cassette 頁的 front+back 配對；regex 法多抓到 ~57 張（縮圖/類型圖示等）。
- 空白頁面（1,3,4,5,12~23 皆 200 但 0 圖）= 佔位/未啟用，非資料頁。
- 本專案 App 已涵蓋 **cassette/11（銀河第二彈，已 live）+ cassette/10（銀河第一彈，本地建置待 push）+ cassette/9（星塵第4彈，本地建置待 push）** 三代，代別選擇器 UI 已建置。多代擴充 = 對每個 N 重跑 build pipeline（下載正背圖→OCR→VLM→build→generations.js 啟用）。

## 已知問題
- ~~舊 `PRESET_POKEMON_DB` 的 stars/六維數值全部不可靠~~ → **已校正完成**
  - **星等（Phase 5.10 AGY VLM 重建，2026-07-17）**：
    - ⚠️ Phase 5.5+5.6 的 CV skeleton + 視覺校正仍有 31/73 (42%) 錯誤！
    - ⚠️ **WorkBuddy Read 視覺也不可靠** — 人工複讀 2-2-004 仍錯(stars=5→6, hp=166→150_front, 漏超級明星/極巨化)
    - **根因**：CV 對 MEZASTAR 背面圖不可靠；Read 工具多模態對此資料集精度不足
    - **唯一可靠方法（已驗證）**：**AGY/Gemini VLM 兩階段辨識**
      - 正面圖 → stars/name/type1/type2/hp_front/layout/hasSuperStar/hasGigantamax
      - 背面圖 → hp/attack/defense/spAtk/spDef/speed + moveName/moveType/moveCategory [+move2*]
      - 已驗證：2-2-004 (6★/150/超級明星✓/極巨化✓) + 2-2-029 (4★/火幽靈/禍不單行/六維全對)
      - 管線腳本：`scripts/agy_recognize.py` v2（批次 73 卡、resume-friendly）
    - **Phase 5.9 Read 工具修正**：31 張錯誤卡修正，build 通過（**將被 AGY 結果取代**）
    - 修正後(5.9)分佈：6★×2 / 5★×24 / 4★×18 / 3★×14 / 2★×12 / 1★×3(Special)
    - 唯二真 6★：蒼響(001)、藏瑪然特(002)；Special Rare (R系列) = 1★
    - **教訓**：CV 和 WorkBuddy Read 對此資料集均不可靠；**AGY/Gemini VLM 是目前唯一驗證可靠的辨識方案**
  - **六維數值：easyocr 背面圖 OCR = 73/73 ✓ (Phase 5.7)**（AGY VLM 也同時讀取，可交叉驗證）
  - 資料來源：官網 Nuxt payload back_image 欄位 + easyocr
- **type1/type2/moveName/moveType/moveCategory → 銀河第二彈(cassette/11) 已全量校正（Phase 5.8 完成）**
  - 73 張卡全部直接讀背面圖逐一驗證，0 空值、14 張雙招式卡（加 move2Name/move2Type/move2Category 欄位）
  - 原 DB 僅 ~11 張正確，058–065 整段錯位、035–057 進化鏈漂移已全數修正
  - **狀態**：校正版已寫入 `src/data/pokemonDb.cards.generated.js`、build 通過、待推送（PING 已授權「確定沒問題就推」，但對話收捲未完成推送）
  - 驗證報告：`scripts/_verification_report_5.8.html`
- **App 架構（2026-07-19 重構）**：頂部全域代別選擇器已**移除**。改由 `pokemonDb.js` 提供跨代合併池 `getAllCards()`（6 代 + localOverrides，每張附 `generation`/`generationLabel`），各功能頁自帶獨立代別篩選（預設全部）。
  - 登錄卡匣(CardRegister) / 我的卡匣(CardAlbum) / 對手掃描(ScreenOcr) 均改用 `getAllCards()` 跨全代；唯「機台對手」(QuickTapPanel) 依用戶要求保持 galaxy2 硬编码不動。
  - `ACTIVE_PRESET_DB`/`getActiveGeneration`/`setActiveGeneration` 保留但僅供 `cardTemplateMatcher` 的 galaxy2 模板比對 + 星等預篩，不再被 UI 呼叫。
  - 新增一代 = 建好該代 cards 陣列 + 在 `generations.js` 啟用條目即可（圖片仍僅建庫用，app 呈示意圖）。

## 多代優先順序（PING 指定）
- 先做：銀河第一彈、星塵第1/2/3/4彈、MEZASTAR活動卡匣
- cassette/11 = 銀河第二彈（已 live；校正 e052978 + SPECIAL 精選卡匣修復 594d2af 已推送）
- cassette/10 = 銀河第一彈（73 張，本地建置完成、build 通過；**星等仍背舊自動初值（無 1★/6★，分佈異常）→ 按住不推，須 AGY 重建後再推**）
- cassette/9 = 星塵第4彈（76 張，含 3 特卡+3 R 卡，本地建置完成、build 通過；**同上，星等分佈異常 → 按住不推，須 AGY 重建後再推**）
  - 星等分佈：★2×14 / ★3×14 / ★4×35 / ★5×13 | 雙招式 13 式 | 雙屬性 26 式
  - 驗證頁：`scripts/verify_stardust4.html`
- ⚠️ 星塵第1/2/3彈（cassette 2/7/8）+ MEZASTAR活動卡匣（cassette/6）**尚未建置**，仍需各跑一次 build pipeline。
