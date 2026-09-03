// MD3 动态取色 (Material You Dynamic Color)
// 基于 @material/material-color-utilities，从种子色（或图片）生成完整 MD3 调和色板，
// 注入为 --md-sys-color-* CSS 变量；styles.styl 中的组件样式直接消费这些变量。
import {
  themeFromSourceColor,
  sourceColorFromImage,
  hexFromArgb,
} from './lib/mcu/index.js';

const root = document.documentElement;
const SEED = (root.dataset.mdSeed || '#4AA26F').trim();
const mql = window.matchMedia('(prefers-color-scheme: dark)');

// #4AA26F -> 0xFF4AA26F (ARGB)
function argbFromHex(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return ((255 << 24) | (r << 16) | (g << 8) | b) >>> 0;
}

let theme = null;

function applyScheme() {
  if (!theme) return;
  const isDark = root.classList.contains('dark') || mql.matches;
  const scheme = isDark ? theme.schemes.dark : theme.schemes.light;
  for (const [key, value] of Object.entries(scheme.toJSON())) {
    const token = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    root.style.setProperty('--md-sys-color-' + token, hexFromArgb(value));
  }
  root.setAttribute('data-md-mode', isDark ? 'dark' : 'light');
}

function buildFromSeed(seed) {
  theme = themeFromSourceColor(argbFromHex(seed));
  applyScheme();
}

// 默认：从种子色生成（Material You 的“动态取色”本质就是单色 → 调和色板）
buildFromSeed(SEED);

// 可选：从图片实时取色。在 <html data-md-image="/images/avatar.png"> 开启。
const imgSrc = root.dataset.mdImage;
if (imgSrc) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = async () => {
    try {
      const src = await sourceColorFromImage(img);
      const t = themeFromSourceColor(src);
      theme = t;
      applyScheme();
    } catch (e) {
      /* 跨域/采样失败则回退到种子色 */
    }
  };
  img.onerror = () => {};
  img.src = imgSrc;
}

// 跟随系统/手动切换，实时重算
mql.addEventListener('change', applyScheme);
new MutationObserver(applyScheme).observe(root, {
  attributes: true,
  attributeFilter: ['class'],
});

// 暴露给控制台：window.mdTheme('#RRGGBB') 可实时换色
window.mdTheme = (hex) => buildFromSeed(hex);
