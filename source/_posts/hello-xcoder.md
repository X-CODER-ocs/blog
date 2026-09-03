---
title: 'Hello, X-CODER'
date: 2026-09-03 20:00:00
tags:
  - Hexo
  - 建站
categories:
  - 随笔
description: 'X-CODER 官方博客正式上线，记录 OCS 团队的开发与工程实践。'
sticky: 1
---

第一篇博客，记录了一些使用方法。

## 这个博客是什么

X-CODER(我)的技术博客。用于记录我的故事awa。

## 技术栈

| 组件 | 说明 |
| --- | --- |
| [Hexo](https://hexo.io/) | 静态博客生成器，Node.js 生态，Markdown 直接写 |
| [NexT](https://theme-next.js.org/) | 主题，Gemini 方案 |
| GitHub Actions | 推送到 main 分支后自动构建并发布到 GitHub Pages |

## 工作流

写文章只需要三步：

```bash
# 1. 新建文章
hexo new post "文章标题"

# 2. 本地预览
hexo server

# 3. 提交后自动发布
git add . && git commit -m "feat: new post" && git push
```

推送到 `main` 之后，GitHub Actions 会跑 `hexo generate` 并把 `public/` 发布到 Pages，全程不用手动介入。

## 常用命令

```bash
hexo clean          # 清理缓存和已生成的静态文件
hexo g              # generate，生成静态文件
hexo s              # server，本地预览 http://localhost:4000
hexo new draft "x"  # 新建草稿
hexo publish "x"    # 草稿转正式文章
```


