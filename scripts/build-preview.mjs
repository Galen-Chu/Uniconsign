// 產生 dist/preview.html：一頁看完所有 token 與 icon，用來檢查一致性。
// 先跑 npm run build，再跑這支（npm run preview 會兩者一起跑）。
import { readFile, writeFile } from 'node:fs/promises';
import config from '../brand.config.mjs';

const css = await readFile('dist/tokens/tokens.css', 'utf8');
const { light } = JSON.parse(await readFile('dist/tokens/tokens.json', 'utf8'));
const icons = await import('../dist/icons/icons.js?' + Date.now());

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ids = Object.keys(light);
const group = (prefix) => ids.filter((id) => id.startsWith(prefix));
const cssVar = (id) => `var(--${id.replaceAll('.', '-')})`;

const swatches = (prefix, strip = prefix) =>
  group(prefix)
    .map((id) => `<figure class="sw"><span style="background:${cssVar(id)}"></span><figcaption>${id.slice(strip.length)}<small>${light[id]}</small></figcaption></figure>`)
    .join('');

const scale = (prefix, render) => group(prefix).map((id) => render(id)).join('');

const iconCell = (name, svg) => `
  <div class="ic">
    <div class="ic-sizes">${[16, 20, 24, 32].map((s) => `<span style="width:${s}px;height:${s}px">${svg}</span>`).join('')}</div>
    <div class="ic-big"><span>${svg}</span><i class="grid"></i></div>
    <code>${name}</code>
  </div>`;

const camel = (n) => n.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const CATEGORY_LABELS = { math: '數學符號', philosophy: '哲學符號', science: '科學符號', dao: '道學符號', law: '法學符號', theology: '神學符號' };
const uiCells = icons.uiIconNames.map((n) => iconCell(n, icons[camel(n)])).join('');
const symbolSections = Object.entries(icons.symbolCategories)
  .map(([cat, names]) => `<h3>${CATEGORY_LABELS[cat] ?? cat}</h3><div class="ics">${names.map((n) => iconCell(n, icons[camel(n)])).join('')}</div>`)
  .join('');
const brandCells = icons.brandIconNames
  .map((n) => iconCell(n, icons['brand' + n.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase())]))
  .join('');

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Uniconsign preview</title>
<style>
${css}
* { box-sizing: border-box; }
body { margin: 0; background: var(--color-bg-canvas); color: var(--color-text-primary);
  font-family: var(--font-family-sans); font-size: var(--font-size-md); line-height: var(--font-line-height-normal); }
header, section { max-width: 1100px; margin: 0 auto; padding: var(--space-8) var(--space-6); }
header { display: flex; align-items: center; gap: var(--space-4); border-bottom: 1px solid var(--color-border-default); }
header h1 { font-size: var(--font-size-2xl); line-height: var(--font-line-height-tight); margin: 0; flex: 1; }
h2 { font-size: var(--font-size-xl); margin: 0 0 var(--space-4); }
h3 { font-size: var(--font-size-sm); color: var(--color-text-secondary); font-weight: var(--font-weight-medium); margin: var(--space-6) 0 var(--space-3); }
button { font: inherit; font-size: var(--font-size-sm); color: var(--color-text-primary); background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default); border-radius: var(--radius-md); padding: var(--space-2) var(--space-3); cursor: pointer; }
button:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }
.row { display: flex; flex-wrap: wrap; gap: var(--space-3); }
.sw { margin: 0; width: 132px; font-size: var(--font-size-xs); }
.sw span { display: block; height: 56px; border-radius: var(--radius-md); border: 1px solid var(--color-border-default); }
.sw figcaption { margin-top: var(--space-1); display: flex; justify-content: space-between; }
.sw small { color: var(--color-text-secondary); font-family: var(--font-family-mono); }
.space { display: flex; align-items: center; gap: var(--space-3); font-size: var(--font-size-xs); }
.space b { display: block; height: 12px; background: var(--color-bg-brand); border-radius: 2px; }
.radius { width: 72px; height: 72px; background: var(--color-bg-brand-subtle); border: 1px solid var(--color-border-strong);
  display: grid; place-items: center; font-size: var(--font-size-xs); }
.type p { margin: 0 0 var(--space-2); }
.ics { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--space-3); }
.ic { background: var(--color-bg-surface); border: 1px solid var(--color-border-default); border-radius: var(--radius-lg);
  padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); align-items: center; color: var(--color-icon-default); }
.ic-sizes { display: flex; align-items: end; gap: var(--space-3); }
.ic-sizes span, .ic-big span { display: block; }
.ic-sizes svg, .ic-big svg { width: 100%; height: 100%; display: block; }
.ic-big { position: relative; width: 96px; height: 96px; }
.ic-big span { width: 96px; height: 96px; }
.grid { position: absolute; inset: 0; pointer-events: none; display: none;
  background-image: linear-gradient(to right, var(--color-accent-default) 1px, transparent 1px),
                    linear-gradient(to bottom, var(--color-accent-default) 1px, transparent 1px);
  background-size: 4px 4px; opacity: .25; outline: 8px solid color-mix(in srgb, var(--color-accent-default) 20%, transparent); outline-offset: -8px; }
body.show-grid .grid { display: block; }
code { font-family: var(--font-family-mono); font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.inline { font-size: var(--font-size-lg); }
.inline svg { width: 1em; height: 1em; vertical-align: -0.125em; color: var(--color-icon-brand); }
.demo { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-4); }
.demo-card { background: var(--color-bg-surface); border: 1px solid var(--color-border-default); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md); padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4); }
.demo-card h3 { margin: 0; }
.demo-card label { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.demo-card input { font: inherit; color: var(--color-text-primary); background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default); border-radius: var(--radius-md); padding: var(--space-2) var(--space-3); }
.demo-card input::placeholder { color: var(--color-text-disabled); }
.demo-card input:focus { outline: 2px solid var(--color-border-focus); outline-offset: -1px; border-color: var(--color-border-focus); }
.btn-primary { background: var(--color-bg-brand); border-color: var(--color-bg-brand); color: var(--color-text-on-brand); font-weight: var(--font-weight-medium); }
.btn-primary:hover { background: var(--color-brand-700); border-color: var(--color-brand-700); }
.btn-primary svg { width: 1em; height: 1em; vertical-align: -0.125em; }
.demo-actions { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
.demo-actions a { color: var(--color-text-link); font-size: var(--font-size-sm); }
.alert { display: flex; align-items: baseline; gap: var(--space-2); font-size: var(--font-size-sm); padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md); }
.alert b { font-weight: var(--font-weight-medium); }
.alert-success { background: color-mix(in srgb, var(--color-status-success) 12%, var(--color-bg-surface)); color: var(--color-status-success); }
.alert-info { background: color-mix(in srgb, var(--color-status-info) 12%, var(--color-bg-surface)); color: var(--color-status-info); }
.alert-warning { background: color-mix(in srgb, var(--color-status-warning) 14%, var(--color-bg-surface)); color: var(--color-status-warning); }
.alert-danger { background: color-mix(in srgb, var(--color-status-danger) 12%, var(--color-bg-surface)); color: var(--color-status-danger); }
.badge { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);
  background: var(--color-bg-sunken); color: var(--color-text-primary); border-radius: var(--radius-full); padding: var(--space-1) var(--space-3); }
.badge i { width: 8px; height: 8px; border-radius: var(--radius-full); }
.demo-search { position: relative; }
.demo-search svg { position: absolute; left: var(--space-3); top: 50%; translate: 0 -50%; width: 16px; height: 16px; color: var(--color-icon-muted); }
.demo-search input { width: 100%; padding-left: var(--space-8); }
.demo-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); font-size: var(--font-size-sm); }
.demo-list li { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-default); border-radius: var(--radius-md); }
.demo-list svg { width: 16px; height: 16px; color: var(--color-icon-brand); flex: none; }
</style>
</head>
<body>
<header>
  <h1>Uniconsign</h1>
  <button type="button" id="grid">顯示網格</button>
  <button type="button" id="theme">切換深色</button>
</header>

<section>
  <h2>顏色</h2>
  <h3>語意色（專案只用這一層）</h3><div class="row">${swatches('color.bg.', 'color.')}${swatches('color.text.', 'color.')}</div>
  <div class="row" style="margin-top:var(--space-3)">${swatches('color.border.', 'color.')}${swatches('color.icon.', 'color.')}${swatches('color.accent.', 'color.')}${swatches('color.status.', 'color.')}</div>
  <h3>主色</h3><div class="row">${swatches('color.brand.')}</div>
  <h3>輔色</h3><div class="row">${swatches('color.cyan.')}${swatches('color.yellow.')}</div>
  <h3>中性色</h3><div class="row">${swatches('color.neutral.')}</div>
</section>

<section>
  <h2>文字</h2>
  <div class="type">${scale('font.size.', (id) => `<p style="font-size:${cssVar(id)}">${id.split('.').pop()} · ${light[id]} — 一致的系統讓每個專案都像同一家人</p>`)}</div>
</section>

<section>
  <h2>間距與圓角</h2>
  <div style="display:grid;gap:var(--space-2)">${scale('space.', (id) => `<div class="space"><code style="width:48px">${id.split('.').pop()}</code><b style="width:${light[id]}"></b><code>${light[id]}</code></div>`)}</div>
  <h3>圓角</h3><div class="row">${scale('radius.', (id) => `<div class="radius" style="border-radius:${cssVar(id)}">${id.split('.').pop()}</div>`)}</div>
</section>

<section>
  <h2>UI icon</h2>
  <p class="inline">放在文字中的樣子：搜尋 ${icons.search} 新增 ${icons.plus} 完成 ${icons.check} 無限 ${icons.infinity}</p>
  <div class="ics">${uiCells}</div>
  ${symbolSections}
  <h3>品牌符號</h3>
  <div class="ics">${brandCells}</div>
</section>

<section>
  <h2>元件示範</h2>
  <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin:0 0 var(--space-4)">以下元件只用語意層 token 組成，用上方按鈕切換深色模式看看兩種模式的效果。</p>
  <div class="demo">
    <div class="demo-card">
      <h3>帳號登入</h3>
      <label>電子郵件 <input type="email" placeholder="you@example.com"></label>
      <label>密碼 <input type="password" placeholder="請輸入密碼"></label>
      <div class="demo-actions">
        <button type="button" class="btn-primary">${icons.arrowRight} 登入</button>
        <button type="button">取消</button>
        <a href="#" onclick="return false">忘記密碼？</a>
      </div>
    </div>
    <div class="demo-card">
      <h3>系統訊息</h3>
      <div class="alert alert-success"><b>已儲存。</b>變更會同步到所有裝置。</div>
      <div class="alert alert-info"><b>有新版可取得。</b>詳情請見更新紀錄。</div>
      <div class="alert alert-warning"><b>儲存空間不足。</b>即將到達上限。</div>
      <div class="alert alert-danger"><b>連線中斷。</b>請檢查網路後重試。</div>
      <div class="demo-actions">
        <span class="badge"><i style="background:var(--color-status-success)"></i>運作中</span>
        <span class="badge"><i style="background:var(--color-status-warning)"></i>維護中</span>
        <span class="badge"><i style="background:var(--color-accent-default)"></i>新功能</span>
      </div>
    </div>
    <div class="demo-card">
      <h3>搜尋與清單</h3>
      <div class="demo-search">${icons.search}<input type="search" placeholder="搜尋功能…"></div>
      <ul class="demo-list">
        <li>${icons.check}Design tokens（顏色、間距、字級）</li>
        <li>${icons.check}UI icon 與品牌符號</li>
        <li>${icons.arrowRight}深色模式支援</li>
      </ul>
    </div>
  </div>
</section>

<script>
  const root = document.documentElement;
  const forced = new URLSearchParams(location.search).get('theme');
  if (forced === 'dark' || forced === 'light') root.dataset.theme = forced;
  const isDark = () => root.dataset.theme === 'dark' ||
    (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  const themeBtn = document.getElementById('theme');
  const gridBtn = document.getElementById('grid');
  const syncThemeLabel = () => { themeBtn.textContent = isDark() ? '切換淺色' : '切換深色'; };
  themeBtn.onclick = () => { root.dataset.theme = isDark() ? 'light' : 'dark'; syncThemeLabel(); };
  gridBtn.onclick = () => {
    const shown = document.body.classList.toggle('show-grid');
    gridBtn.textContent = shown ? '隱藏網格' : '顯示網格';
  };
  syncThemeLabel();
</script>
</body>
</html>
`;
await writeFile('dist/preview.html', html);
console.log(`✓ 預覽頁 → dist/preview.html（prefix: ${config.prefix}）`);
