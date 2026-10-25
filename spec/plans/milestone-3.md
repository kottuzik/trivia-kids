# Milestone 3 — משחק רציף, התאמה אישית ושחזור

**מקורות:** `PRD.md` (FR-01, FR-02, FR-04, FR-05, FR-06, Edge Cases), `ARCHITECTURE.md` §2.4, §2.7, ADR-1, ADR-4, `DESIGN.md` §1.1, §1.3, §2.3, `MILESTONES.md` — Milestone 3.

**מצב קיים (נקודת פתיחה):** המשחק מוחזק בזיכרון ב-`GameProvider` סביב Reducer טהור (`src/lib/game/engine.ts`). שפה וקבוצת גיל נשמרות ב-Cookies (ADR-1) ונקראות בכל בקשת שאלה. כל `Question` כבר נושאת את `topic`, `locale`, `ageGroup`, `difficulty` שבהם נוצרה, כולל תשובה נכונה והסבר — כך שמענה Offline כבר עובד בזיכרון. אין דילוגים, אין שמירה, אין שינוי הגדרות באמצע משחק, אין צלילים.

## 1. גישה כללית

1. **Reducer אחד נשאר מקור האמת.** מוסיפים לו פעולות `SKIP`, `UPDATE_SETTINGS`, `RESTORE`, ושדה `skipCount`. השמירה ב-IndexedDB "עוטפת" את ה-Reducer — לא משכפלת לוגיקה (כפי שתוכנן ב-ADR-4).
2. **טעינת שאלה אוטומטית אחת.** במקום לקרוא ל-`loadQuestion` מתוך `startGame`/`next`, אפקט יחיד ב-`GameProvider` טוען שאלה בכל פעם ש-`needsQuestion(state)` נכון (אחרי שחזור). כך התחלה, "הבא", דילוג ושחזור משחק שנסגר באמצע טעינה עוברים באותו מסלול.
3. **דילוג נצרך ברגע הדילוג, לא בבקשה.** `SKIP` מגדיל `skipCount` ומנקה את השאלה; הבקשה שאחריו היא בקשה רגילה. אם היא נכשלת — `retry` טוען שוב בלי לגעת ב-`skipCount`.
4. **הגדרות "מהשאלה הבאה" בלי `nextSettings` נפרד.** השאלה המוצגת כבר שומרת את ההגדרות שבהן נוצרה ומוצגת לפיהן; `settings` של המשחק (נושא, קושי) והעדפות שפה/גיל (Cookies) משמשים רק לבקשה הבאה. לכן שינוי הגדרות פשוט מעדכן אותם — והשאלה הנוכחית לא משתנה מעצמה. יתועד כ-ADR.
5. **צלילים בלי קובצי אודיו** — צלילים קצרים שנוצרים ב-Web Audio API (אין צורך ברישוי, הורדה או Cache). העדפה ב-`localStorage`.

## 2. תלויות

- להוסיף `idb` (dependency). אין תלויות נוספות; אין `fake-indexeddb` — בדיקות היחידה בודקות את פונקציות ההמרה הטהורות, והשמירה בפועל נבדקת בדפדפן.
- אין משתני סביבה חדשים; `.env.example` לא משתנה.

## 3. קבצים — יצירה ושינוי

### 3.1 Game engine — `src/lib/game/engine.ts` (שינוי)
- `GameState`: להוסיף `skipCount: number` (0–3). קבוע `MAX_SKIPS = 3`.
- `GameSettings` נשאר `{ topic, difficulty, questionLimit }`.
- פעולות חדשות:
  - `SKIP` — מותר רק אם `status === "playing"`, יש `currentQuestion`, עוד לא נענתה, ו-`skipCount < MAX_SKIPS`. תוצאה: `skipCount + 1`, `currentQuestion: null`, `selectedAnswerId: null`. הטביעה כבר ב-`seenFingerprints` (נוספה ב-`QUESTION_LOADED`), ולכן השאלה לא תחזור. `completedCount`, `correctCount`, `answeredQuestions` — ללא שינוי.
  - `UPDATE_SETTINGS { topic, difficulty }` — מעדכן את `settings` (משאיר `questionLimit`). לא נוגע ב-`currentQuestion`, בניקוד או בהתקדמות. מותר ב-`playing` בלבד.
  - `RESTORE { state }` — מחליף את כל המצב במצב ששוחזר (אחרי ניקוי, ראה 3.2).
- `START` ו-`RESET` מאפסים `skipCount` (דרך `initialGameState`).
- פונקציית עזר `canSkip(state)` ו-`skipsLeft(state)`.
- `needsQuestion` נשאר כפי שהוא ומשמש את האפקט האוטומטי.

### 3.2 שמירה מקומית — `src/lib/game/storage.ts` (חדש)
- `openDB("trivia-kids", 1)` עם Object Store אחד `game`, מפתח קבוע `"active"`.
- רשומה: `{ schemaVersion: 1, savedAt, game: PersistedGame }`. `PersistedGame` = כל `GameState` (כולל `gameId`, `status`, `settings`, `currentQuestion`, `selectedAnswerId`, ספירות, `skipCount`, `answeredQuestions`, `seenFingerprints`, `request`, `setupError`).
- `toPersisted(state)` / `fromPersisted(raw)` — פונקציות טהורות:
  - `fromPersisted` מאמת עם Zod (סכמה ב-`storage.ts`, משתמשת ב-`DIFFICULTIES`, `QUESTION_LIMITS`, `ANSWER_IDS`, `LOCALES`, `AGE_GROUPS`). נתונים פגומים או `schemaVersion` אחר → `null` (מתחילים נקי, בלי קריסה).
  - `request.state === "loading"` משוחזר כ-`idle` → האפקט האוטומטי יבקש את השאלה שוב (המשחק נסגר באמצע טעינה).
- `loadGame(): Promise<GameState | null>`, `saveGame(state): Promise<void>`. כל שגיאת IndexedDB (מצב פרטי, חסימה) נתפסת: המשחק ממשיך לעבוד בזיכרון בלבד, בלי הודעת שגיאה לילד.
- הקובץ מיובא רק מקוד לקוח (`"use client"` דרך ה-Provider).

### 3.3 `src/lib/game/GameProvider.tsx` (שינוי)
- מצב `hydrated` (בוליאני). ב-mount: `loadGame()` → `dispatch({ type: "RESTORE" })` אם נמצא משחק → `hydrated = true`.
- שמירה: `useEffect` על `state` — אחרי `hydrated` בלבד — קורא ל-`saveGame(state)` (בלי Debounce; המצב קטן ו-IndexedDB שומר לפי סדר הטרנזקציות).
- טעינה אוטומטית: `useEffect` — אם `hydrated && needsQuestion(state)` → `loadQuestion(state)`. להסיר את הקריאות הישירות ל-`loadQuestion` מ-`startGame` ו-`next`. להגן מכפל בקשה ב-StrictMode באמצעות `REQUEST_START` (שהופך את `needsQuestion` ל-false) — ה-dispatch מתבצע לפני ה-`await`, ובנוסף Ref של "בקשה בתהליך לפי gameId+מספר שאלה".
- `loadQuestion` נשאר: שפה וגיל מההעדפות ברגע הבקשה; נושא וקושי מ-`state.settings` ברגע הבקשה.
- חזרת חיבור: מאזין ל-`online` — אם `request` הוא `error` עם `NETWORK`, קורא ל-`retry()` אוטומטית.
- ערכים חדשים ב-Context: `hydrated`, `skip()`, `updateSettings({ topic, difficulty })`, `hasActiveGame` (`status === "playing"`).
- `skip()`: אם `navigator.onLine === false` — לא מבצע `SKIP` (דילוג לא נצרך) ומחזיר `false` כדי שהממשק יציג "צריך חיבור לאינטרנט כדי לדלג". אחרת `dispatch SKIP` ומחזיר `true`.

### 3.4 צלילים — `src/lib/sound.tsx` (חדש)
- `SoundProvider` + `useSound()` → `{ soundEnabled, toggleSound, play(name) }`.
- העדפה ב-`localStorage` במפתח `soundEnabled` (ברירת מחדל: פועל). קריאה עם `useSyncExternalStore` (Snapshot שרת = פועל) כדי למנוע אי-התאמת Hydration; כל גישה ל-`localStorage` עטופה ב-`try/catch`.
- `play("correct" | "wrong" | "transition")` — `AudioContext` יחיד שנוצר בעצלות בלחיצה הראשונה (מדיניות Autoplay), צלילים קצרים (< 0.5 שנ'), עוצמה נמוכה: נכון = שני צלילים עולים; שגוי = צליל נמוך יורד רך; מעבר = "פופ" קצר. לא מנגן כש-`soundEnabled === false`.
- הצליל לעולם אינו האמצעי היחיד למשוב — הטקסט והאייקון הקיימים נשארים (WCAG).
- `SoundProvider` עוטף את `GameProvider` ב-`src/app/layout.tsx`.

### 3.5 זיהוי חיבור — `src/lib/useOnlineStatus.ts` (חדש)
- `useSyncExternalStore` על `navigator.onLine` ואירועי `online`/`offline` (Snapshot שרת = מחובר).

### 3.6 כותרת — `src/components/AppHeader.tsx` (+CSS) (שינוי)
- כפתור צליל קבוע בכל המסכים, ליד כפתור התפריט: `aria-pressed={soundEnabled}`, תווית נגישה "צלילים פועלים/מושתקים", אייקון רמקול/רמקול מושתק. יעד לחיצה ≥ 44px כמו `iconButton` הקיים.
- `src/components/icons.tsx`: להוסיף `SoundOnIcon`, `SoundOffIcon`, `SkipIcon`, `SettingsIcon`, `OfflineIcon` באותו סגנון.

### 3.7 דיאלוג אישור משחק חדש — `src/components/ConfirmDialog.tsx` (+CSS) (חדש)
- רכיב גנרי על בסיס `<dialog>` מקורי (`showModal()`), עם כותרת, טקסט, כפתור אישור וכפתור ביטול. Focus עובר לכפתור "ביטול" (הבחירה הבטוחה), Escape = ביטול, Focus חוזר לכפתור שפתח את הדיאלוג. עיצוב: כרטיס מעוגל, `::backdrop` עדין.
- Hook קטן `useConfirmNewGame()` (באותו קובץ או ב-`src/lib/game/`) שמחזיר `requestNewGame()` + את הדיאלוג: אם `hasActiveGame` → פותח אישור; באישור → `reset()` ומעבר ל-`/quiz` (מסך הגדרה נקי); בביטול → לא קורה כלום והמשחק נשאר.

### 3.8 מסך הבית — `src/app/HomeScreen.tsx` (+`page.module.css`) (שינוי)
- עד `hydrated`: אזור הכפתורים שומר מקום ולא מציג כפתורי התחלה (מונע "קפיצה" מ"התחל" ל"המשך").
- משחק פעיל (`status === "playing"`): כפתור ראשי **"המשך משחק"** (→ `/quiz`) וכפתור משני **"משחק חדש"** (→ דיאלוג אישור). כרטיס קטן מעל הכפתורים: "יש לך משחק שמור: שאלה X מתוך Y · נושא Z".
- משחק שהסתיים (`summary`) או אין משחק: כפתור "התחל לשחק" כמו היום; אם קיים סיכום ישן — `reset()` לפני המעבר (משחק שהסתיים לא דורש אישור).
- בחירת שפה/גיל בבית בזמן משחק פעיל — עובדת כרגיל ומשפיעה מהשאלה הבאה (אין שינוי לוגי; רק טקסט עזר קטן מתחת לבחירות כשיש משחק פעיל: "השינוי יחול מהשאלה הבאה").

### 3.9 מסך השאלות — `src/app/quiz/*` (שינוי)
- **`QuizScreen.tsx`:** עד `hydrated` — מציג `LoadingPanel` במצב "טוענים את המשחק שלך...". כפתור "משחק חדש" ב-`ErrorPanel` עובר דרך `useConfirmNewGame` (משחק פעיל → אישור).
- **`QuestionView.tsx`:**
  - **דילוג:** כפתור משני "דלג על השאלה" לפני מענה בלבד, עם טקסט "נותרו N דילוגים". אחרי 3 — הכפתור מושבת עם הטקסט "ניצלת את כל הדילוגים" (מושבת עם `aria-disabled` + הסבר, כדי שקורא מסך ישמע מדוע). Offline — הודעת סטטוס "צריך חיבור לאינטרנט כדי לדלג", בלי לצרוך דילוג.
  - **סימון השפעת הגדרות:** אם ההגדרות לבקשה הבאה שונות מהגדרות השאלה הנוכחית — שורת מידע קטנה: "ההגדרות החדשות יחולו מהשאלה הבאה".
  - **צלילים ואנימציות:** `play("correct"/"wrong")` בעת מענה; `play("transition")` כשמופיעה שאלה חדשה. אנימציות: כניסה רכה של כרטיס השאלה (fade + slide קטן, הפוך ב-RTL), "פופ" לכרטיס המשוב (קיים — `pop-in`), פעימה קלה לתשובה הנכונה ורעידה עדינה לשגויה.
  - **Offline:** באנר קטן (`role="status"`) כשאין חיבור: "אין חיבור לאינטרנט. אפשר לענות על השאלה הזו; השאלה הבאה תיטען כשהחיבור יחזור." המענה, המשוב וההסבר עובדים כבר היום מקומית.
- **`GameSettingsPanel.tsx` (חדש):** כפתור "שינוי הגדרות" (`aria-expanded`) שפותח חלונית מתקפלת בתוך מסך השאלות (לא מסך נפרד — DESIGN §1.3). מוצג במצב שאלה ובמצב שגיאה במשחק פעיל.
  - תוכן: שפה (ChoiceGroup), קבוצת גיל (ChoiceGroup), רמת קושי (ChoiceGroup), נושא (שדה טקסט + כפתור "הצע לי נושאים" — שימוש חוזר בלוגיקת ההצעות מ-`GameSetup`, שתוצא ל-Hook משותף `useTopicSuggestions` בקובץ חדש `src/app/quiz/useTopicSuggestions.ts`).
  - כפתור "שמור שינויים": אימות נושא (אותם כללים כמו בהגדרה) → `setLocale`/`setAgeGroup` (אם השתנו) + `updateSettings({ topic, difficulty })` → הודעת אישור "נשמר! השינוי יחול מהשאלה הבאה" וסגירת החלונית. מספר השאלות לא ניתן לשינוי באמצע משחק (אינו בין ארבע ההגדרות).
  - בעקבות שגיאת `UNSAFE_TOPIC` באמצע משחק: ה-`ErrorPanel` מציע לפתוח את החלונית ולבחור נושא אחר (במקום רק "משחק חדש"); לעדכן את הטקסט של `apiErrors.UNSAFE_TOPIC` בהתאם.
- **`GameSetup.tsx`:** משתמש ב-`useTopicSuggestions` המשותף (ללא שינוי התנהגות).
- **`GameSummary.tsx`:** ללא שינוי לוגי (משחק שהסתיים — "משחק חדש" בלי אישור). צליל "correct" קצר/חגיגי בכניסה — לא חובה; לא להוסיף.
- **`page.module.css`:** סגנונות לדילוג, חלונית הגדרות, באנר Offline, אנימציות חדשות.

### 3.10 אנימציות ו-Reduced Motion — `src/app/globals.css` (בדיקה/שינוי)
- הבלוק הקיים `@media (prefers-reduced-motion: reduce)` צריך לבטל/לקצר את כל האנימציות והמעברים החדשים (כולל `scroll-behavior`). לוודא שהוא חל גם על CSS Modules (בורר גלובלי `*, *::before, *::after`).
- צלילים אינם "תנועה" ואינם מושפעים מ-Reduced Motion; הם נשלטים רק במתג.

### 3.11 טקסטים — `src/i18n/dictionaries/{he,en,ru}.ts` (שינוי)
מפתחות חדשים בשלוש השפות (המבנה זהה, הטיפוס נגזר מ-`he`):
- `common`: `soundOn`, `soundOff` (תוויות כפתור הצליל).
- `home`: `continueGame`, `newGame`, `savedGame` ("שאלה {n} מתוך {total} · נושא: {topic}"), `appliesNext`.
- `confirmNewGame`: `title` ("להתחיל משחק חדש?"), `text` ("המשחק הנוכחי והניקוד שלו יימחקו."), `confirm` ("כן, משחק חדש"), `cancel` ("לא, חזרה למשחק").
- `quiz`: `loadingGame`, `skip`, `skipsLeft` ("נותרו {n} דילוגים"), `noSkipsLeft`, `skipNeedsConnection`, `offlineBanner`, `settingsButton`, `settingsTitle`, `settingsHint`, `saveSettings`, `settingsSaved`, `appliesNext`, `chooseOtherTopic`; עדכון `apiErrors.UNSAFE_TOPIC`, `apiErrors.NETWORK` ("...המשחק שמור").
- טקסטי האודות כבר מתארים דילוגים, שינוי הגדרות ושמירה — לוודא התאמה, בלי להוסיף פיצ'רים.

## 4. בדיקות

### 4.1 Unit (Vitest)
- `engine.test.ts` — להרחיב:
  - שלושה דילוגים מצליחים; רביעי לא משנה מצב; דילוג אחרי מענה לא אפשרי; דילוג לא משנה `completedCount`/`correctCount`/`answeredQuestions`; השאלה שדולגה נשארת ב-`seenFingerprints`.
  - `SKIP` ← `REQUEST_FAILED` ← `REQUEST_START` (Retry) ← `QUESTION_LOADED`: `skipCount` נשאר 1.
  - `UPDATE_SETTINGS` בזמן שאלה פתוחה/נענתה: `currentQuestion` ו-`selectedAnswerId` זהים, ניקוד ו-`questionLimit` נשמרים, `settings.topic/difficulty` מתעדכנים.
  - `START`/`RESET` מאפסים `skipCount`.
- `storage.test.ts` (חדש): `fromPersisted(toPersisted(state))` שווה למצב (עם `loading`→`idle`); נתונים פגומים / גרסה אחרת / שדות חסרים → `null`; שאלה עם 3 תשובות או `correctAnswerId` לא חוקי → `null`.

### 4.2 בדיקה בדפדפן (בזמן הבנייה, מול שרת dev מקומי ומפתח הפיתוח)
- משחק 5 שאלות: לענות על 2, לרענן → אותה שאלה ואותו מצב משוב; סגירת לשונית ופתיחה מחדש → אותו דבר.
- 3 דילוגים → הכפתור מושבת; ניקוד ומונה "שאלה X מתוך Y" לא השתנו.
- כשל בקשה אחרי דילוג (סימולציית Offline לפני הדילוג אינה צורכת דילוג; סימולציית כשל שרת אחרי דילוג) → "נסה שוב" → `skipCount` לא השתנה.
- שינוי כל אחת מארבע ההגדרות בחלונית בזמן שאלה → השאלה זהה; השאלה הבאה בשפה/גיל/קושי/נושא החדשים.
- בית בזמן משחק → "המשך משחק"/"משחק חדש"; ביטול → המשחק נשאר; אישור → מסך הגדרה נקי.
- Offline (אמולציית רשת בדפדפן הבדיקה) אחרי טעינת שאלה → מענה, משוב והסבר; "השאלה הבאה" → הודעת חיבור; החזרת חיבור → טעינה אוטומטית; המשחק שמור.
- מתג צליל → רענון → ההעדפה נשמרה; `prefers-reduced-motion: reduce` (אמולציה) → אין אנימציות.
- מקלדת וקורא מסך: דיאלוג (Focus, Escape), כפתור דילוג מושבת עם הסבר, חלונית הגדרות, כפתור צליל (`aria-pressed`). שלוש שפות + RTL/LTR.
- `npm run lint && npm run typecheck && npm test && npm run build` עוברים.

## 5. ADRs שיתווספו ל-ARCHITECTURE.md בזמן הבנייה
- **ADR-6: שמירת משחק ב-IndexedDB** — רשומה אחת `active`, שמירה אחרי כל שינוי מצב, אימות Zod בשחזור ומחיקה שקטה של נתונים פגומים, `loading`→`idle`, נפילה לזיכרון בלבד כש-IndexedDB לא זמין; כמה לשוניות פתוחות — "האחרונה שנשמרה מנצחת".
- **ADR-7: הגדרות "מהשאלה הבאה" בלי `nextSettings`** — השאלה נושאת את ההגדרות שבהן נוצרה; `settings` (נושא/קושי) והעדפות שפה/גיל (Cookies, ADR-1) משמשים רק לבקשה הבאה. מחליף את `settings`/`nextSettings` שב-§2.4.
- **ADR-8: צלילים ב-Web Audio API** — ללא קובצי אודיו; ברירת מחדל פועל; העדפה ב-`localStorage`.

## 6. מחוץ להיקף ה-Milestone הזה
- דיווח על שאלה (Milestone 4); Service Worker, Manifest ופתיחת האפליקציה Offline מאפס (Milestone 5) — בשלב זה Offline נבדק רק אחרי שהעמוד כבר נטען.
- סנכרון בין מכשירים, היסטוריית משחקים, שינוי מספר השאלות באמצע משחק.

## 7. Definition of Done (מתוך MILESTONES.md) ← איך כל סעיף מתקיים
| תנאי | מימוש |
|---|---|
| שחזור אחרי רענון/סגירה לאותה שאלה/משוב עם ניקוד, טעויות, הגדרות ודילוגים | 3.2, 3.3 (RESTORE + שמירה אחרי כל שינוי) |
| דילוגים 1–3, רביעי לא זמין, Retry לא צורך דילוג | 3.1 (`SKIP`), 3.3 (`skip()`, Retry), 3.9 |
| שינוי ארבע ההגדרות משפיע על הבאה בלבד | 3.1 (`UPDATE_SETTINGS`), 3.9 (`GameSettingsPanel`), ADR-7 |
| בית: המשך/משחק חדש, ביטול משאיר, אישור מנקה | 3.7, 3.8 |
| מענה Offline, הודעת חיבור בשאלה הבאה, המשחק נשמר | 3.3 (`online`), 3.5, 3.9 |
| צלילים: השתקה בכל שלב ושמירה; Reduced Motion | 3.4, 3.6, 3.10 |
