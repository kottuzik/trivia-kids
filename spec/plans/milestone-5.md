# תוכנית — Milestone 5: PWA, נגישות ובדיקות מוצר שלם

**מקורות:** `MILESTONES.md` (Milestone 5), `PRD.md` (§3ג, §4ב, §5א), `ARCHITECTURE.md` (§1, §2.8 PWA, §2.11, ADR-1–11), `DESIGN.md` (§2.4 Accessibility).

## 1. היקף

**בתוך ה-Milestone:**
- התקנה כ-PWA: Web App Manifest, אייקונים, Service Worker מצומצם בכתיבה ידנית (בלי ספרייה).
- כותרות אבטחה ו-CSP בסיסי (ARCHITECTURE §2.8: "HTTPS, CSP מתאים").
- בדיקות E2E אוטומטיות ב-Playwright לכל זרימות ה-PRD, מול API מדומה (בלי OpenAI ובלי Google Sheets).
- בדיקות WCAG 2.2 AA אוטומטיות (axe) וידניות (מקלדת, VoiceOver, זום, ניגודיות), ותיקון כל ליקוי שיימצא.
- בדיקה מקצה לקצה ב-Vercel Preview מול גיליון Development בלבד.

**מחוץ ל-Milestone:** כפתור "התקן" בתוך האפליקציה, Push notifications, יצירת שאלות Offline, Cache של תשובות API או דיווחים, פיצ'רים מה-Mockups שאינם ב-PRD, פריסת Production (Milestone 6).

## 2. החלטה שדורשת אישור — Cache של מסגרת הדפים (App shell)

ARCHITECTURE §2.8 מתיר Cache "רק לנכסים סטטיים". הדפים עצמם (`/`, `/quiz`, `/about`) מרונדרים בשרת (ADR-1), ולכן הם לא קבצים סטטיים במובן הצר. בלי Cache שלהם, אפליקציה מותקנת שנפתחת בלי אינטרנט תציג את מסך השגיאה של הדפדפן, והילד לא יוכל לענות על שאלה שכבר נטענה (PRD §4ב, "אין חיבור לאינטרנט") אחרי סגירה ופתיחה מחדש.

**ההצעה:** ה-Service Worker שומר עותק אחרון של כל אחד משלושת הדפים (HTML בלבד, בלי נתוני שאלות, תשובות או דיווחים: הנתונים נשארים ב-IndexedDB כמו היום). כשיש רשת, הדף תמיד נטען מהשרת (Network-first); העותק השמור משמש רק כשאין חיבור. **API ודיווחים לעולם לא נשמרים ב-Cache.**

אם לא מאושר: רק `/_next/static/*` ואייקונים נשמרים; פתיחה Offline של האפליקציה המותקנת לא תעבוד, אבל שאלה פתוחה בלשונית שכבר טעונה עדיין ניתנת למענה (כמו היום).

ההחלטה תתועד כ-ADR-12.

## 3. קבצים ליצירה / שינוי

### 3.1 Manifest ואייקונים
- `src/app/manifest.ts` — `MetadataRoute.Manifest`: `name`/`short_name`/`description` מהמילון לפי Cookie השפה (`getServerPreferences`), `lang`, `dir`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `background_color` ו-`theme_color` = `#F8FDFF`, `icons` (192, 512, maskable 512).
- `public/icons/icon.svg` — אייקון מקור בסגנון `HomeIllustration` (צבעי פסטל, סימן שאלה/כוכב, פינות מעוגלות), עם שוליים בטוחים לגרסת maskable.
- `scripts/generate-icons.mjs` — סקריפט חד-פעמי שמייצר מה-SVG את `icon-192.png`, `icon-512.png`, `maskable-512.png`, ו-`src/app/apple-icon.png` (180×180), באמצעות `sharp` שכבר מותקן עם Next.js. קובצי ה-PNG נשמרים ב-Repository; הסקריפט לא רץ ב-build.
- `src/app/layout.tsx` — הוספת `appleWebApp` (`capable`, `title`, `statusBarStyle: "default"`) ל-Metadata, ורכיב רישום ה-Service Worker.

### 3.2 Service Worker
- `public/sw.js` — JavaScript פשוט, בלי ספרייה:
  - שם Cache עם גרסה (`trivia-kids-v1`); ב-`activate` מוחקים Caches בגרסה אחרת ומפעילים `clients.claim()`.
  - **Cache-first:** בקשות GET מאותו Origin ל-`/_next/static/*` (JS, CSS, גופנים של `next/font`) ול-`/icons/*`, `/apple-icon.png`, `/favicon.ico`, `/manifest.webmanifest`.
  - **Network-first עם עותק שמור** (בכפוף לאישור בסעיף 2): בקשות ניווט (`request.mode === "navigate"`) ל-`/`, `/quiz`, `/about`. נשמרות רק תשובות `200` מסוג `basic`.
  - **לעולם לא נוגעים:** כל `/api/*`, כל בקשה שאינה GET, בקשות ל-Origin אחר, `/_next/image`, ותשובות עם `Cache-Control: no-store`.
  - אין Pre-cache בהתקנה מעבר לאייקונים ולדפים (שמות הקבצים של Next.js משתנים בכל build ונשמרים בעת השימוש).
- `src/lib/pwa/ServiceWorkerRegister.tsx` — רכיב Client שרושם את `/sw.js` אחרי `load`, **רק ב-Production build** (`process.env.NODE_ENV === "production"`), כדי לא להפריע ל-`npm run dev`. כשל ברישום נבלע בשקט.
- `next.config.ts` — `headers()`:
  - `/sw.js`: `Content-Type: application/javascript; charset=utf-8`, `Cache-Control: no-cache, no-store, must-revalidate`, `Service-Worker-Allowed: /`.
  - כל הנתיבים: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (מצלמה/מיקרופון/מיקום כבויים), ו-CSP: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`. ב-Development מוסיפים `'unsafe-eval'` ל-`script-src` (נדרש ל-HMR).
  - `'unsafe-inline'` נדרש לסקריפטים שה-Next.js מטמיע; CSP מבוסס Nonce היה מחייב Middleware ומונע Cache — לא שווה את הסיבוך כאן. יתועד כ-ADR-13.

### 3.3 נגישות — תיקונים צפויים (רשימה סופית אחרי הבדיקה)
בדיקה של כל מסך ומצב (בית, אודות, הגדרת משחק, טעינה, שאלה, משוב, שגיאה, Offline, סיכום, חלון אישור משחק חדש, חלון דיווח) מול WCAG 2.2 AA, עם תשומת לב מיוחדת לקריטריונים החדשים ב-2.2 ולמה שעוד לא נבדק שיטתית:
- **2.4.11 Focus Not Obscured** — ה-Header הדביק לא מסתיר רכיב בפוקוס (בדיקת `scroll-padding-top` בכל הגדלים).
- **2.5.8 Target Size** — כל אזור לחיצה ≥ 24×24 (היעד שלנו 48px, כולל קישורים בתוך טקסט ומתג הצלילים).
- **1.4.10 Reflow / 1.4.4 Resize text** — רוחב 320px וזום 200% בלי גלילה אופקית ובלי טקסט חתוך.
- **1.4.3 / 1.4.11 Contrast** — טקסט על רקעי פסטל, מצבי Hover/Selected/Disabled, Placeholder.
- **4.1.3 Status Messages** — טעינה, משוב נכון/שגוי, שגיאות, Offline, דיווח, "ההגדרות יחולו מהשאלה הבאה" מוכרזים לקורא מסך פעם אחת, בלי הכרזות כפולות.
- **2.3.3 / Reduced Motion** — כל אנימציה (כולל Spinner ומעברי שאלה) מכובדת תחת `prefers-reduced-motion`.
- **3.1.2 Language of Parts** — שאלה שנוצרה בשפה שונה משפת הממשק (אחרי שינוי שפה באמצע) מקבלת `lang` ו-`dir` של השאלה.
- **3.2.6 Consistent Help / 3.3.7 Redundant Entry** — לוודא שאין בעיה (קישור "אודות" במקום קבוע; ההגדרות לא מתבקשות פעמיים).
- כותרת `<title>` ייחודית לכל מצב מרכזי, וסדר כותרות תקין.

כל תיקון — בקובצי הרכיבים וה-CSS הקיימים, בלי רכיבים חדשים שאינם ב-PRD.

### 3.4 בדיקות E2E
- תלויות פיתוח: `@playwright/test`, `@axe-core/playwright`. התקנת דפדפן Chromium בלבד (`npx playwright install chromium`).
- `playwright.config.ts` — מריץ `npm run build && npm run start -- -p 3100` (Production build, כדי שגם ה-Service Worker ייבדק); שלושה Projects: מובייל (Pixel 7), טאבלט (iPad Mini, Chromium), Desktop (1280×800).
- `e2e/fixtures/mockApi.ts` — יירוט `page.route("**/api/**")`: יוצר שאלות דמה ייחודיות בשלוש השפות, מאפשר להחזיר שגיאה בבקשה מסוימת (`AI_UNAVAILABLE`, `RATE_LIMITED`, `UNSAFE_TOPIC`, `AI_INVALID_RESPONSE`, `REPORT_SAVE_FAILED`), ורושם את גופי הבקשות לבדיקה. **אף בדיקה אוטומטית לא פונה ל-OpenAI או ל-Apps Script.**
- `e2e/fixtures/a11y.ts` — עזר שמריץ axe עם התגים `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` ונכשל על כל הפרה.
- קובצי בדיקה:
  - `navigation.spec.ts` — שלוש שפות, `lang`/`dir`, בחירת גיל, בית ↔ שאלות ↔ אודות.
  - `full-game.spec.ts` — משחק של 5 שאלות (וגם 10 ו-15 במובייל בלבד, לחיסכון בזמן): תשובה נכונה ושגויה, משוב והסבר בשני המקרים, נעילה אחרי מענה, סיכום עם ספירה, אחוז ורשימת טעויות נכונים, משחק חדש.
  - `restore.spec.ts` — רענון באמצע שאלה ואחרי מענה; מעבר לבית ולאודות וחזרה; "המשך משחק"; "משחק חדש" עם ביטול ועם אישור.
  - `settings.spec.ts` — שינוי נושא, שפה, גיל וקושי באמצע שאלה: השאלה המוצגת לא משתנה, גוף הבקשה הבאה מכיל את ההגדרות החדשות, הניקוד נשמר.
  - `skips.spec.ts` — שלושה דילוגים בלי שינוי ניקוד ומכסה, דילוג רביעי לא זמין, כשל אחרי דילוג ו-Retry לא צורך דילוג נוסף.
  - `errors.spec.ts` — כל קודי השגיאה: הודעה ידידותית ו-"נסה שוב", התקדמות נשמרת גם אחרי רענון; Offline (`context.setOffline(true)`): מענה על שאלה טעונה עם משוב והסבר, "הבא" מציג צורך בחיבור, חידוש חיבור ממשיך.
  - `report.spec.ts` — דיווח מצליח; כשל ואז Retry עם אותו גוף בקשה; לחיצה כפולה שולחת בקשה אחת; ניקוד ומצב מענה לא משתנים; גוף הבקשה בלי מידע מזהה.
  - `pwa.spec.ts` — Manifest תקין (שם, אייקונים זמינים, `display`, `start_url`); ה-Service Worker נרשם ופעיל; ב-Cache יש נכסי `/_next/static` ואין אף כתובת `/api/`; פתיחה מחדש Offline של `/quiz` מציגה את המשחק השמור וניתן לענות (בכפוף לסעיף 2).
  - `a11y.spec.ts` — axe על כל מסך ומצב בשלוש השפות; משחק שלם במקלדת בלבד (Tab/Shift+Tab/Enter/Space/Escape), כולל חלון הדיווח וחלון האישור, עם בדיקה שה-Focus תמיד נראה וחוזר למקום הנכון.
- `package.json` — סקריפט `test:e2e` (`playwright test`).
- `.github/workflows/ci.yml` — Job נוסף `e2e` שמתקין Chromium ומריץ `npm run test:e2e`; מעלה את דוח Playwright כ-Artifact רק בכישלון. ה-Job לא צריך Secrets (הכול מדומה).
- `eslint.config.mjs` / `tsconfig.json` — לכלול את `e2e/` ו-`playwright.config.ts` לפי הצורך. `.gitignore` כבר מכיל `playwright-report/` ו-`test-results/`.
- `vitest.config.mts` — ללא שינוי (כולל רק `src/**` ו-`apps-script/**`).

### 3.5 תיעוד
- `ARCHITECTURE.md` — ADR-12 (Cache של מסגרת הדפים, לפי ההחלטה בסעיף 2), ADR-13 (Service Worker ידני + CSP בלי Nonce), ADR-14 (E2E ב-Playwright מול API מדומה).
- `CLAUDE.md` — עדכון "פקודות הרצה": הוספת `npm run test:e2e`.
- `spec/MILESTONES.md` — 🟡 ליד Milestone 5 בסיום הבנייה.

## 4. בדיקה ידנית (אחרי שהאוטומטיות עוברות)

**מקומית (Production build):**
1. Chrome במחשב: Lighthouse/DevTools → Application: Manifest ללא שגיאות, Service Worker פעיל, תוכן ה-Cache Storage (אין `/api`), כפתור ההתקנה בשורת הכתובת.
2. VoiceOver ב-Mac (Safari): משחק שלם בעברית ובאנגלית — הכרזות שאלה, תשובות, משוב, שגיאה, דיווח וסיכום.
3. זום 200% ורוחב 320px בכל המסכים; `prefers-reduced-motion` מופעל במערכת.

**ב-Vercel Preview (גיליון Development בלבד):**
4. דורש push של ענף עבודה (לא `main`) — **אעצור ואבקש אישור לפני ה-push**. לפני כן אבקש ממך לוודא ב-Vercel שמשתני ה-Preview (`REPORTS_SCRIPT_URL`, `REPORTS_SHARED_SECRET`) מפנים לגיליון Development.
5. אתה בודק בטלפון (Android Chrome ו/או iPhone Safari → "הוסף למסך הבית"): התקנה, פתיחה מהאייקון, משחק מלא, דילוגים, שינוי הגדרות, סגירה ופתיחה מחדש, מצב טיסה עם שאלה טעונה, דיווח אחד.
6. בגיליון Development מופיעה שורת הדיווח; גיליון Production נשאר ללא שינוי.

## 5. סדר עבודה
1. אישור ההחלטה בסעיף 2.
2. Manifest, אייקונים, Service Worker, כותרות ו-CSP; בדיקה ידנית ב-DevTools.
3. תשתית Playwright, API מדומה ובדיקות הזרימות.
4. בדיקות axe ומקלדת; סקירה ידנית של WCAG 2.2 AA; תיקונים; הרצה חוזרת של כל הבדיקות (`lint`, `typecheck`, `test`, `build`, `test:e2e`).
5. ADRs, CLAUDE.md, 🟡 ב-MILESTONES.md.
6. בקשת אישור ל-push של ענף Preview ובדיקה ב-Preview יחד איתך.

## 6. מיפוי ל-Definition of Done

| תנאי | איך נבדק |
|---|---|
| התקנה כ-PWA; נכסים סטטיים לפי מדיניות ה-Cache; אין שאלות חדשות Offline | `pwa.spec.ts`, `errors.spec.ts` (Offline), DevTools, התקנה בטלפון ב-Preview |
| משחק מלא, חזרה, שינוי הגדרות, דילוגים, דיווח וסיכום מקצה לקצה ב-Preview | `full-game`, `restore`, `settings`, `skips`, `report` + בדיקה ידנית ב-Preview (סעיף 4) |
| WCAG 2.2 AA ידני ואוטומטי; אין ליקויים חוסמים | `a11y.spec.ts` (axe + מקלדת), סקירה ידנית לפי סעיף 3.3, VoiceOver |
| 3 שפות, RTL/LTR, מובייל/טאבלט/Desktop, קורא מסך ומקלדת; בלי רכיבי Mockup שאינם ב-PRD | שלושת ה-Projects של Playwright × שלוש שפות, VoiceOver, סקירת קוד שלא נוספו רכיבים |
| שגיאות לא מאבדות משחק ולא מדווחות הצלחה שגויה; דיווחי בדיקה רק ב-Development | `errors.spec.ts`, `report.spec.ts` (מדומה), דיווח ידני אחד ב-Preview מול Development, Production נשאר ריק |
