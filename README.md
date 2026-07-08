# Viziblezone — Company Website

Multi-page static company site, built from JSON content + Mustache templates, deployed to GitHub Pages via GitHub Actions, and managed through a custom browser-based CMS.

## Structure
```
content/            All site copy as JSON (one file per page + site.json)
templates/          Mustache templates (base layout + one per page type)
assets/css/         Single brand stylesheet
assets/img/         Images uploaded via the CMS
build.js            Renders content + templates -> dist/
admin/editor.html   The CMS. Open locally in a browser. Not deployed.
admin/schema.js     Field definitions the CMS renders forms from
docs/               Planning documents (Hebrew)
.github/workflows/  Build & deploy to Pages on every push to main
```

## Local development
```
npm install
node build.js
npx http-server dist -p 8080
```

## Content editing
Open `admin/editor.html` in a browser, enter the repo details and a fine-grained GitHub token (Contents read/write, this repo only), load, edit, preview, publish. GitHub Actions rebuilds the live site in 1-2 minutes. Only `dist/` is deployed — the CMS and raw content are never publicly served.

**Confidentiality rule:** public wording is limited to "direct device-to-device", "no cellular dependency", "DMO-inspired". No physical-layer specifics and no range figures — in content, code, comments, or commit messages.

**Rule for developers:** when adding a content field or section to a template, update `admin/schema.js` in the same commit.
