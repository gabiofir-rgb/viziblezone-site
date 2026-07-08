# NOTES · אתר Viziblezone

## החלטות
- 2026-07-07: לא משפצים את Webflow, בונים חדש. הישן קפוא מ-2020 ומזיק (קורונה, Contact שבור, נרטיב הפוך על אוטומוטיב).
- 2026-07-07: רמת הפשטה — DMO / direct device-to-device בלבד. אין שכבה פיזית, אין מספרי טווח. במכוון.
- 2026-07-07: גבי הבהיר — סאני טורס אינו מודל. זה אתר חברה טכנולוגית: רב-עמודי, מושקע, עם CMS אמיתי.
- 2026-07-07: הוחלט (מול חלופת Decap CMS): מיני-CMS מותאם. נימוק: בלי שכבת OAuth חיצונית, שליטה מלאה, מתיישב עם אקוסיסטם GitHub + Claude Code.
- 2026-07-07: היקף גרסה ראשונה: מבנה מלא (4 עמודי ורטיקלים + Company + News). אנגלית בלבד.
- 2026-07-07: ארכיטקטורה: JSON + Mustache + build.js + GitHub Actions ל-Pages. רק dist מתפרסם, ה-CMS לא ציבורי.

- 2026-07-08: המאגר ציבורי (Pages בחינם). נגזרת: מסמכי docs מנוסחים כפומביים, בלי שמות שותפים וללא הקשרים עסקיים פנימיים. כל מה שנכנס לתיקייה מתפרסם.
- 2026-07-08: גבי מעביר את תיקיית הלוגו הרשמית אל assets/brand/. שילוב הלוגו בניווט, favicon ותמונת שיתוף — במסגרת שלבים 2-3.

- 2026-07-08 (שער סודיות, שלב 1, אושר ע"י גבי): מעבר לפני ה-push הראשון העלה שתי חריגות והן טופלו לפני כל commit:
  1. **תוכן:** הוסרו אזכור אחד של שם-תקן מקצועי + ניסוחי שכבה-פיזית מ-8 מקומות (company/home/platform/automotive/public-safety) והוחלפו בניסוח הפומבי המותר בלבד (DMO / direct device-to-device / communications). לפי כלל הסודיות, המונחים שהוסרו אינם מצוטטים כאן — docs עצמו פומבי.
  2. **נכסי מותג:** תיקיית assets/brand/Logo שהועתקה הכילה קבצים שאינם לפרסום (ייצוא Gmail אישי, מצגות PDF, נייר-מכתבים docx, זבל OS/zip). נשמרו בגיבוי מחוץ ל-repo ב-`C:\Users\ofirg\Projects\viziblezone-brand-source-PRIVATE`, ובמאגר נשארו רק קובצי לוגו/אייקון נקיים (png/jpg/svg/pdf/ai). build.js מעתיק את כל assets/ ל-dist, ולכן ניקוי זה מונע חשיפה גם באתר החי. .gitignore חוזק נגד הישנות (docx/zip/html/__MACOSX/Picasa/lnk).
  3. **מסמכי ממשל/הוראות:** המונח הפיזי הופיע גם במשפט הכלל ב-MASTER_PLAN ובהוראות ההקמה. נוסח הכלל רוכך ל"טכנולוגיות שכבה פיזית" (בלי המונח הספציפי), ו-SETUP_PROMPT.md הוצא מהמאגר (פנימי) לגיבוי החיצוני + נוסף ל-.gitignore. בדיקת git grep על העץ המנוהל: אין יותר אזכור של המונח הפיזי בכל המאגר.
  - פתוח לגיבוב עתידי: הניסוח "V2X" (platform, השוואה לחלופות) ותיקיית "LOGO NEW SHMULIK" (שם פרטי של מעצב) — לא חריגות מוגדרות, נשארו; לשקול תיקון קוסמטי בשלב 3.

- 2026-07-09 (שלב 1, המשך): הרצה חוזרת גילתה ששלב 1 כבר בוצע קודם — repo ציבורי, Pages ממקור GitHub Actions, ו-deploy ירוק. אומץ המאגר הקיים כמקור אמת (במקום push חדש שידרוס אותו). בבדיקה נמצא ששרידי ניסוח לא-מותר עדיין היו חיים באתר: ניסוח מפורש של מונח מקצועי (home/company/public-safety) והפניות לגופי תקינה (company). תוקנו והוחלפו בניסוח הפומבי המותר (DMO-inspired / DMO principles / direct device-to-device); לפי כלל הסודיות המונחים שהוסרו אינם מצוטטים כאן. .gitignore חוזק כדי שעותקים מקומיים שנותרו של המצגות הכבדות וייצוא ה-Gmail לא ייכנסו לעולם למאגר. deploy חוזר ירוק, והאתר החי אומת נקי (9 עמודים 200). פתוח לשלב 2/3: ניסוחי DMO "עירומים" (engineering/expert/DNA), "V2X" בהשוואת חלופות, ותיקיית "LOGO NEW SHMULIK" — לא חריגות מוגדרות.

- 2026-07-09 (שלב 2 — תוכן ומיתוג, Claude Code):
  1. **CMS לאנגלית:** admin/editor.html ו-admin/schema.js הומרו לאנגלית (RTL→LTR, פונט Archivo). אומת: 0 תווי עברית (֐-׿). כבר בוצע ב-commit נפרד ("CMS interface converted to English").
  2. **תיקיית מותג:** assets/brand/Logo → assets/brand/logo (אותיות קטנות). תיקיית "LOGO NEW SHMULIK" (שם פרטי) → logo/master. נמחקו כל שאריות ה-junk שלא במעקב (ייצוא Gmail אישי, מצגות PDF כבדות, .picasa, __MACOSX, .DS_Store, zip/docx/lnk) — גיבוי קיים ב-viziblezone-brand-source-PRIVATE. אין יותר שמות אישיים בנתיבים הפומביים.
  3. **לוגו באתר:** נבחר Logo_White+Yellow-01.svg (SVG וקטורי, white+yellow — מתאים לרקע הכהה) והועתק ל-assets/logo.svg. הוחלף הלוגו הטקסטואלי בניווט (30px) ובפוטר (34px) ב-base.mustache. נוצרו assets/favicon.ico (16/32/48) ו-assets/apple-touch-icon.png (180x180) מסמל הלוגו על רקע חרדל, מקושרים ב-<head>. build.js מעתיק את assets/ ולכן הם עולים לאתר.
  4. **צוות:** מערך team ב-company.json הוחלף ב-4 חברי הנהלה (photo ריק — גבי יעלה תמונות דרך ה-CMS).
  5. **פטנטים (תיקון דיוק, כל האתר):** לחברה אין פטנטים; הקרדיטים אישיים למייסדים. story.paragraphs ו-heritage.bullets נוסחו מחדש ל"founders credited with 60+ career patents". סריקה בכל קובצי content: אין עוד טענת פטנט ברמת החברה.
  6. **סקשן וידאו:** נוסף "See it in action" ל-home (בין verticals ל-resilience) — רשת רספונסיבית 16:9, iframes עצלים מ-youtube-nocookie.com/embed. חילוץ מזהה ה-YouTube מכל צורת URL נעשה ב-build.js (ytId), לא ב-JS צד-לקוח. admin/schema.js עודכן עם שדות videos באותו commit (עריך מה-CMS). הערה: תצוגת ה-preview ב-CMS לא מריצה את build.js ולכן לא תטמיע את הווידאו — האתר הבנוי כן.
  - נסגר: פריט "LOGO NEW SHMULIK" מ-2026-07-08 טופל (שוּנה ל-master).

## ידוע ופתוח
- placeholder-ים שחייבים תוכן אמיתי לפני דומיין: נתוני סטטיסטיקה בעמוד הבית (50%+, <2s ללא מקור), קישורי עיתונות (#), אנשי צוות 2-3 בעמוד Company, פריטי News, form.action של Formspree, אימות info@vizible.zone.
- עמוד Company מכיל תיאור רקע כללי של הצוות (mission-critical, standards, patents) בלי שמות חברות. לאשר מול גבי אם לנקוב בשם המעסיק הקודם במפורש.
- אין עדיין favicon, OG image, sitemap, 404 (שלב 3).
- כשמוסיפים שדה/סקשן חדש בתבניות, חובה לעדכן את admin/schema.js באותו commit.

## לקחים
- Mustache מקודד "/" בתוך {{depth}}, לכן {{{depth}}} בכל התבניות (טופל).
- /bin/sh בסביבות CI/סקריפטים לא תומך ב-brace expansion, ליצור תיקיות מפורשות.
- GitHub API תומך CORS מכל origin כולל file://, לכן ה-CMS עובד ישירות מהדיסק בלי שרת.
