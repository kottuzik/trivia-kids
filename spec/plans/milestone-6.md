# תוכנית — Milestone 6: פרסום Production ובדיקת הפעלה

**מקורות:** `MILESTONES.md` (Milestone 6), `ARCHITECTURE.md` §2.8–2.10, ADR-5, ADR-11, ADR-12, ADR-14, `apps-script/README.md`.
**עיקרון:** כמעט כל העבודה היא הגדרות וחשבונות שהמשתמש מבצע בעצמו, בהדרכה צעד אחר צעד. שינויי הקוד קטנים. אין Database ואין Migrations.

## 0. מצב קיים (נבדק בקוד)

- הפרויקט מחובר ל-GitHub (`kottuzik/trivia-kids`) ול-Vercel (מאז Milestone 1); Preview נוצר אוטומטית.
- השרת קורא רק שלושה משתנים: `OPENAI_API_KEY` (`src/lib/server/openai.ts`), `REPORTS_SCRIPT_URL` ו-`REPORTS_SHARED_SECRET` (`src/lib/server/reports.ts`). אין משתני `NEXT_PUBLIC_`.
- CI (`.github/workflows/ci.yml`) מריץ שני Jobs: `checks` (lint, typecheck, unit, build) ו-`e2e` (Playwright מול API מדומה), על Node 22.
- `package.json` מגדיר `"engines": { "node": ">=20.9" }`. Node 20 הוצא משימוש ב-Vercel ב-1.10.2026.
- הגנות קיימות: Origin זהה, גוף עד 8KB, Zod, הגבלת קצב בזיכרון (ADR-5), CSP וכותרות אבטחה (ADR-13), Service Worker לנכסים סטטיים בלבד (ADR-12).
- Apps Script: גיליון ופרויקט Production הוקמו ב-Milestone 4; הכתובת והסוד שמורים אצל המשתמש ועדיין לא הוכנסו ל-Vercel.

## 1. שינויי קוד וקבצים (Claude)

| קובץ | שינוי |
|---|---|
| `package.json` | `engines.node` ← `"24.x"` (גרסת ה-LTS הנוכחית וברירת המחדל ב-Vercel), כדי ש-Vercel לא יבנה על גרסה ישנה. |
| `.github/workflows/ci.yml` | `node-version: 24` בשני ה-Jobs, כדי ש-CI יבדוק את אותה גרסה ש-Vercel מריץ. בלי שינוי בשמות ה-Jobs (`checks`, `e2e`), כי Vercel יחכה להם (סעיף 3). |
| `docs/production.md` (חדש) | מדריך בעברית, צעד אחר צעד, למשתמש: הגדרות Vercel Production, Apps Script Production, בקרת הוצאות OpenAI, בדיקות אחרי פרסום, ו"איפה רואים דיווחים ואיך מסמנים טופל". |
| `apps-script/README.md` | בשלב 6 ("Production"), החלפת "רק ב-Milestone 6" בהפניה ל-`docs/production.md`. |
| `spec/ARCHITECTURE.md` | ADR-15 (פרסום ל-Production רק אחרי CI), ADR-16 (Node 24). |
| `CLAUDE.md` | בפקודות ההרצה: שורה עם כתובת האתר החי, אחרי שהיא ידועה. |

לא נוסף קוד אפליקציה, ספריות או מסכים. אם בבדיקות ה-Production תימצא תקלה, היא תתוקן כחלק מה-Milestone הזה.

## 2. סדר הפעולות

הסדר מחייב: **Apps Script Production נבדק לפני** ש-Vercel Production מקבל את הכתובת שלו (DoD 1).

### שלב א — הכנות ובדיקות לפני פרסום (Claude)
1. עדכון Node (סעיף 1), הרצת `npm run lint && npm run typecheck && npm test && npm run build` ו-`npm run test:e2e`.
2. וידוא שאין סודות בקוד הדפדפן: חיפוש ב-`.next/static` אחרי `script.google.com`, `OPENAI`, `REPORTS_`, `sk-` (מצופה: אין תוצאות).
3. וידוא ש-`apps-script/Code.gs` ב-Repository זהה לגרסה שנבדקה מול Development ב-Milestone 4 (השוואה ל-git history), כדי לדעת מה להדביק ב-Production.

### שלב ב — Apps Script Production (המשתמש, בהדרכה)
1. בפרויקט Apps Script Production: הדבקת `Code.gs` ו-`appsscript.json` העדכניים; בדיקה ש-Script Properties כוללים `SPREADSHEET_ID` של גיליון **Production** ו-`REPORTS_SHARED_SECRET` של **Production** (שונה מהסוד של Development).
2. אם קיימת פריסה: **Manage deployments → Edit → New version**; אחרת **New deployment** (Web app, Execute as: Me, Who has access: Anyone), לפי `apps-script/README.md`.
3. בדיקת "חיים" בלי כתיבה (Claude, בטרמינל): בקשת POST לכתובת עם סוד שגוי → מצופה דחייה (`{ ok: false, error: "UNAUTHORIZED" }`) ושום שורה חדשה בגיליון. כך בודקים שהסקריפט פרוס ומגיב, בלי ליצור דיווח בדיקה ב-Production. המשתמש מעביר את הכתובת דרך משתנה סביבה זמני בטרמינל שלו, לא בצ'אט.

### שלב ג — Vercel Production (המשתמש, בהדרכה)
1. **Settings → Environment Variables:** שלושת המשתנים עם ערכי Production, מסומנים **רק Production**. בדיקה שערכי Development מסומנים רק Preview (ו-Development אם רוצים), ושאין משתנה עם ערכי Production ב-Preview.
2. **מפתח OpenAI:** המפתח הקיים (החלטה 4). בפרויקט שלו ב-OpenAI מגדירים **תקציב חודשי (Budget) והתראה במייל**. זו בקרת ההוצאות העיקרית (ADR-5).
3. **Settings → Build and Deployment → Node.js Version:** 24.x (אמור להתאים ל-`engines`).
4. **Settings → Git:** Production Branch = `main`.
5. **Deployment Checks** (סעיף 3): הוספת `checks` ו-`e2e` כבדיקות חובה.
6. אין דומיין: הכתובת היא `<project>.vercel.app` (החלטה 2).

### שלב ד — פרסום (דורש אישור מפורש של המשתמש)
1. אחרי אישור: commit + push ל-`main` (אחת הפעולות היחידות שדורשות push כדי להשלים Milestone; Claude עוצר ומבקש אישור לפני כן).
2. Vercel בונה Production deployment; הכתובת הציבורית מתעדכנת רק אחרי ש-`checks` ו-`e2e` עוברים ב-GitHub Actions.
3. אם משהו נכשל — אפשר להחזיר ב-Vercel את ה-Deployment הקודם (Instant Rollback) בלחיצה.

### שלב ה — בדיקות על האתר החי (Claude + המשתמש)
**Claude (אוטומטי, בלי לכתוב לגיליון ובלי עלות AI משמעותית):**
- `/`, `/quiz`, `/about` נטענים ב-HTTPS; כותרות CSP ואבטחה קיימות; `manifest.webmanifest`, אייקונים ו-`sw.js` (עם `no-store`) זמינים.
- `POST /api/questions/generate` ו-`/api/reports` מכתובת Origin זרה או בגוף לא תקין → נדחים (`INVALID_INPUT`); שום שורה לא נכתבת.
- קובצי ה-JS באתר החי לא מכילים את כתובת Apps Script, את שמות הסודות או מפתח.
- סבב משחק קצר בדפדפן (5 שאלות, עברית) ובדיקת Console ללא שגיאות.

**המשתמש (ידני, לפי צ'קליסט ב-`docs/production.md`):**
- משחק מלא בשלוש השפות בטלפון: משוב, הסבר, דילוג, סיכום, רענון ושחזור.
- התקנת PWA בטלפון (Android: "התקן אפליקציה"; iPhone: Safari → שיתוף → "הוסף למסך הבית").
- **דיווח מבוקר אחד ב-Production:** דיווח על שאלה מהאתר החי → בדיקה שהשורה הופיעה בגיליון Production (ולא ב-Development) → שינוי סטטוס ל"טופל" → **המשתמש מוחק את שורת הבדיקה בעצמו** (Claude לא מוחק נתונים).
- דיווח אחד מ-Preview או מקומית → מופיע **רק** בגיליון Development.

### שלב ו — סיום
- ADR-15, ADR-16, כתובת חיה ב-`CLAUDE.md`, סימון 🟡 ב-`MILESTONES.md`.
- הצגת הכתובת החיה, תוצאות הבדיקות מול כל סעיף DoD והנחיות קצרות לטיפול בדיווחים.

## 3. ADRs שיתווספו

**ADR-15: פרסום Production רק אחרי מעבר CI.** כברירת מחדל Vercel מפרסם כל push ל-`main` מיד, גם אם הבדיקות ב-GitHub נכשלות. בעזרת **Vercel Deployment Checks** הכתובת הציבורית עוברת לגרסה החדשה רק אחרי ש-`checks` ו-`e2e` עוברים. לא נדרש שינוי ב-Workflow (אין `repository_dispatch`). השלכה: שינוי שם Job ב-CI מחייב עדכון ההגדרה ב-Vercel.

**ADR-16: Node.js 24.** Node 20 הוצא משימוש ב-Vercel; `engines` ו-CI עוברים ל-24.x, כך שהבדיקות והפרסום רצים על אותה גרסה.

## 4. מה לא נעשה ב-Milestone הזה

- אין Database, Migrations, Analytics, Admin Dashboard או פיצ'רים חדשים.
- אין שינוי בהגבלת הקצב (ADR-5) ואין Vercel Firewall בתשלום. אם יופיע ניצול לרעה, זה יטופל בנפרד.
- אין פריסה בדרך אחרת מלבד Git Integration של Vercel.
- Claude לא נכנס לחשבונות, לא מקליד סודות ולא קורא את `.env`.

## 5. החלטות המשתמש (26.10.2026)

1. **תוכנית Vercel:** Hobby (חינם). האפליקציה אישית, לתרגול הטכנולוגיות ובהמשך לשימוש המשפחה, ולא מסחרית.
2. **דומיין:** כתובת `vercel.app` החינמית. אין חיבור דומיין.
3. **פרסום:** בהתחלה רק קישור לחברים ולמשפחה, לא פרסום ציבורי. בדיקת מדיניות הנתונים של OpenAI והפרטיות נשארת בהמלצה לפני פרסום ציבורי בעתיד.
4. **מפתח OpenAI:** משתמשים במפתח שהמשתמש כבר סיפק, בלי ליצור מפתח נוסף. בשלב ג נבדק רק שהוא מוגדר ב-Vercel Production, ושלפרויקט שלו ב-OpenAI יש תקציב חודשי והתראה.

## 6. Definition of Done — איך ייבדק

| תנאי | בדיקה |
|---|---|
| המשתמש אישר פרסום; Apps Script Production עודכן ונבדק לפני ה-Backend | אישור בצ'אט; שלב ב (בדיקת דחייה) לפני שלב ג |
| `main` נפרס אוטומטית; CI עבר; סודות Production רק במקומם | Deployment ב-Vercel מ-push; Deployment Checks ירוקים; מעבר על מסך Environment Variables |
| משחק Production מלא, שפות, שחזור, PWA | שלב ה (Claude + המשתמש) |
| דיווח Production רק בגיליון Production; Development רק ב-Development; סטטוס מתעדכן | שני דיווחים מבוקרים בשלב ה |
| אין חשיפת סודות או נתוני ילדים; יש הגנות ובקרת הוצאות | סריקת JS חי, בקשות דחייה, תקציב OpenAI מוגדר |
| הוצגו כתובת, תוצאות והנחיות לדיווחים | סיכום הסיום + `docs/production.md` |
