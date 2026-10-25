# תוכנית — Milestone 1: יסודות אפליקציה וניווט עובד

**מקורות:** `MILESTONES.md` (Milestone 1), `PRD.md` (FR-01, FR-02 חלקית, FR-08, UX Requirements), `ARCHITECTURE.md` (§1, §2.2–2.3, §2.9), `DESIGN.md` + `wireframes.png`, `mockups.png`, `style-guide.png`.

**מטרה:** אפליקציית Next.js מעוצבת שבה בוחרים שפה (he/en/ru) וקבוצת גיל, רואים את כל טקסטי הממשק בשפה ובכיווניות הנכונות, ומנווטים בין בית, שאלות ואודות. CI ב-GitHub Actions ו-Preview deployments ב-Vercel.

**מחוץ להיקף ב-Milestone זה:** קריאות AI, Route Handlers, game engine, IndexedDB/`idb`, דילוגים, צלילים ומתג צלילים, דיווח על שאלה, PWA (Manifest/Service Worker), `.env` (אין עדיין משתנים נדרשים). אין לבבות/חיים, Bottom Navigation, סטטיסטיקות או קטלוג נושאים קבוע.

---

## 1. הקמת הפרויקט

- Next.js **16.x** (העדכנית: 16.4.3) עם App Router, React, TypeScript, ללא Tailwind, עם תיקיית `src/` (הפרדה ברורה בין הקוד ל-`spec/`).
- יצירה ב-create-next-app לתיקייה זמנית ב-scratchpad, והעברת הקבצים לשורש הפרויקט (השורש כבר מכיל `spec/`, `CLAUDE.md`, `.gitignore`). **לא** להחליף את `.gitignore` הקיים — הוא כבר מכסה `node_modules/`, `.next/`, `.vercel/`, `*.tsbuildinfo`, `.env*`; להוסיף רק `next-env.d.ts` אם חסר משהו שה-template מוסיף.
- ESLint: ב-Next 16 אין `next lint` — שימוש ב-`eslint .` עם `eslint.config.mjs` המבוסס על `eslint-config-next/core-web-vitals` (כולל כללי `jsx-a11y` בסיסיים).
- Scripts ב-`package.json`:
  - `dev` → `next dev`
  - `build` → `next build`
  - `start` → `next start`
  - `lint` → `eslint .`
  - `typecheck` → `tsc --noEmit`
- `engines.node` ≥ 20.

## 2. מבנה קבצים

```text
.github/workflows/ci.yml          # lint + typecheck + build on push / PR
eslint.config.mjs
next.config.ts
tsconfig.json
package.json
src/
  app/
    layout.tsx                    # <html lang dir> from locale cookie, fonts, PreferencesProvider, AppHeader
    globals.css                   # CSS variables (tokens), reset, focus styles, reduced-motion
    page.tsx                      # Home  (/)
    page.module.css
    quiz/page.tsx                 # Quiz setup placeholder (/quiz)
    quiz/page.module.css
    about/page.tsx                # About + how to play (/about)
    about/page.module.css
    not-found.tsx                 # localized simple 404 with link home
  components/
    AppHeader.tsx / .module.css   # back arrow, screen title, menu (Home / Game / About)
    Button.tsx / .module.css      # primary / secondary / outline variants, works as <Link> or <button>
    ChoiceGroup.tsx / .module.css # accessible radio-group of pill/card options (language, age, difficulty, count)
    HomeIllustration.tsx          # inline SVG: star character, hills, clouds, small doodles (decorative)
    icons.tsx                     # small inline SVG icons: home, back, menu, info, flag, star…
  i18n/
    locales.ts                    # Locale type, list, dir per locale, display names (native: עברית / English / Русский)
    dictionaries/he.ts, en.ts, ru.ts   # all UI strings; `he` is the reference type, others must match it
    getDictionary.ts
  lib/
    preferences.tsx               # PreferencesProvider + usePreferences(): locale, ageGroup, setters
    ageGroups.ts                  # '6-9' | '10-12' | '13-16'
```

## 3. שפה, כיווניות ושמירת בחירות

- **Locale:** `he` (ברירת מחדל), `en`, `ru`. `dir`: `rtl` לעברית, `ltr` לאנגלית ורוסית.
- **מילונים:** קובץ TypeScript לכל שפה; הטיפוס נגזר מ-`he` כך ש-typecheck נכשל אם חסר מפתח בשפה אחרת. כל טקסט בממשק (כולל `aria-label`, `<title>` של העמוד, תוכן אודות) מגיע מהמילון.
- **שמירת השפה:** Cookie פונקציונלי בשם `locale` (לא tracking). ה-`layout.tsx` בצד השרת קורא אותו וקובע `lang` ו-`dir` על `<html>` כבר ב-HTML הראשון — בלי "הבהוב" של כיוון שגוי. בשינוי שפה: עדכון ה-Cookie, עדכון ה-context ו-`router.refresh()` כך שכל המסך מתחלף מיד.
- **קבוצת גיל:** נשמרת ב-`PreferencesProvider` (React context ברמת ה-layout), כך שהיא נשמרת במעבר בין מסכים. לשמירה גם אחרי רענון — ב-`localStorage` (`ageGroup`), כ"העדפת UI קטנה" לפי ARCHITECTURE §2.4. שמירת מצב משחק מלאה ב-IndexedDB היא Milestone 3.
- **ADR:** בזמן הבנייה יתועד ADR-1 ב-ARCHITECTURE.md: "שמירת השפה ב-Cookie וקבוצת הגיל ב-localStorage" (הקשר: מניעת הבהוב RTL/LTR בלי URL לפי שפה, מכיוון שהנתיבים מוגדרים `/`, `/quiz`, `/about`).
- מספרים בתוך טקסט עברי (למשל "6–9", "10 מתוך 15") — עטיפה ב-`<bdi>` / שימוש ב-`dir="ltr"` מקומי לפי הצורך לשמירת סדר קריא.

## 4. עיצוב (Design tokens)

ב-`globals.css`, כ-CSS variables על `:root`:

| Token | ערך |
|---|---|
| `--color-primary-blue` | `#A7C7FF` |
| `--color-primary-green` | `#3DBB8F` |
| `--color-primary-yellow` | `#FFE4BC` |
| `--color-primary-pink` | `#FFB3D9` |
| `--color-lavender` | `#D6C8FF` |
| `--color-sky` | `#CFEFFF` |
| `--color-mint` | `#E6F7D9` |
| `--color-peach` | `#FFE2D6` |
| `--color-text` | `#2B2B2B` |
| `--color-text-secondary` | `#6B7280` |
| `--color-border` | `#E5E7EB` |
| `--color-bg` | `#F8FDFF` |
| `--radius-md` / `--radius-lg` | `16px` / `24px` |
| `--shadow-soft` | `0 4px 12px rgba(0,0,0,0.08)` |
| `--space-*` | 8 / 16 / 24 / 32px |
| טיפוגרפיה | H1 32 Bold, H2 24 Bold, H3 18 Bold, Body 16/14/12 Regular |

- **צבע כפתור ראשי:** ב-Mockups הכחול רווי יותר, אבל אין לו HEX ב-Style Guide (ו-DESIGN.md אוסר להמציא). לכן: רקע `#A7C7FF` עם טקסט `#2B2B2B` (ניגודיות גבוהה, עומד ב-AA). כפתור משני: Outline לבן עם גבול כחול; הדגשות פסטל לכרטיסי בחירה.
- **גופנים:** `next/font/google` — `Rubik` (hebrew + latin) לעברית, `Nunito` (latin + cyrillic) לאנגלית ולרוסית. ה-`font-family` נבחר לפי `lang` (`:lang(he)`), עם Fallback הדדי.
- **מצב נבחר:** גבול עבה + סימן ✓ + `aria-checked` — לא צבע בלבד.
- **Focus:** `:focus-visible` עם outline ברור (2–3px, ניגודיות ≥ 3:1) על כל רכיב אינטראקטיבי.
- **Reduced motion:** מעברים קלים בלבד; `@media (prefers-reduced-motion: reduce)` מבטל אותם.
- **כיווניות ב-CSS:** שימוש ב-logical properties (`margin-inline-start`, `padding-inline`, `inset-inline-start`); חץ "חזרה" מתהפך לפי `dir`.
- **Responsive:** Mobile-first; עמודת תוכן מרכזית עם `max-width` (~480px במובייל/טאבלט, עד ~640px ב-Desktop) על רקע בהיר עם איורי שוליים עדינים. אזורי לחיצה ≥ 44×44px.
- **הערה קטנה:** בתמונת ה-Style Guide הרקע נראה כ-`#FBFDFE`, וב-DESIGN.md הוא `#F8FDFF`. לפי הכלל, DESIGN.md קובע את המראה → `#F8FDFF` (ההבדל כמעט בלתי נראה).

## 5. מסכים

### 5.1 Header משותף (`AppHeader`)
- בכל המסכים: כותרת המסך + כפתור תפריט (☰, כמו ב-Wireframe) שנפתח כרשימה עם קישורים: **בית**, **משחק**, **אודות**. נגיש: `aria-expanded`, `aria-controls`, סגירה ב-Esc ובלחיצה בחוץ, ה-Focus חוזר לכפתור.
- במסכים פנימיים (`/quiz`, `/about`): חץ חזרה לבית (כמו ב-Wireframes).
- הקישור למסך הנוכחי מסומן `aria-current="page"`.
- אין Bottom Navigation ואין כפתור צלילים בשלב זה (Milestone 3).

### 5.2 בית (`/`)
לפי Wireframe/Mockup + תוספת החובה מ-DESIGN 1.1:
1. כותרת "טריוויה קידס" (H1) ותיאור קצר ("משחק שאלות מהנה לילדים סקרנים").
2. `HomeIllustration` — כוכב מחייך, גבעות, עננים (SVG, `aria-hidden`, דקורטיבי).
3. **בחירת שפה** — `ChoiceGroup` עם 3 אפשרויות בשם המקורי (עברית / English / Русский). כל אפשרות עם `lang` מתאים.
4. **בחירת קבוצת גיל** — `ChoiceGroup` עם 6–9, 10–12, 13–16 (כרטיסים בצבעי פסטל שונים).
5. כפתור ראשי "התחל לשחק" → `/quiz`. אם עוד לא נבחר גיל: הכפתור לא נעול, אבל לחיצה מציגה הודעה נגישה ("בחרו קבוצת גיל") ומעבירה Focus לקבוצת הגיל. (אין ברירת מחדל לגיל ב-PRD — לכן מבקשים בחירה.)
6. כפתורים משניים: "איך משחקים?" → `/about#how-to-play`, "אודות" → `/about`.
- "המשך משחק" / "משחק חדש" — לא ב-Milestone זה (תלוי בשמירת משחק, Milestone 3).

### 5.3 שאלות (`/quiz`) — אזור הגדרה ראשוני
- אם לא נבחר גיל (כניסה ישירה ל-URL): הודעה + קישור לבית לבחירת גיל.
- אחרת: כרטיס קטן המציג את השפה וקבוצת הגיל שנבחרו (עם קישור "שינוי" לבית), ואזור הגדרה ראשוני לפי DESIGN 1.2:
  - רמת קושי — 3 כרטיסים (קל / בינוני / קשה, עם תיאור משנה כמו ב-Wireframe).
  - מספר שאלות — 5 / 10 / 15.
  - שדה נושא ("בחר נושא" / הקלדה חופשית).
  - כפתור "התחל" **מושבת** עם הודעה קצרה בשפת הממשק שיצירת השאלות תתווסף בשלב הבא.
- בחירות הקושי/מספר/נושא הן מצב מקומי של המסך בלבד (יחוברו למשחק ב-Milestone 2).

### 5.4 אודות (`/about`)
לפי Wireframe "אודות" + "איך משחקים?" (מאוחדים במסך אחד, DESIGN 1.6), כל התוכן מהמילון בשלוש השפות:
1. "טריוויה קידס" + תיאור.
2. מטרת המשחק; מקור השאלות (נוצרות ב-AI ונבדקות לפני הצגה — בלי להבטיח נכונות מוחלטת).
3. **איך משחקים?** (`id="how-to-play"`) — רשימה ממוספרת (`<ol>`) עם תגי מספר צבעוניים: בחירת שפה וקבוצת גיל; בחירת רמת קושי ומספר שאלות (5/10/15); בחירת נושא בהקלדה או מהצעות; מענה — תשובה אחת מתוך ארבע, בלי ניסיון חוזר; משוב והסבר אחרי כל תשובה; "השאלה הבאה"; עד 3 דילוגים שלא משנים ניקוד; שינוי הגדרות באמצע — חל מהשאלה הבאה; המשחק נשמר במכשיר וניתן להמשיך; סיכום — תשובות נכונות, אחוז הצלחה ורשימת טעויות; דיווח על שאלה בעייתית.
4. כפתורים: "חזרה לבית", "למשחק" (→ `/quiz`).
- ללא "פנייה אלינו" עם פרטי קשר (לא מוגדר ב-PRD); אפשר להזכיר שדיווח נעשה דרך כפתור הדיווח במשחק.

## 6. נגישות (WCAG 2.2 AA — בסיס ל-Milestone זה)
- HTML סמנטי: `<header>`, `<nav aria-label>`, `<main id="main">`, כותרות בסדר היררכי, H1 אחד לכל עמוד.
- Skip link "דלג לתוכן" בתחילת העמוד.
- `ChoiceGroup` כ-`role="radiogroup"` עם `role="radio"` ו-`aria-checked`, תווית קבוצה, ניווט בחצים (מותאם ל-RTL) ו-roving tabindex.
- `document.title` מתורגם לכל מסך; `lang`/`dir` מתעדכנים בשינוי שפה.
- הודעות (כמו "בחרו קבוצת גיל") ב-`aria-live="polite"`.
- ניגודיות: בדיקה של כל זוג טקסט/רקע שבשימוש (במיוחד טקסט משני על פסטל).

## 7. CI ו-Deployment

- **`.github/workflows/ci.yml`:** על `push` ו-`pull_request` — `actions/checkout`, `actions/setup-node` (Node 22, cache npm), `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`.
- **GitHub:** ה-repo המקומי כבר מחובר ל-`origin` (`kottuzik/trivia-kids`). כדי שה-CI ירוץ וייווצר Preview צריך push — **בסיום הבנייה אעצור ואבקש אישור ל-push** (לענף עבודה, למשל `milestone-1`, כדי שיווצר Preview ולא Production).
- **Vercel (את/ה מבצע/ת, אני מדריך צעד אחר צעד):** כניסה ל-Vercel עם GitHub → Add New Project → בחירת `trivia-kids` → Framework: Next.js (זיהוי אוטומטי) → Deploy. אין משתני סביבה ב-Milestone זה. אחרי החיבור, כל push לענף יוצר Preview אוטומטית.
- עד שה-push מאושר, סעיף 1 ב-DoD ייבדק מקומית (lint/typecheck/build) ויסומן "ממתין ל-push וחיבור Vercel".

## 8. בדיקות שאריץ בעצמי בסיום הבנייה
- `npm run lint`, `npm run typecheck`, `npm run build` — כולם עוברים.
- הרצה מקומית (`npm run dev`) ובדיקה בדפדפן (Playwright / הדפדפן המובנה):
  - החלפה בין שלוש השפות: הטקסטים מתחלפים, `dir` מתחלף RTL↔LTR, הבחירה נשמרת ברענון.
  - בחירת כל אחת משלוש קבוצות הגיל ומעבר ל-`/quiz`; ניסיון להתחיל בלי גיל מציג הודעה.
  - אודות בשלוש השפות, "איך משחקים?" גולל לסעיף, ניווט בית ↔ שאלות ↔ אודות דרך התפריט והחץ.
  - צילומי מסך ברוחב 375 / 768 / 1280.
  - ניווט מקלדת בלבד (Tab, Shift+Tab, חצים, Enter, Esc), Focus נראה, Skip link.
  - בדיקת נגישות אוטומטית (axe דרך Playwright) — ללא הפרות חמורות.
- סגירת השרת בסיום.

## 9. עדכונים נלווים
- `CLAUDE.md` → "פקודות הרצה": **הרצה (dev):** `npm run dev`; **בדיקות (test):** `npm run lint && npm run typecheck` (אין עדיין בדיקות יחידה — יתווספו כשיהיה game engine, Milestone 2).
- `MILESTONES.md` → 🟡 ליד כותרת Milestone 1 בסיום הבנייה.
- `ARCHITECTURE.md` → ADR-1 (שמירת שפה וגיל), בסעיף `## החלטות מרכזיות (ADRs)`.

## 10. מיפוי ל-Definition of Done

| תנאי DoD | איך מתקיים |
|---|---|
| Repository מחובר ל-Vercel, Preview אוטומטי; lint/typecheck/build עוברים | סעיף 7 — דורש את אישורך ל-push ואת חיבור Vercel שלך |
| שלוש השפות קריאות; שינוי שפה מחליף טקסטים וכיווניות | סעיף 3, גופנים Rubik/Nunito, בדיקה בסעיף 8 |
| בחירת כל קבוצת גיל ומעבר למסך השאלות | סעיפים 5.2–5.3 |
| אודות עם תיאור והוראות מפורטות בשפה הנבחרת; ניווט הלוך ושוב | סעיפים 5.1, 5.4 |
| מובייל/טאבלט/Desktop; מקלדת, Focus, תוויות נגישות, ניגודיות | סעיפים 4, 6, 8 |
