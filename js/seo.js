/**
 * HeAn 统一 SEO 单点（全站标题/描述/规范链接/分享卡片/结构化数据都走这里）
 *
 * ⚠️ 与项目「全站统一 UI 必须抽离为单点」的约束一致：禁止各页面各写一份 SEO 逻辑 ✗
 *
 * 分工：
 *   静态页（首页/列表页/关于）→ 在 <head> 里【写死】canonical + og（爬虫不执行 JS 也能读到 ✓）
 *   详情页（博客/专题/产品）  → 内容由 JS 渲染，加载完后调用 HeAnSeo.apply({...}) 覆盖 ✓
 *
 * 用法：
 *   HeAnSeo.apply({ title, description, image, url, type, jsonLd })
 */
(function () {
    'use strict';

    /**
     * 站点显示名（⚠️ 不硬编码）：唯一来源是 views.js 的 siteDisplayName()
     * （后台「网站配置」的 site_name → localStorage 缓存 → config.js 静态兜底 ✓）
     */
    function siteName() {
        if (typeof siteDisplayName === 'function') return siteDisplayName();
        return (typeof SITE !== 'undefined' && SITE.name) || '禾安';
    }
    // 兜底分享图：1200×630 品牌封面（微信等对 svg 卡片图支持差，故用 PNG ✓）
    var DEFAULT_IMAGE = '/assets/img/og-cover.png';
    // 允许保留在规范 URL 里的业务参数；其余（from / theme / utm_* 等）一律剔除，避免同一内容被算成多个页面 ✗
    var KEEP_PARAMS = ['id', 'series', 'article'];

    function siteOrigin() {
        return location.origin;
    }

    /** 相对路径 → 绝对 URL（og:image / og:url 必须是绝对地址 ✓） */
    function absolutize(p) {
        if (!p) return '';
        if (/^https?:\/\//i.test(p)) return p;
        return siteOrigin() + (p.charAt(0) === '/' ? p : '/' + p);
    }

    /**
     * 规范 URL：去掉 from / theme 等非业务参数；
     * index.html 归一为目录（/index.html → /，/blog/index.html → /blog/），与 sitemap 的写法一致 ✓
     */
    function canonicalUrl() {
        var u = new URL(location.href);
        var keep = new URLSearchParams();
        KEEP_PARAMS.forEach(function (k) {
            if (u.searchParams.has(k)) keep.set(k, u.searchParams.get(k));
        });
        var qs = keep.toString();
        return u.origin + u.pathname.replace(/index\.html$/, '') + (qs ? '?' + qs : '');
    }

    function upsertMeta(attr, key, content) {
        if (!content) return;
        var el = document.head.querySelector('meta[' + attr + '="' + key + '"]');
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute(attr, key);
            document.head.appendChild(el);
        }
        el.setAttribute('content', content);
    }

    function upsertLink(rel, href) {
        var el = document.head.querySelector('link[rel="' + rel + '"]');
        if (!el) {
            el = document.createElement('link');
            el.setAttribute('rel', rel);
            document.head.appendChild(el);
        }
        el.setAttribute('href', href);
    }

    /** 写入/覆盖 JSON-LD 结构化数据（同一页只保留一条，避免重复 ✗） */
    function applyJsonLd(obj) {
        if (!obj) return;
        var el = document.getElementById('seo-jsonld');
        if (!el) {
            // ⚠️ 预渲染页里已经烤进了一条 <script type="application/ld+json">，但它【没有 id】——
            //    若这里直接新建，页面就会同时存在两条重复的 JSON-LD ✗（实测 /blog/6/ 出现 2 条）。
            //    这里复用页面里已存在的第一条并认领它 → 全页恒为 1 条 ✓
            el = document.head.querySelector('script[type="application/ld+json"]')
              || document.querySelector('script[type="application/ld+json"]');
            if (el) el.id = 'seo-jsonld';
        }
        if (!el) {
            el = document.createElement('script');
            el.type = 'application/ld+json';
            el.id = 'seo-jsonld';
            document.head.appendChild(el);
        }
        el.textContent = JSON.stringify(obj);
    }

    /** 统一入口：写入 title / description / canonical / og / twitter（有 jsonLd 则一并写） */
    function apply(opts) {
        opts = opts || {};
        var title = opts.title || document.title;
        var descEl = document.head.querySelector('meta[name="description"]');
        var desc = opts.description || (descEl ? descEl.getAttribute('content') : '') || '';
        var url = opts.url || canonicalUrl();
        var image = absolutize(opts.image || DEFAULT_IMAGE);
        var type = opts.type || 'website';

        if (opts.title) document.title = opts.title;

        upsertMeta('name', 'description', desc);
        upsertLink('canonical', url);

        upsertMeta('property', 'og:site_name', siteName());
        upsertMeta('property', 'og:type', type);
        upsertMeta('property', 'og:title', title);
        upsertMeta('property', 'og:description', desc);
        upsertMeta('property', 'og:url', url);
        upsertMeta('property', 'og:image', image);

        upsertMeta('name', 'twitter:card', 'summary_large_image');
        upsertMeta('name', 'twitter:title', title);
        upsertMeta('name', 'twitter:description', desc);
        upsertMeta('name', 'twitter:image', image);

        applyJsonLd(opts.jsonLd);
    }

    // ---------------- JSON-LD 构造器（结构化数据，争取搜索结果富摘要） ----------------

    /** 首页：WebSite */
    function websiteJsonLd(description) {
        return {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: siteName(),
            alternateName: 'hacore.cn',
            url: siteOrigin() + '/',
            description: description || ''
        };
    }

    /** 首页 / 关于页：Person（站点作者） */
    function personJsonLd(about) {
        about = about || {};
        return {
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: siteName(),
            url: siteOrigin() + '/about/',
            jobTitle: about.job_title || '独立开发者',
            description: about.bio || '',
            knowsAbout: about.tech_stacks || []
        };
    }

    /** 详情页：BlogPosting（博客文章） */
    function articleJsonLd(o) {
        o = o || {};
        return {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: o.title || '',
            description: o.description || '',
            image: absolutize(o.image),
            datePublished: o.date || '',
            dateModified: o.date || '',
            author: { '@type': 'Person', name: siteName(), url: siteOrigin() + '/about/' },
            publisher: { '@type': 'Organization', name: siteName(), url: siteOrigin() + '/' },
            mainEntityOfPage: { '@type': 'WebPage', '@id': o.url || canonicalUrl() },
            keywords: o.tags || []
        };
    }

    /** 详情页：SoftwareApplication（产品；本站产品都是"能用的东西"） */
    function productJsonLd(o) {
        o = o || {};
        var app = {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: o.title || '',
            description: o.description || '',
            image: absolutize(o.image),
            url: o.url || canonicalUrl(),
            applicationCategory: 'WebApplication',
            operatingSystem: 'Any',
            author: { '@type': 'Person', name: siteName(), url: siteOrigin() + '/about/' }
        };
        if (o.version) app.softwareVersion = o.version;
        if (o.date) app.datePublished = o.date;
        return app;
    }

    /** 详情页：LearningSeries 用 Course（专题看做课程） */
    function courseJsonLd(o) {
        o = o || {};
        return {
            '@context': 'https://schema.org',
            '@type': 'Course',
            name: o.title || '',
            description: o.description || '',
            image: absolutize(o.image),
            url: o.url || canonicalUrl(),
            provider: { '@type': 'Person', name: siteName(), url: siteOrigin() + '/about/' }
        };
    }

    /**
     * 把「Tiptap JSON / 纯文本」统一转成纯文本摘要
     * ⚠️ 产品的 description 存的是 Tiptap JSON，直接当摘要会写进一堆 JSON 字符串 ✗
     */
    function plainText(v) {
        if (!v) return '';
        if (typeof v === 'string') {
            var doc = (typeof parseTiptapJson === 'function') ? parseTiptapJson(v) : null;
            if (doc && typeof tiptapJsonToPlainText === 'function') return tiptapJsonToPlainText(doc) || '';
            return v;
        }
        return (typeof tiptapJsonToPlainText === 'function') ? (tiptapJsonToPlainText(v) || '') : '';
    }

    window.HeAnSeo = {
        siteName: siteName,
        apply: apply,
        canonicalUrl: canonicalUrl,
        absolutize: absolutize,
        plainText: plainText,
        jsonLd: {
            website: websiteJsonLd,
            person: personJsonLd,
            article: articleJsonLd,
            product: productJsonLd,
            course: courseJsonLd
        }
    };
})();
