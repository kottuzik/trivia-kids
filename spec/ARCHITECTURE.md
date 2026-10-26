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

## החלטות מרכזיות (ADRs)

### ADR-1: שמירת שפה וקבוצת גיל ב-Cookies פונקציונליים
**הקשר:** הנתיבים מוגדרים כ-`/`, `/quiz`, `/about` ללא קידומת שפה. אם השפה נקבעת רק בדפדפן אחרי הטעינה, המסך מוצג לרגע בשפה ובכיווניות הלא נכונות (RTL/LTR), ובחירת הגיל "קופצת". ARCHITECTURE §2.4 הציע `localStorage` להעדפות קטנות.
**החלטה:** השפה (`locale`) וקבוצת הגיל (`ageGroup`) נשמרות ב-Cookies פונקציונליים (`SameSite=Lax`, שנה אחת, ללא מידע מזהה וללא tracking). ה-Root Layout קורא אותם בשרת וקובע `lang`/`dir` ואת הבחירות כבר ב-HTML הראשון. שינוי שפה מעדכן Cookie, Context ו-`router.refresh()`. מצב המשחק עצמו עדיין יישמר ב-IndexedDB (Milestone 3), והעדפת צלילים ב-`localStorage`.
**השלכות:** כל הדפים מרונדרים דינמית (לא סטטית) — זניח לאפליקציה בגודל זה. ה-Cookies נשלחים לשרת בכל בקשה, אך אינם מכילים מידע אישי ואינם נשמרים בשרת.

### ADR-2: מודל OpenAI, Moderation וניסיונות חלופיים
**הקשר:** ARCHITECTURE §2.6 השאיר את בחירת המודל לזמן ההטמעה. נדרש מודל זול ומהיר שתומך ב-Structured Outputs, וסינון תוכן לקלט ולפלט.
**החלטה:** `gpt-6-luna` (המודל הזול ביותר כרגע עם Structured Outputs, ‎$0.10/$0.50 למיליון Tokens) עם `reasoning.effort: "low"` ו-`max_output_tokens` מוגבל, דרך `responses.parse` + `zodTextFormat`. הנושא נבדק תחילה ב-Moderation API (`omni-moderation-latest`) — מסומן ← `UNSAFE_TOPIC` בלי לייצר שאלה. הפלט נבדק ב-Moderation שמוחזר יחד עם התשובה (פרמטר `moderation` של Responses API), ואם התוצאה חסרה — בקריאה נפרדת. המודל גם מחזיר `topicSuitable`. שאלה שנכשלת בבדיקות (`validateQuestion` או Moderation) מוחלפת עד 3 ניסיונות לבקשה; אחר כך `AI_INVALID_RESPONSE`. ה-Client של OpenAI: Timeout של 25 שניות וניסיון חוזר אחד לשגיאות רשת.
**השלכות:** המודל מוגדר כקבוע אחד ב-`src/lib/server/openai.ts` — החלפה דורשת שינוי שורה אחת. במקרה הגרוע בקשה אחת עולה עד 3 יצירות + Moderation.

### ADR-3: "טביעת שאלה" כטקסט מנורמל
**הקשר:** צריך למנוע חזרה על שאלה במשחק הנוכחי, וגם לומר למודל אילו שאלות כבר נשאלו.
**החלטה:** `fingerprint` = טקסט השאלה באותיות קטנות, בלי ניקוד/סימנים דיאקריטיים ופיסוק, קצוץ ל-200 תווים. הלקוח שולח את רשימת הטביעות (עד 30); השרת מוסיף אותן להנחיה כ"שאלות שנשאלו" (כנתונים, לא כהוראות) ודוחה שאלה שטביעתה ברשימה.
**השלכות:** אין צורך ב-Hash נפרד; ניסוח שונה מעט של אותה שאלה עלול לעבור את הבדיקה — המודל מונחה להימנע גם מכך.

### ADR-4: מצב המשחק בזיכרון ב-Milestone 2
**הקשר:** שמירה ב-IndexedDB שייכת ל-Milestone 3, אבל מעבר בין מסכים לא אמור לאבד משחק.
**החלטה:** `GameProvider` ב-Root Layout מחזיק את המשחק בזיכרון באמצעות Reducer טהור (`src/lib/game/engine.ts`). כל שאלה מבוקשת עם השפה וקבוצת הגיל הנוכחיות.
**השלכות:** מעבר בית/אודות/משחק שומר את המשחק; רענון או סגירה מאפסים אותו עד Milestone 3, שבו השמירה תעטוף את אותו Reducer.

### ADR-5: הגבלת קצב בזיכרון ובקרת הוצאות
**הקשר:** ה-API ציבורי ועולה כסף; אין Database או שירות Cache.
**החלטה:** הגבלת קצב בזיכרון לפי IP (נושאים 15, שאלות 40 בכל 10 דקות), בדיקת `Origin` זהה לאתר, תקרת גוף בקשה 8KB, Zod `strictObject` ותקרות אורך. בקרת ההוצאות העיקרית היא תקציב חודשי והתראה בפרויקט OpenAI.
**השלכות:** ב-Vercel כל Instance סופר בנפרד — זו הגנה בסיסית בלבד ולא מגבלת משחק. אם יידרש, אפשר לעבור בהמשך למגבלה מרוכזת (למשל Vercel Firewall / KV).

### ADR-6: שמירת המשחק ב-IndexedDB כרשומה אחת
**הקשר:** Milestone 3 דורש שחזור משחק אחרי רענון או סגירה, כולל שאלה פתוחה, משוב, ניקוד, טעויות, הגדרות ודילוגים (§2.4).
**החלטה:** כל מצב ה-Reducer נשמר באמצעות `idb` כרשומה אחת (`trivia-kids` → `game` → `active`) אחרי כל שינוי, עם `schemaVersion`. בטעינה המצב מאומת ב-Zod; נתונים פגומים או מגרסה אחרת נזרקים בשקט ומתחילים נקי. בקשה שהייתה "בטעינה" בעת הסגירה משוחזרת כ"ממתינה" ונשלחת שוב. כש-IndexedDB לא זמין (מצב פרטי, חסימה) המשחק ממשיך בזיכרון בלבד. בקשת שאלה נשלחת ממקום אחד — אפקט שמגיב למצב "צריך שאלה" — כך שהתחלה, "הבא", דילוג ושחזור עוברים באותו מסלול.
**השלכות:** אין צורך במיגרציות בין גרסאות כל עוד אפשר לזרוק משחק ישן. בכמה לשוניות פתוחות — השמירה האחרונה מנצחת.

### ADR-7: הגדרות "מהשאלה הבאה" בלי `nextSettings`
**הקשר:** §2.4 הציע `settings` ו-`nextSettings` נפרדים כדי ששינוי הגדרות לא ישנה את השאלה המוצגת.
**החלטה:** כל שאלה כבר נושאת את הנושא, השפה, הגיל והקושי שבהם נוצרה, ומוצגת לפיהם. לכן `settings` של המשחק (נושא וקושי) והעדפות השפה והגיל (Cookies, ADR-1) משמשים רק לבקשה הבאה, ושינוי שלהם פשוט מעדכן אותם. מספר השאלות אינו ניתן לשינוי באמצע משחק.
**השלכות:** אין שדה `nextSettings`; מבנה נתונים פשוט יותר. טקסטי הממשק מתחלפים מיד לשפה החדשה, ותוכן השאלה הנוכחית נשאר בשפה שבה נוצר.

### ADR-8: צלילים ב-Web Audio API
**הקשר:** נדרשים צלילים למשוב ולמעברים עם מתג השתקה ושמירת העדפה (FR-06).
**החלטה:** צלילים קצרים נוצרים בקוד (Oscillator) — ללא קובצי אודיו, רישוי או Cache. ברירת המחדל: צלילים פועלים. ההעדפה נשמרת ב-`localStorage` (`soundEnabled`), והמתג נמצא בכותרת של כל מסך.
**השלכות:** אין משקל הורדה; הצלילים פשוטים. צליל לעולם אינו האמצעי היחיד למשוב — טקסט ואייקון תמיד מוצגים.

### ADR-9: `reportId` דטרמיניסטי מהשאלה ומסוג הבעיה
**הקשר:** §2.4 דורש ש-`reportId` ייווצר ב-Backend, ו-Milestone 4 דורש שהוא יישאר יציב בניסיון חוזר כדי ש-Apps Script לא יוסיף שורה כפולה. מזהה אקראי בשרת היה משתנה בכל Retry.
**החלטה:** ה-Backend מחשב `reportId` = 24 התווים הראשונים של SHA-256 על מזהה השאלה (UUID שנוצר בשרת עם השאלה) וסוג הבעיה. Apps Script בודק את המזהה בעמודה `reportId` בתוך `LockService` לפני הוספה, ומחזיר הצלחה גם כשהמזהה כבר קיים.
**השלכות:** כל Retry — אחרי כשל, רענון או חזרה לשאלה — מגיע לאותה שורה. דיווח על אותה שאלה בסוג בעיה אחר הוא שורה נפרדת. אין צורך לשמור מזהה בדפדפן.

### ADR-10: חלון דיווח מודאלי, ללא שדה הערות חופשי
**הקשר:** DESIGN §1.5 מתאר מסך דיווח עם שדה הערות אופציונלי; ה-PRD אינו דורש אותו ואינו כולל עמודה עבורו, ודורש שהדיווח לא יכלול פרטים מזהים של הילד.
**החלטה:** הדיווח הוא `<dialog>` מודאלי מקורי מעל מסך השאלה (Focus נלכד, Escape סוגר, Focus חוזר), עם 5 סוגי בעיה מה-Wireframe (`not_for_kids`, `wrong_answer`, `off_topic`, `confusing`, `other`). אין שדה טקסט חופשי. מצב "דווח" נשמר רק ברכיב השאלה ואינו חלק ממצב המשחק.
**השלכות:** הדיווח אינו יכול לשנות ניקוד או התקדמות, ואין סיכון שילד יקליד שם או פרטים. אם יידרש שדה הערות בעתיד — שינוי ב-Schema, בממשק ובעמודה בגיליון.

### ADR-11: קוד Apps Script ב-`apps-script/`, פריסה ידנית
**הקשר:** §2.9 דורש לנהל את קוד הסקריפט ב-GitHub ולפרוס אותו בנפרד מ-Vercel, ל-Development ול-Production.
**החלטה:** `apps-script/Code.gs` ו-`appsscript.json` נשמרים ב-Repository ומודבקים ידנית לעורך Apps Script (ללא `clasp`), לפי `apps-script/README.md`. פונקציית `setup()` יוצרת את לשונית `Reports`, הכותרות והרשימה הנפתחת `חדש`/`טופל`. השרת שולח `{ secret, report }` ב-POST, עוקב אחרי ה-Redirect של Google ומצליח רק אם הגוף הוא `{ ok: true, reportId }` זהה. `Code.gs` נבדק ב-Vitest בתוך `node:vm` עם תחליפים לשירותי Google.
**השלכות:** אין כלי או התחברות נוספים; עדכון הסקריפט דורש הדבקה ו-"New version" ב-Manage deployments כדי לשמור על אותה כתובת.

### ADR-12: Service Worker ששומר קבצים קבועים בלבד
**הקשר:** §2.8 מתיר Cache רק לנכסים סטטיים. הדפים (`/`, `/quiz`, `/about`) מרונדרים בשרת לפי Cookies (ADR-1). נשקלה שמירת עותק של הדפים כדי שאפליקציה מותקנת תיפתח גם בלי אינטרנט; המשתמש בחר שלא.
**החלטה:** `public/sw.js` נכתב ידנית, בלי ספרייה. הוא שומר Cache-first רק את `/_next/static/*` (קוד, CSS וגופנים, עם שמות שמשתנים בכל build), את `/icons/*`, את `/apple-icon.png` ואת `/favicon.ico`. בקשות שאינן GET, `/api/*`, ניווטים בין דפים והמניפסט אינם עוברים דרכו. שם ה-Cache כולל גרסה, ו-Caches ישנים נמחקים ב-`activate`. הרישום מתבצע רק ב-Production build, כדי לא להפריע ל-`npm run dev`. `sw.js` מוגש עם `Cache-Control: no-store` כדי שעדכונים יגיעו מיד. המניפסט (`src/app/manifest.ts`) לוקח את השם, השפה והכיווניות מ-Cookie השפה.
**השלכות:** האפליקציה ניתנת להתקנה ונטענת מהר, ואין סיכון ששאלות או דיווחים יישמרו ב-Cache. פתיחת האפליקציה המותקנת ללא אינטרנט מציגה את דף השגיאה של הדפדפן. מענה Offline על שאלה שכבר נטענה עובד כל עוד הלשונית פתוחה (Milestone 3). שינוי מדיניות ה-Cache מחייב העלאת הגרסה ב-`CACHE`.

### ADR-13: כותרות אבטחה ו-CSP בלי Nonce
**הקשר:** §2.8 דורש CSP מתאים. Next.js מטמיע סקריפטים קטנים בתוך ה-HTML. CSP מבוסס Nonce מחייב Middleware ומונע Cache של דפים, וזה סיבוך מיותר לאפליקציה בלי תוכן של צד שלישי.
**החלטה:** `next.config.ts` שולח בכל הנתיבים CSP עם `default-src 'self'`, `script-src 'self' 'unsafe-inline'` (ב-Development נוסף `'unsafe-eval'`), `connect-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, ובנוסף `X-Content-Type-Options: nosniff`, `Referrer-Policy` ו-`Permissions-Policy` (מצלמה, מיקרופון ומיקום כבויים).
**השלכות:** הדפדפן לא יטען סקריפטים, פונטים או חיבורים מאתרים אחרים, והאתר לא יוצג בתוך iframe. `'unsafe-inline'` משאיר הגנה חלשה יותר מפני הזרקת סקריפט; הסיכון נמוך כי React מקודד טקסט ואין HTML חיצוני. הוספת שירות חיצוני בעתיד מחייבת עדכון ה-CSP.

### ADR-14: בדיקות E2E ב-Playwright מול API מדומה
**הקשר:** §2.11 דורש E2E לזרימות המשחק, הדיווח, השחזור וה-PWA, ובדיקות WCAG אוטומטיות. בדיקה מול OpenAI ו-Apps Script אמיתיים עולה כסף, איטית, לא יציבה, ועלולה לכתוב לגיליון.
**החלטה:** `@playwright/test` עם Chromium בלבד, מול `next build` + `next start` (פורט 3100), בשלושה גדלים: מובייל (Pixel 7), טאבלט (iPad Mini) ו-Desktop. כל בקשה ל-`/api/*` מיורטת בדפדפן (`e2e/fixtures/mockApi.ts`) ומקבלת שאלות דמה, שגיאות לפי הצורך ואישור דיווח. נגישות נבדקת ב-`@axe-core/playwright` (תגיות WCAG 2.0–2.2 A/AA) בכל מסך ומצב ובשלוש השפות, יחד עם בדיקות מקלדת, Focus גלוי שאינו מוסתר, Reflow ברוחב 320px ו-Reduced Motion. ה-Service Worker חסום בבדיקות (כדי שהיירוט יעבוד), חוץ מ-`pwa.spec.ts`. ב-CI רץ Job נפרד `e2e` בלי Secrets.
**השלכות:** הבדיקות לא נוגעות ב-OpenAI או בגיליונות. איכות השאלות האמיתיות ושמירת שורה בגיליון נבדקות ידנית מול Development. Safari/WebKit וקורא מסך אמיתי לא נבדקים אוטומטית ונשארים לבדיקה ידנית.
