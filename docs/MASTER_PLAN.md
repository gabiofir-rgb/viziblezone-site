# MASTER_PLAN · אתר Viziblezone

עדכון אחרון: 2026-07-09

## מטרה
אתר חברה מלא ורב-עמודי שמחליף את אתר ה-Webflow הקפוא, מספר את סיפור פלטפורמת המודעות המצבית לקהלי OEM, ערים, תעשייה וביטחון ציבורי, ומנוהל תוכן על ידי גבי דרך CMS ייעודי בלי תלות באיש חוץ.

## כלל סודיות מחייב (חל על כל שלב, כל קובץ, כל commit)
אין לאזכר טכנולוגיות שכבה פיזית, פרוטוקולים, שמות תקנים או מספרי טווח קליטה. הניסוח הפומבי המותר בלבד: "direct device-to-device", "no cellular dependency", "DMO-inspired" / "DMO principles".

## מיתוג
שחור #0B0B0C · לבן #FCFBF7 · חרדל #E0A526. פונטים: Big Shoulders Display (כותרות), Archivo (גוף), IBM Plex Mono (תוויות). מוגדר במקום אחד: assets/css/main.css.

## ארכיטקטורה
- תוכן מופרד מתבניות: content/*.json ← templates/*.mustache ← build.js ← dist/
- מאגר ציבורי (Pages חינם). רק חומרים המאושרים לפרסום נכנסים אליו.
- פרסום: push ל-main מפעיל GitHub Actions שבונה ומפרסם ל-GitHub Pages (dist בלבד עולה לאוויר, ה-CMS לא נחשף).
- ניהול תוכן: admin/editor.html + admin/schema.js. עריכה בדפדפן, פרסום דרך GitHub API, ה-Action בונה אוטומטית.

## מפת האתר
בית · Platform (איך זה עובד, עקרונות, אינטגרציה, FAQ) · 4 עמודי ורטיקלים (Automotive, Smart Cities, Industrial, Public Safety) · Company (סיפור, מורשת DMO, צוות) · News · Contact (טופס).

## שלבים
- [x] שלב 0: ארכיטקטורה, עיצוב, תבניות, תוכן v1, בילדר, CMS — הופק בצ'אט התכנון ונבדק (בנייה מקומית עוברת)
- [~] שלב 1: repo ציבורי + push + Pages ממקור GitHub Actions — בוצע ופרוס. אתר חי: https://gabiofir-rgb.github.io/viziblezone-site/ · מאגר: https://github.com/gabiofir-rgb/viziblezone-site · נותר: יצירת fine-grained token ובדיקת CMS מקצה לקצה עם גבי
- [ ] שלב 2: תוכן אמיתי — קישורי עיתונות, אנשי צוות ותמונות, פריטי News, אימות מייל, נתוני סטטיסטיקה מאומתים, חיבור Formspree לטופס
- [ ] שלב 3: השלמות טכניות — favicon, Open Graph + תמונת שיתוף, sitemap.xml, robots.txt, 404.html
- [ ] שלב 4: QA — מובייל 360px, נגישות, Lighthouse 90+, בדיקת כל קישור
- [ ] שלב 5: אישור סופי של גבי
- [ ] שלב 6: דומיין — CNAME ל-vizible.zone, DNS, HTTPS, ניתוק Webflow
- [ ] שלב 7: מסירה — הדרכת CMS, נוהל גיבוי, תזכורת חידוש טוקן

## עקרונות עבודה
1. כל החלטה חדשה מתועדת ב-docs. שום דבר לא נשאר מחוץ למסמכים.
2. פיתוח בלפטופ בלבד. אין תלות ב-GabiDesktop.
3. שינויי תוכן: רק דרך ה-CMS. שינויי מבנה/עיצוב: רק דרך Claude Code, ותמיד לעדכן את admin/schema.js כשמוסיפים שדות תוכן חדשים.
