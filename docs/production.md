# פרסום האתר החי (Production) — מדריך צעד אחר צעד

המדריך הזה מחבר את האפליקציה לשירותים "האמיתיים": מפתח OpenAI וגיליון הדיווחים של Production.
את כל הפעולות בחשבונות (Vercel, Google, OpenAI) עושים בעצמכם. **אל תשלחו סודות או כתובות בצ'אט.**

**סדר חובה:** קודם Apps Script Production (שלב 1), ורק אחר כך Vercel (שלב 2). אחרת האתר החי עלול לשלוח דיווחים לסקריפט שלא עודכן.

---

## שלב 1 — סקריפט הדיווחים של Production

1. פתחו את גיליון **"טריוויה קידס — דיווחים (Production)"** → **Extensions → Apps Script**.
2. ודאו ש-`Code.gs` ו-`appsscript.json` זהים לקבצים שבתיקייה `apps-script/` בפרויקט. אם לא, הדביקו אותם מחדש ושמרו (💾).
3. ⚙️ **Project Settings → Script Properties**: ודאו שיש בדיוק שניים:
   - `SPREADSHEET_ID`: המזהה של גיליון **Production** (לא של Development).
   - `REPORTS_SHARED_SECRET`: הסוד של **Production** (שונה מהסוד של Development).
4. פריסה:
   - אם כבר יש פריסה: **Deploy → Manage deployments** → ✏️ → Version: **New version** → **Deploy**.
   - אם אין: **Deploy → New deployment** → Web app → Execute as: **Me** → Who has access: **Anyone** → **Deploy**.
5. העתיקו את ה-**Web app URL** (מסתיים ב-`/exec`) ושמרו אותו במקום בטוח.

### בדיקה שהסקריפט חי, בלי לכתוב שורה
בטרמינל, החליפו את `PASTE_URL_HERE` בכתובת מסעיף 5 (בתוך המירכאות) והריצו:

```bash
curl -sL -H "Content-Type: application/json" -d '{"secret":"wrong","report":{}}' "PASTE_URL_HERE"
```

התוצאה הנכונה היא `{"ok":false,"error":"UNAUTHORIZED"}`. כלומר, הסקריפט פרוס ודוחה בקשה בלי הסוד הנכון. בגיליון לא אמורה להופיע שורה חדשה.
כל תוצאה אחרת (דף HTML, שגיאה, הודעת התחברות) אומרת שהפריסה לא נכונה. בדקו שוב את Who has access: **Anyone**.

---

## שלב 2 — הגדרות Vercel

היכנסו ל-[vercel.com](https://vercel.com) → הפרויקט **trivia-kids** → **Settings**.

### 2א. משתני סביבה (Environment Variables)
צריכים להיות שלושה משתנים, **כל אחד פעמיים**: פעם עם ערכי Production ופעם עם ערכי Development.

| שם | ערך Production — לסמן **רק Production** | ערך Development — לסמן **רק Preview** |
|---|---|---|
| `OPENAI_API_KEY` | המפתח שלכם | המפתח שלכם (מותר אותו מפתח) |
| `REPORTS_SCRIPT_URL` | כתובת Apps Script **Production** | כתובת Apps Script **Development** |
| `REPORTS_SHARED_SECRET` | הסוד של **Production** | הסוד של **Development** |

איך מוסיפים: **Add New** → שם → ערך → בתיבות Environments מסמנים רק את הסביבה המתאימה → **Save**.
**בדיקה:** אף משתנה שמסומן Preview לא מכיל כתובת או סוד של Production.

### 2ב. גרסת Node.js
**Settings → Build and Deployment → Node.js Version** → **24.x** → Save.

### 2ג. ענף Production
**Settings → Git** → Production Branch: `main`.

### 2ד. לפרסם רק אחרי שהבדיקות עברו (Deployment Checks)
1. **Settings → Environments → Production**: ודאו שהקצאת הכתובת האוטומטית ל-Production מופעלת (בדרך כלל זו ברירת המחדל).
2. **Settings → Build and Deployment → Deployment Checks → Add Checks** → **GitHub**.
3. חפשו ובחרו את שתי הבדיקות: **`checks`** ו-**`e2e`**. שמרו.

מעכשיו, אחרי כל push ל-`main`, Vercel בונה גרסה חדשה, אבל הכתובת החיה עוברת אליה רק אחרי ששתי הבדיקות ב-GitHub עברו.
(ייתכן שהבדיקות יופיעו בחיפוש רק אחרי שרצו לפחות פעם אחת. אם הן לא מופיעות, חזרו לסעיף הזה אחרי ה-push הראשון.)

---

## שלב 3 — בקרת הוצאות ב-OpenAI

1. [platform.openai.com](https://platform.openai.com) → בחרו את ה-Project שבו נוצר המפתח.
2. **Settings → Limits** (או Billing → Limits): הגדירו **Budget** חודשי, למשל 5$ לשימוש משפחתי.
3. הגדירו **התראה במייל** כשמגיעים לחלק מהתקציב (למשל 80%).

המשחק שולח קריאה ל-AI על כל שאלה, ולכן זו ההגנה העיקרית מפני חשבון גבוה.

---

## שלב 4 — בדיקות אחרי הפרסום (בטלפון)

פתחו את כתובת האתר החי (`https://<שם-הפרויקט>.vercel.app`).

- [ ] משחק של 5 שאלות **בעברית**: משוב, הסבר, "השאלה הבאה", סיכום.
- [ ] אותו דבר **באנגלית** ו**ברוסית** (הכיוון מתחלף משמאל לימין).
- [ ] באמצע משחק: דילוג, שינוי נושא, רענון הדף. המשחק חוזר לאותה נקודה.
- [ ] **התקנה:** Android/Chrome: תפריט ⋮ → "התקנת אפליקציה". iPhone/Safari: שיתוף → "הוספה למסך הבית". האפליקציה נפתחת מהאייקון.
- [ ] **דיווח בדיקה אחד ב-Production:** "דווח על שאלה" → סוג בעיה → שליחה → הודעת הצלחה.
  - השורה מופיעה בגיליון **Production**, ולא בגיליון Development.
  - שנו את `status` ל-**טופל**, ואז **מחקו את שורת הבדיקה** (קליק ימני על מספר השורה → מחיקת שורה).
- [ ] **דיווח בדיקה אחד מ-Development** (מ-`npm run dev` במחשב, או מכתובת Preview): מופיע **רק** בגיליון Development.

---

## טיפול בדיווחים (שוטף)

- פותחים את גיליון **Production** בחשבון Google שלכם. כל שורה היא דיווח, החדש ביותר למטה.
- `status` מתחיל ב-**חדש**. אחרי שבדקתם, בוחרים **טופל** מהרשימה הנפתחת.
- אל תשתפו את הגיליון. הילדים לא צריכים אליו גישה.

## אם משהו השתבש אחרי פרסום

Vercel → **Deployments** → בחרו את הגרסה הקודמת שעבדה → ⋯ → **Instant Rollback**. הכתובת חוזרת מיד לגרסה הקודמת.
