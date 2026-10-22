# Uniconsign

[Galen Chu](https://github.com/Galen-Chu) 的個人品牌設計系統：design token、UI icon、品牌符號與文字排版的單一來源，所有專案共用。SVG 是唯一的原始檔，其他格式全部由 build 產生。

```
tokens/*.json ──► build-tokens ──► tokens.css / tokens.js / tokens.json
icons/ui/*.svg ─┐
                ├► lint ► build-icons ──► 最佳化 SVG / sprite / icons.js / React 元件 / icon font
icons/brand/*.svg┘
```

## 目錄

```
brand.config.mjs        字型名稱、class 前綴、元件前綴（改名只改這裡）
tokens/
  primitives.json       原始值：色階、間距、字級
  semantic.json         用途：bg、text、border、icon、status（含深色模式）
icons/
  ui/                   單色 UI icon，24×24，已外框化
  symbols/              符號系統，依內容分類：math / philosophy / science / dao / law / human / theology
  brand/                品牌符號，可多色（logo-mark、logo-c、logo-p、logo-s）
  codepoints.json       icon font 字碼表（自動維護，請提交）
templates/
  icon-grid-24.svg      設計用網格模板
scripts/                build、lint、預覽頁
docs/
  tokens.md             token 規範
  icon-guidelines.md    icon 網格規範
```

## 目前的內容（2026-10 盤點）

共 **210 個 icon**，分三種類型：

- **UI icon（13）**：介面動作——八方向箭頭、check / double-check / triple-check、close、open
- **符號（193）**：表達概念的符號系統，依內容分七類
  - 數學（29）：四則與關係運算子、全等、根號、積分、希臘字母變數（α β γ Δ θ λ μ π Σ τ φ ψ ω）、���限
  - 哲學（16）：思想意象（陰陽、天平、圓相、螺旋、沙漏、問答驚嘆），邏輯與集合（且/或、∵ ∴、如果、∩ ∪、互斥、獨立）
  - 科學（18）：觀察工具（放大鏡、顯微鏡、望遠鏡）、物理（原子、軌道、分子、波、磁、閃電）、生物（細胞、DNA）、實驗室、醫藥、材料
  - 道學（21）：自然界非人之事物——天（日月星雲）、水文（海浪水滴冰晶）、氣象（霧風氣）、火與土地（火山地土沙）、植物（樹芽草蕨花）；全部以線條表現
  - 法學（44）：人造之物——書；楷書漢字（一二三十、人大小士王天世中文永示朱、五行木火土金水、山川田）；鍊金術符號（四元素、三原質、七金屬、昇華／沉澱／蒸餾／溶解／淨化／腐化）
  - 人學（27）：與人相關之物——頭部與五官（頭、髮、眼、耳、鼻、口、舌、牙、顱骨、腦）、臟器（心、肺、肝、胃、胰、腎、膀胱、腸）、骨骼（骨、脊椎）、肢體（手臂、手、手指、指紋、腿、膝、足）
  - 神學（38）：當代占星——黃道十二宮；行星（日月、水金地火木土、天王 ♅、海王、冥王 ⯓）；小行星與虛點（凱龍、穀神、智神、婚神、灶神、莉莉絲、北交點、南交點、福點）；相位（合、沖、三分、四分、六分、梅花）
- **品牌符號（4）**：logo-mark（G）與字母變體 logo-c、logo-p、logo-s

各類內的排列順序（相似符號相��）定義在 `icons/order.json`。目前為 v0 樣貌：整體系統與規範已定，個別符號的細節與形變之後會逐類微調。

## 指令

```bash
npm install
npm run build          # 產生 dist/
npm run lint:icons     # 只檢查 icon 是否符合規範
npm run preview        # build 並產生 dist/preview.html，打開檢查
```

## CI 與發布

套件名稱是 `@galen-chu/uniconsign`（GitHub Packages 要求 scope 等於帳號或組織名稱）。每次 push 都會跑 lint 與 build，預覽頁可在 Actions 的 artifact 下載。要發布版本時：

```bash
npm version minor     # 0.1.0 → 0.2.0，並自動打 tag
git push --follow-tags
```

推送 tag 後 Actions 會自動發布到 GitHub Packages。

## 在其他專案中使用

在專案根目錄加一個 `.npmrc`，告訴 npm 你的 scope 去 GitHub Packages 找：

```
@galen-chu:registry=https://npm.pkg.github.com
```

然後安裝：

```bash
npm install @galen-chu/uniconsign
```

> 安裝私有套件需要一個有 `read:packages` 權限的 GitHub token，設定方式見 GitHub 文件「Working with the npm registry」。

### Tokens

```css
@import '@galen-chu/uniconsign/tokens.css';

.card {
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}
```

```js
import { tokens, cssVar } from '@galen-chu/uniconsign/tokens';
tokens.color.bg.brand;           // '#167839'
cssVar('color.bg.brand');        // 'var(--color-bg-brand)'
```

深色模式預設跟隨系統，在 `<html>` 上設 `data-theme="dark"` 或 `"light"` 可強制切換。

### React

```jsx
import { IconSearch, IconPlus, BrandLogoMark } from '@galen-chu/uniconsign/react';

<IconSearch />                       {/* 24px，裝飾用，自動 aria-hidden */}
<IconPlus size={20} title="新增" />  {/* 有 title 時會被螢幕閱讀器念出 */}
<BrandLogoMark size={32} />
```

顏色跟著文字顏色（`currentColor`），所以用 CSS 的 `color` 控制即可。每個 icon 是獨立檔案，打包工具只會打包用到的。

### Vue、Svelte、純 JS

```js
import { search, plus } from '@galen-chu/uniconsign/icons';
element.innerHTML = search;   // 原始 SVG 字串
```

### SVG sprite

把 `sprite.svg` 的內容放進頁面一次，之後：

```html
<svg width="24" height="24"><use href="#uc-search"/></svg>
<svg width="32" height="32"><use href="#uc-brand-logo-mark"/></svg>
```

### Icon font

只在必須「當文字用」的場合使用，例如只能貼文字的環境、舊系統、或需要跟著文字自動對齊的地方。一般網頁優先用上面的方式。

```html
<link rel="stylesheet" href="node_modules/@galen-chu/uniconsign/dist/icons/font/uniconsign.css">
<i class="uc-search" aria-hidden="true"></i>
```

字碼記錄在 `icons/codepoints.json`，新增 icon 只會往後加，既有 icon 的字碼永遠不變。

## 新增 icon

詳細規則見 [docs/icon-guidelines.md](docs/icon-guidelines.md)。簡要流程：

1. 用 `templates/icon-grid-24.svg` 畫，線條外框化後匯出到 `icons/ui/`。
2. `npm run preview`，開預覽頁打開網格、切深色檢查。
3. 連同 `icons/codepoints.json` 一起提交。

## 修改 token

見 [docs/tokens.md](docs/tokens.md)。目前色系定調為綠（主色）、青、黃三色；之後微調色值時改 `tokens/primitives.json` 的色階。

## 授權

[MIT](LICENSE)

法學類的漢字字形取自[全字庫正楷體](https://www.cns11643.gov.tw/)（TW-Kai，© 數位發展部），依「[政府資料開放授權條款－第1版](https://data.gov.tw/license)」使用。
