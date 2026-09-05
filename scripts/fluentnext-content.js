'use strict';

/*
 * FluentNext 后端：把 Hexo 当成「内容 API」。
 * 注册一个 generator，在 `hexo generate` 时输出 public/api/content.json，
 * 供 Blazor WebAssembly 前端（FluentNext 主题）消费。
 *
 * 输出结构：
 *   site      : 站点信息（title / description / url / menu）
 *   posts     : 全部文章全文（HTML，已注入与 TOC 一致的标题 id），每篇含 toc[]
 *   categories: 分类统计（name / slug / count）
 *   tags      : 标签统计（name / slug / count）
 *   archives  : 按年→月的归档统计
 *
 * 该文件属于「真正的 Hexo 后端」：前端不再依赖 wwwroot 里的 mock 数据，
 * 而是部署时直接读取 Hexo 生成的 api/content.json。
 */

hexo.extend.generator.register('fluentnext-content', function (locals) {
  const site = hexo.config;

  // ---- 文章列表（按日期倒序） ----
  const posts = locals.posts.sort('-date').map(function (p) {
    const built = buildToc(p.content || '');
    return {
      title: p.title || '',
      slug: p.slug || '',
      permalink: p.permalink || '',
      date: toIso(p.date),
      updated: toIso(p.updated),
      excerpt: makeExcerpt(built.content),
      // 正文 HTML（已重写标题 id，与 toc 一一对应）
      content: built.content,
      // 文章目录（h2~h4）
      toc: built.toc,
      categories: names(p.categories),
      tags: names(p.tags)
    };
  });

  // ---- 分类 / 标签计数（自己统计，避免依赖 taxonomy 内部 API） ----
  const catCount = {};
  const tagCount = {};
  posts.forEach(function (p) {
    p.categories.forEach(function (c) { catCount[c] = (catCount[c] || 0) + 1; });
    p.tags.forEach(function (t) { tagCount[t] = (tagCount[t] || 0) + 1; });
  });

  const categories = Object.keys(catCount)
    .map(function (name) { return { name: name, slug: name, count: catCount[name] }; })
    .sort(function (a, b) { return b.count - a.count; });

  const tags = Object.keys(tagCount)
    .map(function (name) { return { name: name, slug: name, count: tagCount[name] }; })
    .sort(function (a, b) { return b.count - a.count; });

  // ---- 归档（按年 → 月） ----
  const arch = {};
  posts.forEach(function (p) {
    const d = p.date ? new Date(p.date) : null;
    if (!d || isNaN(d.getTime())) return;
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    arch[y] = arch[y] || { year: y, count: 0, months: {} };
    arch[y].count += 1;
    arch[y].months[m] = (arch[y].months[m] || 0) + 1;
  });
  const archives = Object.keys(arch)
    .map(function (y) {
      const a = arch[y];
      const months = Object.keys(a.months)
        .map(function (m) { return { month: parseInt(m, 10), count: a.months[m] }; })
        .sort(function (x, z) { return z.month - x.month; });
      return { year: a.year, count: a.count, months: months };
    })
    .sort(function (x, z) { return z.year - x.year; });

  const data = {
    site: {
      title: site.title || 'X-CODER',
      description: site.description || '',
      url: site.url || '',
      menu: (site.fluentnext && site.fluentnext.menu) || []
    },
    posts: posts,
    categories: categories,
    tags: tags,
    archives: archives
  };

  return {
    path: 'api/content.json',
    data: JSON.stringify(data, null, 2)
  };
});

// ---------- 辅助函数 ----------

function toIso(m) {
  if (!m) return '';
  try {
    return (typeof m.toISOString === 'function') ? m.toISOString() : new Date(m).toISOString();
  } catch (e) {
    return '';
  }
}

function names(tax) {
  if (!tax) return [];
  const arr = tax.data ? tax.data : (Array.isArray(tax) ? tax : []);
  return arr.map(function (x) { return (x && x.name) ? x.name : String(x); });
}

function makeExcerpt(html, max) {
  max = max || 120;
  const text = String(html)
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max) + '…' : text;
}

// 生成稳定的锚点 id（保留中文，小写，空格转 -）
function toId(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w一-龥-]/g, '');
}

// 解析文章 HTML 中的 h2~h4，提取 TOC 并「重写标题 id」保证与正文锚点一致
function buildToc(content) {
  const toc = [];
  const seen = {};
  const re = /<h([2-4])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi;

  const out = content.replace(re, function (m, lvl, attrs, inner) {
    // 去掉 markdown-it-anchor 注入的 permalink <a>（含 ¶ 符号）
    const cleanInner = inner.replace(/<a[^>]*class="header-anchor"[^>]*>[\s\S]*?<\/a>/gi, '');
    const text = cleanInner.replace(/<[^>]+>/g, '').replace(/¶/g, '').trim();
    if (!text) return m;

    let id = toId(text);
    if (seen[id]) {
      seen[id] += 1;
      id = id + '-' + seen[id];
    } else {
      seen[id] = 1;
    }
    toc.push({ level: parseInt(lvl, 10), text: text, id: id });

    const cleanAttrs = (attrs || '').replace(/\s+id="[^"]*"/i, '');
    return '<h' + lvl + ' id="' + id + '"' + cleanAttrs + '>' + cleanInner + '</h' + lvl + '>';
  });

  return { toc: toc, content: out };
}
