---
title: 让搜索引擎主动来找我：Hexo 接入三合一收录推送的五个坑
date: 2026-09-05 14:30:00
tags:
  - Hexo
  - GitHub Actions
  - SEO
  - 搜索引擎收录
  - 博客搭建
categories:
  - 教程
license: CC BY 4.0（作者保留权利，允许署名转发与分发）
---

博客搭好、文章写完，然后呢？然后就是**没人看**。

原因很朴素：搜索引擎压根不知道你更新了。你发完文章，得等爬虫自己溜达过来，这个周期可能是几天，也可能是几周。对刚建的新站来说，基本等于「薛定谔的收录」qwq。

所以这次我给博客接上了**主动推送**：每次部署完，自动把新文章的链接推给百度、必应、Google，让它们立刻派人来抓。

听起来就是装个插件的事——**实际上踩了五个坑，一个比一个隐蔽**。尤其最后两个，CI 全程显示绿色成功，其实推送一直在失败。这篇就把它们全记下来。

## 选型：一个插件搞定三家

先说清楚要装什么：

| 插件 | 作用 |
| --- | --- |
| `hexo-submit-urls-to-search-engine` | 百度 + 必应 + Google **三合一**推送 |
| `hexo-generator-json-content` | 输出 `content.json`，相当于给自己留一个内容开放 API |

第一个插件有个**特别容易被忽略的机制**，我读源码才搞明白：

- 它是 **generator + deployer 双身份**——`hexo generate` 时只生成待推送列表 `public/urls.txt`，**真正发请求是在 `hexo deploy` 阶段**。
- 而绝大多数 Hexo + GitHub Pages 的 CI，只跑 `hexo generate` 然后 `actions/deploy-pages`，**从头到尾不会跑 `hexo deploy`**。

也就是说：插件装了、配置写了、CI 绿了，但**一条链接都没推送出去**。必须在 CI 里显式加一步 `npx hexo deploy`。

## 坑一：子路径站点的验证文件，放错目录就是双路径

搜索引擎要你证明站点是你的，方式是给一个验证文件，让你放到「站点根目录」。

我的博客地址是 `https://x-coder-ocs.github.io/blog/`——注意这个 `/blog` 后缀，它不是我主动加的，而是 **GitHub Pages 仓库名就叫 `blog`**，所以站点根天然就是 `/blog`。

于是我犯了个很自然的错误：既然站点根是 `/blog`，那我把验证文件放 `source/blog/` 不就完了？

**错了。** 结果线上出现了一个双 `/blog` 的路径：

| 文件位置 | 生成到 public | 线上实际 URL | 对不对 |
| --- | --- | --- | --- |
| `source/blog/BingSiteAuth.xml` | `public/blog/BingSiteAuth.xml` | `/blog/blog/BingSiteAuth.xml` | ✗ 双路径 |
| `source/BingSiteAuth.xml` | `public/BingSiteAuth.xml` | `/blog/BingSiteAuth.xml` | ✓ 正确 |

关键在于：`upload-pages-artifact` 上传的是整个 `public/` 目录，而 GitHub Pages **已经**把站点根映射到了 `/blog`。你再在 `source/` 里套一层 `blog/`，就变成 `/blog/blog/` 了。

**结论：子路径站点的静态验证文件，一律放 `source/` 根目录，不要放 `source/blog/`。**

## 坑二：Hexo 会把你的 .html 验证文件当成页面渲染

这个坑更阴。文件位置放对了，本地生成也看着正常，结果上线一查——**53 字节的纯文本变成了 13KB 的完整网页**。

原因是 Hexo 会把 `source/` 下的 `.html` 当作**页面**处理，给它套上整套主题模板。谷歌要的那行 `google-site-verification: xxx.html` 被淹没在一堆 `<div>` 里。

解法是 `skip_render`，让 Hexo 对这些文件原样复制、不做任何处理：

```yaml
# _config.yml
# 搜索引擎站点验证文件（Google / Bing / 百度）
# 官方要求：验证通过后文件须永久保留在站点根，删除会导致验证失效、收录被取消。
# ⚠️ 必须列入 skip_render，否则 hexo 会把 .html 当 page 套上主题模板，
#    输出完整网页，验证串被淹没导致验证失败。
skip_render:
  - 'google*.html'
  - 'BingSiteAuth.xml'
  - 'baidu_verify_*.html'
```

> 顺带一提：`.xml` 文件本来就不会被渲染，我把它也加进去纯粹是防御性配置，防止以后有人改配置改出问题。

## 坑三：GitHub Actions 的 `if` 里不能写 `secrets`

**这一个坑我栽了两次，而且第一次还判断错了原因。**

我的需求很朴素：「Secret 配了就推送，没配就跳过」。于是很自然地写成了：

```yaml
# ❌ 错误写法，会让整个 workflow 启动失败
- name: Submit URLs to search engines
  if: ${{ secrets.BING_TOKEN != '' }}
  run: npx hexo deploy
```

结果 CI 直接启动失败，报 `workflow file issue`。我当时以为是「引用了未定义的 Secret」导致的，于是把 Google 那步注释掉——**还是失败**。

真正的答案是：**GitHub Actions 压根不允许在 `if` 条件里使用 `secrets` context**。`if` 只支持 `github`、`needs`、`vars`、`inputs`、`env`、`steps`、`job`、`runner`、`matrix`、`strategy` 这些。

表现症状很有辨识度，记住这几个特征：

1. run 的名字从正常的工作流名，退化成**文件路径** `.github/workflows/pages.yml`；
2. 查 jobs 接口返回 `total_count: 0`——**一个 job 都没起来**；
3. 报错提示是 `This run likely failed because of a workflow file issue`。

正确写法是：**Secret 注入 `env`，在 shell 里判空**。

```yaml
# ✅ 正确写法
- name: Submit URLs to search engines
  continue-on-error: true
  env:
    BING_TOKEN: ${{ secrets.BING_TOKEN }}
  run: |
    if [ -z "$BING_TOKEN" ] && [ ! -f google-key.json ]; then
      echo "密钥均未配置，跳过推送"
      exit 0
    fi
    npx hexo deploy
```

## 坑四：`continue-on-error` 会让失败「看起来成功」

上面那段代码里有个 `continue-on-error: true`，我加它的本意是「推送失败也别阻断发版」——这个想法本身没错，但它带来一个严重的副作用：

**推送失败时，step 依然显示绿色 success。**

我被这个坑结结实实骗了一次。CI 全绿，我心想稳了，结果去翻日志才发现谷歌一直在报 403。

**教训：只要给推送步加了 `continue-on-error`，就绝不能用「绿勾」判断推送成败，必须看日志。**

## 坑五：Google 返回 403，`Failed to verify the URL ownership`

谷歌推送需要的是**服务账号的 JSON 私钥**，流程和必应拿一个 token 完全不是一个量级：

1. Google Cloud 建项目 → 启用 **Web Search Indexing API**
2. 建**服务账号** → 生成 **JSON 密钥**并下载
3. 把 JSON 的**全部内容**填进 GitHub Secret `GOOGLE_KEY_JSON`
4. **回 Search Console，把服务账号邮箱加为站点的「所有者」** ← 最容易漏

第 4 步漏掉的话，就会喜提这个错误：

```json
{
  "error": {
    "code": 403,
    "message": "Permission denied. Failed to verify the URL ownership.",
    "status": "PERMISSION_DENIED"
  }
}
```

意思很直白：**密钥是对的，token 也换到了，但谷歌不认这个服务账号对网站有所有权**。

排查时注意这几点：

- 加的必须是**你验证过的那个具体资源**（比如 `https://xxx.github.io/blog/`），不是根域名资源；
- 邮箱就是 JSON 里的 `client_email` 字段，形如 `xxx@项目id.iam.gserviceaccount.com`；
- **权限级别最容易翻车**，下面单独说。

### 权限必须选「拥有者」，选「完整」照样 403

GSC 给用户分三种权限：

| 权限级别 | 能否调用 Indexing API |
| --- | --- |
| **拥有者**（Owner） | ✅ 可以 |
| **完整**（Full user） | ❌ 不行，照样 403 |
| 受限（Restricted） | ❌ 不行 |

我第一遍就是加成了「**完整**」。这个坑的阴险之处在于：GSC 的「用户和权限」页面上**明明显示着这个服务账号存在、且拥有权限**，看上去一切都对，你根本不会怀疑是权限问题——但它就是一直 403 qwq。

**这比「压根忘了添加用户」难查得多**，因为前者你一眼就能看出漏了什么，后者界面上什么都不缺。

改回「拥有者」之后，响应立刻从报错变成了成功：

```json
{
  "urlNotificationMetadata": {
    "url": "https://xxx.github.io/blog/2026/09/03/hello-xcoder/"
  }
}
```

看到 **`urlNotificationMetadata`** 这个字段就说明推送成功了（失败时对应的是 `error`）。

> 另外提醒一句：那个 JSON 含私钥，**千万别提交进仓库**，也别放进项目目录——我这边是让 CI 从 Secret 动态生成文件的。

## 附赠：怎么从 CI 日志里挖出被脱敏的真相

GitHub 会自动脱敏日志里跟 Secret 相关的内容，我的谷歌响应被脱敏成了这样：

```
Google response:  ***
  error: ***
    code: 403,
    message: 'Permission denied. Failed to verify the URL ownership.',
    status: 'PERMISSION_DENIED'
```

注意——**外层被打了码，但 `code` / `message` / `status` 这些字段反而保留下来了**。所以哪怕响应整体被脱敏，也足够定位问题。

如果 `gh` 命令用不了，可以直接用 curl 拉日志：

```bash
TOKEN=$(gh auth token)
JOBID=<job 的 id>
curl -sL -H "Authorization: Bearer $TOKEN" \
  "https://api.github.com/repos/<owner>/<repo>/actions/jobs/$JOBID/logs" -o ci.log
```

⚠️ 一个反直觉的点：**这个接口返回的不是 zip，是纯文本**，别傻乎乎去解压，直接 grep 就行。

## 最后：验证文件要永久保留

谷歌和必应都明确说了：**验证通过后，验证文件也不能删**，删了会导致验证失效、收录被取消。

为了防止未来的我自己手贱删掉，我在 CI 里加了一道守卫：

```yaml
- name: Guard search engine auth files
  shell: bash
  run: |
    set -e
    # 用 bash 数组 + nullglob 收集验证文件：换名（换账户后哈希变化）无需改动本步
    shopt -s nullglob
    files=(public/BingSiteAuth.xml public/google*.html public/baidu_verify_*.html)
    for f in "${files[@]}"; do
      if [ ! -f "$f" ]; then
        echo "::error::缺少搜索引擎验证文件 $f（勿删，官方要求永久保留）"
        exit 1
      fi
      size=$(wc -c < "$f")
      if [ "$size" -gt 1000 ]; then
        echo "::error::$(basename "$f") 大小 ${size} 字节，疑似被渲染，检查 skip_render"
        exit 1
      fi
      echo "OK: $(basename "$f") (${size} 字节，纯文本)"
    done
```

它同时防两件事：**文件被误删**、**文件被渲染**（渲染后体积会暴涨到 13KB，一测就知道）。

这里还有个小坑：**一定要显式写 `shell: bash`**。我本地是 zsh，跑起来完全正常，但 zsh 和 bash 在 glob 展开、变量单词分割上行为不一致，不锁死 shell 迟早出事。

## 小结：一张 checklist

| 检查项 | 要点 |
| --- | --- |
| 插件机制 | 推送只在 `hexo deploy` 阶段发生，CI 必须显式跑 |
| 验证文件位置 | 子路径站点放 `source/` 根，**不是** `source/blog/` |
| 防渲染 | 验证文件必须进 `skip_render`，否则被套模板 |
| Secret 用法 | **绝不能**出现在 `if` 里，只能进 `env` |
| 成败判断 | 有 `continue-on-error` 就不能看绿勾，必须翻日志 |
| 谷歌授权 | 服务账号邮箱要在 GSC 里加成**拥有者**（「完整」权限不够，仍会 403） |
| 推送成功标志 | 必应看 `d: null`，谷歌看 `urlNotificationMetadata` |
| 文件保留 | 验证通过后永久保留，建议加 CI 守卫 |
| 排障手法 | 日志是纯文本，脱敏了也留着 `code` / `message` |

整套折腾下来，最大的感受是：**CI 的绿色是个很不靠谱的信号**。它会因为你写错一个 `if` 而直接不起来，也会因为 `continue-on-error` 而对失败视而不见。真正的真相，永远在日志里 awa。

---

本文记录于一次真实的「从零接通三引擎推送」过程，所有坑都是本人亲自踩的（踩了两遍的那种也有 qwq）。如果你也在给 Hexo 博客接收录推送，希望这篇能帮你省下几个小时。
