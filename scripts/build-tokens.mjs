// 讀取 tokens/*.json（W3C Design Tokens 格式），輸出 CSS 變數、JS、扁平 JSON。
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'tokens';
const OUT = 'dist/tokens';
const REF = /\{([^}]+)\}/g;
const GENERIC_FONTS = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace']);

// ---- 1. 讀取並攤平成 { "color.brand.500": { value, type, dark } } ----
const tokens = new Map();

function walk(node, trail, inheritedType) {
  const type = node.$type ?? inheritedType;
  if ('$value' in node) {
    const id = trail.join('.');
    if (tokens.has(id)) throw new Error(`token 重複定義：${id}`);
    tokens.set(id, { value: node.$value, type, dark: node.$extensions?.mode?.dark });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    walk(child, [...trail, key], type);
  }
}

const files = (await readdir(SRC)).filter((f) => f.endsWith('.json')).sort();
for (const f of files) walk(JSON.parse(await readFile(path.join(SRC, f), 'utf8')), [], undefined);

// ---- 2. 解析引用 {color.brand.500} ----
function resolve(value, mode, seen = []) {
  if (typeof value !== 'string') return value;
  const whole = value.match(/^\{([^}]+)\}$/);
  const lookup = (id) => {
    if (seen.includes(id)) throw new Error(`循環引用：${[...seen, id].join(' → ')}`);
    const t = tokens.get(id);
    if (!t) throw new Error(`找不到 token：${id}（被 ${seen.at(-1) ?? '?'} 引用）`);
    const raw = mode === 'dark' && t.dark !== undefined ? t.dark : t.value;
    return resolve(raw, mode, [...seen, id]);
  };
  if (whole) return lookup(whole[1]);
  return value.replace(REF, (_, id) => toCss(lookup(id), tokens.get(id).type));
}

// ---- 3. 轉成 CSS 可用的字串 ----
function toCss(value, type) {
  if (type === 'fontFamily' && Array.isArray(value))
    return value.map((f) => (GENERIC_FONTS.has(f) ? f : `"${f}"`)).join(', ');
  if (type === 'cubicBezier' && Array.isArray(value)) return `cubic-bezier(${value.join(', ')})`;
  return String(value);
}

const cssName = (id) => `--${id.replaceAll('.', '-')}`;

// 語意層若只是單純引用另一個 token，CSS 輸出 var(--x)，換主題時才會連動
function cssValue(token, mode) {
  const raw = mode === 'dark' && token.dark !== undefined ? token.dark : token.value;
  const whole = typeof raw === 'string' && raw.match(/^\{([^}]+)\}$/);
  if (whole) {
    resolve(raw, mode); // 確認引用存在
    return `var(${cssName(whole[1])})`;
  }
  return toCss(resolve(raw, mode), token.type);
}

// ---- 4. 輸出 ----
await mkdir(OUT, { recursive: true });

const light = [];
const dark = [];
for (const [id, t] of tokens) {
  light.push(`  ${cssName(id)}: ${cssValue(t, 'light')};`);
  if (t.dark !== undefined) dark.push(`  ${cssName(id)}: ${cssValue(t, 'dark')};`);
}
const indent = (lines) => lines.map((l) => '  ' + l).join('\n');

const css = `/* 由 scripts/build-tokens.mjs 產生，請勿手動修改 */
:root {
${light.join('\n')}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${indent(dark)}
  }
}

:root[data-theme="dark"] {
${dark.join('\n')}
}
`;
await writeFile(path.join(OUT, 'tokens.css'), css);

// 扁平 JSON 與巢狀 JS 物件（已解析成實際值）
const flat = { light: {}, dark: {} };
const nested = { light: {}, dark: {} };
const setDeep = (obj, keys, v) => {
  keys.slice(0, -1).reduce((o, k) => (o[k] ??= {}), obj)[keys.at(-1)] = v;
};
for (const [id, t] of tokens) {
  for (const mode of ['light', 'dark']) {
    if (mode === 'dark' && t.dark === undefined) continue;
    const v = toCss(resolve(mode === 'dark' ? t.dark : t.value, mode), t.type);
    flat[mode][id] = v;
    setDeep(nested[mode], id.split('.'), v);
  }
}
await writeFile(path.join(OUT, 'tokens.json'), JSON.stringify(flat, null, 2));
await writeFile(
  path.join(OUT, 'tokens.js'),
  `// 由 scripts/build-tokens.mjs 產生\nexport const tokens = ${JSON.stringify(nested.light, null, 2)};\n` +
    `export const darkTokens = ${JSON.stringify(nested.dark, null, 2)};\n` +
    `export const cssVar = (id) => \`var(--\${id.replaceAll('.', '-')})\`;\nexport default tokens;\n`
);
await writeFile(
  path.join(OUT, 'tokens.d.ts'),
  `export declare const tokens: Record<string, any>;\nexport declare const darkTokens: Record<string, any>;\n` +
    `export declare function cssVar(id: string): string;\nexport default tokens;\n`
);

console.log(`✓ tokens：${tokens.size} 個，其中 ${dark.length} 個有深色值 → ${OUT}/`);
