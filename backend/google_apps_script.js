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
