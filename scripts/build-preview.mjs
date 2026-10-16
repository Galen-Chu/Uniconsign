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

const uiCells = icons.uiIconNames.map((n) => iconCell(n, icons[n.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())])).join('');
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
  <h3>輔色</h3><div class="row">${swatches('color.gold.')}</div>
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
  <p class="inline">放在文字中的樣子：搜尋 ${icons.search} 新增 ${icons.plus} 完成 ${icons.check}</p>
  <div class="ics">${uiCells}</div>
  <h3>品牌符號</h3>
  <div class="ics">${brandCells}</div>
</section>

<script>
  const root = document.documentElement;
  document.getElementById('grid').onclick = () => document.body.classList.toggle('show-grid');
  document.getElementById('theme').onclick = () => {
    const dark = root.dataset.theme === 'dark' ||
      (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'light' : 'dark';
  };
</script>
</body>
</html>
`;
await writeFile('dist/preview.html', html);
console.log(`✓ 預覽頁 → dist/preview.html（prefix: ${config.prefix}）`);
