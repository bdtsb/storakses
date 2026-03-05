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
      'Tujuan',
      'Tempoh'
    ]);
    sheet.getRange("A1:D1").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  
  let staffSheet = ss.getSheetByName("STAFF_LIST");
  if (!staffSheet) {
    staffSheet = ss.insertSheet("STAFF_LIST");
    staffSheet.appendRow(["Staff_Name", "PIN"]);
    staffSheet.getRange("A1:B1").setFontWeight("bold").setBackground("#fff2cc");
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
    
    // Check if it's the PIN setup action
    if (data.action === "setStaffPin") {
      return setStaffPin(data.payload);
    }
    
    const timestamp = Utilities.formatDate(new Date(), "Asia/Kuala_Lumpur", "dd/MM/yy HH:mm");
    const fullName = data.fullName || '';
    const pinInput = data.pin || '';
    
    // --- PIN VERIFICATION ---
    const staffSheet = ss.getSheetByName("STAFF_LIST");
    if (!staffSheet) {
      setup(); 
    }
    const staffData = ss.getSheetByName("STAFF_LIST").getDataRange().getValues();
    let isAuthorized = false;
    
    for (let s = 1; s < staffData.length; s++) {
      if (String(staffData[s][0]).trim().toLowerCase() === fullName.toLowerCase()) {
        const realPin = String(staffData[s][1]).trim();
        if (realPin !== "" && realPin === pinInput) {
          isAuthorized = true;
        }
        break;
      }
    }
    
    if (!isAuthorized) {
       return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: "Pengesahan Gagal: PIN tidak sah bagi nama " + fullName }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // ------------------------
    
    // Append to sheet
    sheet.appendRow([
      timestamp,
      fullName,
      data.purpose || '',
      data.duration || ''
    ]);

    // Check how many times this user accessed today
    const todayStr = Utilities.formatDate(new Date(), "Asia/Kuala_Lumpur", "dd/MM/yyyy");
    const allData = sheet.getDataRange().getValues();
    let userAccessCount = 0;
    
    // Skip header row (1)
    for (let i = 1; i < allData.length; i++) {
        const rowTimestampStr = String(allData[i][0]);
        // Extract just the dd/MM/yyyy part (first 10 characters)
        const rowDateStr = rowTimestampStr.substring(0, 10);
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
        purpose: row[2],
        duration: row[3]
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
    else if (action === 'getStaff') {
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, data: getStaff() }))
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

function getStaff() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("STAFF_LIST");
  if (!sheet) {
    setup();
    sheet = ss.getSheetByName("STAFF_LIST");
  }
  const data = sheet.getDataRange().getValues();
  const staffList = [];
  
  for (let i = 1; i < data.length; i++) {
    const name = String(data[i][0] || "").trim();
    if (name !== "") {
      const pin = String(data[i][1] || "").trim();
      staffList.push({
        Staff_Name: name,
        Has_PIN: pin !== ""
      });
    }
  }
  return staffList;
}

function setStaffPin(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("STAFF_LIST");
    const sheetData = sheet.getDataRange().getValues();
    
    const staffName = (payload.Staff_Name || "").trim();
    const newPin = (payload.PIN || "").trim();
    
    if (!staffName || !newPin) {
      return ContentService.createTextOutput(JSON.stringify({success: false, error: "Maklumat tidak lengkap."})).setMimeType(ContentService.MimeType.JSON);
    }
    
    for (let i = 1; i < sheetData.length; i++) {
      if (String(sheetData[i][0]).trim().toLowerCase() === staffName.toLowerCase()) {
        const existingPin = String(sheetData[i][1]).trim();
        if (existingPin !== "") {
           return ContentService.createTextOutput(JSON.stringify({success: false, error: "Staff ini sudah mempunyai PIN."})).setMimeType(ContentService.MimeType.JSON);
        }
        
        // Update PIN
        sheet.getRange(i + 1, 2).setValue(newPin);
        return ContentService.createTextOutput(JSON.stringify({success: true, message: "PIN berjaya ditetapkan."})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({success: false, error: "Nama Staff tidak dijumpai."})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}
