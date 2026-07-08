/* Schema of all editable content files. The editor renders forms from this. */
const VERTICAL_FIELDS = [
  { key: "name", type: "text", label: "Vertical name (shown in nav and footer)" },
  { key: "cardTitle", type: "text", label: "Card title on home page" },
  { key: "cardText", type: "textarea", label: "Card text on home page" },
  { key: "meta.title", type: "text", label: "Browser tab title (SEO)" },
  { key: "meta.description", type: "textarea", label: "Meta description (SEO)" },
  { key: "hero.eyebrow", type: "text", label: "Eyebrow" },
  { key: "hero.title", type: "html", label: "Main title" },
  { key: "hero.lede", type: "textarea", label: "Lede paragraph" },
  { key: "scenario.eyebrow", type: "text", label: "Scenario: eyebrow" },
  { key: "scenario.title", type: "html", label: "Scenario: title" },
  { key: "scenario.paragraphs", type: "list", label: "Scenario: paragraphs", item: [{ key: "", type: "textarea", label: "Paragraph" }] },
  { key: "value.eyebrow", type: "text", label: "Value: eyebrow" },
  { key: "value.title", type: "html", label: "Value: title" },
  { key: "value.items", type: "list", label: "Value: cards", item: [
    { key: "tag", type: "text", label: "Tag" },
    { key: "title", type: "text", label: "Title" },
    { key: "text", type: "textarea", label: "Text" }
  ]},
  { key: "deployment.eyebrow", type: "text", label: "Deployment: eyebrow" },
  { key: "deployment.title", type: "html", label: "Deployment: title" },
  { key: "deployment.paragraphs", type: "list", label: "Deployment: paragraphs", item: [{ key: "", type: "textarea", label: "Paragraph" }] },
  { key: "deployment.bullets", type: "list", label: "Deployment: bullets", item: [{ key: "", type: "textarea", label: "Bullet" }] },
  { key: "cta.title", type: "html", label: "CTA: title" },
  { key: "cta.lede", type: "textarea", label: "CTA: text" },
  { key: "cta.button", type: "text", label: "CTA: button" }
];

const CMS_SCHEMA = {
  "content/site.json": { label: "General settings", template: null, fields: [
    { key: "legalName", type: "text", label: "Legal name (footer)" },
    { key: "location", type: "text", label: "Location (footer and contact page)" },
    { key: "contactEmail", type: "text", label: "Contact email" },
    { key: "footerBlurb", type: "textarea", label: "Footer blurb" }
  ]},
  "content/home.json": { label: "Home page", template: "home", out: "index.html", fields: [
    { key: "meta.title", type: "text", label: "Tab title (SEO)" },
    { key: "meta.description", type: "textarea", label: "Meta description (SEO)" },
    { key: "hero.eyebrow", type: "text", label: "Hero: eyebrow" },
    { key: "hero.title", type: "html", label: "Hero: main title" },
    { key: "hero.lede", type: "textarea", label: "Hero: lede paragraph" },
    { key: "hero.cta1", type: "text", label: "Hero: primary button" },
    { key: "hero.cta2", type: "text", label: "Hero: secondary button" },
    { key: "hero.tags", type: "list", label: "Hero: tags", item: [{ key: "", type: "text", label: "Tag" }] },
    { key: "hero.sceneLabel", type: "text", label: "Hero: animation caption" },
    { key: "problem.eyebrow", type: "text", label: "Problem: eyebrow" },
    { key: "problem.title", type: "html", label: "Problem: title" },
    { key: "problem.lede", type: "textarea", label: "Problem: paragraph" },
    { key: "problem.stats", type: "list", label: "Problem: stats", item: [
      { key: "num", type: "html", label: "Number" },
      { key: "text", type: "textarea", label: "Explanation" }
    ]},
    { key: "platform.eyebrow", type: "text", label: "Platform: eyebrow" },
    { key: "platform.title", type: "html", label: "Platform: title" },
    { key: "platform.lede", type: "textarea", label: "Platform: paragraph" },
    { key: "platform.steps", type: "list", label: "Platform: steps", item: [
      { key: "k", type: "text", label: "Numbering (01 / ...)" },
      { key: "title", type: "text", label: "Title" },
      { key: "text", type: "textarea", label: "Text" }
    ]},
    { key: "platform.cta", type: "text", label: "Platform: button" },
    { key: "verticalsIntro.eyebrow", type: "text", label: "Verticals: eyebrow" },
    { key: "verticalsIntro.title", type: "html", label: "Verticals: title" },
    { key: "verticalsIntro.lede", type: "textarea", label: "Verticals: paragraph" },
    { key: "videos.eyebrow", type: "text", label: "Videos: eyebrow" },
    { key: "videos.title", type: "html", label: "Videos: title" },
    { key: "videos.items", type: "list", label: "Videos: items", item: [
      { key: "title", type: "text", label: "Title" },
      { key: "caption", type: "textarea", label: "Caption" },
      { key: "youtubeUrl", type: "url", label: "YouTube URL (or upload a GIF/image below)" },
      { key: "gif", type: "image", label: "GIF / image (used when no YouTube URL)" }
    ]},
    { key: "resilience.quote", type: "html", label: "Resilience: large quote" },
    { key: "resilience.lede", type: "textarea", label: "Resilience: paragraph" },
    { key: "resilience.bullets", type: "list", label: "Resilience: bullets", item: [{ key: "", type: "textarea", label: "Bullet" }] },
    { key: "press.eyebrow", type: "text", label: "Press: eyebrow" },
    { key: "press.title", type: "html", label: "Press: title" },
    { key: "press.items", type: "list", label: "Press: logos", item: [
      { key: "name", type: "text", label: "Name" },
      { key: "url", type: "url", label: "Link" }
    ]},
    { key: "press.cta", type: "text", label: "Press: button" },
    { key: "cta.eyebrow", type: "text", label: "Closing: eyebrow" },
    { key: "cta.title", type: "html", label: "Closing: title" },
    { key: "cta.lede", type: "textarea", label: "Closing: paragraph" },
    { key: "cta.button", type: "text", label: "Closing: button" }
  ]},
  "content/platform.json": { label: "Platform page", template: "platform", out: "platform.html", fields: [
    { key: "meta.title", type: "text", label: "Tab title (SEO)" },
    { key: "meta.description", type: "textarea", label: "Meta description (SEO)" },
    { key: "hero.eyebrow", type: "text", label: "Hero: eyebrow" },
    { key: "hero.title", type: "html", label: "Hero: title" },
    { key: "hero.lede", type: "textarea", label: "Hero: paragraph" },
    { key: "how.eyebrow", type: "text", label: "How it works: eyebrow" },
    { key: "how.title", type: "html", label: "How it works: title" },
    { key: "how.lede", type: "textarea", label: "How it works: paragraph" },
    { key: "how.steps", type: "list", label: "How it works: steps", item: [
      { key: "k", type: "text", label: "Numbering" },
      { key: "title", type: "text", label: "Title" },
      { key: "text", type: "textarea", label: "Text" }
    ]},
    { key: "principles.eyebrow", type: "text", label: "Principles: eyebrow" },
    { key: "principles.title", type: "html", label: "Principles: title" },
    { key: "principles.items", type: "list", label: "Principles: cards", item: [
      { key: "tag", type: "text", label: "Tag" },
      { key: "title", type: "text", label: "Title" },
      { key: "text", type: "textarea", label: "Text" }
    ]},
    { key: "integration.eyebrow", type: "text", label: "Integration: eyebrow" },
    { key: "integration.title", type: "html", label: "Integration: title" },
    { key: "integration.lede", type: "textarea", label: "Integration: paragraph" },
    { key: "integration.paths", type: "list", label: "Integration: paths", item: [
      { key: "tag", type: "text", label: "Tag" },
      { key: "title", type: "text", label: "Title" },
      { key: "text", type: "textarea", label: "Text" }
    ]},
    { key: "faq.eyebrow", type: "text", label: "FAQ: eyebrow" },
    { key: "faq.title", type: "html", label: "FAQ: title" },
    { key: "faq.items", type: "list", label: "FAQ items", item: [
      { key: "q", type: "text", label: "Question" },
      { key: "a", type: "textarea", label: "Answer" }
    ]},
    { key: "cta.title", type: "html", label: "Closing: title" },
    { key: "cta.lede", type: "textarea", label: "Closing: paragraph" },
    { key: "cta.button", type: "text", label: "Closing: button" }
  ]},
  "content/verticals/automotive.json":   { label: "Vertical: Automotive",    template: "vertical", out: "verticals/automotive.html",    fields: VERTICAL_FIELDS },
  "content/verticals/smart-cities.json": { label: "Vertical: Smart Cities",  template: "vertical", out: "verticals/smart-cities.html",  fields: VERTICAL_FIELDS },
  "content/verticals/industrial.json":   { label: "Vertical: Industrial",    template: "vertical", out: "verticals/industrial.html",    fields: VERTICAL_FIELDS },
  "content/verticals/public-safety.json":{ label: "Vertical: Public Safety", template: "vertical", out: "verticals/public-safety.html", fields: VERTICAL_FIELDS },
  "content/company.json": { label: "Company page", template: "company", out: "company.html", fields: [
    { key: "meta.title", type: "text", label: "Tab title (SEO)" },
    { key: "meta.description", type: "textarea", label: "Meta description (SEO)" },
    { key: "hero.eyebrow", type: "text", label: "Hero: eyebrow" },
    { key: "hero.title", type: "html", label: "Hero: title" },
    { key: "hero.lede", type: "textarea", label: "Hero: paragraph" },
    { key: "story.eyebrow", type: "text", label: "Story: eyebrow" },
    { key: "story.title", type: "html", label: "Story: title" },
    { key: "story.paragraphs", type: "list", label: "Story: paragraphs", item: [{ key: "", type: "textarea", label: "Paragraph" }] },
    { key: "heritage.quote", type: "html", label: "Heritage: quote" },
    { key: "heritage.lede", type: "textarea", label: "Heritage: paragraph" },
    { key: "heritage.bullets", type: "list", label: "Heritage: bullets", item: [{ key: "", type: "textarea", label: "Bullet" }] },
    { key: "teamIntro.eyebrow", type: "text", label: "Team: eyebrow" },
    { key: "teamIntro.title", type: "html", label: "Team: title" },
    { key: "teamIntro.lede", type: "textarea", label: "Team: paragraph" },
    { key: "team", type: "list", label: "Team members", item: [
      { key: "name", type: "text", label: "Name" },
      { key: "role", type: "text", label: "Role" },
      { key: "bio", type: "textarea", label: "Short bio" },
      { key: "photo", type: "image", label: "Photo" }
    ]},
    { key: "cta.title", type: "html", label: "Closing: title" },
    { key: "cta.lede", type: "textarea", label: "Closing: paragraph" },
    { key: "cta.button", type: "text", label: "Closing: button" }
  ]},
  "content/news.json": { label: "News page", template: "news", out: "news.html", fields: [
    { key: "meta.title", type: "text", label: "Tab title (SEO)" },
    { key: "meta.description", type: "textarea", label: "Meta description (SEO)" },
    { key: "hero.eyebrow", type: "text", label: "Hero: eyebrow" },
    { key: "hero.title", type: "html", label: "Hero: title" },
    { key: "hero.lede", type: "textarea", label: "Hero: paragraph" },
    { key: "items", type: "list", label: "News & press items", item: [
      { key: "date", type: "text", label: "Date (e.g. May 2026)" },
      { key: "title", type: "text", label: "Title" },
      { key: "source", type: "text", label: "Source (publication name / Viziblezone)" },
      { key: "url", type: "url", label: "Link (optional)" },
      { key: "summary", type: "textarea", label: "Summary" }
    ]},
    { key: "cta.title", type: "html", label: "Closing: title" },
    { key: "cta.lede", type: "textarea", label: "Closing: paragraph" },
    { key: "cta.button", type: "text", label: "Closing: button" }
  ]},
  "content/contact.json": { label: "Contact page", template: "contact", out: "contact.html", fields: [
    { key: "meta.title", type: "text", label: "Tab title (SEO)" },
    { key: "meta.description", type: "textarea", label: "Meta description (SEO)" },
    { key: "hero.eyebrow", type: "text", label: "Hero: eyebrow" },
    { key: "hero.title", type: "html", label: "Hero: title" },
    { key: "hero.lede", type: "textarea", label: "Hero: paragraph" },
    { key: "form.action", type: "url", label: "Form service URL (Formspree)" },
    { key: "form.topics", type: "list", label: "Inquiry topics", item: [{ key: "", type: "text", label: "Topic" }] },
    { key: "form.button", type: "text", label: "Submit button" }
  ]}
};
