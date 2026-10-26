// Trivia Kids — question reports Web App.
// Receives reports from the Next.js backend only, checks the shared secret and adds one
// row per report to the private "Reports" sheet. Deployed by hand (see README.md).
//
// Script Properties (Project Settings → Script Properties):
//   SPREADSHEET_ID         — id of this environment's private sheet
//   REPORTS_SHARED_SECRET  — the same secret as the backend's REPORTS_SHARED_SECRET

var SHEET_NAME = 'Reports';
var HEADERS = [
  'createdAt', 'reportId', 'issueType', 'topic', 'locale', 'ageGroup', 'difficulty',
  'questionText', 'answer1', 'answer2', 'answer3', 'answer4', 'correctAnswerId',
  'explanation', 'status',
];
var STATUS_NEW = 'חדש';
var STATUS_DONE = 'טופל';
var ISSUE_LABELS = [
  'שאלה לא מתאימה לילדים', 'תשובה לא נכונה', 'נושא לא מתאים', 'שאלה מבלבלת', 'בעיה אחרת',
];
var LOCALES = ['he', 'en', 'ru'];
var AGE_GROUPS = ['6-9', '10-12', '13-16'];
var DIFFICULTIES = ['easy', 'medium', 'hard'];
var MAX = { topic: 60, question: 300, answer: 120, explanation: 600 };

// Run once from the editor: creates the sheet tab, header row and status drop-down.
function setup() {
  var spreadsheet = SpreadsheetApp.openById(getProperty_('SPREADSHEET_ID'));
  var sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([STATUS_NEW, STATUS_DONE], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, HEADERS.length, sheet.getMaxRows() - 1, 1).setDataValidation(statusRule);
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (error) {
    return reply_({ ok: false, error: 'BAD_REQUEST' });
  }

  var secret = PropertiesService.getScriptProperties().getProperty('REPORTS_SHARED_SECRET');
  if (!secret || !body || typeof body.secret !== 'string' || body.secret !== secret) {
    return reply_({ ok: false, error: 'UNAUTHORIZED' });
  }

  var report = body.report;
  if (!isValidReport_(report)) return reply_({ ok: false, error: 'BAD_REQUEST' });

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (error) {
    return reply_({ ok: false, error: 'BUSY' });
  }

  try {
    var sheet = SpreadsheetApp.openById(getProperty_('SPREADSHEET_ID')).getSheetByName(SHEET_NAME);
    if (!sheet) return reply_({ ok: false, error: 'NO_SHEET' });

    var existing = sheet
      .getRange(1, 2, Math.max(sheet.getLastRow(), 1), 1)
      .createTextFinder(report.reportId)
      .matchEntireCell(true)
      .findNext();
    if (existing) return reply_({ ok: true, reportId: report.reportId, duplicate: true });

    sheet.appendRow(toRow_(report, new Date()));
    SpreadsheetApp.flush();
    return reply_({ ok: true, reportId: report.reportId });
  } catch (error) {
    return reply_({ ok: false, error: 'WRITE_FAILED' });
  } finally {
    lock.releaseLock();
  }
}

function toRow_(report, now) {
  return [
    now,
    report.reportId,
    safeCell_(report.issueType),
    safeCell_(report.topic),
    report.locale,
    report.ageGroup,
    report.difficulty,
    safeCell_(report.questionText),
    safeCell_(report.answers[0]),
    safeCell_(report.answers[1]),
    safeCell_(report.answers[2]),
    safeCell_(report.answers[3]),
    report.correctAnswer,
    safeCell_(report.explanation),
    STATUS_NEW,
  ];
}

// Text that a spreadsheet could read as a formula is stored as plain text instead.
function safeCell_(value) {
  var text = String(value);
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}

function isValidReport_(report) {
  if (!report || typeof report !== 'object') return false;
  return (
    typeof report.reportId === 'string' && /^[0-9a-f]{24}$/.test(report.reportId) &&
    ISSUE_LABELS.indexOf(report.issueType) !== -1 &&
    LOCALES.indexOf(report.locale) !== -1 &&
    AGE_GROUPS.indexOf(report.ageGroup) !== -1 &&
    DIFFICULTIES.indexOf(report.difficulty) !== -1 &&
    isText_(report.topic, MAX.topic) &&
    isText_(report.questionText, MAX.question) &&
    isText_(report.explanation, MAX.explanation) &&
    Array.isArray(report.answers) && report.answers.length === 4 &&
    report.answers.every(function (answer) { return isText_(answer, MAX.answer); }) &&
    [1, 2, 3, 4].indexOf(report.correctAnswer) !== -1
  );
}

function isText_(value, max) {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function getProperty_(name) {
  var value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error('Missing Script Property: ' + name);
  return value;
}

function reply_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
