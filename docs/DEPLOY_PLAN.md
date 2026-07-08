# DEPLOY_PLAN · אתר Viziblezone

## סביבה
- מכונה: לפטופ (ofirg). לא GabiDesktop.
- מאגר: viziblezone-site, ציבורי (הוחלט 2026-07-08: GitHub Pages על repo פרטי דורש מנוי בתשלום; אין סוד בקוד, הטוקן לעולם לא במאגר, והתוכן ממילא ציבורי). ענף main.
- כלל נגזר מציבוריות המאגר: כל קובץ שנכנס לתיקייה הופך פומבי עם ה-push. רק חומרים שאושרו לפרסום שיווקי. חומר פנימי לא נכנס למאגר, נקודה.
- אחסון: GitHub Pages, מקור "GitHub Actions". רק תיקיית dist מתפרסמת, לכן admin/ וה-content הגולמי לא נגישים לגולשים.
- דומיין: שלב ראשון github.io, מעבר ל-vizible.zone רק אחרי אישור סופי (שלב 6).

## שרשרת הפרסום
עריכה ב-CMS → commit של content/*.json דרך GitHub API → GitHub Actions: npm install, node build.js → deploy-pages → אתר חי תוך 1-2 דקות.

## עבודה מקומית (פיתוח)
```
npm install
node build.js
npx http-server dist -p 8080
```

## ה-CMS
- פתיחה: admin/editor.html מקומית בדפדפן (או מתוך clone של המאגר).
- טוקן: fine-grained, מוגבל למאגר viziblezone-site בלבד, הרשאת Contents: Read and write בלבד, תוקף 90 יום. נשמר ב-localStorage בלבד.
- יכולות: עריכת כל שדה בכל עמוד, הוספה/מחיקה/סידור פריטים (חדשות, צוות, שאלות, סטטיסטיקות), העלאת תמונות, תצוגה מקדימה חיה, טיוטה אוטומטית מקומית, גיבוי תוכן, פרסום.

## Rollback
- כל פרסום הוא commit. שחזור: git revert או שחזור קובץ content ספציפי מ-history.
- כפתור "הורד גיבוי תוכן" ב-CMS לפני שינויים גדולים.

## חיתוך דומיין (שלב 6)
1. קובץ CNAME עם vizible.zone (build.js יצטרך להעתיק אותו ל-dist, לעדכן אז).
2. DNS אצל הרשם: A records של GitHub Pages + CNAME ל-www.
3. Enforce HTTPS.
4. ניתוק הדומיין מ-Webflow ואימות שאין תוכן ישן נגיש.
