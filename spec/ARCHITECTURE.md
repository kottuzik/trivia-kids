# ARCHITECTURE — טריוויה קידס

**עודכן:** 25.10.2026  
**מסמך מקור:** `PRD.md` (גרסת דיווחים ב-Google Sheets)  
**מטרה:** ארכיטקטורה פשוטה ליישום Mobile-first PWA, שאלות טריוויה באמצעות AI, שמירת משחק מקומית ושמירת דיווחי שאלות ב-Google Sheets.

## 1. Technology Stack שנבחר

| רכיב | טכנולוגיה | תפקיד |
|---|---|---|
| Frontend + Backend | Next.js (App Router), React, TypeScript | מסכי Web ו-Route Handlers באותו Repository |
| עיצוב | CSS Modules + CSS variables | Responsive, RTL/LTR, WCAG 2.2 AA |
| Validation | Zod | אימות קלט ותשובות AI לפי Schema |
| PWA | Web App Manifest + Service Worker מצומצם | התקנה ו-Cache לנכסים סטטיים |
| שמירת משחק | IndexedDB באמצעות `idb`; `localStorage` להעדפות | שחזור משחק ושמירת צלילים במכשיר בלבד |
| AI | OpenAI Responses API + Structured Outputs | יצירת נושאים, שאלות, תשובות והסברים |
| סינון | OpenAI Moderation + בדיקות שרת | התאמת תוכן לגיל, זיהוי תוכן בעייתי |
| אחסון דיווחים | Google Sheets + Google Apps Script Web App | הוספת דיווחים כשורות לגיליון פרטי; סימון טיפול ידני בגיליון |
| Hosting | Vercel Functions (Node.js runtime) | Frontend ו-Backend ללא שרת עצמאי |
| Source control / CI | GitHub + GitHub Actions | ניהול קוד ובדיקות אוטומטיות |
| Deployment | Vercel Git Integration | Preview ו-Production deployments אוטומטיים |

**הכרעה:** Next.js מפשט את השילוב בין UI ו-API, לעומת Frontend נפרד ושרת עצמאי. Google Sheets + Apps Script נבחרו במקום Supabase או שירות Email API: דרוש מאגר דיווחים קטן שניתן לפתוח ולנהל ללא Admin Dashboard. Google Sheets משמש אחסון דיווחים קל, לא Database אפליקטיבי כללי. אין ORM, Object Storage, Auth לילדים, Queue או Analytics. אין צורך ב-Docker.

**מגבלות:** Google Sheets אינו Database בעל יכולות Transaction, שאילתות או Scalability גבוהות. Apps Script כפוף למכסות ולמגבלות זמינות/הרצה של Google, והגיליון מחייב חשבון Google של המנהל. Web App ציבורי של Apps Script עלול להיות נגיש גם לגורמים אחרים אם כתובתו נחשפת; נדרשת בדיקת Secret בצד הסקריפט בנוסף להגנות ה-Backend. אין להבטיח מניעת Spam מוחלטת. תוכנית Vercel Hobby מיועדת לשימוש אישי ולא מסחרי; שימוש מסחרי דורש תוכנית מתאימה. גם AI מאומת אינו מבטיח נכונות עובדתית מוחלטת.

## 2. ארכיטקטורת המערכת

### 2.1 מבנה כללי

```text
Browser / Installed PWA
  ├─ Home / Quiz / About
  ├─ IndexedDB: game, current question, history
  ├─ localStorage: sound preference
  └─ HTTPS
       │
       ▼
Next.js Route Handlers on Vercel (Node.js)
  ├─ Input validation + abuse protection
  ├─ AI orchestration + moderation + question validation ──► OpenAI API
  └─ Report validation + server-only secret ─────────────► Apps Script Web App ──► Private Google Sheet
```

המערכת היא **modular monolith**: פרויקט Next.js אחד. קוד השרת מחזיק מפתחות API; הדפדפן אינו ניגש ישירות ל-OpenAI או ל-Apps Script. אין Database אפליקטיבי ייעודי; דיווחים נשמרים בענן בגיליון Google Sheets פרטי. המנהל נכנס לגיליון באמצעות חשבון Google שלו בלבד.

### 2.2 Modules ואחריות

- **App shell / navigation:** בית, משחק, אודות, החלפת שפה וכיווניות, מצבי טעינה ושגיאה.
- **Game engine (client):** 5/10/15 שאלות, ניקוד, עד שלושה דילוגים, תשובה אחת לכל שאלה, סיכום טעויות, שמירת התקדמות ומניעת חזרה במשחק הנוכחי.
- **Local persistence:** שמירה ושחזור מ-IndexedDB, כולל שאלה פעילה, תשובות והגדרות ממתינות.
- **AI service (server):** נושאים מוצעים, בדיקת התאמה לגיל, יצירת שאלה והסבר, Validation, ניסיונות חלופיים מוגבלים.
- **Reports service (server):** אימות סוג הדיווח ופרטי השאלה, הגנה משימוש לרעה ושליחה מאובטחת ל-Apps Script לצורך כתיבת שורה בגיליון.
- **Localization / accessibility:** מילוני UI ל-`he`, `en`, `ru`, כיווניות RTL/LTR, Keyboard, Focus, Screen readers, Reduced motion ו-WCAG 2.2 AA.

### 2.3 מסכים

- `/` — שם "טריוויה קידס", תמונת טריוויה, שפה, קבוצת גיל, משחק חדש או המשך משחק.
- `/quiz` — רמת קושי, 5/10/15 שאלות, נושא חופשי או מוצע, שאלה, ארבע תשובות, משוב, הסבר, דילוג, דיווח וסיכום.
- `/about` — תיאור והוראות מפורטות בשפה שנבחרה.

אין `/admin`, דף כניסה או ניהול משתמשים. בכל המסכים יש אפשרות להשתקת צלילים; טקסטי UI מוצגים בשפה שנבחרה.

### 2.4 Data Model ואחסון

**IndexedDB — `activeGame` (מקומי בלבד):**
- `schemaVersion`, `gameId` מקומי, `status` (`setup`/`active`/`completed`), `questionLimit` (5/10/15), `completedCount`, `correctCount`, `skipCount` (0–3).
- `settings`: `locale`, `ageGroup`, `difficulty`, `topic`; `nextSettings` לשינויים שיחולו מהשאלה הבאה.
- `currentQuestion`: מזהה מקומי, טקסט, ארבע אפשרויות, מזהה התשובה הנכונה, הסבר, הגדרות השאלה, מצב מענה ובחירת הילד.
- `answeredQuestions`: שאלות שנענו, בחירה, תשובה נכונה ותוצאה — לסיכום ומניעת חזרות.
- `seenQuestionFingerprints`: טביעות שאלות שהוצגו במשחק הנוכחי, גם אם דולגו; לא נשמרות בין משחקים.
- `localStorage`: `soundEnabled` והעדפות UI קטנות.

**Google Sheets — גיליון `Reports` פרטי (מרכזי לדיווחים בלבד):** כל שורה כוללת `createdAt`, `reportId`, `issueType`, `topic`, `locale`, `ageGroup`, `difficulty`, `questionText`, `answer1`–`answer4`, `correctAnswerId`, `explanation`, `status` (ברירת מחדל `חדש`). `status` ניתן לשינוי ידני ל-`טופל` בגיליון. `reportId` נוצר ב-Backend לצורך זיהוי בקשה וניסיון למניעת כפילויות; Apps Script בודק אם הוא כבר קיים לפני הוספה, אך אין הבטחת Exactly-once בעת עומס או כשל תקשורת. יש להשתמש ב-`LockService` סביב בדיקה והוספה לצמצום מרוצים. לא שומרים שם, אימייל, מזהה מכשיר, IP או היסטוריית משחק של ילד. הגיליון אינו ציבורי; רק המנהל ומורשים מטעמו יכולים לפתוח אותו.

### 2.5 API Contracts

כל הממשקים תחת `/api`, ב-HTTPS, עם Zod, מגבלות אורך וגודל קלט, תשובות JSON ומנגנוני הגנה מניצול לרעה:

| Endpoint | גישה | פעולה |
|---|---|---|
| `POST /api/topics/suggest` | ציבורית | קבלת `locale`, `ageGroup`; החזרת נושאים בטוחים ומותאמים |
| `POST /api/questions/generate` | ציבורית | קבלת `topic`, `locale`, `ageGroup`, `difficulty`, `seenQuestionFingerprints`; החזרת שאלה אחת מאומתת |
| `POST /api/reports` | ציבורית | קבלת סוג בעיה ופרטי שאלה; העברה משרת Next.js ל-Apps Script; הצלחה רק לאחר אישור כתיבה לגיליון |

אין API ל-Admin, למשתמשים או לשמירת משחקים. נכונות התשובה וההסבר מגיעים עם השאלה, ולכן ניתן לענות גם לאחר ניתוק אינטרנט. תשובת הצלחה ללקוח תישלח רק אם Apps Script החזיר אישור מפורש שהשורה נשמרה (או שאותו `reportId` כבר נשמר). תשובת HTTP תקינה בלבד אינה מספיקה; יש לבדוק גם את גוף התגובה.

**קודי שגיאה:** `INVALID_INPUT`, `UNSAFE_TOPIC`, `AI_UNAVAILABLE`, `AI_INVALID_RESPONSE`, `RATE_LIMITED`, `REPORT_SAVE_FAILED`. במקרה של כישלון דיווח מוצגת אפשרות לנסות שוב, בלי שינוי בניקוד. יש למנוע שליחה כפולה בלחיצות חוזרות באמצעות נעילת כפתור בזמן בקשה; ייתכנו כפילויות נדירות במקרה של כשל תקשורת או שליחה חוזרת ללא אותו `reportId`.

### 2.6 יצירת שאלות ובדיקות AI

1. אימות `topic`, `locale`, `ageGroup`, `difficulty` וגבולות הקלט בשרת; הגדרת מדיניות גיל שלא ניתן לעקוף דרך טקסט המשתמש.
2. בדיקת נושא באמצעות Moderation וכללי התאמה לגיל; בנושא לא מתאים החזרת `UNSAFE_TOPIC`.
3. קריאה ל-OpenAI Responses API באמצעות מודל תומך Structured Outputs (בחירת המודל ותמחורו ייבדקו בעת ההטמעה), להחזרת `question`, ארבע `answers`, `correctAnswerId`, `explanation`.
4. בדיקת Schema וארבע תשובות שונות, מזהה נכון יחיד, התאמה לשפה/גיל/נושא, הסבר, סינון פלט וזיהוי חזרות; בדיקת עקביות נוספת לפי הצורך.
5. במקרה של תוכן לא תקין — יצירת חלופה עד מספר ניסיונות שרת מוגבל; כישלון אינו נספר כשאלה במשחק.

אין לשלוח לספק AI פרטים מזהים של ילדים. נושאים שהוקלדו וטביעות שאלות קודמות הדרושות למניעת חזרות עשויים להישלח; יש לבדוק מדיניות נתונים של ספק ה-AI לפני השקה ציבורית לילדים.

### 2.7 Data Flows

**משחק חדש:** בחירת שפה/גיל/קושי/מספר שאלות → בחירת נושא או בקשת הצעות AI → יצירת שאלה בשרת → אימות → שמירה ב-IndexedDB → הצגה.

**מענה:** בחירת תשובה אחת → נעילת התשובות → חישוב נכונות ועדכון `completedCount` ו-`correctCount` → שמירה → משוב והסבר → כפתור שאלה הבאה או סיכום.

**דילוג:** אם `skipCount < 3` והשאלה טרם נענתה → רישום שאלה כנצפתה והגדלת `skipCount` → בקשת שאלה חלופית; ללא שינוי ניקוד או `completedCount`. אם הבקשה נכשלת, Retry לא צורך דילוג נוסף.

**שינוי הגדרות:** שינוי נושא/שפה/גיל/קושי נרשם ל-`nextSettings` → השאלה הנוכחית נשארת → השינוי משפיע על יצירת השאלה הבאה. טקסטי הניווט בשפה החדשה יכולים להתעדכן מיידית, אך תוכן השאלה הנוכחית נשאר כפי שנוצר.

**ניתוק אינטרנט:** אפשר לענות על שאלה שכבר נטענה, לקבל משוב והסבר ולשמור מצב. יצירת השאלה הבאה מחייבת חיבור. מעבר מסכים וסגירה אינם מאפסים משחק.

**דיווח:** הילד בוחר סוג בעיה → `POST /api/reports` → אימות והגנה בשרת → `POST` ל-Apps Script Web App עם Secret שרת-לשרת → אימות Secret בסקריפט → בדיקת כפילות וכתיבת שורה ב-Google Sheets → אישור מפורש → הודעת הצלחה או כישלון. דיווח לא משנה ניקוד. המנהל בודק דיווחים ומשנה `status` ישירות בגיליון; אין מסך ניהול באפליקציה.

### 2.8 אבטחה ופרטיות

- **ילדים:** ללא הרשמה, חשבונות, מעקב מרכזי או סנכרון בין מכשירים.
- **Secrets:** `OPENAI_API_KEY`, `REPORTS_SCRIPT_URL` ו-`REPORTS_SHARED_SECRET` בצד השרת בלבד; לעולם לא `NEXT_PUBLIC_` עבור מפתחות או כתובת ניהול שאינה מיועדת לפרסום.
- **שמירת דיווחים:** ה-Frontend אינו מכיר את כתובת Apps Script, מזהה הגיליון או ה-Secret. ה-Backend מקבל רק נתוני דיווח ואינו מאפשר בחירת גיליון יעד. Apps Script מוגדר כ-Web App עם `Execute as me` כדי לכתוב בגיליון ללא חשבון Google לילד; אם נדרשת גישה אנונימית ל-Web App, יש להתייחס אליו כ-endpoint ציבורי גם אם בפועל רק ה-Backend אמור לקרוא לו. ה-Secret נשמר ב-Vercel וב-Apps Script Script Properties, נשלח ב-POST body דרך HTTPS ונבדק לפני כל כתיבה; אין להכניס אותו ל-URL או לדפדפן. אין להסתמך על סוד משותף לבדו: הגבלת קצב ובדיקת Bot ב-Backend, בדיקת Schema ואורכי שדות גם בסקריפט, והגנה מפני Formula Injection בגיליון (טקסט חופשי שמתחיל בתווי נוסחה חייב להיכתב כטקסט בטוח). אין להניח ש-CORS לבדו מגן על endpoint ציבורי.

- **API ציבורי:** Validation, הגבלת בקשות, הגבלת מספר ניסיונות AI, תקרת הוצאות והתראות. אין מכסה יומית לילד; הגנות שימוש לרעה אינן מגבלת משחק מוצרית.
- **תוכן:** Moderation לקלט ולפלט, מדיניות התאמה לגיל, התייחסות לקלט כנתון ולא כהוראה, ובדיקות איכות שאינן מבטיחות אמת מוחלטת.
- **פרטיות:** ללא Analytics או tracking cookies; ללא logging של גוף שאלות, נושאים ותשובות. הדיווחים נשמרים בשירותי Google תחת חשבון המנהל, ולכן יש להגביל שיתוף של הגיליון, להגדיר מדיניות שמירה/מחיקה ולבדוק חובות פרטיות החלות על מוצר לילדים לפני פרסום.
- **PWA:** HTTPS, CSP מתאים, Cache רק לנכסים סטטיים; לא לשמור תשובות API או פרטי דיווח ב-Service Worker Cache. IndexedDB מקומי אינו מבודד בין משתמשי אותו פרופיל דפדפן.
- **נגישות:** WCAG 2.2 AA, קוראי מסך, Keyboard/Focus, ניגודיות, כפתורי מגע, Reduced motion, משוב שאינו מסתמך רק על צליל או צבע.

### 2.9 Hosting, סביבות ו-Deployment

**GitHub:** Repository אחד, `main` ל-Production וענפי עבודה לבדיקות. GitHub Actions מריץ lint, typecheck, tests ו-build. אין לשמור `.env.local` או מפתחות ב-Git.

**Vercel:** חיבור ישיר ל-GitHub; כל Pull Request יוצר Preview deployment, ו-Merge ל-`main` מפעיל Production deployment אוטומטי. Next.js Route Handlers פועלים ב-Node.js runtime; יש לוודא שזמן יצירת שאלות וקריאות ל-Apps Script נכנס למגבלות Function.

**Google Sheets + Apps Script:** חשבון Google של המנהל מחזיק גיליון פרטי ופרויקט Apps Script. הסקריפט נפרס כ-Web App עם `doPost(e)` הפועל בזהות בעל הסקריפט (`Execute as me`). כדי לאפשר בקשה מה-Backend ללא התחברות Google, נדרשת הרשאת גישה אנונימית ל-Web App, ככל שהיא זמינה בחשבון ובמדיניות הארגון. **ההרשאה הזו אינה הופכת את הגיליון לציבורי**; היא הופכת את נקודת הקבלה לציבורית, ולכן בדיקת Secret בסקריפט היא חובה. `doPost` מאמת את הבקשה, משתמש ב-`SpreadsheetApp.openById` וב-`appendRow` להוספת שורה, ומחזיר JSON עם `ok: true` רק לאחר הצלחת כתיבה. הסקריפט בודק כפילויות באמצעות `reportId` ומצמצם מרוצים עם `LockService`. Google עשויה לבצע Redirect בתגובות `ContentService`; ה-Backend חייב לתמוך ב-Redirect המאובטח ולבדוק גוף JSON. הגיליון אינו משותף עם משתמשי האפליקציה. אין צורך ב-Google OAuth עבור הילדים או ב-Google Sheets API Credentials ב-Next.js.

**Development:** סביבת פיתוח מקומית עם `.env.local` ומפתח OpenAI לבדיקות; פרויקט Apps Script וגיליון Google Sheets **נפרדים לבדיקות**, עם URL ו-Secret ייעודיים. Vercel Preview משתמש בהגדרות בדיקות בלבד. אין להפנות דיווחי בדיקות לגיליון Production.

**Production:** מפתחות Production ופרטי Apps Script Production נשמרים רק ב-Vercel Production Environment Variables. Script Properties של Apps Script Production כוללים את ה-Secret המתאים ואת מזהה הגיליון. יש לשמור את קוד Apps Script תחת GitHub באותו Repository, ולנהל פריסת Web App בנפרד: Vercel נפרס אוטומטית מ-GitHub; שינויי Apps Script דורשים עדכון Deployment של Apps Script ואינם מתפרסמים אוטומטית על ידי Vercel. עדכון ה-Apps Script חייב להיות תואם לגרסת Backend שנפרסת.

| משתנה / הגדרה | Development / Preview | Production |
|---|---|---|
| `OPENAI_API_KEY` | מפתח בדיקות | מפתח Production ב-Vercel בלבד |
| `REPORTS_SCRIPT_URL` | כתובת Web App לבדיקות | כתובת Web App Production ב-Vercel בלבד |
| `REPORTS_SHARED_SECRET` | Secret ייעודי לבדיקות | Secret Production ב-Vercel בלבד |
| Apps Script Script Properties: `REPORTS_SHARED_SECRET` | אותו Secret של בדיקות | אותו Secret של Production |
| Apps Script Script Properties: `SPREADSHEET_ID` | מזהה גיליון בדיקות | מזהה גיליון Production |

אין Supabase Projects או Database Migrations בגרסה זו. בעת הרחבה אפשר להוסיף Supabase, להעביר דיווחים קיימים מהגיליון, ולשנות רק את מימוש `Reports service` — בלי לשנות את טופס הדיווח של הילד. זו אפשרות עתידית, **לא חלק מהגרסה הנוכחית**.

### 2.10 עלויות ומגבלות

- **Vercel:** Hobby מוגבלת לשימוש אישי ולא מסחרי; יש לבדוק מכסות Functions ותוכנית מתאימה לפרויקט ציבורי/מסחרי.
- **OpenAI:** חיוב לפי שימוש ו-Tokens; יצירת חלופות, דילוגים וסינון עשויים להגדיל עלות. יש להגדיר בקרות הוצאה והתראות.
- **Google Sheets + Apps Script:** לרוב ללא תשלום נוסף בשימוש קטן במסגרת חשבון Google קיים, בכפוף למכסות, נפח אחסון, מגבלות הרצה ושינויי מדיניות Google. לא מובטחת זמינות רציפה או התאמה לעומסים גבוהים. יש לוודא שניתן לפרוס Web App בגישה אנונימית בחשבון המנהל.
- **Database ייעודי:** אין עלות Database נפרד בגרסה זו. עלות דומיין, אם נרכש, נפרדת.
- ללא אומדן משתמשים ובקשות אין תחזית חודשית אמינה; שירות ה-AI נשאר רכיב בתשלום לפי שימוש.

### 2.11 בדיקות איכות

- **Unit:** ניקוד, אחוז הצלחה, עד שלושה דילוגים, שינויים החל מהשאלה הבאה, שחזור משחק, מניעת כפילויות ו-Zod schemas.
- **Integration:** OpenAI/Apps Script עם mocks; כשלי AI, Timeout, תוכן לא תקין, Rate limiting, שליחת דיווח, שגיאות כתיבה, ניסיון כפול ו-Formula Injection.
- **E2E:** שלוש שפות, RTL/LTR, PWA, Offline answer, חזרה לאחר סגירה, אישור משחק חדש, שמירת דיווח בגיליון ומצבי שגיאה; בדיקות WCAG אוטומטיות וידניות.
- **Out of Scope:** חשבונות ילדים, Admin Dashboard, Database ייעודי (מעבר לגיליון דיווחים), סטטיסטיקות שימוש, סנכרון בין מכשירים, עריכת שאלות, Push notifications או יצירת שאלות Offline.

## 3. מקורות רשמיים

1. Next.js — App Router: https://nextjs.org/docs/app
2. Next.js — Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
3. Next.js — PWA: https://nextjs.org/docs/app/guides/progressive-web-apps
4. Vercel — Git Deployments: https://vercel.com/docs/git
5. Vercel — Hobby Plan: https://vercel.com/docs/plans/hobby
6. Google Apps Script — Web Apps (`doPost`, `Execute as me`): https://developers.google.com/apps-script/guides/web
7. Google Apps Script — Web App access permissions: https://developers.google.com/apps-script/manifest/web-app-api-executable
8. Google Apps Script — Quotas and limitations: https://developers.google.com/apps-script/guides/services/quotas
9. Google Apps Script — Sheet `appendRow`: https://developers.google.com/apps-script/reference/spreadsheet/sheet
10. Google Apps Script — Properties Service: https://developers.google.com/apps-script/guides/properties
11. Google Apps Script — Lock Service: https://developers.google.com/apps-script/reference/lock
12. OpenAI — API Pricing: https://openai.com/api/pricing/
13. OpenAI — Moderation: https://platform.openai.com/docs/guides/moderation
14. WCAG 2.2: https://www.w3.org/TR/WCAG22/

> אין במסמך Milestones או לוחות זמנים. ניהול הדיווחים ב-Google Sheets הוא חלק מגרסת המוצר הנוכחית; Supabase אינו נדרש כעת.
