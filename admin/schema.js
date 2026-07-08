/* Schema of all editable content files. The editor renders forms from this. */
const VERTICAL_FIELDS = [
  { key: "name", type: "text", label: "שם הוורטיקל (מופיע בתפריט ובפוטר)" },
  { key: "cardTitle", type: "text", label: "כותרת הכרטיס בעמוד הבית" },
  { key: "cardText", type: "textarea", label: "טקסט הכרטיס בעמוד הבית" },
  { key: "meta.title", type: "text", label: "כותרת לשונית הדפדפן (SEO)" },
  { key: "meta.description", type: "textarea", label: "תיאור לגוגל (SEO)" },
  { key: "hero.eyebrow", type: "text", label: "שורת פתיח קטנה" },
  { key: "hero.title", type: "html", label: "כותרת ראשית" },
  { key: "hero.lede", type: "textarea", label: "פסקת פתיח" },
  { key: "scenario.eyebrow", type: "text", label: "תרחיש: פתיח קטן" },
  { key: "scenario.title", type: "html", label: "תרחיש: כותרת" },
  { key: "scenario.paragraphs", type: "list", label: "תרחיש: פסקאות", item: [{ key: "", type: "textarea", label: "פסקה" }] },
  { key: "value.eyebrow", type: "text", label: "ערך: פתיח קטן" },
  { key: "value.title", type: "html", label: "ערך: כותרת" },
  { key: "value.items", type: "list", label: "ערך: כרטיסים", item: [
    { key: "tag", type: "text", label: "תגית" },
    { key: "title", type: "text", label: "כותרת" },
    { key: "text", type: "textarea", label: "טקסט" }
  ]},
  { key: "deployment.eyebrow", type: "text", label: "פריסה: פתיח קטן" },
  { key: "deployment.title", type: "html", label: "פריסה: כותרת" },
  { key: "deployment.paragraphs", type: "list", label: "פריסה: פסקאות", item: [{ key: "", type: "textarea", label: "פסקה" }] },
  { key: "deployment.bullets", type: "list", label: "פריסה: נקודות", item: [{ key: "", type: "textarea", label: "נקודה" }] },
  { key: "cta.title", type: "html", label: "קריאה לפעולה: כותרת" },
  { key: "cta.lede", type: "textarea", label: "קריאה לפעולה: טקסט" },
  { key: "cta.button", type: "text", label: "קריאה לפעולה: כפתור" }
];

const CMS_SCHEMA = {
  "content/site.json": { label: "הגדרות כלליות", template: null, fields: [
    { key: "legalName", type: "text", label: "שם משפטי (פוטר)" },
    { key: "location", type: "text", label: "מיקום (פוטר ועמוד קשר)" },
    { key: "contactEmail", type: "text", label: "אימייל ליצירת קשר" },
    { key: "footerBlurb", type: "textarea", label: "משפט תיאור בפוטר" }
  ]},
  "content/home.json": { label: "עמוד הבית", template: "home", out: "index.html", fields: [
    { key: "meta.title", type: "text", label: "כותרת לשונית (SEO)" },
    { key: "meta.description", type: "textarea", label: "תיאור לגוגל (SEO)" },
    { key: "hero.eyebrow", type: "text", label: "Hero: פתיח קטן" },
    { key: "hero.title", type: "html", label: "Hero: כותרת ראשית" },
    { key: "hero.lede", type: "textarea", label: "Hero: פסקת פתיח" },
    { key: "hero.cta1", type: "text", label: "Hero: כפתור ראשי" },
    { key: "hero.cta2", type: "text", label: "Hero: כפתור משני" },
    { key: "hero.tags", type: "list", label: "Hero: תגיות", item: [{ key: "", type: "text", label: "תגית" }] },
    { key: "hero.sceneLabel", type: "text", label: "Hero: כיתוב האנימציה" },
    { key: "problem.eyebrow", type: "text", label: "הבעיה: פתיח קטן" },
    { key: "problem.title", type: "html", label: "הבעיה: כותרת" },
    { key: "problem.lede", type: "textarea", label: "הבעיה: פסקה" },
    { key: "problem.stats", type: "list", label: "הבעיה: סטטיסטיקות", item: [
      { key: "num", type: "html", label: "מספר" },
      { key: "text", type: "textarea", label: "הסבר" }
    ]},
    { key: "platform.eyebrow", type: "text", label: "פלטפורמה: פתיח קטן" },
    { key: "platform.title", type: "html", label: "פלטפורמה: כותרת" },
    { key: "platform.lede", type: "textarea", label: "פלטפורמה: פסקה" },
    { key: "platform.steps", type: "list", label: "פלטפורמה: שלבים", item: [
      { key: "k", type: "text", label: "מספור (01 / ...)" },
      { key: "title", type: "text", label: "כותרת" },
      { key: "text", type: "textarea", label: "טקסט" }
    ]},
    { key: "platform.cta", type: "text", label: "פלטפורמה: כפתור" },
    { key: "verticalsIntro.eyebrow", type: "text", label: "ורטיקלים: פתיח קטן" },
    { key: "verticalsIntro.title", type: "html", label: "ורטיקלים: כותרת" },
    { key: "verticalsIntro.lede", type: "textarea", label: "ורטיקלים: פסקה" },
    { key: "resilience.quote", type: "html", label: "עמידות: ציטוט גדול" },
    { key: "resilience.lede", type: "textarea", label: "עמידות: פסקה" },
    { key: "resilience.bullets", type: "list", label: "עמידות: נקודות", item: [{ key: "", type: "textarea", label: "נקודה" }] },
    { key: "press.eyebrow", type: "text", label: "עיתונות: פתיח קטן" },
    { key: "press.title", type: "html", label: "עיתונות: כותרת" },
    { key: "press.items", type: "list", label: "עיתונות: לוגואים", item: [
      { key: "name", type: "text", label: "שם" },
      { key: "url", type: "url", label: "קישור" }
    ]},
    { key: "press.cta", type: "text", label: "עיתונות: כפתור" },
    { key: "cta.eyebrow", type: "text", label: "סיום: פתיח קטן" },
    { key: "cta.title", type: "html", label: "סיום: כותרת" },
    { key: "cta.lede", type: "textarea", label: "סיום: פסקה" },
    { key: "cta.button", type: "text", label: "סיום: כפתור" }
  ]},
  "content/platform.json": { label: "עמוד Platform", template: "platform", out: "platform.html", fields: [
    { key: "meta.title", type: "text", label: "כותרת לשונית (SEO)" },
    { key: "meta.description", type: "textarea", label: "תיאור לגוגל (SEO)" },
    { key: "hero.eyebrow", type: "text", label: "Hero: פתיח קטן" },
    { key: "hero.title", type: "html", label: "Hero: כותרת" },
    { key: "hero.lede", type: "textarea", label: "Hero: פסקה" },
    { key: "how.eyebrow", type: "text", label: "איך זה עובד: פתיח קטן" },
    { key: "how.title", type: "html", label: "איך זה עובד: כותרת" },
    { key: "how.lede", type: "textarea", label: "איך זה עובד: פסקה" },
    { key: "how.steps", type: "list", label: "איך זה עובד: שלבים", item: [
      { key: "k", type: "text", label: "מספור" },
      { key: "title", type: "text", label: "כותרת" },
      { key: "text", type: "textarea", label: "טקסט" }
    ]},
    { key: "principles.eyebrow", type: "text", label: "עקרונות: פתיח קטן" },
    { key: "principles.title", type: "html", label: "עקרונות: כותרת" },
    { key: "principles.items", type: "list", label: "עקרונות: כרטיסים", item: [
      { key: "tag", type: "text", label: "תגית" },
      { key: "title", type: "text", label: "כותרת" },
      { key: "text", type: "textarea", label: "טקסט" }
    ]},
    { key: "integration.eyebrow", type: "text", label: "אינטגרציה: פתיח קטן" },
    { key: "integration.title", type: "html", label: "אינטגרציה: כותרת" },
    { key: "integration.lede", type: "textarea", label: "אינטגרציה: פסקה" },
    { key: "integration.paths", type: "list", label: "אינטגרציה: מסלולים", item: [
      { key: "tag", type: "text", label: "תגית" },
      { key: "title", type: "text", label: "כותרת" },
      { key: "text", type: "textarea", label: "טקסט" }
    ]},
    { key: "faq.eyebrow", type: "text", label: "שאלות: פתיח קטן" },
    { key: "faq.title", type: "html", label: "שאלות: כותרת" },
    { key: "faq.items", type: "list", label: "שאלות ותשובות", item: [
      { key: "q", type: "text", label: "שאלה" },
      { key: "a", type: "textarea", label: "תשובה" }
    ]},
    { key: "cta.title", type: "html", label: "סיום: כותרת" },
    { key: "cta.lede", type: "textarea", label: "סיום: פסקה" },
    { key: "cta.button", type: "text", label: "סיום: כפתור" }
  ]},
  "content/verticals/automotive.json":   { label: "ורטיקל: Automotive",    template: "vertical", out: "verticals/automotive.html",    fields: VERTICAL_FIELDS },
  "content/verticals/smart-cities.json": { label: "ורטיקל: Smart Cities",  template: "vertical", out: "verticals/smart-cities.html",  fields: VERTICAL_FIELDS },
  "content/verticals/industrial.json":   { label: "ורטיקל: Industrial",    template: "vertical", out: "verticals/industrial.html",    fields: VERTICAL_FIELDS },
  "content/verticals/public-safety.json":{ label: "ורטיקל: Public Safety", template: "vertical", out: "verticals/public-safety.html", fields: VERTICAL_FIELDS },
  "content/company.json": { label: "עמוד Company", template: "company", out: "company.html", fields: [
    { key: "meta.title", type: "text", label: "כותרת לשונית (SEO)" },
    { key: "meta.description", type: "textarea", label: "תיאור לגוגל (SEO)" },
    { key: "hero.eyebrow", type: "text", label: "Hero: פתיח קטן" },
    { key: "hero.title", type: "html", label: "Hero: כותרת" },
    { key: "hero.lede", type: "textarea", label: "Hero: פסקה" },
    { key: "story.eyebrow", type: "text", label: "הסיפור: פתיח קטן" },
    { key: "story.title", type: "html", label: "הסיפור: כותרת" },
    { key: "story.paragraphs", type: "list", label: "הסיפור: פסקאות", item: [{ key: "", type: "textarea", label: "פסקה" }] },
    { key: "heritage.quote", type: "html", label: "מורשת: ציטוט" },
    { key: "heritage.lede", type: "textarea", label: "מורשת: פסקה" },
    { key: "heritage.bullets", type: "list", label: "מורשת: נקודות", item: [{ key: "", type: "textarea", label: "נקודה" }] },
    { key: "teamIntro.eyebrow", type: "text", label: "צוות: פתיח קטן" },
    { key: "teamIntro.title", type: "html", label: "צוות: כותרת" },
    { key: "teamIntro.lede", type: "textarea", label: "צוות: פסקה" },
    { key: "team", type: "list", label: "אנשי הצוות", item: [
      { key: "name", type: "text", label: "שם" },
      { key: "role", type: "text", label: "תפקיד" },
      { key: "bio", type: "textarea", label: "ביוגרפיה קצרה" },
      { key: "photo", type: "image", label: "תמונה" }
    ]},
    { key: "cta.title", type: "html", label: "סיום: כותרת" },
    { key: "cta.lede", type: "textarea", label: "סיום: פסקה" },
    { key: "cta.button", type: "text", label: "סיום: כפתור" }
  ]},
  "content/news.json": { label: "עמוד News", template: "news", out: "news.html", fields: [
    { key: "meta.title", type: "text", label: "כותרת לשונית (SEO)" },
    { key: "meta.description", type: "textarea", label: "תיאור לגוגל (SEO)" },
    { key: "hero.eyebrow", type: "text", label: "Hero: פתיח קטן" },
    { key: "hero.title", type: "html", label: "Hero: כותרת" },
    { key: "hero.lede", type: "textarea", label: "Hero: פסקה" },
    { key: "items", type: "list", label: "פריטי חדשות ועיתונות", item: [
      { key: "date", type: "text", label: "תאריך (למשל: May 2026)" },
      { key: "title", type: "text", label: "כותרת" },
      { key: "source", type: "text", label: "מקור (שם העיתון / Viziblezone)" },
      { key: "url", type: "url", label: "קישור (אפשר להשאיר ריק)" },
      { key: "summary", type: "textarea", label: "תקציר" }
    ]},
    { key: "cta.title", type: "html", label: "סיום: כותרת" },
    { key: "cta.lede", type: "textarea", label: "סיום: פסקה" },
    { key: "cta.button", type: "text", label: "סיום: כפתור" }
  ]},
  "content/contact.json": { label: "עמוד Contact", template: "contact", out: "contact.html", fields: [
    { key: "meta.title", type: "text", label: "כותרת לשונית (SEO)" },
    { key: "meta.description", type: "textarea", label: "תיאור לגוגל (SEO)" },
    { key: "hero.eyebrow", type: "text", label: "Hero: פתיח קטן" },
    { key: "hero.title", type: "html", label: "Hero: כותרת" },
    { key: "hero.lede", type: "textarea", label: "Hero: פסקה" },
    { key: "form.action", type: "url", label: "כתובת שירות הטופס (Formspree)" },
    { key: "form.topics", type: "list", label: "נושאי הפנייה", item: [{ key: "", type: "text", label: "נושא" }] },
    { key: "form.button", type: "text", label: "כפתור שליחה" }
  ]}
};
