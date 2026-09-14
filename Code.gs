const ALLOWED_SHEETS = new Set(['Players', 'Match Results', 'Sessions', 'Source Index', 'Player Profile Supplement', 'profilePicturePermission']);

function doGet(e) {
  if (e?.parameter?.action === 'publicData') return json_(buildPublicData_());
  if (e?.parameter?.action === 'profileSupplements') return json_(buildProfileSupplements_());
  return json_({ ok:true, spreadsheet:SpreadsheetApp.getActiveSpreadsheet().getName(), message:'Little Kings Sheet API is running.' });
}

function doPost(e) {
  try {
    const request = parseRequest_(e);
    if (request.action === 'verifySitePassword') return json_(verifySitePassword_(request));
    if (request.action === 'submitEquipmentSurvey') return json_(submitEquipmentSurvey_(request));
    authenticate_(request);
    switch (request.action) {
      case 'appendRows': return json_(appendRows_(request));
      case 'upsertRows': return json_(upsertRows_(request));
      case 'getHeaders': return json_(getHeaders_(request));
      case 'updatePlayers': return json_(updatePlayers_(request));
      case 'syncPlayerRubberTypes': return json_(syncPlayerRubberTypesFromSupplements_());
      default: throw new Error('Unsupported action.');
    }
  } catch (error) { return json_({ ok:false, error:error.message }); }
}

function parseRequest_(e) {
  return (e?.postData?.type || '').indexOf('application/json') === 0 ? JSON.parse(e.postData.contents || '{}') : e.parameter || {};
}

function appendRows_(request) {
  const sheet = getSheet_(request.sheet), headers = getHeadersFromSheet_(sheet), rows = request.rows || [];
  if (!Array.isArray(rows) || !rows.length) throw new Error('rows must contain at least one row object.');
  const values = rows.map(row => objectToRow_(row, headers)), startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, values.length, headers.length).setValues(values);
  return { ok:true, action:'appendRows', sheet:sheet.getName(), rowsAdded:values.length, startRow };
}

function upsertRows_(request) {
  const sheet = getSheet_(request.sheet), headers = getHeadersFromSheet_(sheet), keyColumn = request.keyColumn, rows = request.rows || [];
  if (!headers.includes(keyColumn)) throw new Error(`Key column "${keyColumn}" does not exist in ${sheet.getName()}.`);
  if (!Array.isArray(rows) || !rows.length) throw new Error('rows must contain at least one row object.');
  const lock = LockService.getDocumentLock(); lock.waitLock(30000);
  try {
    const keyIndex = headers.indexOf(keyColumn), lastRow = sheet.getLastRow(), existing = lastRow > 1 ? sheet.getRange(2,1,lastRow - 1,headers.length).getValues() : [], rowByKey = new Map();
    existing.forEach((row,index) => { if (row[keyIndex] !== '') rowByKey.set(String(row[keyIndex]), index + 2); });
    let rowsAdded = 0, rowsUpdated = 0; const newRows = [];
    rows.forEach(record => {
      const key = record[keyColumn]; if (key === undefined || key === null || key === '') throw new Error(`Each row must include a non-empty "${keyColumn}" value.`);
      const rowNumber = rowByKey.get(String(key));
      if (rowNumber) { const merged = headers.map((header,index) => Object.prototype.hasOwnProperty.call(record,header) ? record[header] : existing[rowNumber - 2][index]); sheet.getRange(rowNumber,1,1,headers.length).setValues([merged]); rowsUpdated++; }
      else { newRows.push(objectToRow_(record,headers)); rowsAdded++; }
    });
    if (newRows.length) sheet.getRange(sheet.getLastRow()+1,1,newRows.length,headers.length).setValues(newRows);
    return { ok:true, action:request.action, sheet:sheet.getName(), rowsAdded, rowsUpdated };
  } finally { lock.releaseLock(); }
}

function getHeaders_(request) { const sheet = getSheet_(request.sheet); return { ok:true, sheet:sheet.getName(), headers:getHeadersFromSheet_(sheet) }; }

function submitEquipmentSurvey_(request) {
  const required = ['kanjiName','romanizedName','playerCategory','playingHand','grip','playingStyle','forehandType','forehandModel','backhandType','backhandModel'];
  required.forEach(field => { if (!String(request[field] || '').trim()) throw new Error(`Missing required field: ${field}`); });
  if (!['小学生','中学生','高校生','一般','Unassigned'].includes(request.playerCategory)) throw new Error('Invalid player category.');
  if (!['右','左'].includes(request.playingHand)) throw new Error('Invalid playing hand.');
  if (!['シェークハンド / Shakehand','ペンホルダー / Penhold'].includes(request.grip)) throw new Error('Invalid grip.');
  if (!['Yes','No'].includes(request.profilePicturePermission)) throw new Error('Invalid profile-picture permission.');
  if (!['裏ソフト','表ソフト','粒高','アンチ'].includes(request.forehandType) || !['裏ソフト','表ソフト','粒高','アンチ'].includes(request.backhandType)) throw new Error('Invalid rubber type.');
  return appendRows_({ sheet:'Player Profile Supplement', rows:[{'Submitted At':new Date(),'Kanji Name':request.kanjiName.trim(),'Romanized Name':request.romanizedName.trim(),'Player Category':request.playerCategory,'Playing Hand':request.playingHand,'Grip':request.grip,'Playing Style':request.playingStyle.trim(),'Forehand Type':request.forehandType,'Forehand Brand and Model':request.forehandModel.trim(),'Backhand Type':request.backhandType,'Backhand Brand and Model':request.backhandModel.trim(),'Profile Picture Permission':request.profilePicturePermission}] });
}

function buildPublicData_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet(), players = sheetObjects_(spreadsheet.getSheetByName('Players')), matches = sheetObjects_(spreadsheet.getSheetByName('Match Results'));
  const publicPlayers = players.filter(player => player['Player ID'] && player['Status'] === 'Active').map(player => ({
    playerId:player['Player ID'], displayName:player['Display Name'] || '', englishName:player['Preferred English Name'] || '', gender:player['Gender'] || '', schoolLevel:player['Player Category'] || '', playingHand:player['Playing Hand'] || '', grip:player['Grip'] || '', playingStyle:player['Playing Style'] || '', blade:player['Blade'] || '', forehandRubber:player['Forehand Rubber'] || '', backhandRubber:player['Backhand Rubber'] || '',
    forehandRubberType:player['Forehand Rubber Type'] || '', backhandRubberType:player['Backhand Rubber Type'] || '', rating:player['Current Rating'] || '', status:player['Status'] || ''
  }));
  const publicMatches = matches.filter(match => match['Match ID'] && match['Result Status'] !== 'Void').map(match => ({ matchId:match['Match ID'], matchDate:formatPublicDate_(match['Match Date']), event:match['Event / Session'] || '', division:match['Division'] || '', format:match['Format'] || '', player1Id:match['Player 1 ID'] || '', player1Name:match['Player 1 Name'] || '', player1Sets:Number(match['Player 1 Sets']) || 0, player2Id:match['Player 2 ID'] || '', player2Name:match['Player 2 Name'] || '', player2Sets:Number(match['Player 2 Sets']) || 0, winnerId:match['Winner ID'] || '', winnerName:match['Winner Name'] || '', score:match['Score'] || '', resultStatus:match['Result Status'] || '' }));
  return { ok:true, club:{name:'Little Kings',nameJa:'リトルキングス',logoUrl:'https://ritokin.gosyuugi.com/img/3.jpg'}, players:publicPlayers, matches:publicMatches, lastUpdated:new Date().toISOString() };
}

// One-time migration: copy known types into Players. The public site never reads the supplement sheet.
function syncPlayerRubberTypesFromSupplements_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet(), playerSheet = spreadsheet.getSheetByName('Players'), supplementSheet = spreadsheet.getSheetByName('Player Profile Supplement'), headers = getHeadersFromSheet_(playerSheet);
  ['Forehand Rubber Type','Backhand Rubber Type'].forEach(header => { if (!headers.includes(header)) throw new Error(`Add the "${header}" column to Players before running this migration.`); });
  const supplements = sheetObjects_(supplementSheet), byName = new Map(supplements.filter(row => row['Kanji Name']).map(row => [String(row['Kanji Name']),row]));
  const players = sheetObjects_(playerSheet), fhIndex = headers.indexOf('Forehand Rubber Type'), bhIndex = headers.indexOf('Backhand Rubber Type'); let updated = 0;
  players.forEach((player,index) => { const supplement = byName.get(String(player['Display Name'])); if (!supplement) return; const fh = player['Forehand Rubber Type'] || supplement['Forehand Type'] || '', bh = player['Backhand Rubber Type'] || supplement['Backhand Type'] || ''; if (fh === player['Forehand Rubber Type'] && bh === player['Backhand Rubber Type']) return; playerSheet.getRange(index + 2,fhIndex + 1).setValue(fh); playerSheet.getRange(index + 2,bhIndex + 1).setValue(bh); updated++; });
  return { ok:true, updated };
}

function sheetObjects_(sheet) { if (!sheet) throw new Error('Required sheet was not found.'); const values = sheet.getDataRange().getValues(), headers = values.shift(); return values.map(row => headers.reduce((object,header,index) => { object[header] = row[index]; return object; },{})); }
function formatPublicDate_(value) { return value instanceof Date ? Utilities.formatDate(value,SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(),'yyyy-MM-dd') : value || ''; }
function getSheet_(sheetName) { if (!ALLOWED_SHEETS.has(sheetName)) throw new Error(`Sheet "${sheetName}" is not allowed.`); const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName); if (!sheet) throw new Error(`Sheet "${sheetName}" was not found.`); return sheet; }
function getHeadersFromSheet_(sheet) { const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String); if (!headers.length || !headers[0]) throw new Error(`Sheet "${sheet.getName()}" has no header row.`); return headers; }
function objectToRow_(record,headers) { return headers.map(header => Object.prototype.hasOwnProperty.call(record,header) ? record[header] : ''); }
function authenticate_(request) { const secret = PropertiesService.getScriptProperties().getProperty('SHEET_API_SECRET'); if (!secret) throw new Error('SHEET_API_SECRET has not been configured.'); if (request.secret !== secret) throw new Error('Unauthorized request.'); }
function json_(payload) { return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON); }
function buildProfileSupplements_() { const entries = sheetObjects_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Player Profile Supplement')).filter(entry => entry['Kanji Name']).map(entry => ({kanjiName:entry['Kanji Name'] || '',romanizedName:entry['Romanized Name'] || '',playerCategory:entry['Player Category'] || '',playingHand:entry['Playing Hand'] || '',grip:entry['Grip'] || '',playingStyle:entry['Playing Style'] || '',forehandType:entry['Forehand Type'] || '',forehandModel:entry['Forehand Brand and Model'] || '',backhandType:entry['Backhand Type'] || '',backhandModel:entry['Backhand Brand and Model'] || ''})); return {ok:true,entries}; }
function verifySitePassword_(request) { const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Password'); if (!sheet) throw new Error('Password sheet was not found.'); const authorized = sheetObjects_(sheet).some(row => String(row['Active']).toUpperCase() === 'TRUE' && String(row['Password']) === String(request.password || '')); return {ok:true,authorized}; }
function updatePlayers_(request) { return upsertRows_({sheet:'Players',keyColumn:'Display Name',rows:request.rows || []}); }
