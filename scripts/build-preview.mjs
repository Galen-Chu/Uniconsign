// 產生 dist/preview.html：一頁看完所有 token 與 icon，用來檢查一致性。
// 先跑 npm run build，再跑這支（npm run preview 會兩者一起跑）。
import { readFile, writeFile } from 'node:fs/promises';
import config from '../brand.config.mjs';

const css = await readFile('dist/tokens/tokens.css', 'utf8');
const { light, dark } = JSON.parse(await readFile('dist/tokens/tokens.json', 'utf8'));
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const icons = await import('../dist/icons/icons.js?' + Date.now());

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ids = Object.keys(light);
const group = (prefix) => ids.filter((id) => id.startsWith(prefix));
const cssVar = (id) => `var(--${id.replaceAll('.', '-')})`;

const scale = (prefix, render) => group(prefix).map((id) => render(id)).join('');

// 色票：語意色依角色分組標示，各類用能表達用途的樣式呈現
const cap = (id) => id.split('.').pop();
const fig = (id, inner, caption, value, prim = false) =>
  `<figure class="sw${prim ? ' prim' : ''}"${value ? ` title="${esc(`${id} = ${value}`)}"` : ''}>${inner}` +
  `<figcaption><code>${caption}</code>${prim && value ? `<small>${value}</small>` : ''}</figcaption></figure>`;
const blockSw = (id, caption) => fig(id, `<span class="box" style="background:${cssVar(id)}"></span>`, caption, light[id]);
const textSw = (id, caption) => {
  const onBrand = id.endsWith('on-brand'), onAccent = id.endsWith('on-accent'), link = id.endsWith('link');
  const bg = onBrand ? 'background:var(--color-bg-brand);' : onAccent ? 'background:var(--color-accent-default);' : '';
  return fig(id,
    `<span class="box"><span class="t" style="color:${cssVar(id)};${bg}${link ? 'text-decoration:underline' : ''}">文Aa</span></span>`,
    caption, light[id]);
};
const borderSw = (id, caption) =>
  fig(id, `<span class="box" style="border-color:${cssVar(id)};border-width:2px"></span>`, caption, light[id]);
const iconSw = (id, caption) =>
  fig(id, `<span class="box ic-box" style="color:${cssVar(id)}">${icons.check}</span>`, caption, light[id]);
// 半透明覆蓋色：左半疊淺色底、右半疊深色底，展示實際疊加效果
const dualSw = (id, caption) => {
  const dk = dark[id] ?? light[id];
  return fig(id,
    `<span class="dual"><i style="background:var(--color-neutral-0)"><b style="background:${light[id]}"></b></i>` +
    `<i style="background:var(--color-neutral-900)"><b style="background:${dk}"></b></i></span>`,
    caption, `淺 ${light[id]}／深 ${dk}`);
};

const semanticRows = [
  ['背景 bg', ['canvas', 'surface', 'sunken', 'brand', 'brand-subtle', 'disabled'].map((s) => 'color.bg.' + s), blockSw],
  ['狀態淡底', ['success-subtle', 'warning-subtle', 'danger-subtle', 'info-subtle'].map((s) => 'color.bg.' + s), blockSw],
  ['互動覆蓋（半透明）', ['hover', 'active', 'overlay'].map((s) => 'color.bg.' + s), dualSw],
  ['文字 text', ['primary', 'secondary', 'disabled', 'on-brand', 'on-accent', 'link'].map((s) => 'color.text.' + s), textSw],
  ['邊框 border', ['default', 'strong', 'focus'].map((s) => 'color.border.' + s), borderSw],
  ['圖示 icon', ['default', 'muted', 'brand'].map((s) => 'color.icon.' + s), iconSw],
  ['強調 accent', ['default', 'subtle'].map((s) => 'color.accent.' + s), blockSw],
  ['狀態 status', ['success', 'warning', 'danger', 'info'].map((s) => 'color.status.' + s), blockSw],
].map(([label, ids, render]) =>
  `<div class="sem-label">${label}</div><div class="sem-cells">${ids.map((id) => render(id, cap(id))).join('')}</div>`
).join('');

const primRows = [
  ['主色 brand', 'color.brand.'],
  ['輔色 cyan', 'color.cyan.'],
  ['輔色 yellow', 'color.yellow.'],
  ['危險 red', 'color.red.'],
  ['中性 neutral', 'color.neutral.'],
].map(([label, prefix]) =>
  `<div class="sem-label">${label}</div><div class="sem-cells">${
    group(prefix).map((id) => fig(id, `<span class="box" style="background:${cssVar(id)}"></span>`, cap(id), light[id], true)).join('')
  }</div>`
).join('');

const iconCell = (name, svg) => `
  <div class="ic">
    <div class="ic-sizes">${[16, 20, 24, 32].map((s) => `<span style="width:${s}px;height:${s}px">${svg}</span>`).join('')}</div>
    <div class="ic-big"><span>${svg}</span><i class="grid"></i></div>
    <code>${name}</code>
  </div>`;

const camel = (n) => n.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const CATEGORY_LABELS = { math: '數學符號', philosophy: '哲學符號', science: '科學符號', dao: '道學符號', law: '法學符號', human: '人學符號', theology: '神學符號' };
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
.sem-grid { display: grid; grid-template-columns: 120px 1fr; gap: var(--space-3) var(--space-4); align-items: start; }
.sem-label { font-size: var(--font-size-xs); color: var(--color-text-secondary); padding-top: 14px; text-align: right; }
.sem-cells { display: flex; flex-wrap: wrap; gap: var(--space-3); }
.sw { margin: 0; width: 112px; font-size: var(--font-size-xs); }
.sw.prim { width: 132px; }
.sw .box { display: flex; align-items: center; justify-content: center; height: 48px; border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default); }
.sw .t { font-size: var(--font-size-md); font-weight: var(--font-weight-medium); }
.sw .ic-box svg { width: 20px; height: 20px; display: block; }
.sw .dual { display: flex; height: 48px; border-radius: var(--radius-md); border: 1px solid var(--color-border-default); overflow: hidden; }
.sw .dual i { flex: 1; position: relative; display: block; }
.sw .dual i + i { border-left: 1px solid var(--color-border-default); }
.sw .dual b { position: absolute; inset: 0; display: block; }
.sw figcaption { margin-top: var(--space-1); display: flex; justify-content: space-between; gap: var(--space-2); }
.sw small { color: var(--color-text-secondary); font-family: var(--font-family-mono); }
@media (max-width: 720px) { .sem-grid { grid-template-columns: 1fr; } .sem-label { text-align: left; padding-top: 0; } }
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
.btn-disabled { background: var(--color-bg-disabled); border-color: transparent; color: var(--color-text-disabled); }
.btn-primary svg { width: 1em; height: 1em; vertical-align: -0.125em; }
.demo-actions { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
.demo-actions a { color: var(--color-text-link); font-size: var(--font-size-sm); }
.alert { display: flex; align-items: baseline; gap: var(--space-2); font-size: var(--font-size-sm); padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md); }
.alert b { font-weight: var(--font-weight-medium); }
.alert-success { background: var(--color-bg-success-subtle); color: var(--color-status-success); }
.alert-info { background: var(--color-bg-info-subtle); color: var(--color-status-info); }
.alert-warning { background: var(--color-bg-warning-subtle); color: var(--color-status-warning); }
.alert-danger { background: var(--color-bg-danger-subtle); color: var(--color-status-danger); }
.badge { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-xs); font-weight: var(--font-weight-medium);
  background: var(--color-bg-sunken); color: var(--color-text-primary); border-radius: var(--radius-full); padding: var(--space-1) var(--space-3); }
.badge i { width: 8px; height: 8px; border-radius: var(--radius-full); }
.demo-search { position: relative; }
.demo-search svg { position: absolute; left: var(--space-3); top: 50%; translate: 0 -50%; width: 16px; height: 16px; color: var(--color-icon-muted); }
.demo-search input { width: 100%; padding-left: var(--space-8); }
.demo-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); font-size: var(--font-size-sm); }
.demo-list li { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-default); border-radius: var(--radius-md); }
.demo-list li:hover { background: var(--color-bg-hover); }
.demo-list li:active { background: var(--color-bg-active); }
.demo-list svg { width: 16px; height: 16px; color: var(--color-icon-brand); flex: none; }
</style>
</head>
<body>
<header>
  <h1>Uniconsign</h1>
  <code class="ver">v${version}</code>
  <button type="button" id="grid">顯示網格</button>
  <button type="button" id="theme">切換深色</button>
</header>

<section>
  <h2>顏色</h2>
  <h3>語意色（專案只用這一層）</h3>
  <div class="sem-grid">${semanticRows}</div>
  <h3>原始色階（組出語意層的原料）</h3>
  <div class="sem-grid">${primRows}</div>
</section>

<section>
  <h2>字級</h2>
  <div class="type">${scale('font.size.', (id) => `<p style="font-size:${cssVar(id)}">${id.split('.').pop()} · ${light[id]} — 一致的系統讓每個專案都像同一家人</p>`)}</div>
</section>

<section>
  <h2>間距與圓角</h2>
  <div style="display:grid;gap:var(--space-2)">${scale('space.', (id) => `<div class="space"><code style="width:48px">${id.split('.').pop()}</code><b style="width:${light[id]}"></b><code>${light[id]}</code></div>`)}</div>
  <h3>圓角</h3><div class="row">${scale('radius.', (id) => `<div class="radius" style="border-radius:${cssVar(id)}">${id.split('.').pop()}</div>`)}</div>
</section>

<section>
  <h2>UI icon</h2>
  <h3>基礎符號</h3>
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
        <button type="button" disabled class="btn-disabled">已停用</button>
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
