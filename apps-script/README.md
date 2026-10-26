# דיווחי שאלות — הקמת Google Sheets ו-Apps Script

הקוד בתיקייה הזו רץ אצל Google, לא ב-Vercel. הוא מקבל דיווחים מהשרת של האפליקציה בלבד ומוסיף כל דיווח כשורה בגיליון פרטי.
**Vercel לא מעדכן אותו אוטומטית** — כל שינוי בקוד מודבק ונפרס כאן ידנית.

יש **שתי סביבות נפרדות לגמרי**, כל אחת עם גיליון, פרויקט Apps Script וסוד (Secret) משלה:

| | Development (בדיקות) | Production (אמיתי) |
|---|---|---|
| גיליון | "טריוויה קידס — דיווחים (Development)" | "טריוויה קידס — דיווחים (Production)" |
| לאן הכתובת והסוד הולכים | `.env` במחשב + Vercel **Preview** | Vercel **Production** — רק ב-Milestone 6 |

דיווחי בדיקה נשלחים **רק** ל-Development.

---

## שלב 1 — יצירת סוד (פעם אחת לכל סביבה)

בטרמינל:

```bash
openssl rand -hex 32
```

מתקבלת מחרוזת ארוכה. זה הסוד. הריצו פעמיים — אחד ל-Development ואחד ל-Production — ושמרו אותם במקום בטוח (למשל מנהל סיסמאות). אל תשלחו אותם בצ'אט, במייל או ב-GitHub.

## שלב 2 — יצירת הגיליון

1. ב-[Google Sheets](https://sheets.google.com) צרו גיליון ריק חדש וקראו לו בשם מהטבלה למעלה.
2. **אל תשתפו אותו** עם אף אחד.
3. העתיקו את מזהה הגיליון מהכתובת: החלק שבין `/d/` לבין `/edit`.
   לדוגמה: `https://docs.google.com/spreadsheets/d/`**`1AbC...xyz`**`/edit`

## שלב 3 — פרויקט Apps Script

1. בתוך הגיליון: **Extensions → Apps Script** (הרחבות → Apps Script). נפתח עורך קוד.
2. שנו את שם הפרויקט (למעלה) ל-"Trivia Kids Reports (Development)" או "(Production)".
3. מחקו את כל מה שכתוב בקובץ `Code.gs` והדביקו במקומו את כל התוכן של `apps-script/Code.gs` מהפרויקט.
4. ⚙️ **Project Settings** (גלגל שיניים משמאל):
   - סמנו **Show "appsscript.json" manifest file in editor**.
   - חזרו לעורך, פתחו את `appsscript.json`, מחקו את התוכן והדביקו את `apps-script/appsscript.json`.
5. ⚙️ **Project Settings → Script Properties → Add script property** — הוסיפו שניים:
   - `SPREADSHEET_ID` = מזהה הגיליון משלב 2
   - `REPORTS_SHARED_SECRET` = הסוד של הסביבה הזו משלב 1
6. שמרו (💾).

## שלב 4 — הכנת הגיליון

1. בעורך, ברשימת הפונקציות שליד כפתור ▶️ **Run**, בחרו `setup` ולחצו **Run**.
2. Google תבקש הרשאה: **Review permissions** → בחרו את החשבון שלכם.
   אם מופיע "Google hasn't verified this app": **Advanced → Go to ... (unsafe)** — זה הסקריפט שלכם עצמכם. אשרו **Allow**.
3. בגיליון נוצרה לשונית `Reports` עם שורת כותרות, ובעמודה `status` רשימה נפתחת "חדש / טופל".

## שלב 5 — פריסה כ-Web App

1. **Deploy → New deployment**.
2. ליד "Select type" לחצו ⚙️ ובחרו **Web app**.
3. Description: `v1`.
4. **Execute as: Me**.
5. **Who has access: Anyone**.
   (זה לא הופך את **הגיליון** לציבורי — רק את "תיבת הדואר" שמקבלת דיווחים, והיא דוחה כל בקשה בלי הסוד.)
6. **Deploy**, ואז העתיקו את ה-**Web app URL** (מסתיים ב-`/exec`).

## שלב 6 — חיבור לאפליקציה

**Development:**
1. בקובץ `.env` בפרויקט הוסיפו את הערכים (בלי רווחים ובלי מירכאות):
   ```
   REPORTS_SCRIPT_URL=<כתובת ה-Web App של Development>
   REPORTS_SHARED_SECRET=<הסוד של Development>
   ```
2. ב-Vercel: Project → **Settings → Environment Variables** → הוסיפו את שני המשתנים עם ערכי Development, וסמנו **רק Preview**.

**Production:** בינתיים רק שומרים את הכתובת והסוד במקום בטוח. הם נכנסים ל-Vercel Production ב-Milestone 6.

## עדכון הקוד בעתיד (בלי לשנות את הכתובת)

1. הדביקו את `Code.gs` החדש ושמרו.
2. **Deploy → Manage deployments** → ✏️ (Edit) → Version: **New version** → **Deploy**.

כך הכתובת נשארת זהה ואין צורך לשנות את Vercel. אם יוצרים "New deployment" במקום זאת — נוצרת כתובת חדשה, וצריך לעדכן אותה ב-`.env` וב-Vercel.

## טיפול בדיווחים (למנהל)

פותחים את הגיליון בחשבון Google שלכם. כל שורה היא דיווח. כשטיפלתם — משנים את `status` ל-**טופל** מהרשימה הנפתחת.

עמודות: `createdAt` (תאריך), `reportId`, `issueType` (סוג בעיה), `topic`, `locale` (שפה), `ageGroup`, `difficulty`, `questionText`, `answer1`–`answer4`, `correctAnswerId` (מספר התשובה הנכונה, 1–4), `explanation`, `status`.
טקסט שמתחיל ב-`=`, `+`, `-` או `@` נשמר עם `'` בתחילתו, כדי שהגיליון לא יפעיל אותו כנוסחה.
