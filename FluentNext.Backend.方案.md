# FluentNext 后端重构方案：用 .NET 重写「类 Hexo 内容后端」

> 状态：方案稿（待你确认后进入实现）
> 作者：WorkBuddy × 仓仓
> 日期：2026-09-27

---

## 1. 背景与目标

你现在这套博客是 **「Hexo 当后端（只产 `content.json`）+ Blazor WASM 当前端 + CI 里一堆 sed/rsync/`hexo deploy` 缝合脚本」**。你原话："这套猪肉的方案太混乱了"。

目标：**用 .NET 把 Hexo 那一层彻底替掉**，让整条内容链路纯 .NET，CI 大幅简化，前端 Blazor **一行不改**。

已确认的事实（调研结论，不是拍脑袋）：
- 前端 `ContentService` 只吃 `api/content.json`，且 `PropertyNameCaseInsensitive = true`（字段名大小写不敏感）。
- 前端**不依赖** `search.xml`（Grep 全仓库零命中；站内搜索走 `content.json` 全文）。
- 前端**不消费** `content.json.site.menu`（菜单硬编码在 `wwwroot/appsettings.json`）。
- 前端 `Post.razor` 把 `content` HTML 整体注入，图片 `images/xxx.png` 靠 `<base href="/blog/">` 相对解析 → `/blog/images/xxx.png`。
- 现有文章是**标准 Markdown**，无 Hexo 专有语法（`{% %}` / `{{ }}`），可无缝迁移。

---

## 2. 现状痛点（"猪肉"具体指什么）

| 痛点 | 说明 |
| --- | --- |
| 双语言栈 | 内容后端是 Node/Hexo，前端是 .NET/Blazor，你本命是 .NET，Hexo 纯属额外负担 |
| CI 缝合怪 | 一个 `pages.yml` 里混了 npm ci / hexo clean / hexo generate / hexo deploy / 一堆 sed 改 base href + 指纹 + 404 重定向注入 + PWA 清理 + Bing 推送 |
| Hexo 幽灵页清理 | 每次要 `rm -rf public/20xx public/categories ...` 删掉 Hexo 渲染出的"幽灵"静态页，再 rsync 前端覆盖，极易出 bug |
| 旧 NexT PWA 残留 | `service-worker.js` / `workbox-*.js` 反复被 Hexo 插件写回，要多次清理，否则劫持 Blazor 缓存 |
| 搜索引擎推送耦合 Hexo | Bing 推送依赖 `hexo deploy --skip-generate` 和 `hexo-submit-urls-to-search-engine` 插件 |
| 依赖膨胀 | `package.json` / `node_modules` / `themes/` / `scaffolds/` / `scripts/` 一堆只服务于"产一个 JSON" |

**重构后**：删掉上面所有 Node/Hexo 部分，只留一个 .NET 控制台程序读 Markdown → 产 `content.json` + `atom.xml` + `sitemap.xml` + 拷贝图片/验证文件。

---

## 3. 目标架构

```
┌─────────────────────────────────────────────────────────┐
│  博客仓库 X-CODER-ocs/blog（内容 + 部署）                  │
│                                                         │
│  source/_posts/*.md      ← 你写文章的地方（不变）          │
│  source/images/*.png     ← 图片资源（不变）               │
│  static/                 ← 搜索引擎验证文件（从 source/ 根搬过来）│
│  src/FluentNext.Backend/ ← ★ 新增：.NET 10 内容生成器      │
│  .github/workflows/      ← 改：去掉 Hexo，加 dotnet run   │
└───────────────┬─────────────────────────┬───────────────┘
                │ 读 Markdown + 配置        │ dotnet publish
                ▼                          ▼
        public/api/content.json    FluentNext.Frontend（Blazor WASM，独立仓库，不变）
        public/atom.xml  sitemap.xml       │
        public/images/*  static 文件        │ rsync 合并到 public/
                └──────────────┬───────────┘
                               ▼
                    GitHub Pages /blog/  （404.html SPA 兜底保留）
```

前端仓库 `fluentnext-frontend` **完全不动**，CI 仍单独 checkout 它并 `dotnet publish`。

---

## 4. 数据契约（必须精确复刻的 `content.json`）

线上 `content.json` 实测结构（**全部 camelCase**，这是反序列化的硬约束——System.Text.Json 默认 PascalCase，必须显式配 `JsonNamingPolicy.CamelCase`）：

| 层级 | 字段 | 类型 | 说明 |
| --- | --- | --- | --- |
| 顶层 | `site` | obj | `{ title, description, url, menu[] }` |
| 顶层 | `posts` | array | 文章列表（按 date 倒序） |
| 顶层 | `categories` | array | `{ name, slug, count }` |
| 顶层 | `tags` | array | `{ name, slug, count }` |
| 顶层 | `archives` | array | `{ year, count, months: [{ month, count }] }` |
| post | `title` | string | 标题 |
| post | `slug` | string | = 文件名去 `.md`（如 `sulfur-launcher`） |
| post | `permalink` | string | 绝对 URL：`{siteUrl}/post/{slug}/` |
| post | `date` | string | **UTC ISO 8601**，如 `2026-09-12T12:00:00.000Z` |
| post | `updated` | string | UTC ISO，Hexo 取文件 mtime；新后端同样取文件 LastWriteTimeUtc |
| post | `excerpt` | string | 正文纯文本前 220 字（无 `<!-- more -->` 时） |
| post | `content` | string | 正文 HTML（表格/代码块/引用/图片相对路径） |
| post | `toc` | array | `{ level, text, id }`，h2~h4，id 与正文标题锚点**一一对应** |
| post | `categories` / `tags` | string[] | 分类/标签名数组 |

> ⚠️ `license` 字段：front-matter 有，但现 `content.json` **没输出**（前端也没用）。新后端默认不输出，保持契约一致即可；若以后前端要显示 CC 协议，再加。

---

## 5. 新后端项目设计

### 5.1 技术选型（.NET 10）

| 用途 | 库 | 备注 |
| --- | --- | --- |
| Markdown → HTML | **Markdig** | 启用 `Footnote` / `Mark`(mark) / `Superscript` / `Subscript` / `TaskLists` / `AutoIdentifiers`（对应 Hexo markdown-it 那票插件） |
| YAML front-matter | **YamlDotNet** | 解析 `title/date/tags/categories/description` 等 |
| JSON 序列化 | System.Text.Json | 配 `CamelCase` + 自定义 DateTime 格式 `yyyy-MM-ddTHH:mm:ss.fffZ` |
| RSS (atom.xml) | **手工 XmlWriter** 或 `System.ServiceModel.Syndication` | 推荐手工拼，避免引入 WCF 系依赖；entry 内容用 `<content type="html">` + CDATA 包全文 HTML |

### 5.2 项目位置（待你拍板，推荐 A）

- **A（推荐）：放博客仓库内 `src/FluentNext.Backend/`**
  - 单仓库，你只管 `X-CODER-ocs/blog`；生成器与文章同仓，路径简单（相对读 `../source/_posts` 写 `../public`）。
  - CI 不用额外 checkout 后端仓库。
- B：独立仓库 `X-CODER-ocs/fluentnext-backend`，CI 同时 checkout 它 + blog + frontend。
  - 生成器可独立版本化/复用，但多一个仓库要维护。

### 5.3 输入 / 输出

```
输入：
  source/_posts/*.md          文章源（front-matter + Markdown）
  source/images/              图片（直接拷贝，不解析）
  static/                     搜索引擎验证文件（BingSiteAuth.xml / google*.html / baidu_verify_*.html）
  backend-config.json         站点配置（见 §7）

输出（全部进 public/）：
  public/api/content.json     ★ 前端唯一依赖
  public/atom.xml             RSS 全文（前端 feedUrl 指向它）
  public/sitemap.xml          搜索引擎收录
  public/images/*             图片（原样拷贝）
  public/{验证文件}           根目录验证文件（官方要求永久保留）
  public/urls.txt             （可选）Bing IndexNow 推送用的 URL 列表
```

### 5.4 处理流程（Program.cs 主线）

1. 读 `backend-config.json` → 拿到 `siteUrl` / `title` / `excerptLength` / `timezone` 等。
2. 遍历 `source/_posts/*.md`：
   - 用 `---` 分隔拆 front-matter（YamlDotNet 解析）与正文。
   - `slug` = 文件名去扩展名。
   - `date` = front-matter `date`（按 config 时区解析为本地）→ 转 **UTC**。
   - `updated` = 文件 `LastWriteTimeUtc`（对齐 Hexo `updated_option: mtime`）。
   - 用 Markdig 渲染正文 → HTML；**同时收集 h2~h4 生成 TOC**（id 用 Markdig `AutoIdentifiers` 算法，保证与正文标题锚点一致）。
   - `excerpt` = 剥掉 HTML 标签取纯文本，按 `excerptLength`（220）截断，**不在标签中间切**。
   - `permalink` = `{siteUrl}/post/{slug}/`。
   - 聚合 `categories` / `tags` / `archives` 统计。
3. 序列化 `content.json`（camelCase）。
4. 生成 `atom.xml`（每篇 entry：绝对 link + `<content type="html"><![CDATA[ 全文 HTML ]]></content>`）。
5. 生成 `sitemap.xml`（列出全部 post 绝对 URL）。
6. 拷贝 `source/images/` → `public/images/`。
7. 拷贝 `static/` 验证文件 → `public/` 根。
8. （可选）写 `urls.txt`。

### 5.5 关键实现要点（坑位清单）

- **camelCase 序列化**：否则前端 `ContentService` 虽 case-insensitive 能容错，但为与历史契约 100% 一致必须 camelCase。
- **DateTime 格式**：必须 `yyyy-MM-ddTHH:mm:ss.fffZ`（带毫秒 + Z），与线上现有格式逐字节一致。
- **中文标题锚点 id**：Markdig `AutoIdentifiers` 默认对中文可能生成空 slug。需配置 `AutoIdentifierOptions.GitHub` 或自定义 slugifier（中文保留、空格/标点转 `-`），且 **TOC id 与正文 `<hN id>` 必须同源生成**，否则前端 TOC 跳转失效。
- **图片相对路径**：正文里 `images/xxx.png` **保持原样**不动（靠前端 base href 解析）；生成器只负责把 `source/images/` 原样拷到 `public/images/`。不要改成绝对路径。
- **代码块**：Markdig 输出 `<pre><code class="language-xxx">`，前端 `theme.js` 的 MutationObserver 会自动 `hljs.highlightElement`，无需生成器加 hljs 类。
- **时区**：front-matter `date` 是 `Asia/Shanghai` 本地时间，输出前转 UTC。config 里写死 `timezone: Asia/Shanghai` 即可。

---

## 6. 配置：`backend-config.json`（替代 Hexo `_config.yml` 的博客段）

```json
{
  "site": {
    "title": "X-CODER",
    "description": "X-CODER 的技术博客，分享编程、开发、开源等相关内容。",
    "url": "https://x-coder-ocs.github.io/blog",
    "author": "X-CODER",
    "timezone": "Asia/Shanghai",
    "language": "zh-CN"
  },
  "posts": {
    "sourceDir": "source/_posts",
    "imagesDir": "source/images",
    "excerptLength": 220
  },
  "feed": {
    "path": "atom.xml",
    "title": "X-CODER",
    "language": "zh-CN"
  },
  "sitemap": { "path": "sitemap.xml" },
  "authFilesDir": "static",
  "outputDir": "public"
}
```

> 菜单不用放这里（前端硬编码在 `appsettings.json`）。若以后想配置驱动，再加 `menu` 段。

---

## 7. CI 改造（`pages.yml`）

**删除**：`Setup Node.js` / `npm ci` / `Clean Hexo` / `Build Hexo (content.json 后端)` / `hexo deploy --skip-generate` 整段 / 所有 Hexo 插件相关环境变量。

**新增**（在 `Setup .NET 10` 之后、`Copy FluentNext 前端到 public/` 之前）：

```yaml
- name: Build & Run FluentNext 内容后端 (.NET)
  run: |
    dotnet run --project src/FluentNext.Backend/FluentNext.Backend.csproj -- \
      --input . --output public --config backend-config.json
```

**保留不变**：
- checkout blog + checkout fluentnext-frontend
- `dotnet publish` 前端 → `.fn-dist`
- 改写 base href `/blog/`、修 blazor 指纹、删 source map
- rsync 前端到 `public/`（排除 `/api`、`/images`、验证文件、`atom.xml`、`sitemap.xml`，这些由后端产，避免被覆盖）
- `404.html` SPA 兜底 + 重定向注入
- 验证文件守卫（仍校验 `public/BingSiteAuth.xml` 等存在且 <1000 字节）
- `upload-pages-artifact` + `deploy-pages`

**Bing 推送**（待确认，见 §9）：
- 方案甲：保留主动推送——CI 用 `curl` 把后端产的 `urls.txt` 提交到 Bing IndexNow API（需 `BING_TOKEN`）。
- 方案乙：只靠 `sitemap.xml`，Bing Webmaster 自动抓取，CI 彻底不碰推送。

---

## 8. 迁移路径（分步，可回退）

1. 在 blog 仓库建 `src/FluentNext.Backend/`（.NET 10 控制台）+ `backend-config.json`。
2. 本地跑生成器，拿产出的 `content.json` 与**线上现有** `content.json` 逐字段 diff（重点：字段名 camelCase、date 格式、toc id、excerpt）。
3. 把 `source/` 根的验证文件（`BingSiteAuth.xml` / `google*.html` / `baidu_verify_*.html`）移到 `static/`。
4. 改 `pages.yml`（去 Hexo，加 dotnet 生成器）。
5. 删除 Hexo 残留：`package.json`、`node_modules`、`themes/`、`scaffolds/`、`scripts/`、`_config.yml` 的 Hexo 专属段（保留 `_config.yml` 仅作记录或直接删，因为不再需要 Hexo）。
6. 推送，CI 跑，验证线上 `/blog/`、`/blog/api/content.json`、`/blog/atom.xml`、`/blog/sitemap.xml`、`/blog/images/...`。
7. 硬刷新清缓存（旧 base href / SW 残留）。

---

## 9. 风险与回退

| 风险 | 缓解 |
| --- | --- |
| 中文标题 TOC id 算法不一致 → 前端锚点跳转失效 | 生成器自统一 slugifier；迁移前本地对比线上 toc |
| Markdown 渲染 HTML 与 Hexo 略有差异 | 前端按自己 CSS 渲染，影响极小；代码块/表格/图片均标准 HTML |
| 某篇文章含 Hexo 专有语法（目前 6 篇均无） | 生成器加容错；遇到 `{%%}` 报 WARNING 跳过 |
| 前端"开屏崩"老问题（lib.module.js 加载顺序） | **与后端无关**，属前端 bug；可顺带修（把 `lib.module.js` 改非 module/提前），但不在本方案范围 |
| 新方案上线翻车 | 保留 Hexo 旧 CI 为 `pages-hexo.yml` 备份，回退只需切文件名 |

---

## 10. 待你确认的决策点

| # | 决策 | 我的推荐 |
| --- | --- | --- |
| 1 | 新后端放**博客仓库内** `src/FluentNext.Backend/` 还是**独立仓库** | 博客仓库内（单仓、路径简单） |
| 2 | Bing 推送：保留主动 IndexNow 还是只靠 sitemap | 只靠 sitemap（最简，Bing 能自动抓） |
| 3 | `search.xml`：省略（前端不用）还是产出兼容 | 省略（死重） |
| 4 | `content.json.site.menu`：省略还是保留 | 省略（前端不消费） |
| 5 | 是否顺便修前端"开屏崩"（lib.module.js 时序） | 单独排期，不阻塞本方案 |

---

确认上面 5 个决策点后，我就开始实现 `src/FluentNext.Backend/` + 改 `pages.yml`，先在本地跑通生成器、对比 `content.json` 再上线。
