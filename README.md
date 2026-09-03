# X-CODER Blog

X-CODER / OCS 团队的技术博客，基于 [Hexo](https://hexo.io/) + [NexT](https://theme-next.js.org/) 主题构建。

线上地址：https://x-coder-ocs.github.io/blog

## 快速开始

```bash
npm install          # 安装依赖
npm run server       # 本地预览 http://localhost:4000
npm run build        # 生成静态文件到 public/
npm run clean        # 清理缓存
```

## 写文章

```bash
hexo new post "文章标题"     # 新建文章 -> source/_posts/文章标题.md
hexo new draft "草稿标题"    # 新建草稿
hexo publish "草稿标题"      # 草稿转为正式文章
```

文章开头需要 Front-matter：

```markdown
---
title: 文章标题
date: 2026-09-03 20:00:00
tags: [Hexo]
categories: [随笔]
---
```

## 自动发布

推送到 `main` 分支后，GitHub Actions（`.github/workflows/pages.yml`）会自动执行 `hexo generate` 并把 `public/` 发布到 GitHub Pages，无需手动部署。

首次使用需要在仓库 **Settings → Pages → Build and deployment → Source** 中确认为 `GitHub Actions`。

## 目录结构

```
.
├── _config.yml          # 站点配置（标题、URL、主题等）
├── _config.next.yml     # NexT 主题配置（菜单、样式、搜索等）
├── scaffolds/           # 文章模板
├── source/
│   ├── _posts/          # 文章
│   ├── about/           # 关于页
│   ├── images/          # 图片资源
│   └── _data/styles.styl # 自定义样式
├── themes/next/         # NexT 主题
└── .github/workflows/   # CI 配置
```
