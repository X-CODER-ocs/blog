---
title: 给博客接上评论系统：用 Utterances 把留言存进 GitHub Issues
date: 2026-09-04 18:40:00
tags:
  - 评论系统
  - Utterances
  - NexT
  - Hexo
  - 博客搭建
categories:
  - 教程
license: CC BY 4.0（作者保留权利，允许署名转发与分发）
---

静态博客最尴尬的一件事：它能发文章，但没有「评论」这个灵魂功能。原因很简单——纯静态页面没有后端、没有数据库，你总不能让访客对着一张图留言吧 awa。

所以给本博客挑评论系统时，我定了几条硬标准：

- **不能要密钥**：我可不想把 GitHub Token 之类塞进公开仓库，太刺激了。
- **不能要服务器**：本来就是用 GitHub Pages 白嫖托管的，再搞个后端就本末倒置了。
- **数据得归我**：评论要落在我自己的仓库里，不能归别人管。

顺着这三条去筛，最后落在了 **Utterances** 上。

## 什么是 Utterances

一句话：**一个把 GitHub Issues 当评论区的开源脚本**。

它的工作原理特别「白嫖主义」：

1. 访客用 GitHub 账号登录（也就是他得有个 GitHub 号）；
2. 他写的评论，被 Utterances 直接写成你仓库里的 **一条 Issue**；
3. 页面通过 `<iframe>` 加载 Utterances 官方脚本，把对应的 Issue 渲染成评论区显示出来。

也就是说——**你不需要任何数据库、不需要任何服务器、不需要任何密钥**。评论就是 Issues，Issues 就是评论。整件事完全跑在 GitHub 的生态里，和 GitHub Pages 是同一个妈，天然搭 awa。

| 方案 | 后端 | 密钥 | 数据归属 | 我的评价 |
| --- | --- | --- | --- | --- |
| Disqus | 有（它家服务器） | 不需要 | 第三方 | 广告多、国内慢、隐私劝退 |
| Valine | 有（LeanCloud 等） | 需要 | 第三方 | 要注册 BaaS，懒得搞 |
| Gitalk | 无 | 需要（GitHub OAuth App） | 自己仓库 | 思路对，但配 OAuth 略烦 |
| **Utterances** | **无** | **不需要** | **自己仓库** | 正中下怀 awa |

## 配置步骤（NexT 真就三步）

### 第 1 步：给仓库装上 Utterances App

打开 [github.com/apps/utterances](https://github.com/apps/utterances)，点 **Install**，把你的博客仓库（`X-CODER-ocs/blog`）授权进去。

> ⚠️ 这一步很多人会忘。没装 App，访客评论时就没权限往你仓库写 Issue，评论框会转圈圈转到天荒地老。亲身踩过，别问 awa。

### 第 2 步：改 NexT 配置

在 `_config.next.yml` 里把评论系统切成 utterances，并填上仓库名：

```yaml
# 评论系统：Utterances（基于 GitHub Issues，无需任何密钥）
comments:
  style: tabs
  active: utterances

# Utterances —— 评论存进 X-CODER-ocs/blog 仓库的 Issues
utterances:
  enable: true
  repo: X-CODER-ocs/blog
  issue_term: pathname        # 用文章路径作为 issue 标识
  theme: github-light         # 浅色，与 #4AA26F 主题搭配
```

几个字段解释一下：

- `repo`：必须是 `用户名/仓库名` 的格式，**而且仓库得是 public**，不然 Utterances 读不到 Issues。
- `issue_term: pathname`：用文章的相对路径（比如 `/blog/2026/09/04/xxx/`）来绑定 Issue。好处是**你改文章标题也不会丢评论**；如果你用 `title`，哪天手痒改了标题，旧评论就找不回来了，会新建一条空 Issue（别问我怎么知道的qwq）。
- `theme`：评论框配色。我选了 `github-light` 配博客的浅绿主题，深色模式其实也能用 `github-dark`，等哪天手痒再切 awa。

### 第 3 步：部署

```bash
hexo clean && hexo generate && hexo deploy
```

刷新页面，文章底部就多出一个用 GitHub 账号登录的评论框了。就这么简单。

## 几个值得知道的坑（和甜头）

**坑 1：访客必须有 GitHub 账号。**
这其实是把双刃剑——门槛劝退了一部分人，但也顺手过滤掉了 90% 的垃圾评论和机器人。对我这种小博客来说，净是好事。

**坑 2：评论 = Issue，别手贱去删。**
你在仓库 Issues 里看到的每一条「评论帖」，删了页面上对应的评论也没了。整理 Issues 的时候长点心 awa。

**坑 3：permalink 别乱改。**
因为用的是 `issue_term: pathname`，文章 URL 一变，评论就「漂」了。所以定好 permalink 之后就别老去动 slug。

**甜头：完全免费 + 可导出。**
Issues 是标准数据，GitHub 一键导出，哪天想搬家连评论一起搬都行。而且永远不会有「服务商跑路 / 收费」这种破事。

**甜头：自带 Markdown +  emoji。**
毕竟底层就是 Issues，访客能用完整的 Markdown 写评论，代码块、表格、emoji 全支持，技术博客的评论区就该这样 awa。

## 结语

接上评论系统之后，这个博客才算真正「活」了——不仅是发，还能听得到回音。Utterances 这套「用 Issues 当数据库」的思路，把静态博客的短板补得干干净净，又没引入任何新负担。

如果你也在搭 Hexo + NexT 的博客，又不想折腾后端和密钥，强烈建议直接上 Utterances(广?!广?!)。装个 App、改两行配置，十分钟搞定，剩下的交给 GitHub 替你打工 awa~

有啥想喷的，下面评论区见（记得先登录 GitHub 哈）。
