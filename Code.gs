/**
 * BDT Store Key Access - Google Apps Script Backend
 * Deploy this as a Web App to process form submissions and retrieve logs.
 */

const SHEET_NAME = 'Logs';

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Setup Headers
    sheet.appendRow([
      'Masa',
      'Nama',
      'Jabatan',
      'Tujuan',
      'Nama Projek',
      'Tempoh',
      'Nombor Telefon'
    ]);
    sheet.getRange("A1:G1").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      setup();
      sheet = ss.getSheetByName(SHEET_NAME);
    }
    
    const timestamp = Utilities.formatDate(new Date(), "Asia/Kuala_Lumpur", "dd/MM/yy | hh:mm a").toLowerCase();
    const fullName = data.fullName || '';
    
    // Append to sheet
    sheet.appendRow([
      timestamp,
      fullName,
      data.department || '',
      data.purpose || '',
      data.projectName || '',
      data.duration || '',
      data.phone || ''
    ]);

    // Check how many times this user accessed today
    const todayStr = Utilities.formatDate(new Date(), "Asia/Kuala_Lumpur", "dd/MM/yy");
    const allData = sheet.getDataRange().getValues();
    let userAccessCount = 0;
    
    // Skip header row (1)
    for (let i = 1; i < allData.length; i++) {
        const rowTimestampStr = String(allData[i][0]);
        const rowDateStr = rowTimestampStr.split(" | ")[0];
        const rowName = String(allData[i][1]);
        
        if (rowDateStr === todayStr && rowName.toLowerCase() === fullName.toLowerCase()) {
            userAccessCount++;
        }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: true, 
        message: 'Log berjaya ditambah', 
        userAccessCount: userAccessCount 
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: "Sila set up helaian dahulu" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const action = e.parameter.action;
    const data = sheet.getDataRange().getValues();
    
    // Skip header row
    const headers = data[0];
    const rows = data.slice(1);
    
    const records = rows.map(row => {
      return {
        timestamp: row[0],
        fullName: row[1],
        department: row[2],
        purpose: row[3],
        projectName: row[4],
        duration: row[5],
        phone: row[6]
      };
    });

    if (action === 'getLatest') {
      const latest = records.length > 0 ? records[records.length - 1] : null;
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, record: latest }))
        .setMimeType(ContentService.MimeType.JSON);
    } 
    else if (action === 'getAllLogs') {
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, records: records }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    else {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: "Arahan tidak sah" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
