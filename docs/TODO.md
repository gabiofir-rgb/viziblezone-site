# TODO · אתר Viziblezone

## דחוף (בלתי תלוי באתר החדש)
- [ ] Webflow הישן: להסיר באנרי קורונה ולתקן את כפתור CONTACT US. רבע שעה.

## שלב 1 (קלוד קוד)
- [x] תיקיית הלוגו הועתקה אל assets/brand/ (במאגר רק קובצי לוגו/אייקון נקיים; מצגות PDF כבדות, נייר-מכתבים, ייצוא Gmail וזבל OS הוחרגו)
- [x] repo ציבורי + push — https://github.com/gabiofir-rgb/viziblezone-site
- [x] Pages ממקור GitHub Actions + ריצת deploy ירוקה — https://gabiofir-rgb.github.io/viziblezone-site/ (9 עמודים 200, CSS נטען, ניווט תקין)
- [ ] fine-grained token (גבי מייצר; נכנס ישירות ל-admin/editor.html, נשמר ב-localStorage בלבד)
- [ ] בדיקת CMS מקצה לקצה: טעינה → עריכה → פרסום → האתר התעדכן (עם גבי)

## תוכן, דורש קלט מגבי (שלב 2)
- [ ] קישורי עיתונות אמיתיים (TechCrunch, Fast Company, Geektime, Calcalist, NoCamels)
- [~] אנשי צוות: 4 חברי הנהלה (Gabi Ofir, Dr. Baruh Hason, Roy Ben-Sasson, Ariel Michaeli) — שמות/תפקידים/ביו עודכנו; תמונות ממתינות להעלאה דרך ה-CMS
- [x] תיקון ניסוח פטנטים באתר: לחברה אין פטנטים — הקרדיטים הם אישיים של המייסדים (35+26 = 60+ פטנטים בקריירה). תוקן ב-company.json (story + heritage + ביו)
- [x] סקשן וידאו "See it in action" בעמוד הבית — 2 סרטוני YouTube (embed מ-youtube-nocookie), נערך דרך ה-CMS
- [ ] פריטי News ראשונים (כולל Smart Mobility IL אם רלוונטי לפרסום)
- [ ] אימות info@vizible.zone
- [ ] נתוני סטטיסטיקה עם מקור, או ניסוח בלי מספרים
- [ ] פתיחת חשבון Formspree (חינמי) ועדכון form.action דרך ה-CMS
- [ ] החלטה: לציין בעמוד Company את שם המעסיק הקודם של המייסד במפורש או להשאיר ניסוח כללי

## שלב 3 טכני
- [x] שילוב הלוגו (assets/logo.svg — white+yellow SVG) בניווט ובפוטר; הוחלף הלוגו הטקסטואלי
- [x] favicon.ico (16/32/48) + apple-touch-icon 180x180 מסמל הלוגו, ב-assets/, מקושרים ב-base.mustache, מועתקים ל-dist
- [ ] Open Graph + תמונת שיתוף 1200x630
- [ ] sitemap.xml + robots.txt (להוסיף ל-build.js)
- [ ] 404.html ממותג

## לפני דומיין
- [ ] Lighthouse 90+ בכל עמוד
- [ ] מובייל 360px כולל תפריט המבורגר ואנימציית hero
- [ ] בדיקת כל קישור פנימי וחיצוני
- [ ] אישור סופי של גבי
