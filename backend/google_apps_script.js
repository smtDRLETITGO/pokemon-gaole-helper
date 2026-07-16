// Google Apps Script for Google Sheets integration
// Paste this code in Extensions -> Apps Script on your Google Sheet, then Deploy as a Web App.

function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  setupSheetIfNeeded(sheet);
  var data = getSheetData(sheet);
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  setupSheetIfNeeded(sheet);
  var postData = JSON.parse(e.postData.contents);
  
  if (postData.action === 'sync') {
    syncCollection(sheet, postData.cards);
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Sync complete' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (postData.action === 'ocr') {
    return handleOcrAnalysis(postData.imageBase64, postData.openRouterApiKey, postData.mode || 'tag');
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function setupSheetIfNeeded(sheet) {
  if (sheet.getLastColumn() === 0) {
    // Setup Headers
    sheet.appendRow([
      "cardId", "name", "stars", "type1", "type2", 
      "moveName", "moveType", "hp", "attack", "defense", 
      "spAtk", "spDef", "speed", "count", "storageLocation", "lastUpdated"
    ]);
    // Bold headers and add light grey background
    sheet.getRange(1, 1, 1, 16).setFontWeight("bold").setBackground("#f3f3f3");
  }
}

function getSheetData(sheet) {
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var cards = [];
  for (var i = 1; i < rows.length; i++) {
    var card = {};
    for (var j = 0; j < headers.length; j++) {
      card[headers[j]] = rows[i][j];
    }
    cards.push(card);
  }
  return cards;
}

function syncCollection(sheet, clientCards) {
  // Clear sheet data (excluding headers)
  if (sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
  }
  
  // Append updated cards
  clientCards.forEach(function(card) {
    sheet.appendRow([
      card.cardId || "",
      card.name || "",
      card.stars || 1,
      card.type1 || "",
      card.type2 || "",
      card.moveName || "",
      card.moveType || "",
      card.hp || 0,
      card.attack || 0,
      card.defense || 0,
      card.spAtk || 0,
      card.spDef || 0,
      card.speed || 0,
      card.count || 1,
      card.storageLocation || "",
      new Date().toISOString()
    ]);
  });
}

function handleOcrAnalysis(imageBase64, apiKey, mode) {
  if (!apiKey) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: '未提供 OpenRouter API Key，請先於設定中填入！' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var systemPrompt = "";
  if (mode === "screen") {
    systemPrompt = "你是一個專業的寶可夢街機 MEZASTAR（星塵/銀河系列）對戰畫面分析專家。\n你的任務是分析使用者拍下的機台遊戲螢幕，找出畫面上此時正在對戰的「對手寶可夢」（通常是三個，有時可能是一個或兩個）。\n\n請仔細觀察圖片中出現在對面陣營的所有寶可夢，並辨識出牠們的繁體中文名稱（例如：蒼響、噴火龍、烈空坐）。\n請「只」回傳一個 JSON 格式的陣列，包含所辨識到的寶可夢名稱，不要包含任何 markdown 語法 (不要 ```json 包裹)、不要任何多餘的解釋或客套話。如果沒有辨識到任何寶可夢，請回傳空陣列 []。\n\n格式範例：\n[\n  \"蒼響\",\n  \"噴火龍\",\n  \"烈空坐\"\n]";
  } else {
    systemPrompt = "你是一個專業的寶可夢街機 MEZASTAR（星塵/銀河系列）卡匣辨識專家。\n你的任務是分析使用者上傳的卡匣圖片（可能是卡匣正面，也可能是卡匣背面），並精準提取出所有的欄位資訊。\n\n請仔細辨識圖片中出現的以下實體資訊：\n\n【如果是卡匣背面 (Back of the Tag)】：\n1. 卡匣編號 (卡片左上角，格式通常為：X-X-XXX 後綴字母，例如：2-2-031 TC)\n2. 寶可夢名稱 (位於頂部中央，繁體中文，例如：狂歡浪舞鴨)\n3. 星等 (編號下方的星星數量，例如：4)\n4. 招式名稱 (位於粉紅色招式欄中，例如：下盤踢)\n5. 招式屬性 (招式名稱右側的屬性圖標文字，例如：格鬥)\n6. 招式分類 (如果是拳頭圖標則為「物理」，如果是同心圓/星狀光芒圖標則為「特殊」)\n7. 六維數值 (位於右側的綠、粉、藍、紫、青色長條參數區)：\n   - HP (體力)\n   - 攻擊 (物理攻擊)\n   - 防禦 (物理防禦)\n   - 特攻 (特殊攻擊)\n   - 特防 (特殊防禦)\n   - 速度\n\n【如果是卡匣正面 (Front of the Tag)】：\n1. 卡匣編號 (卡片右下角，格式通常為：X-X-XXX 後綴字母，例如：2-2-031 TC)\n2. 寶可夢名稱 (位於下方中央偏左，繁體中文，例如：狂歡浪舞鴨)\n3. 星等 (名稱上方的星星數量，例如：4)\n4. 寶可能量 (右下角的紅色/橙色大數字，例如：118)\n5. 寶可夢屬性 (名稱下方的屬性圓圈圖標，可能有一個或兩個，例如：水、格鬥)\n\n【回傳格式要求】：\n請「只」回傳一個 JSON 格式的物件，不要包含任何 markdown 語法 (不要 ```json 包裹)、不要任何多餘的解釋或客套話。如果某個欄位在圖片中完全無法看清或不存在，請填入 null。\n\nJSON 格式欄位如下：\n{\n  \"cardSide\": \"front\" 或 \"back\",\n  \"cardId\": \"卡匣編號(字串)\",\n  \"name\": \"寶可夢名稱(字串)\",\n  \"stars\": 星等(整數),\n  \"pokeEne\": 寶可能量(整數，若無則為null),\n  \"type1\": \"主屬性(字串，例如：水，若無則為null)\",\n  \"type2\": \"副屬性(字串，例如：格鬥，若無則為null)\",\n  \"moveName\": \"招式名稱(字串，若無則為null)\",\n  \"moveType\": \"招式屬性(字串，例如：格鬥，若無則為null)\",\n  \"moveCategory\": \"招式分類(物理 或 特殊，若無則為null)\",\n  \"hp\": HP值(整數，若無則為null),\n  \"attack\": 攻擊力(整數，若無則為null),\n  \"defense\": 防禦力(整數，若無則為null),\n  \"spAtk\": 特攻值(整數，若無則為null),\n  \"spDef\": 特防值(整數，若無則為null),\n  \"speed\": 速度值(整數，若無則為null)\n}";
  }

  var payload = {
    "model": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "messages": [
      {
        "role": "system",
        "content": systemPrompt
      },
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "請辨識這張圖片中的對戰對手或卡片資訊："
          },
          {
            "type": "image_url",
            "image_url": {
              "url": imageBase64
            }
          }
        ]
      }
    ]
  };

  var options = {
    "method": "post",
    "contentType": "application/json",
    "headers": {
      "Authorization": "Bearer " + apiKey,
      "HTTP-Referer": "https://smtDRLETITGO.github.io/pokemon-gaole-helper/",
      "X-Title": "MEZASTAR Battle Helper"
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  try {
    var response = UrlFetchApp.fetch("https://openrouter.ai/api/v1/chat/completions", options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    if (responseCode !== 200) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'OpenRouter API 回報錯誤: ' + responseText }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var json = JSON.parse(responseText);
    var content = json.choices[0].message.content;
    
    var resultObj = cleanAndParseJson(content);
    return ContentService.createTextOutput(JSON.stringify({ success: true, result: resultObj }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: '系統錯誤: ' + err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function cleanAndParseJson(text) {
  var cleaned = text.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  var firstBrace = cleaned.indexOf('{');
  var firstBracket = cleaned.indexOf('[');
  var startIdx = -1;
  var endIdx = -1;
  
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = cleaned.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = cleaned.lastIndexOf(']');
  }
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }
  
  return JSON.parse(cleaned);
}
