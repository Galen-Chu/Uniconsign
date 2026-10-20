// 整套系統的命名設定。改名時只需要改這裡。
export default {
  // icon font 的字型名稱
  fontName: 'uniconsign',
  // CSS class 與 sprite id 的前綴，例如 .uc-plus、#uc-plus
  prefix: 'uc',
  // React 元件命名前綴，例如 <IconPlus />、<BrandLogoMark />；符號與 UI icon 同用 Icon 前綴
  componentPrefix: { ui: 'Icon', symbols: 'Icon', brand: 'Brand' },
  // UI icon 的設計畫布
  grid: 24,
  // 新 icon 的 codepoint 起點（Unicode 私有區）
  codepointStart: 0xe001,
};
