---
title: 注入方案退役记：把 Hexo 换成纯 .NET 后端生成器
date: 2026-09-27 12:30:00
tags:
  - FluentNext
  - .NET
  - 博客搭建
  - 后端重构
categories:
  - 教程
license: CC BY 4.0（作者保留权利，允许署名转发与分发）
description: '上次说 Hexo 退到后台只产 JSON，但那套还是猪肉方案。这次用纯 .NET 控制台生成器把 Hexo 彻底踢了，CI 里只剩 dotnet。'
---

呐，上次写《FluentNext 主题诞生记》的时候我说："Hexo 我不想换，换的是前端"——让 Hexo 退到后台只产一份 `content.json`，前端用 Blazor 写。

听起来很优雅对吧？实际跑起来才发现，**那套还是十分的烂**（qwq）。

## 上次的"优雅"方案，到底烂在哪里在哪

回顾一下上一版架构——

| 角色 | 技术 | 实际干的活 |
| --- | --- | --- |
| 内容源 | Markdown + **Hexo** | 写文章、跑 `hexo generate` |
| 后端契约 | `scripts/fluentnext-content.js` | `hexo generate` 时 hook 出 `content.json` |
| 前端 | Blazor WASM | 拉 JSON 渲 SPA |
| CI | GitHub Actions | `npm ci` → `hexo generate` → `dotnet publish` → rsync 缝合 |

问题就出在那条流水线：

- **Hexo 还是得装**：`node_modules` 一大坨，`hexo generate` 为了吐一份 JSON，要把整站路由、NexT 主题、EJS 模板全跑一遍——**99% 的计算量都是浪费**，只为兜里那一份 JSON。
- **CI 里 Node + .NET 两套运行时共存**：`npm ci` 慢、缓存乱、`package-lock.json` 还偶尔抽风。
- **改个 front-matter 字段都要碰 Node**：生成逻辑藏在 Hexo 的 generator 钩子里，想加个字段得在 JS 里翻 `locals.posts`，而我是个写 C# 的人，每次都别扭。
- **缝合脚本越来越多**：base href 改写、Blazor 指纹脚本修正、SPA 404 回退……全靠 shell 串，越串越像一锅炖。

一句话：**为了"不换 Hexo"，反而养出了一套更乱的东西**。

于是我拍板：把 Hexo 也踢了，后端用**纯 .NET 重写**。

## 新架构：三仓协作，CI 里只剩 dotnet

这次的架构干净多了——

```text
┌─────────────────────────────────────────────────┐
│  浏览器 (GitHub Pages / /blog/)                 │
│   ┌──────────────────────────────────────────┐  │
│   │ Blazor WASM (.NET 10) + Fluent UI Blazor  │  │
│   └────────────────┬─────────────────────────┘  │
│                    │ 拉取                        │
│                    ▼                             │
│         /blog/api/content.json                  │
└────────────────────┬────────────────────────────┘
                     │ 构建期生成
┌────────────────────┴────────────────────────────┐
│  GitHub Actions                                 │
│   checkout: blog(文章) + frontend + backend     │
│   dotnet run 后端生成器 ──► content.json 等      │
│   dotnet publish 前端  ──► wwwroot               │
│   rsync(--exclude=/api) ──► public ──► 部署      │
└──────────────────────────────────────────────────┘
         后端仓库: FluentNext.Backend (.NET 10 控制台)
```

三个仓库各司其职——

| 仓库 | 角色 |
| --- | --- |
| `X-CODER-ocs/blog`（原 Hexo 仓库） | **只存文章 markdown + 图片 + 验证文件**，不再跑 Hexo |
| `X-CODER-ocs/fluentnext-frontend` | Blazor WASM 前端（这次一行逻辑没动，只修了个开屏崩） |
| `X-CODER-ocs/fluentnext-backend` | **新建**：.NET 10 控制台生成器，复刻 Hexo 产出 |

CI 里现在**只有一个运行时：`dotnet`**。没有 `npm`、`node_modules`、`package-lock.json`，干净得我想哭 awa。

## 后端生成器干了啥

核心就一个控制台程序，读 `source/_posts/*.md` → 吐四份产物。技术选型——

| 组件 | 选型 |
| --- | --- |
| Markdown 渲染 | **Markdig** 0.40（`UseFootnotes`/`UseEmphasisExtras`/`UseTaskLists`/`UsePipeTables`/`UseGridTables`/`UseAutoLinks`） |
| front-matter 解析 | **YamlDotNet** 16.2 |
| 注入 heading `id` / 抽 excerpt | **HtmlAgilityPack** 1.11 |
| 输出 | `content.json` / `atom.xml` / `sitemap.xml` / `search.xml` |

贴一段真实的核心逻辑（精简版）——

```csharp
// FluentNext.Backend/Program.cs
foreach (var md in Directory.GetFiles(inputDir, "*.md"))
{
    var raw = File.ReadAllText(md);
    SplitFrontMatter(raw, out var fm, out var body);          // 抽 --- 之间的 YAML
    var html = Markdown.ToHtml(body, pipeline);               // Markdig 渲染
    var (htmlWithIds, toc) = InjectHeadingIds(html);           // 给 h2~h4 注 id + 建 TOC

    posts.Add(new BlogPost
    {
        Title    = Str("title"),
        Slug     = Path.GetFileNameWithoutExtension(md),
        Permalink = site.Url.TrimEnd('/') + "/post/" + slug + "/",
        Date     = ParseDate(Str("date"), md),                // front-matter 视为 UTC+8
        Content  = htmlWithIds,
        Toc      = toc,
        Categories = List("categories"),
        Tags    = List("tags"),
    });
}
// 聚合分类/标签/归档 → 序列化 content.json、写三份 XML
```

出来的 `content.json` 跟前端 `Models.cs` **字段 1:1 对齐**——`site`(含 `menu`)/`posts`/`categories`/`tags`/`archives`，前端 Blazor 一行不用改，直接就能吃。

### 几个钉死的契约（避免锚点/日期错位）

1. **slugify 与线上锚点同源**：复刻 `markdown-it-anchor` 默认算法（`ToLowerInvariant` + 空白转 `-` + 只留 `[a-z0-9_\u4e00-\u9fff-]`），保证旧文章的书签、外链锚点不失效。
2. **日期按 UTC+8 处理**：front-matter 里写 `2026-09-27 12:30:00` 都当 Asia/Shanghai，序列化成 `2026-09-27T04:30:00.000Z`（UTC 毫秒），跟之前线上格式一致。
3. **camelCase + 中文原样**：`JsonNamingPolicy.CamelCase` + `UnsafeRelaxedJsonEscaping`，字段名小驼峰、中文不被转义成 `\uXXXX`。
4. **分类/标签排序稳定**：`.OrderByDescending(Count).ThenBy(Name, Ordinal)`，跟旧站顺序完全一致，不抖动。

## 顺手收拾的几件事

既然重写，就把之前攒下的几个"不顺眼"一起处理了——

### 1. 收录改成只靠 sitemap

之前有 `hexo-submit` 那套，构建后**主动推 Bing IndexNow / Google**。这次直接砍了：

- 不推 Bing IndexNow、不推 Google（Google Indexing API 2023 起只对 jobPosting/直播开放，普通网页推不了，徒增焦虑）。
- **只产 `sitemap.xml`**，去 Google Search Console / Bing Webmaster Tools 各提交一次地址，让爬虫自己来抓。
- `search.xml` 按要求保留（hexo-generator-search 兼容格式），前端暂未消费但留着。

```text
https://x-coder-ocs.github.io/blog/sitemap.xml   ← 就这一个入口
```

### 2. 修开屏崩（lib.module.js 时序竞态）

前端当时有个玄学 bug：进首页偶尔整页弹 "An unhandled error has occurred"。根因是 Fluent Web Components 的 `lib.module.js` 比 Blazor 晚执行，导致 `<fluent-nav-menu>` 还没升级成自定义元素，JS interop 调 `addEventListener` 直接炸，整个电路崩。headless 测试还复现不出来（加载太快），真机稳稳定时炸。

修法很简单——`blazor.webassembly.js` 设 `autostart="false"`，等 `customElements.get('fluent-nav-menu')` 注册完（3 秒兜底）再 `Blazor.start()`：

```html
<script type="module" src="lib.module.js"></script>   <!-- 必须同步，不能 async -->
<script type="module" src="comments.js"></script>
<script type="module" src="_framework/blazor.webassembly.js" autostart="false"></script>
<script>
  (async () => {
    const t = setInterval(() => {
      if (customElements.get('fluent-nav-menu') && customElements.get('fluent-button')) {
        clearInterval(t); Blazor.start();
      }
    }, 50);
    setTimeout(() => { clearInterval(t); Blazor.start(); }, 3000); // 兜底
  })();
</script>
```

## 部署踩的两个坑（记一下，别再踩）

CI 重写后连挂两轮，原因是这两个——

**坑 A：占位 `content.json` 覆盖了真数据。**

前端仓库 `wwwroot/api/` 里提交了一份**过期的占位 `content.json`**（4 篇 / 空 menu）。`dotnet publish` 把它打进产物，rsync 在生成器跑完之后又覆盖了真数据，导致线上只剩 4 篇、menu 空的鬼样子。

→ 修法：CI 的 rsync 加 `--exclude='/api'`（绝不覆盖后端真数据），并 `git rm` 删掉前端仓库的占位文件。

**坑 B：sed 改写 `_framework/*.js` 破坏 SRI。**

我想 strip 掉 source map 引用，在 CI 里 `sed -i '/sourceMappingURL=/d'` 改写了 `_framework/*.js`。结果 .NET 10 在 HTML 里给运行时脚本写了 **SRI `integrity` 哈希**，字节一变哈希失配，浏览器直接拦截运行时、整站打不开。

→ 修法：**删掉这条 CI 步骤**。（`.map` 404 本就无害，不值得为它赌整站。）

## 改完之后写文章流程

反而比以前更简单了——

```bash
# 1. 新建文章（还是 Markdown，想用 hexo new 也行，用手写也行）
#    source/_posts/我的新文章.md

# 2. 提交，CI 自动跑后端生成器 + 部署
git add . && git commit -m "feat: 新文章" && git push
```

没有 Node、没有 `hexo generate`、没有缝合脚本。想给 `content.json` 加字段？改 `Models.cs` + `Program.cs` 两处，C# 强类型，编译器替我把关。

## 写在最后

把 Hexo 踢掉这件事，论"必要性"其实不强——上一版也能跑。但**为了不换它而养出的一锅炖，才是真负担**。现在 CI 里只有 `dotnet`，后端生成器是我自己写的、想怎么改怎么改，整个博客从内容到渲染全在 .NET 10 一条技术线上，舒服得不行 awa。

代价？几乎没有：前端 Blazor 一行没动，文章 Markdown 一行没动，只是换了个"产 JSON 的人"。稳了 qwq。

> 三仓都在 `X-CODER-ocs` 下：`blog`（文章）/ `fluentnext-frontend`（前端）/ `fluentnext-backend`（后端生成器）。评论区见～

(广?!广?!)

```

（看到这里就说明你在认真读 qwq，谢谢你）
