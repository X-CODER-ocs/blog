// Fluent UI 博客主题 · 客户端逻辑
// 1) 套用官方 Fluent 2 主题（亮/暗随系统），并把所有 Brand 令牌改成站点绿 #4AA26F
// 2) 文章列表 list/card/magazine 三布局切换，偏好存 localStorage（参考 FluentReader 客户端设置）
import { webLightTheme, webDarkTheme } from 'https://cdn.jsdelivr.net/npm/@fluentui/tokens@1.0.0-alpha.24/+esm';

const BRAND = '#4AA26F';
const BRAND_HOVER = '#3d8c5e';
const BRAND_PRESSED = '#357a52';

// 把主题里所有含 Brand 的令牌替换成绿色（其余保持 Fluent 官方值）
function greenify(theme) {
  const out = Object.assign({}, theme);
  Object.keys(out).forEach(function (k) {
    if (k.indexOf('Brand') === -1) return;
    if (k.endsWith('Hover')) out[k] = BRAND_HOVER;
    else if (k.endsWith('Pressed')) out[k] = BRAND_PRESSED;
    else out[k] = BRAND;
  });
  return out;
}

function applyTheme() {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = greenify(dark ? webDarkTheme : webLightTheme);
  const root = document.documentElement;
  Object.keys(theme).forEach(function (k) {
    root.style.setProperty('--' + k, theme[k]);
  });
}

applyTheme();
const mq = window.matchMedia('(prefers-color-scheme: dark)');
(mq.addEventListener ? mq.addEventListener('change', applyTheme) : mq.addListener(applyTheme));

// —— 多布局切换 ——
(function () {
  const KEY = 'x-coder-layout';
  const list = document.getElementById('post-list');
  if (!list) return;
  const btns = Array.prototype.slice.call(list.querySelectorAll('.layout-switch fluent-button'));

  function applyLayout(v) {
    list.setAttribute('data-layout', v);
    btns.forEach(function (b) {
      const on = b.getAttribute('data-layout') === v;
      b.setAttribute('appearance', on ? 'accent' : 'neutral');
    });
  }

  applyLayout(localStorage.getItem(KEY) || 'list');
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      const v = b.getAttribute('data-layout');
      applyLayout(v);
      try { localStorage.setItem(KEY, v); } catch (e) {}
    });
  });
})();
