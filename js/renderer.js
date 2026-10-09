// ==================== HeAn/js/renderer.js — Tiptap JSON 文档模型渲染层 ====================
// 后端只存 Tiptap JSON（ProseMirror 文档模型），HeAn 个人网站在此将其渲染为 HTML。
// 纯前端、无外部依赖（不再依赖 marked CDN），并对输出做轻量安全过滤（sanitize）。
// 逻辑与 admin/common/wysiwyg.js 的 JSON→HTML 保持一致。

// ---------- HTML 转义 ----------
function heanEscapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 允许的标签与对应 HTML 标签映射
const HEAN_ALLOWED = {
    doc: true, paragraph: true, heading: true, blockquote: true,
    bulletList: true, orderedList: true, listItem: true, codeBlock: true,
    horizontalRule: true, image: true, text: true,
    // 表格（与 admin/common/wysiwyg.js 的 JSON→HTML 保持一致）
    table: true, tableRow: true, tableHeader: true, tableCell: true,
};

// ---------- 危险属性/协议过滤（轻量 sanitize） ----------
function heanSanitizeAttrs(attrs, tag) {
    const out = {};
    if (!attrs) return out;
    // 仅保留必要属性
    const allow = {
        heading: ['level', 'textAlign'],
        paragraph: ['textAlign'],
        image: ['src', 'alt', 'title'],
        link: ['href'],
        codeBlock: ['language'],
        text: [],
    };
    const allowedKeys = allow[tag] || [];
    allowedKeys.forEach(function (k) {
        if (attrs[k] != null) out[k] = attrs[k];
    });
    // 把 textAlign 转成安全 inline style
    if (out.textAlign && ['left', 'center', 'right', 'justify'].indexOf(out.textAlign) >= 0) {
        out.style = heanSanitizeStyle('text-align:' + out.textAlign);
    }
    delete out.textAlign;
    // href/src 过滤 javascript: 协议
    ['href', 'src'].forEach(function (k) {
        if (out[k] && /^\s*javascript:/i.test(String(out[k]))) delete out[k];
    });
    return out;
}

// 允许的 CSS 属性白名单（仅排版相关，杜绝 expression/url() 注入）
const HEAN_SAFE_CSS = ['color', 'background-color', 'background', 'font-size', 'font-family', 'line-height', 'letter-spacing', 'text-align', 'font-weight', 'font-style', 'text-decoration'];

// 过滤 style 字符串，仅保留白名单内的安全 CSS 声明，剔除 javascript:/expression/url() 等危险内容
function heanSanitizeStyle(styleStr) {
    if (!styleStr) return '';
    const decls = String(styleStr).split(';');
    const kept = [];
    for (let i = 0; i < decls.length; i++) {
        const d = decls[i].trim();
        if (!d) continue;
        if (/url\s*\(|expression\s*\(|javascript:/i.test(d)) continue; // 阻断 url()/expression/javascript:
        const ci = d.indexOf(':');
        if (ci < 0) continue;
        const prop = d.slice(0, ci).trim().toLowerCase();
        const val = d.slice(ci + 1).trim();
        if (HEAN_SAFE_CSS.indexOf(prop) < 0) continue;
        // 最终兜底：值里不允许出现 < 等可能闭合标签的字符
        if (/[<>]/.test(val)) continue;
        kept.push(prop + ':' + val);
    }
    return kept.join(';');
}

// 过滤危险 URL 协议（如 javascript:），返回安全 URL 或空串
function heanSanitizeUrl(url) {
    const u = String(url || '');
    if (/^\s*(javascript|data|vbscript):/i.test(u)) return '';
    return u;
}

// 把 text 节点上的 textStyle mark 的样式属性提取为安全 style 串
function heanTextStyleToCss(mkAttrs) {
    if (!mkAttrs) return '';
    const parts = [];
    if (mkAttrs.color) parts.push('color:' + mkAttrs.color);
    if (mkAttrs.backgroundColor) parts.push('background-color:' + mkAttrs.backgroundColor);
    if (mkAttrs.fontSize) parts.push('font-size:' + mkAttrs.fontSize);
    if (mkAttrs.fontFamily) parts.push('font-family:' + mkAttrs.fontFamily);
    if (mkAttrs.lineHeight) parts.push('line-height:' + mkAttrs.lineHeight);
    if (mkAttrs.letterSpacing) parts.push('letter-spacing:' + mkAttrs.letterSpacing);
    return heanSanitizeStyle(parts.join(';'));
}

// ---------- Tiptap JSON -> HTML ----------
function tiptapJsonToHtml(doc) {
    if (!doc || !doc.content) return '';
    return doc.content.map(jsonNodeToHtml).join('');
}
function jsonNodeToHtml(node) {
    if (!node || !HEAN_ALLOWED[node.type]) return '';
    const type = node.type;
    const inner = (node.content || []).map(jsonNodeToHtml).join('');
    const attrs = heanSanitizeAttrs(node.attrs, type);
    switch (type) {
        case 'heading': {
            const level = attrs.level || 2;
            const style = attrs.style ? ` style="${attrs.style}"` : '';
            return `<h${level}${style}>${inner}</h${level}>`;
        }
        case 'paragraph': {
            const style = attrs.style ? ` style="${attrs.style}"` : '';
            return `<p${style}>${inner}</p>`;
        }
        case 'bulletList':
            return `<ul>${inner}</ul>`;
        case 'orderedList':
            return `<ol>${inner}</ol>`;
        case 'listItem':
            return `<li>${inner}</li>`;
        case 'blockquote':
            return `<blockquote>${inner}</blockquote>`;
        case 'codeBlock': {
            const lang = attrs.language ? ` class="language-${attrs.language}"` : '';
            // ⚠️ inner 里的 text 节点在第 151 行已按 heanEscapeHtml 转义过 ✓
            //    这里【绝不能】再转义一次：会把 &quot; 变成 &amp;quot; ✗
            //    → 页面就会显示出字面的 &quot; （实测 17 个页面、约 1000 处 ✗）
            return `<pre><code${lang}>${inner}</code></pre>`;
        }
        case 'horizontalRule':
            return '<hr>';
        case 'table': {
            const trs = node.content || [];
            const head = trs[0] ? jsonNodeToHtml(trs[0]) : '';
            const body = trs.slice(1).map(jsonNodeToHtml).join('');
            return `<table class="hean-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
        }
        case 'tableRow':
            return `<tr>${inner}</tr>`;
        case 'tableHeader':
            return `<th>${inner}</th>`;
        case 'tableCell':
            return `<td>${inner}</td>`;
        case 'image': {
            const src = attrs.src || '';
            const alt = attrs.alt || '';
            return `<img src="${src}" alt="${alt}" style="max-width:100%;border-radius:8px;">`;
        }
        case 'text': {
            let t = heanEscapeHtml(node.text || '');
            (node.marks || []).forEach(function (mk) {
                if (!mt(mk.type)) return;
                if (mk.type === 'bold') t = `<strong>${t}</strong>`;
                else if (mk.type === 'italic') t = `<em>${t}</em>`;
                else if (mk.type === 'code') t = `<code>${t}</code>`;
                else                 if (mk.type === 'link') t = `<a href="${heanSanitizeUrl(mk.attrs && mk.attrs.href)}" target="_blank" rel="noopener">${t}</a>`;
                else if (mk.type === 'textStyle') {
                    const css = heanTextStyleToCss(mk.attrs);
                    if (css) t = `<span style="${css}">${t}</span>`;
                } else if (mk.type === 'highlight') t = `<mark>${t}</mark>`;
            });
            return t;
        }
        default:
            return inner;
    }
}
// mark 类型允许白名单（与节点白名单共用 HEAN_ALLOWED 的语义：用 link/bold/italic/code/textStyle 作为键）
function mt(name) { return ['bold', 'italic', 'code', 'link', 'textStyle', 'underline', 'strike', 'highlight'].indexOf(name) >= 0; }

// ---------- 解析已存 JSON 字符串（容错） ----------
function parseTiptapJson(str) {
    if (!str) return null;
    try {
        const d = JSON.parse(str);
        if (d && d.type === 'doc') return d;
        // ⚠️ 兼容「裸数组」格式（历史 / 导入数据 ✗）
        //    实测文章 54、55 的 content 就是 [{…}] ✗ → 以前返回 null ✗ → 正文渲染成空白页 ✗
        //    2026-10-09 修复 ✓（与 Python 侧 parse_tiptap_json 同步 ✓）
        if (Array.isArray(d)) return { type: 'doc', content: d };
    } catch (e) {}
    return null;
}

// ---------- Tiptap JSON -> 纯文本（用于卡片摘要、列表截断展示） ----------
function tiptapJsonToPlainText(doc) {
    if (!doc || !doc.content) return '';
    const walk = (nodes) => (nodes || []).map(function (n) {
        if (n.type === 'text') return n.text || '';
        if (n.content) return walk(n.content);
        return '';
    }).join('');
    return walk(doc.content).replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
}

// ---------- 兼容历史数据：段落里的 markdown 管道文本 → table 节点 ----------
// 把「整段就是 markdown 表格」的文本解析成 Tiptap table 节点；非表格返回 null。
function parseMarkdownTableBlock(text) {
    if (!text || text.indexOf('|') < 0 || text.indexOf('\n') < 0) return null;
    const lines = text.replace(/\r\n/g, '\n').split('\n')
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s; });
    if (lines.length < 3 || lines[0].indexOf('|') < 0) return null;
    if (lines[1].indexOf('|') < 0) return null;
    if (!/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(lines[1])) return null;
    const splitRow = function (s) {
        let t = s.trim();
        if (t.charAt(0) === '|') t = t.slice(1);
        if (t.charAt(t.length - 1) === '|') t = t.slice(0, -1);
        return t.split('|').map(function (c) { return c.trim(); });
    };
    const header = splitRow(lines[0]);
    if (header.length < 2) return null;
    const mkCell = function (type, txt) {
        return { type: type, content: [{ type: 'paragraph', content: txt ? [{ type: 'text', text: txt }] : [] }] };
    };
    const cols = header.length;
    const rows = [{ type: 'tableRow', content: header.map(function (c) { return mkCell('tableHeader', c); }) }];
    lines.slice(2).forEach(function (line) {
        const cells = splitRow(line);
        const rowCells = [];
        for (let i = 0; i < cols; i++) rowCells.push(mkCell('tableCell', cells[i] || ''));
        rows.push({ type: 'tableRow', content: rowCells });
    });
    return { type: 'table', content: rows };
}

// 遍历文档顶层节点，把「整段是 markdown 表格」的段落替换为真正的 table 节点（就地修改并返回 doc）
function normalizeMarkdownTables(doc) {
    if (!doc || doc.type !== 'doc' || !Array.isArray(doc.content)) return doc;
    const out = [];
    for (let i = 0; i < doc.content.length; i++) {
        const node = doc.content[i];
        if (node && node.type === 'paragraph' && Array.isArray(node.content) && node.content.length) {
            const allText = node.content.every(function (c) { return c.type === 'text'; });
            if (allText) {
                const text = node.content.map(function (c) { return c.text || ''; }).join('');
                const table = parseMarkdownTableBlock(text);
                if (table) { out.push(table); continue; }
            }
        }
        out.push(node);
    }
    doc.content = out;
    return doc;
}

// ---------- 主入口：渲染正文内容 ----------
// content 为 Tiptap JSON 文档模型字符串（后端唯一存储格式），转 HTML 后返回。
// 返回可直接 innerHTML 的安全 HTML 字符串。
function renderContent(content, fallbackEmpty) {
    if (!content) return fallbackEmpty || '';
    const doc = parseTiptapJson(content);
    if (doc) return tiptapJsonToHtml(normalizeMarkdownTables(doc));
    return fallbackEmpty || '';
}
