# MEZASTAR 卡牌辨識 — 自我修正 Prompt（版本 2026-07-18）

> 本檔案由 `scripts/correction_memory.json` 自動生成/更新。
> 處理新卡匣時，將本 prompt 內容注入 AGY VLM 驗證指令與 OCR 後處理器。

---

## 已驗證的教訓（來源：Galaxy2 cassette/11 全量驗證 73 張）

### ⚠️ 星等讀取（最不可靠環節）
1. **AGY/Gemini VLM 容易多算或漏算星等**：
   - Galaxy2 驗證：73 張中 **2 張錯誤**（010 四顎針龍 5★→6★、020 炎武王 4★→5★）
   - 錯誤率 ≈ 2.7%，不可接受
   - **解法**：星等以**官方卡表 PDF 為唯一權威裁判**。VLM 讀圖僅供參考，不採信。
   - PDF 讀法：渲染高解析 → AGY VLM 讀各星等區段的**卡號名單**（非逐張判斷）→ 與官網對照

### ⚠️ 六維數值（OCR 合併問題）
2. **PP-OCRv6 Tiny 整圖偵測會合併相鄰數值**：
   - Galaxy2 背圖整圖 OCR：87.6% 準確率
   - 失誤模式：**100% 是相鄰兩個數值被併成一個 token**
   - 例：藏瑪然特 `174+193` → OCR 讀成 `174193`
   - **解法**：ROI 分區裁切——按固定版型裁出 6 個獨立數值區域分別 OCR
   - 版型：右側 2×2 網格 + 頂底單列 = 6 ROI（見 correction_memory.json roiTemplate）
   - 安全網：後解析若遇到 >3 位數字串，自動嘗試拆分為合法 stat 範圍(20-260)內的數值對

### ⚠️ 正面圖雜訊
3. **正面圖（藝術圖）OCR 噪音極大**：
   - 六維數值**只從背圖讀取**，正面圖不用於數值提取
   - 正面圖用途：模板比對（感知雜湊）、星等預篩、名稱確認

### ⚠️ SPECIAL 卡約定
4. **R 系列精選卡匣不是 1★，是 SPECIAL**：
   - 資料模型：`stars: 0` + `category: "special"`
   - UI/評分/同步/過濾器全部需感知 category
   - GAS Sheets 同步寫 `"SPECIAL"` 哨兵 + category 欄

### ⚠️ 屬性與招式（代別無關）
5. **types/moveName/moveType 可按英文名匹配 walbertus 數據集**：
   - 已用 Galaxy2 蒼響(Zacian)錨點驗證：walbertus Set3 六維/屬性/招式**完全吻合**
   - 注意：六維**是代別相關**（同只不同代數值不同）→ 不能純名字匹配六維
   - moveCategory：walbertus 未提供 → 用 move→category 查表

---

## 新卡匣處理流程（含自我修正）

```
Step 1: 讀入 scripts/correction_memory.json（載入已學規則）
Step 2: 下載該代正背圖 + 提取 back_image（官方 Nuxt payload）
Step 3: 裁切背圖 → 6 ROI 區域（使用該代 roiTemplate 或自動校準）
Step 4: PP-OCRv6 Tiny 逐一 OCR 各 ROI → 得 6 個數值
Step 5: 自我修正 parser（拆分異常長 token、範圍校驗、期望恰好 6 個值）
Step 6: 官方卡表 PDF → AGY VLM 讀星等區段名單（權威）
Step 7: walbertus 按英文名填 types/moveName/moveType
Step 8: moveCategory 查表補全
Step 9: 寫 <gen>.ground_truth.json
Step 10: validate（--validate）→ 若有偏差，記入 correction_memory.learnedCorrections
Step 11: 生成器重跑 → generations.js 啟用 → build → push
```

## 每次驗證後更新

完成一代後，將以下資訊回寫 correction_memory.json：
- 該代的 roiTemplate（若自動校準過則更新座標）
- learnedCorrections（哪些卡號哪些欄位被修正了，修正前後值）
- validationStatus（準確率、失敗模式統計）

這樣下一代啟動時，所有已知坑都已被預載。
