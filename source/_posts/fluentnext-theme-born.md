---
title: 当博客前端换成 .NET：FluentNext 主题诞生记
date: 2026-09-06 09:50:00
tags:
  - FluentNext
  - Blazor
  - .NET
  - Hexo
  - Fluent UI
  - 博客搭建
categories:
  - 教程
license: CC BY 4.0（作者保留权利，允许署名转发与分发）
description: '把博客前端从 NexT 换成 Blazor WASM —— Hexo 退到「内容后端」只产 JSON,真正的前端用 C# 写。'
---

呐,博客又双叒换皮了 qwq。

这次换得有点激进:前端不是 JS,而是**用 .NET 写的**——确切地说,是 **Blazor WebAssembly**,配合微软官方的 **Fluent UI Blazor** 组件库。换完之后的皮肤我起名叫 **FluentNext**("Fluent" 借 Fluent UI,"Next" 致敬陪我一路走来的 NexT,合在一起算个续作 awa)。

这是换之前的最后一张截图——NexT 的 Gemini 暗色方案,绿底品牌、深灰背景、文章列表 + 头像资料卡,看着其实挺好看的:

![NexT 暗色方案](images/original-next-theme.png)

> 换主题前的最后一眼:左边是「X-CODER / 仓颉的博客!」绿牌,下面挂着首页/关于/标签/分类/归档/搜索。右边是文章列表 + 头像资料卡。整体很"博客",很"程序员"。

然后我就把它整个推翻了(并不是它不好看,是手痒 qwq)。

## 为什么是 .NET,不是 JS

故事要从一句吐槽说起。

`hexo new post "x"` → 写 Markdown → `hexo generate` → `hexo deploy` —— Hexo 这套流程顺得很,**但它的主题全是用 EJS + Stylus + CoffeeScript 写的**。换句话说,你想改个按钮样式,得去翻老古董时代的模板语法;想加个交互,得在 jQuery 的祖传代码堆里游泳。

而我一直在使用 .NET,看到 `Razor` 组件这种东西实在回不去了:

```razor
<FluentCard>
    <FluentButton Appearance="Appearance.Accent" @onclick="OnClick">
        @(count) 次点击
    </FluentButton>
</FluentCard>

@code {
    int count = 0;
    void OnClick() => count++;
}
```

一段 Razor、一个 `@code`、完事。**强类型、热重载、真组件**——不是 CSS 仿的伪组件,是真正可以传泛型、绑数据、捕获键盘事件的 Web Components 级 UI 块。

手痒,就动手了。

## 架构:Hexo 退到后台,只产 JSON

关键判断:**Hexo 我不想换**(Markdown 工作流太舒服了),换的是**前端**。

所以最终架构是——

| 层 | 技术 | 干啥 |
| --- | --- | --- |
| 内容源 | Markdown + Hexo | 写文章、生成静态站点、跑生成器脚本 |
| 后端契约 | `scripts/fluentnext-content.js` | `hexo generate` 时输出 `public/api/content.json`(站点/文章/分类/标签/归档/TOC) |
| 前端 | Blazor WebAssembly(.NET 10)+ Fluent UI Blazor | 拉 `content.json`、用真组件渲染 SPA |
| 集成 | GitHub Actions | 拉前端仓库 → `dotnet publish` → 改 base href → 塞进 Hexo 的 `public/` |

一句话:**Hexo 当"无头 CMS",Blazor 当"前端框架"**。Hexo 不再渲染任何可见页面,只负责在构建时吐一份内容 JSON;真正的 UI 全在浏览器里用 C# 跑。

听起来有点杀鸡用牛刀?其实很合理——

- **写文章体验不变**:还是 `hexo new`,还是 Markdown,本地预览照旧。
- **换前端不用动内容**:哪天又想换 Vue/Svelte/Avalonia,把 `content.json` 喂给它们就行。
- **Blazor WASM 的好处**:首次加载几十 KB 壳子,其余按需下载;组件强类型;SSR 也能加(后续再说)。

## 技术栈一览

```text
┌─────────────────────────────────────────┐
│ 浏览器 (GitHub Pages / /blog/)          │
│  ┌───────────────────────────────────┐  │
│  │ Blazor WebAssembly (.NET 10)      │  │
│  │  ├ Fluent UI Blazor v4.14.4       │  │
│  │  ├ FluentDesignTheme(强调色可改) │  │
│  │  ├ FluentNavMenu / Card / ...     │  │
│  │  └ 自定义主题(色/背景/字号/字体) │  │
│  └───────────────────────────────────┘  │
│              │ 拉取                     │
│              ▼                          │
│       /blog/api/content.json            │
└─────────────────────────────────────────┘
                  ▲
                  │ 构建期生成
┌─────────────────────────────────────────┐
│ GitHub Actions                          │
│  hexo generate ──► scripts/fluentnext   │
│                     -content.js         │
│  dotnet publish ──► wwwroot/           │
│  rsync ──► public/ ──► 部署           │
└─────────────────────────────────────────┘
```

| 组件 | 选型 | 备注 |
| --- | --- | --- |
| 前端框架 | **.NET 10 + Blazor WebAssembly** | 微软官方,Visual Studio 调试体验一绝 |
| UI 组件库 | **Microsoft.FluentUI.AspNetCore.Components** | 微软官方 Fluent UI 的**真 Blazor 组件**(非 Web Components) |
| 设计令牌 | CSS 变量(`--accent-color-base` 等) | 用户改强调色直接覆盖令牌,不用重新编译 |
| 后端 | **Hexo 7** + 自写生成器脚本 | 只产 `content.json`,不渲染可见页面 |
| 部署 | **GitHub Actions** → GitHub Pages | 两个仓库:博客仓库 + 前端仓库,CI 串起来 |
| 评论 | **Utterances** | 基于 GitHub Issues,纯静态站点零密钥 |
| 强调色 | **#4AA26F** | 博客唯一的绿,自定义面板里可以换成任意色 |

## FluentNext 现在长啥样

简单列几个"真组件 + 用户可改"的地方——

- **侧边栏**:`FluentNavMenu` 真组件,顶栏在窄屏收成汉堡按钮唤出抽屉(手机版)。
- **强调色**:设置抽屉里挑色,实时覆盖 `--accent-color-base` 等 Fluent 设计令牌,**不用重编译**。
- **背景 / 文字色**:留空 = 跟随明暗主题;填了 = 锁定自定义(每个访客各调各的,存 `localStorage`)。
- **字体**:系统/无衬线/衬线/等宽四档。
- **布局**:列表(只标题)/ 杂志(含正文片段)切换。
- **主题**:明 / 暗 / 跟随系统。
- **字号**:滑块 12-20px。
- **评论**:Utterances,跟随当前主题切色。
- **错误兜底**:`<ErrorBoundary>` 包整个应用,真异常打到 console + 渲染兜底页(便于定位)。

每个控件的 `ValueChanged` 改完立刻存 `localStorage`,**刷新保留**——纯前端 SPA 的标准做法,无服务端、无 Cookie、无请求开销。

## 踩过的几个坑(预警一下)

如果你也想复刻这套,先把这些雷记一下:

**坑 1:`.NET 10` 把 `blazor.webassembly.js` 指纹化了。**

生成的叫 `blazor.webassembly.w3qd1tpl0e.js`,只有 importmap 知道怎么映射。**经典 `<script src="_framework/blazor.webassembly.js"></script>` 在 .NET 10 下会 404**(importmap 不管经典标签)。CI 里我用 `sed` 把 `src` 改写成实际哈希文件名。

**坑 2:`FluentDesignTheme` 的 `StorageName` 别跟自己的设置 key 撞。**

我一开始复用了同一个 localStorage key,结果用户改强调色把整个设置面板也重置了……分两个 key,各自管各自。

**坑 3:Fluent Web Components 的 `lib.module.js` 加载顺序。**

必须用 `type="module"`(同步),**绝对不能加 `async`**——async 会让它晚于 Blazor 执行,`<fluent-nav-menu>` 还没升级,JS interop 抛 `element.addEventListener is not a function`,整个应用崩,每页弹"An unhandled error has occurred"。CI 里的加载顺序必须是:`lib.module.js` → `comments.js` → `blazor.webassembly.js`。

**坑 4:站内链接必须是相对路径,不能绝对。**

`<base href="/blog/">` 只接管**相对路径**。`href="/post/xxx"` 这种绝对路径解析到 `x-coder-ocs.github.io/post/xxx`(站点根之外),直接 404。全部改成 `href="post/xxx"` 和 `href="./"` 才解决。GitHub Pages 又不能在站点根之上重定向,只能在 `404.html` 里塞脚本把"少 `/blog/`"的 URL 重定向回来。

**坑 5:`Utterances` 不回传用户信息。**

它把 OAuth 留在 `utteranc.es` 的跨域 iframe 里,**没有任何 postMessage 机制告诉宿主页"谁登录了"**。所以侧边栏没法像 Gitalk 那样显示当前用户头像(Gitalk 是把 token 写进你站点的 localStorage,特殊)。要么忍痛放弃侧边栏用户显示,要么自建一个极小的 OAuth 代理。

**坑 6:CI secrets 千万别写进 `if:`。**

```yaml
# ❌ 这样写整个 workflow 直接挂
if: ${{ secrets.X != '' }}

# ✅ 注入 env,shell 里判空
env:
  X: ${{ secrets.X }}
run: |
  if [ -n "$X" ]; then ...; fi
```

GitHub Actions 解析 `if` 里的 secrets 会直接抛 "workflow file issue",`jobs total_count=0`。这个雷我踩过 awa。

## 对比一下 NexT 和 FluentNext

| 维度 | NexT | FluentNext |
| --- | --- | --- |
| 前端技术 | EJS + Stylus + jQuery(老派) | Blazor WASM + Fluent UI(现代 .NET) |
| 改按钮样式 | 翻模板/CSS | 改 Razor 组件,热重载 |
| 加新交互 | jQuery 在 DOM 堆里加事件 | `@onclick` / `EventCallback`,强类型 |
| 自定义主题 | 改 `_config.next.yml` 几个色值 | 设置面板直接挑,**每人各调各的** |
| 换皮 | 换主题(EJS) | 换前端仓库,Hexo 一行不用动 |
| 学习曲线 | 熟悉 EJS/Stylus | 熟悉 C#/Razor |
| 体积 | 几十 KB JS | 首次 ~2MB(后续按需);首次之后有缓存 |

体积那行别骂我——Blazor WASM 首次下载确实重(`.NET` 运行时 + 你的程序集),**但后续访问只下增量**,而且 `dotnet-r2r` 编译产物会小很多。愿意为"用熟悉的 C# 写前端"付这笔学费的人,我觉得不亏。

## 后端脚本长啥样

为了完整性,贴一下产 `content.json` 的核心(精简版)——

```javascript
// scripts/fluentnext-content.js
hexo.extend.generator.register('fluentnext-content', function (locals) {
  const posts = locals.posts.sort('-date').map(p => {
    const built = buildToc(p.content || '');
    return {
      title: p.title,
      slug: p.slug,
      date: p.date?.toISOString(),
      content: built.content,   // 已重写 h2~h4 的 id,与 TOC 一致
      toc: built.toc,
      categories: p.categories.map(c => c.name),
      tags: p.tags.map(t => t.name)
    };
  });
  return { path: 'api/content.json', data: JSON.stringify({...}, null, 2) };
});
```

前端拉回来,塞进 `ContentService`,Blazor 直接当强类型对象用——`@foreach (var post in posts)` 渲染卡片,@p 点击导航,没第二回事。

## 写在最后

把博客前端换成 .NET 这件事,**纯因为好玩**——没有性能提升,没有 SEO 改善,反而多了不少坑。但写出来的感觉,确实比在 EJS 模板里翻来覆去舒服得多(主观评价,仅供参考 qwq)。

如果你也想试试,可以走这条最省力的路:

1. **保留 Hexo**:Markdown 工作流真的没替代品。
2. **写个生成器脚本**:把 `locals.posts` 序列化成 JSON 就行,二十分钟搞定。
3. **新建独立 Blazor 项目**:`dotnet new blazorwasm`,加 `Microsoft.FluentUI.AspNetCore.Components`,拉 JSON,渲页面。
4. **CI 串起来**:GitHub Actions 把 Blazor 产物塞进 Hexo `public/`,改 base href,完事。

最后对比图放这里——**这是换之前的 NexT**(就是开头那张),而你正在看的,就是换之后的 FluentNext。哪个更好看?各有各的味道;但 FluentNext 至少**是我亲手用 C# 写的**——这就够了 awa~

> 本文提到的所有源码都在 `X-CODER-ocs/blog`(后端)+ `X-CODER-ocs/fluentnext-frontend`(前端)两个仓库。CI 配好的话,改 Markdown 推送就会自动触发前端重新构建并部署。评论区见~

(广?!广?!)

```

(看到这里就说明你在认真读 qwq,谢谢你)