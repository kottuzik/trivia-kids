# תוכנית — Milestone 4: דיווח על שאלה ל-Google Sheets

**מקורות:** `PRD.md` (FR-07, זרימות "דיווח על שאלה" ו"טיפול מנהל בדיווחים"), `ARCHITECTURE.md` (§2.4, §2.5, §2.7, §2.8, §2.9), `DESIGN.md` (§1.3, §1.5), Wireframe "דיווח על שאלה".
**מצב הקוד בתחילת ה-Milestone:** Milestones 1–3 אושרו. מסך השאלה (`QuestionView`) מוצג לכל שאלה עם `key` לפי מזהה השאלה, ושאלה מכילה כבר את כל השדות הדרושים לדיווח (טקסט, ארבע תשובות, תשובה נכונה, הסבר, נושא, שפה, גיל, קושי).

## 1. היקף

**בפנים:**
- כפתור "דווח על שאלה" במסך השאלה (לפני ואחרי מענה), חלון דיווח עם בחירת סוג בעיה, שליחה, הצלחה/כישלון ו-Retry.
- `POST /api/reports` ב-Next.js, שמעביר את הדיווח ל-Apps Script עם Secret.
- קוד Apps Script (`doPost` + פונקציית הקמה) בתוך ה-Repository.
- מדריך צעד-אחר-צעד למשתמש להקמת שני גיליונות ושני פרויקטי Apps Script (Development + Production).
- בדיקות אוטומטיות לשרת ולסקריפט, ובדיקה ידנית מול גיליון Development בלבד.

**בחוץ (לא נבנה):**
- שדה "הערות נוספות" חופשי — מופיע ב-Wireframe אך מוגדר ב-DESIGN §1.5 כלא-חובה, ואינו בעמודות הגיליון ב-PRD/ARCHITECTURE. ויתור עליו גם מונע הקלדת פרטים מזהים של ילד.
- דיווח מתוך מסך הסיכום, Admin Dashboard, סימון "טופל" בתוך האפליקציה, שמירת היסטוריית דיווחים במכשיר.
- הגדרת משתני Production ב-Vercel (שייך ל-Milestone 6). ב-Milestone זה רק מקימים את גיליון ו-Apps Script ה-Production ושומרים את פרטיהם בצד.

## 2. סוגי בעיה

לפי ה-Wireframe (הקוד באנגלית; הטקסט מתורגם בשלוש השפות; בגיליון נכתבת התווית בעברית — שפת המנהל):

| קוד | עברית (UI + גיליון) | English | Русский |
|---|---|---|---|
| `not_for_kids` | שאלה לא מתאימה לילדים | Not suitable for kids | Не подходит для детей |
| `wrong_answer` | תשובה לא נכונה | Wrong answer | Неверный ответ |
| `off_topic` | נושא לא מתאים | Doesn't match the topic | Не по теме |
| `confusing` | שאלה מבלבלת | Confusing question | Непонятный вопрос |
| `other` | בעיה אחרת | Other problem | Другая проблема |

## 3. מבנה הגיליון

גיליון (Tab) בשם `Reports`, שורת כותרות קפואה, לפי ARCHITECTURE §2.4:

`createdAt` | `reportId` | `issueType` | `topic` | `locale` | `ageGroup` | `difficulty` | `questionText` | `answer1` | `answer2` | `answer3` | `answer4` | `correctAnswerId` | `explanation` | `status`

- `createdAt` — נקבע ב-Apps Script (`new Date()`), לא מהדפדפן.
- `correctAnswerId` — מספר התשובה הנכונה (1–4) כך שהמנהל מתאים אותו מיד לעמודות `answer1`–`answer4`.
- `status` — ברירת מחדל `חדש`; בעמודה רשימה נפתחת (Data validation) `חדש` / `טופל`, שהמנהל משנה ידנית.
- אין שם, אימייל, IP, מזהה מכשיר או היסטוריית משחק.

## 4. קבצים ליצירה / שינוי

### 4.1 משותף (דפדפן + שרת)
- **`src/lib/reports/schemas.ts`** (חדש)
  - `ISSUE_TYPES` (5 הקודים), `IssueType`.
  - `ReportRequestSchema` — `z.strictObject({ issueType, question: { id (uuid), text, answers[4] {id a–d, text}, correctAnswerId, explanation, topic, locale, ageGroup, difficulty } })`, עם תקרות אורך זהות ל-`validateQuestion` (300/120/600, נושא 60), ניקוי תווי בקרה, ובדיקה שמזהי התשובות הם בדיוק a,b,c,d ושונים.
  - קוד שגיאה חדש — הוספת `REPORT_SAVE_FAILED` ל-`API_ERROR_CODES` ב-`src/lib/game/schemas.ts` (ול-`STATUS` ב-`http.ts` → 502).
- **`src/lib/reports/api.ts`** (חדש) — `sendReport(question, issueType)` בצד הלקוח, משתמש באותו `postJson` (להוציא אותו מ-`src/lib/game/api.ts` לפונקציה משותפת או לייצא אותו), Timeout ‏20 שניות; Offline ← `NETWORK`.

### 4.2 שרת
- **`src/lib/server/reports.ts`** (חדש, `server-only`)
  - `reportIdFor(question, issueType)` — `reportId` **דטרמיניסטי**: SHA-256 של `question.id + issueType`, מקוצר ל-24 תווים hex. כך כל ניסיון חוזר (מהילד או אחרי כשל) מקבל את אותו מזהה, והמזהה עדיין נוצר ב-Backend כפי ש-ARCHITECTURE דורש. (ADR חדש.)
  - `toSheetRow(...)` — בניית אובייקט השורה (תווית עברית לסוג הבעיה, מספר תשובה נכונה 1–4).
  - `saveReport(row)` — `fetch` ל-`REPORTS_SCRIPT_URL` עם `POST` ו-JSON ‏`{ secret, report }`; `redirect: "follow"` (Google מחזיר 302 לכתובת התשובה); Timeout ‏15 שניות; הצלחה **רק** אם הגוף הוא JSON עם `ok: true` ו-`reportId` זהה. כל דבר אחר (HTML, `ok:false`, Timeout, משתנים חסרים) ← `REPORT_SAVE_FAILED`. לוג בשרת עם קוד שגיאה בלבד — בלי תוכן השאלה ובלי ה-Secret.
- **`src/app/api/reports/route.ts`** (חדש) — באותו דפוס של `questions/generate`: `isSameOrigin` ← הגבלת קצב (`LIMITS.reports`: 10 בכל 10 דקות לכל IP) ← `readJson` (8KB) ← Zod ← `saveReport` ← `{ ok: true }`. `maxDuration = 30`.
- **`src/lib/server/rateLimit.ts`** — הוספת `reports` ל-`LIMITS`.
- **`.env.example`** — הוספת `REPORTS_SCRIPT_URL=` ו-`REPORTS_SHARED_SECRET=` (בלי ערכים). אסור `NEXT_PUBLIC_`.

### 4.3 ממשק
- **`src/app/quiz/ReportDialog.tsx`** (חדש) + **`ReportDialog.module.css`**
  - `<dialog>` מודאלי מקורי (כמו `NewGameConfirm`: Focus נלכד, Escape סוגר, Focus חוזר לכפתור הפותח).
  - כותרת "דיווח על שאלה", הסבר קצר ("עזרו לנו לשפר את המשחק — מה הבעיה בשאלה הזו?"), `fieldset` + `legend` עם 5 כפתורי רדיו בסגנון בחירות מעוגלות, כפתור "שלח דיווח" וכפתור "חזרה למשחק".
  - מצבים: `idle` ← `sending` (כפתור נעול + "שולח...", מונע לחיצה כפולה) ← `sent` ("תודה! הדיווח נשלח." + כפתור "חזרה למשחק") או `failed` (הודעה לפי סוג השגיאה + "נסה שוב"; הבחירה נשמרת).
  - שליחה ללא בחירה ← הודעת שגיאה נגישה ליד הקבוצה ("בחרו סוג בעיה"), בלי בקשה לשרת.
  - הודעות מצב ב-`role="status"` / `role="alert"`; הצלחה וכישלון מסומנים בטקסט ואייקון, לא רק בצבע.
- **`src/app/quiz/QuestionView.tsx`** — כפתור משני "דווח על שאלה" עם אייקון דגל, מתחת לתשובות/לכפתור הבא, זמין גם לפני וגם אחרי מענה. אחרי דיווח מוצלח הכפתור מתחלף לטקסט "דיווחת על השאלה הזו — תודה!" (מצב מקומי ברכיב; מתאפס עם השאלה הבאה בזכות ה-`key`). הדיווח **אינו** קורא ל-`useGame` — אין שום שינוי במצב המשחק.
- **`src/components/icons.tsx`** — `FlagIcon`.
- **מילונים `he` / `en` / `ru`** — `quiz.report.*`: כפתור, כותרת, הסבר, legend, 5 סוגים, שלח, שולח, הצלחה, כבר דווח, חזרה למשחק, בחרו סוג, ושגיאות: `REPORT_SAVE_FAILED` ("לא הצלחנו לשמור את הדיווח. נסו שוב."), `NETWORK` ("אין חיבור לאינטרנט..."), `RATE_LIMITED`, וברירת מחדל.

### 4.4 Apps Script (בתוך ה-Repository, נפרס ידנית)
- **`apps-script/Code.gs`**
  - `setup()` — מריצים פעם אחת מהעורך: יוצר/מאתר את ה-Tab `Reports`, כותב שורת כותרות, מקפיא אותה, מגדיר רשימה נפתחת `חדש`/`טופל` בעמודת `status` ועיצוב טקסט לעמודות התוכן.
  - `doPost(e)`:
    1. פענוח JSON; כשל ← `{ ok:false, error:"BAD_REQUEST" }`.
    2. השוואת `secret` ל-`REPORTS_SHARED_SECRET` מ-Script Properties; לא תואם/חסר ← `{ ok:false, error:"UNAUTHORIZED" }`, בלי כתיבה.
    3. אימות שדות ואורכים (סוג בעיה מתוך הרשימה, `reportId` ‏24 hex, שפה/גיל/קושי מוכרים, תקרות אורך) ← `BAD_REQUEST`.
    4. `LockService.getScriptLock().waitLock(10000)`; חיפוש `reportId` בעמודה (`TextFinder`, התאמה מלאה); אם קיים ← `{ ok:true, reportId, duplicate:true }` בלי שורה חדשה.
    5. `safeCell()` על כל תא טקסט: אם מתחיל ב-`=`, `+`, `-`, `@`, Tab או CR ← מוסיפים `'` בתחילתו (נשמר כטקסט, לא כנוסחה).
    6. `appendRow`, `SpreadsheetApp.flush()`, שחרור הנעילה ← `{ ok:true, reportId }`.
    - מזהה הגיליון נקרא מ-`SPREADSHEET_ID` ב-Script Properties (לא מהבקשה).
- **`apps-script/appsscript.json`** — Manifest: אזור זמן `Asia/Jerusalem`, `webapp: { executeAs: "USER_DEPLOYING", access: "ANYONE_ANONYMOUS" }`, הרשאות מינימליות (`spreadsheets`).
- **`apps-script/README.md`** — מדריך בעברית פשוטה (ראו §6).
- **`eslint.config.mjs`** — התעלמות מ-`apps-script/**` אם ה-Lint נכשל על קובצי `.gs`.

### 4.5 תיעוד
- **ARCHITECTURE.md → ADRs:**
  - ADR-9: `reportId` דטרמיניסטי מהשאלה וסוג הבעיה (מזהה יציב ב-Retry, נוצר ב-Backend).
  - ADR-10: חלון דיווח מודאלי ללא שדה הערות חופשי.
  - ADR-11: קוד Apps Script ב-`apps-script/`, פריסה ידנית בהעתק-הדבק (ללא `clasp`), `setup()` להקמת הגיליון.
- **MILESTONES.md** — 🟡 ליד Milestone 4 בסיום הבנייה.

## 5. בדיקות אוטומטיות (Vitest)

- **`src/lib/reports/schemas.test.ts`** — קלט תקין עובר; סוג בעיה לא מוכר, 3/5 תשובות, מזהי תשובות כפולים, טקסט ארוך מדי ושדה עודף — נדחים.
- **`src/lib/server/reports.test.ts`** (עם `fetch` מדומה):
  - `reportIdFor` זהה לאותה שאלה+סוג ושונה לסוג אחר.
  - `{ok:true, reportId}` ← הצלחה; `{ok:false}`, HTML, JSON בלי `reportId` תואם, שגיאת רשת, Timeout, משתני סביבה חסרים ← `REPORT_SAVE_FAILED`.
  - ה-Secret נשלח בגוף ולא ב-URL.
- **`apps-script/Code.test.ts`** — טוען את `Code.gs` בתוך `node:vm` עם תחליפים מזויפים ל-`SpreadsheetApp`, `PropertiesService`, `LockService`, `ContentService`:
  - Secret שגוי/חסר ← `UNAUTHORIZED` ואין שורה.
  - שליחה כפולה עם אותו `reportId` ← שורה אחת בלבד.
  - `=HYPERLINK(...)`, `+1`, `-2`, `@x` נשמרים עם `'` בתחילתם.
  - שורה תקינה כוללת את כל 15 העמודות וסטטוס `חדש`.
- `npm run lint && npm run typecheck && npm test && npm run build` עוברים.

## 6. הקמת גיליונות ו-Apps Script — הדרכת המשתמש

אני (Claude) לא נכנס לחשבון Google. בזמן הבנייה אכתוב את `apps-script/README.md` ואעצור כדי להדריך אותך, צעד אחר צעד:

1. **יצירת Secret** — פקודה אחת בטרמינל שמדפיסה מחרוזת אקראית ארוכה; פעמיים (אחת ל-Development, אחת ל-Production). את ה-Secret לא מדביקים בצ'אט.
2. **גיליון Development** — גיליון Google חדש בשם "טריוויה קידס — דיווחים (Development)", לא משותף עם אף אחד; העתקת מזהה הגיליון מהכתובת.
3. **פרויקט Apps Script Development** — הרחבות ← Apps Script; הדבקת `Code.gs` ו-`appsscript.json`; Script Properties: `SPREADSHEET_ID`, `REPORTS_SHARED_SECRET`; הרצת `setup()` ואישור ההרשאות.
4. **פריסה כ-Web App** — Deploy ← New deployment ← Web app, "Execute as: Me", "Who has access: Anyone"; העתקת כתובת ה-Web App.
5. **`.env` מקומי** — הוספת `REPORTS_SCRIPT_URL` ו-`REPORTS_SHARED_SECRET` של Development בלבד.
6. **Vercel Preview** — אותם שני משתנים של Development ב-Environment Variables של Preview בלבד.
7. **Production** — חזרה על שלבים 2–4 עם גיליון ופרויקט נפרדים ו-Secret אחר. את הכתובת וה-Secret שומרים במקום בטוח (למשל מנהל סיסמאות) — הם יוכנסו ל-Vercel Production רק ב-Milestone 6. **אין שליחת דיווחי בדיקה ל-Production.**
8. **בדיקת סטטוס** — פתיחת גיליון Development ושינוי סטטוס של שורה ל"טופל" מהרשימה הנפתחת.

עדכון קוד הסקריפט בעתיד: הדבקה מחדש ו-Deploy ← Manage deployments ← Edit ← New version (כך הכתובת נשארת זהה).

## 7. בדיקה ידנית (מול Development בלבד)

1. דיווח מכל אחת משלוש השפות ← שורה בגיליון Development עם כל העמודות וסטטוס `חדש`; הודעת "תודה" מופיעה רק אחרי שהשורה נשמרה.
2. ניקוד, מספר שאלה, מצב מענה ומכסת דילוגים זהים לפני ואחרי פתיחה/שליחה/ביטול של הדיווח.
3. דיווח לפני מענה ← אפשר לענות כרגיל אחריו; דיווח אחרי מענה ← המשוב וההסבר נשארים.
4. Secret שגוי ב-`.env` ← הודעת כישלון + "נסה שוב", אין שורה, אין הודעת הצלחה. החזרת ה-Secret הנכון ← "נסה שוב" מצליח עם אותו `reportId`.
5. שליחה חוזרת של אותה שאלה ואותו סוג (למשל אחרי מעבר לבית וחזרה) ← אין שורה כפולה.
6. Offline ← הודעת "אין חיבור" ו-Retry, המשחק לא נפגע.
7. בקשה ישירה ל-Apps Script ללא Secret (`curl`) ← `UNAUTHORIZED`.
8. בדיקה ב-DevTools/ב-bundle (`.next/static`) שאין בו כתובת `script.google.com` או ה-Secret.
9. מקלדת וקורא מסך: Tab לכפתור הדיווח, בחירה בחצים, Escape סוגר ומחזיר Focus, הודעות מוקראות; RTL בעברית ו-LTR באנגלית/רוסית; מובייל ו-Desktop.
10. גיליון Production נשאר ריק (רק שורת כותרות).

## 8. מיפוי ל-Definition of Done

| תנאי | איך מתקיים |
|---|---|
| שני גיליונות ושני פרויקטים; בדיקות רק ל-Development | §6 שלבים 2–7; `.env` ו-Vercel Preview מכילים Development בלבד; §7.10 |
| שורה מלאה עם סטטוס "חדש" | §3, `toSheetRow`, `doPost`; בדיקות §5 ו-§7.1 |
| המנהל משנה ל"טופל"; לילד אין גישה | רשימה נפתחת מ-`setup()`; גיליון לא משותף; הילד מדבר רק עם `/api/reports` |
| Secret וכתובת לא בדפדפן; בלי Secret נדחה; נוסחה נשמרת כטקסט | משתני שרת בלבד; בדיקת Secret ב-`doPost`; `safeCell`; §5, §7.7–7.8 |
| אין שורות כפולות לאותו `reportId`; כשל ← Retry | `reportId` דטרמיניסטי + `LockService` + חיפוש; הצלחה רק עם `ok:true`; §7.4–7.5 |
| דיווח לא משנה משחק; בלי מידע מזהה | `ReportDialog` לא נוגע ב-`useGame`; אין שדה חופשי; §7.2 |
