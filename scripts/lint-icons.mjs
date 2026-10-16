// 檢查 icons/ 底下的 SVG 是否符合 docs/icon-guidelines.md。
// 可單獨執行（npm run lint:icons），build-icons 也會先呼叫它。
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import config from '../brand.config.mjs';

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*\.svg$/;

export async function lintIcons() {
  const problems = [];
  const report = (file, msg) => problems.push(`${file}: ${msg}`);

  for (const kind of ['ui', 'brand']) {
    const dir = path.join('icons', kind);
    const files = (await readdir(dir)).filter((f) => f.endsWith('.svg'));
    for (const f of files) {
      const rel = `${kind}/${f}`;
      const svg = await readFile(path.join(dir, f), 'utf8');

      if (!NAME.test(f)) report(rel, '檔名需為 kebab-case，例如 arrow-right.svg');
      if (/<text[\s>]/.test(svg)) report(rel, '不可含 <text>，文字請先轉外框');
      if (/<image[\s>]/.test(svg)) report(rel, '不可嵌入點陣圖 <image>');
      if (/<style[\s>]/.test(svg)) report(rel, '不可含 <style>，請直接用屬性');

      const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
      if (!viewBox) report(rel, '缺少 viewBox');

      if (kind === 'ui') {
        const g = config.grid;
        if (viewBox && viewBox.trim() !== `0 0 ${g} ${g}`)
          report(rel, `viewBox 必須是 "0 0 ${g} ${g}"，目前是 "${viewBox}"`);
        if (/\sstroke="(?!none)[^"]*"/.test(svg) || /\sstroke-width=/.test(svg))
          report(rel, '含有 stroke：UI icon 匯出前請「外框化線條」（Outline stroke），否則 icon font 會變空心或消失');
        const fills = new Set(
          [...svg.matchAll(/\sfill="([^"]+)"/g)].map((m) => m[1].toLowerCase()).filter((c) => c !== 'none')
        );
        if (fills.size > 1) report(rel, `UI icon 只能單色，目前有 ${[...fills].join(', ')}`);
        if (/<(linearGradient|radialGradient|mask|filter)[\s>]/.test(svg))
          report(rel, 'UI icon 不可使用漸層、遮罩或濾鏡');
      }
    }
  }
  return problems;
}

// 直接執行時
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = await lintIcons();
  if (problems.length) {
    console.error(`✗ icon 檢查發現 ${problems.length} 個問題：\n  ` + problems.join('\n  '));
    process.exit(1);
  }
  console.log('✓ icon 檢查通過');
}
