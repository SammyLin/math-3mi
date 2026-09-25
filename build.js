// 把 public/ 和根目錄的圖示、robots 組成 dist/,同時從同一份 index.html
// 產出三個網址:/ 是總覽,/add/ 和 /sub/ 各自針對一種題型。
//   node build.js && npx wrangler pages deploy dist --project-name=math-3mi
// index.html 裡的 {{...}} 由這裡填,<!--only:x-->...<!--/only:x--> 只留該頁那塊。
const fs = require('fs');
const path = require('path');

const SITE = 'https://math.3mi.ai';
const PAGES = [
  {
    out: 'index.html', keep: 'home', type: '', url: `${SITE}/`,
    hero: '直式<span>減法填空</span>',
    title: '數學小練習｜國小直式加減法填空練習題、可列印',
    ogtitle: '數學小練習:國小直式計算,隨機出題',
    desc: '免費國小數學練習:直式加法、減法填空隨機出題,可選 2 到 4 位數、要不要進位或借位,線上對答案,也能直接列印成練習卷。',
  },
  {
    out: 'add/index.html', keep: 'add', type: 'add-fill', url: `${SITE}/add/`,
    hero: '直式<span>加法填空</span>',
    title: '直式加法練習題(進位)｜國小數學直式加法填空、線上出題',
    ogtitle: '直式加法填空:進位怎麼算,一步一步看',
    desc: '免費國小直式加法練習:隨機出題,每一個直欄都挖一格,可選 2 到 4 位數與要不要進位,附一步一步的進位動畫教學。',
  },
  {
    out: 'sub/index.html', keep: 'sub', type: 'sub-fill', url: `${SITE}/sub/`,
    hero: '直式<span>減法填空</span>',
    title: '直式減法練習題(借位)｜國小數學直式減法填空、線上出題',
    ogtitle: '直式減法填空:借位怎麼算,一步一步看',
    desc: '免費國小直式減法練習:隨機出題,每一個直欄都挖一格,可選 2 到 4 位數與要不要借位,附一步一步的借位動畫教學。',
  },
];
const ROOT_FILES = ['robots.txt', 'favicon.svg', 'og.png', 'apple-touch-icon.png'];

const dist = 'dist';
fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync('public', dist, { recursive: true, filter: f => path.basename(f) !== 'index.html' });
ROOT_FILES.forEach(f => fs.copyFileSync(f, path.join(dist, f)));

const tpl = fs.readFileSync('public/index.html', 'utf8');
const KEEPS = PAGES.map(p => p.keep);

for (const p of PAGES) {
  let html = tpl;
  for (const k of KEEPS) {
    const block = new RegExp(`<!--only:${k}-->[\\s\\S]*?<!--/only:${k}-->`, 'g');
    html = k === p.keep ? html.replace(new RegExp(`<!--/?only:${k}-->`, 'g'), '') : html.replace(block, '');
  }
  html = html
    .replace(/{{TITLE}}/g, p.title)
    .replace(/{{OGTITLE}}/g, p.ogtitle)
    .replace(/{{DESC}}/g, p.desc)
    .replace(/{{URL}}/g, p.url)
    .replace(/{{HERO}}/g, p.hero)
    .replace(/{{TYPEATTR}}/g, p.type ? ` data-type="${p.type}"` : '');
  if (html.includes('{{')) throw new Error(`${p.out} 還有沒填掉的佔位符`);
  const dest = path.join(dist, p.out);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
}

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  PAGES.map(p => `  <url><loc>${p.url}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
  `\n</urlset>\n`);

console.log('built', PAGES.map(p => p.url).join(' '));
