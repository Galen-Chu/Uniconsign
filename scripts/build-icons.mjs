// 從 icons/ui 與 icons/brand 的 SVG 原始檔產生：
//   dist/icons/svg/        最佳化後的 SVG
//   dist/icons/sprite.svg  <symbol> sprite
//   dist/icons/icons.js    原始 SVG 字串（給 Vue、Svelte、純 JS 使用）
//   dist/icons/react/      React 元件（可 tree-shake）
//   dist/icons/font/       icon font（僅 UI icon）
import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { optimize } from 'svgo';
import { transform as svgr } from '@svgr/core';
import { transform as esbuild } from 'esbuild';
import { generateFonts, FontAssetType, OtherAssetType } from 'fantasticon';
import config from '../brand.config.mjs';
import { lintIcons } from './lint-icons.mjs';

// fantasticon 內部用 glob 掃描輸入資料夾，但 glob 在 Windows 上預設把路徑中的
// 反斜線當成跳脫字元，path.join 出來的 pattern 會一個檔案都匹配不到。
// 先補上 windowsPathsNoEscape 再呼叫 generateFonts（在 Linux 上是 no-op）。
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const globModule = require('glob');
if (typeof globModule.glob === 'function' && !globModule.glob.__winPathsPatched) {
  const originalGlob = globModule.glob;
  const patchedGlob = (pattern, opts = {}) => originalGlob(pattern, { windowsPathsNoEscape: true, ...opts });
  patchedGlob.__winPathsPatched = true;
  globModule.glob = patchedGlob;
}

const OUT = 'dist/icons';
const CODEPOINTS_FILE = 'icons/codepoints.json';

// ---- 0. 先檢查 ----
const problems = await lintIcons();
if (problems.length) {
  console.error(`✗ icon 檢查未通過，停止 build：\n  ` + problems.join('\n  '));
  process.exit(1);
}

await rm(OUT, { recursive: true, force: true });
for (const d of ['svg/ui', 'svg/symbols', 'svg/font', 'svg/brand', 'react', 'font']) await mkdir(path.join(OUT, d), { recursive: true });

// ---- 1. SVGO 設定 ----
// UI：去掉所有顏色，根節點設 fill="currentColor"，顏色交給外層 CSS 控制
const uiSvgo = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: { overrides: { removeViewBox: false, removeUselessStrokeAndFill: { removeNone: true } } },
    },
    'removeDimensions',
    { name: 'removeAttrs', params: { attrs: ['fill', 'stroke', 'class', 'data-name', 'id'] } },
    { name: 'addAttributesToSVGElement', params: { attributes: [{ fill: 'currentColor' }] } },
  ],
};
// Brand：保留原色，只做最佳化；id 加前綴避免多個符號放在同一頁時互相衝突
const brandSvgo = (name) => ({
  multipass: true,
  plugins: [
    { name: 'preset-default', params: { overrides: { removeViewBox: false } } },
    'removeDimensions',
    { name: 'prefixIds', params: { prefix: `${config.prefix}-${name}`, delim: '-' } },
  ],
});

const pascal = (s) => s.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

// ---- 2. 讀取並最佳化 ----
const icons = []; // { kind, category, name, svg, viewBox, inner }
const readDir = async (kind, dir, category = null) => {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.svg')).sort();
  for (const f of files) {
    const name = f.replace(/\.svg$/, '');
    const raw = await readFile(path.join(dir, f), 'utf8');
    const { data } = optimize(raw, kind === 'brand' ? brandSvgo(name) : uiSvgo);
    const viewBox = data.match(/viewBox="([^"]+)"/)[1];
    const inner = data.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    icons.push({ kind, category, name, svg: data, viewBox, inner });
    const outDir = path.join(OUT, 'svg', kind, ...(category ? [category] : []));
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, f), data);
    // icon font 只吃單一目錄，UI 與符號的 SVG 另外集中一份
    if (kind !== 'brand') await writeFile(path.join(OUT, 'svg', 'font', f), data);
  }
};
await readDir('ui', 'icons/ui');
const categories = (await readdir('icons/symbols', { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
for (const category of categories) await readDir('symbols', path.join('icons/symbols', category), category);
await readDir('brand', 'icons/brand');
const ui = icons.filter((i) => i.kind === 'ui');
const symbolIcons = icons.filter((i) => i.kind === 'symbols');
const brand = icons.filter((i) => i.kind === 'brand');

// 語意排序：icons/order.json 定義同類內的相鄰順序；未列出的排後面（依字母）
let order = {};
try {
  order = JSON.parse(await readFile('icons/order.json', 'utf8'));
} catch {}
const sortNames = (names, preferred) => [
  ...(preferred ?? []).filter((n) => names.includes(n)),
  ...names.filter((n) => !(preferred ?? []).includes(n)).sort(),
];
const categoryOrder = [
  ...Object.keys(order).filter((c) => categories.includes(c)),
  ...categories.filter((c) => !(c in order)),
];

// ---- 3. Sprite ----
const symbols = icons
  .map((i) => `<symbol id="${config.prefix}-${i.kind === 'brand' ? 'brand-' : ''}${i.name}" viewBox="${i.viewBox}">${i.inner}</symbol>`)
  .join('');
await writeFile(path.join(OUT, 'sprite.svg'), `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols}</svg>\n`);

// ---- 4. 原始字串（框架無關） ----
const jsName = (i) => (i.kind === 'brand' ? camel(`brand-${i.name}`) : camel(i.name));
await writeFile(
  path.join(OUT, 'icons.js'),
  '// 由 scripts/build-icons.mjs 產生\n' +
    icons.map((i) => `export const ${jsName(i)} = ${JSON.stringify(i.svg)};`).join('\n') +
    `\nexport const uiIconNames = ${JSON.stringify(sortNames(ui.map((i) => i.name), order.ui))};\n` +
    `\nexport const symbolCategories = ${JSON.stringify(
      Object.fromEntries(
        categoryOrder.map((c) => [c, sortNames(symbolIcons.filter((s) => s.category === c).map((s) => s.name), order[c])])
      )
    )};\n` +
    `\nexport const brandIconNames = ${JSON.stringify(sortNames(brand.map((i) => i.name), order.brand))};\n`
);
await writeFile(
  path.join(OUT, 'icons.d.ts'),
  icons.map((i) => `export declare const ${jsName(i)}: string;`).join('\n') +
    `\nexport declare const uiIconNames: string[];\nexport declare const symbolCategories: Record<string, string[]>;\nexport declare const brandIconNames: string[];\n`
);

// ---- 5. React 元件 ----
// 用法：<IconPlus size={20} title="新增" />；沒給 title 時自動 aria-hidden
const template = ({ componentName, jsx }, { tpl }) => tpl`
import * as React from 'react';
const ${componentName} = React.forwardRef(({ size = 24, title, titleId, ...props }, ref) => ${jsx});
${componentName}.displayName = ${JSON.stringify(componentName)};
export default ${componentName};
`;

const exportsJs = [];
const exportsDts = [];
for (const i of icons) {
  const componentName = config.componentPrefix[i.kind] + pascal(i.name);
  const jsx = await svgr(
    i.svg,
    {
      plugins: ['@svgr/plugin-jsx'],
      ref: true,
      titleProp: true,
      expandProps: 'end',
      template,
      svgProps: {
        width: '{size}',
        height: '{size}',
        focusable: 'false',
        'aria-hidden': '{title ? undefined : true}',
        role: '{title ? "img" : undefined}',
      },
    },
    { componentName }
  );
  const { code } = await esbuild(jsx, { loader: 'jsx', format: 'esm', jsx: 'transform' });
  await writeFile(path.join(OUT, 'react', `${componentName}.js`), code);
  exportsJs.push(`export { default as ${componentName} } from './${componentName}.js';`);
  exportsDts.push(`export declare const ${componentName}: IconComponent;`);
}
await writeFile(path.join(OUT, 'react', 'index.js'), exportsJs.join('\n') + '\n');
await writeFile(
  path.join(OUT, 'react', 'index.d.ts'),
  `import type * as React from 'react';\n` +
    `export interface IconProps extends React.SVGProps<SVGSVGElement> { size?: number | string; title?: string; titleId?: string; }\n` +
    `export type IconComponent = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;\n` +
    exportsDts.join('\n') + '\n'
);

// ---- 6. Icon font（UI icon 與符號）----
// codepoint 存在 repo 裡，新增 icon 只會往後加，既有 icon 的 codepoint 永遠不變
const fontPool = [...ui, ...symbolIcons];
let codepoints = {};
try {
  codepoints = JSON.parse(await readFile(CODEPOINTS_FILE, 'utf8'));
} catch {}
let next = Math.max(config.codepointStart - 1, ...Object.values(codepoints)) + 1;
for (const i of fontPool) if (!(i.name in codepoints)) codepoints[i.name] = next++;
const removed = Object.keys(codepoints).filter((n) => !fontPool.some((i) => i.name === n));
if (removed.length) console.warn(`! 以下 icon 已刪除，codepoint 保留不重複使用：${removed.join(', ')}`);
// codepoints.json 依「UI → 各類別（order.json 順序）→ 已移除」排序輸出；字碼值永不改變
const orderedNames = [
  ...sortNames(ui.map((i) => i.name), order.ui),
  ...categoryOrder.flatMap((c) => sortNames(symbolIcons.filter((s) => s.category === c).map((s) => s.name), order[c])),
  ...removed.sort(),
];
await writeFile(CODEPOINTS_FILE, JSON.stringify(Object.fromEntries(orderedNames.map((n) => [n, codepoints[n]])), null, 2) + '\n');

await generateFonts({
  inputDir: path.join(OUT, 'svg', 'font'),
  outputDir: path.join(OUT, 'font'),
  name: config.fontName,
  prefix: config.prefix,
  tag: 'i',
  fontTypes: [FontAssetType.WOFF2, FontAssetType.WOFF],
  assetTypes: [OtherAssetType.CSS, OtherAssetType.JSON, OtherAssetType.HTML],
  codepoints: Object.fromEntries(Object.entries(codepoints).filter(([n]) => fontPool.some((i) => i.name === n))),
  normalize: true,
  fontHeight: 1000,
  descent: 125,
});

console.log(
  `✓ icons：${ui.length} 個 UI、${symbolIcons.length} 個符號（${categories.length} 類）、${brand.length} 個 brand → ${OUT}/（svg、sprite、icons.js、react、font）`
);
