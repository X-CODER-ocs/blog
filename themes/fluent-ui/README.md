# fluent-blog-ui

X-CODER 博客的 **Fluent UI 主题** —— 参考 FluentReader 布局 + 微软 Fluent UI Web Components。

## 设计要点

- **布局参考 FluentReader**：文章列表支持 列表 / 卡片 / 杂志 三视图，客户端一键切换，偏好存 `localStorage` 刷新保留
- **UI 组件用 Fluent 原生**：Fluent UI Web Components（微软官方、纯 Web 技术，**非 .NET**），通过 CDN 引入
- **Markdown 优化**：原版 FluentReader 不支持 Markdown，此处补齐 —— 代码高亮 / 表格 / 引用 / Mermaid 由 Hexo 渲染 + Fluent 风格排版 CSS
- **混合渲染**：Hexo 出语义化 HTML，Fluent UI 做 UI 壳（顶部亚克力导航 / 侧栏 / 卡片容器），SEO 友好

## 作为 Hexo 主题使用

本仓库通过 `git submodule` 接入主博客 `X-CODER`：

```bash
# 主博客根目录（一次性）
git submodule add https://github.com/X-CODER-ocs/fluent-blog-ui.git themes/fluent-ui
```

```yaml
# _config.yml
theme: fluent-ui
```

## 主色

`#4AA26F`（与全站绿系一致），跟随系统浅色 / 深色。

## 目录结构

```
layout/        Hexo EJS 模板（layout / index / post）
source/css/    Fluent 风格 + 三布局样式
source/js/     客户端布局切换逻辑
```
