# Design token 規範 v0.1

## 兩層結構

```
primitives.json   原始值：有哪些顏色、間距、字級      color.brand.600 = #167839
       ↓ 引用
semantic.json     用途：這個值拿來做什麼           color.bg.brand = {color.brand.600}
       ↓ 使用
各專案            只用語意層                      background: var(--color-bg-brand)
```

專案程式碼**只引用語意層**。這樣將來調整品牌色時，只要改 primitives 的數值或語意層的對應，所有專案更新套件後就會一起變，不用逐一搜尋取代。

例外：間距、圓角、字級、時間這些本身就沒有「用途」差異的數值，直接使用原始層即可（`--space-4`、`--radius-md`）。

## 格式

檔案採用 [W3C Design Tokens](https://design-tokens.github.io/community-group/format/) 格式：每個 token 是一個有 `$value` 的物件，`$type` 可以寫在群組上讓子層繼承，引用寫成 `{color.brand.600}`。

深色模式的值寫在同一個 token 的 `$extensions.mode.dark`：

```json
"canvas": {
  "$value": "{color.neutral.50}",
  "$extensions": { "mode": { "dark": "{color.neutral.900}" } }
}
```

這樣淺色與深色永遠成對出現，不會有人加了淺色值卻忘了深色。

## 命名

- 全部小寫，用 `.` 分層，輸出成 CSS 時換成 `-`：`color.text.primary` → `--color-text-primary`。
- 原始色依**色相**命名（`brand`、`cyan`、`yellow`、`neutral`、`red`），不用用途命名。
- 色階用 50–900（數字越大越深），中間留空位方便日後插入。
- 語意層依**用途**命名，格式是 `類別.角色.變體`：`color.bg.surface`、`color.text.secondary`、`color.border.focus`。

## 目前的值

品牌色系已定調為**綠（主色 `brand`）、青（`cyan`）、黃（`yellow`）**三色。色階以 OKLCH 色彩空間產生（綠 H150、青 H208、黃 H100），各階亮度間距均勻；語意層在深淺色模式下的文字對比已驗證達 WCAG AA（一般文字 4.5:1），其中 warning 淺色刻意用 `yellow.700` 而非 600，因為黃色要在淺底上達到文字對比標準必須夠深。之後微調色值時：改 `primitives.json` 的數值後跑 `npm run preview`，檢查對比仍達標，且主色、輔色和狀態色之間還分得開。

字體預設 `Inter` 搭配 `Noto Sans TC`，有中文時會自動退回系統的蘋方或微軟正黑體。中文內文行高用 1.7，比英文常見的 1.5 寬鬆，是刻意的。

## 輸出

`npm run build:tokens` 會產生：

| 檔案 | 內容 | 用在 |
| --- | --- | --- |
| `dist/tokens/tokens.css` | CSS 變數，含 `prefers-color-scheme` 與 `[data-theme]` 兩種深色切換 | 任何網頁專案 |
| `dist/tokens/tokens.js` | 解析後的巢狀物件 `tokens`、`darkTokens`，以及 `cssVar()` | JS 中需要實際數值時（Canvas、圖表、React Native） |
| `dist/tokens/tokens.json` | 扁平 key-value，分 light / dark | 其他工具或語言 |

深色模式的切換規則：預設跟隨系統；在 `<html>` 加 `data-theme="dark"` 或 `data-theme="light"` 可強制指定。

## 新增或修改 token

1. 先問：現有的 token 真的不夠嗎？大部分「需要新顏色」的情況，其實是語意層少了一個角色。
2. 原始值改 `primitives.json`，用途對應改 `semantic.json`。
3. `npm run preview` 檢查。
4. 刪除或改名 token 屬於破壞性變更，版本號要升主版號（1.x → 2.0）。
