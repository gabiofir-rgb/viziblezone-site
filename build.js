/* Viziblezone site builder: content/*.json + templates/*.mustache -> dist/ */
const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');

const read = p => fs.readFileSync(p, 'utf8');
const json = p => JSON.parse(read(p));

/* Extract an 11-char YouTube video ID from any URL form (youtu.be/ID,
   watch?v=ID, embed/ID, shorts/ID) or a bare ID. Returns "" if none. */
const ytId = u => {
  const s = String(u || '').trim();
  const m = s.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{11}$/.test(s) ? s : '';
};

const OUT = 'dist';
const site = json('content/site.json');
const base = read('templates/base.mustache');

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'verticals'), { recursive: true });
fs.cpSync('assets', path.join(OUT, 'assets'), { recursive: true });

const verticals = site.verticalSlugs.map(slug => ({ slug, ...json(`content/verticals/${slug}.json`) }));

function build(tpl, data, outFile, depth) {
  const partials = { content: read(`templates/${tpl}.mustache`) };
  const view = { site, depth, verticals, year: new Date().getFullYear(), ...data };
  if (view.page && view.page.videos && Array.isArray(view.page.videos.items)) {
    view.page.videos.items = view.page.videos.items.map(it => ({ ...it, videoId: ytId(it.youtubeUrl) }));
  }
  ['platform','verticals','company','news','contact'].forEach(k => {
    view['is' + k[0].toUpperCase() + k.slice(1)] = data.active === k;
  });
  const html = Mustache.render(base, view, partials);
  fs.writeFileSync(path.join(OUT, outFile), html);
  console.log('built', outFile);
}

build('home',     { page: json('content/home.json'),     active: 'home' },     'index.html',   '');
build('platform', { page: json('content/platform.json'), active: 'platform' }, 'platform.html','');
verticals.forEach(v =>
  build('vertical', { page: v, active: 'verticals' }, `verticals/${v.slug}.html`, '../'));
build('company',  { page: json('content/company.json'),  active: 'company' },  'company.html', '');
build('news',     { page: json('content/news.json'),     active: 'news' },     'news.html',    '');
build('contact',  { page: json('content/contact.json'),  active: 'contact' },  'contact.html', '');

console.log('done.');
