/**
 * HeAn 通用工具函数
 * 包含：分组徽章 HTML 生成、标签 HTML 生成、标签样式应用
 */

// 拼接标签内联样式：字号/粗细优先走后端配置，缺省由 CSS .tag-badge 兜底（默认不加粗）
function tagInlineStyle(entry) {
    if (!entry) return '';
    const style = [];
    if (entry.fontSize) style.push(`font-size:${entry.fontSize}`);
    if (entry.fontWeight) style.push(`font-weight:${entry.fontWeight}`);
    return style.length ? ` style="${style.join(';')}"` : '';
}

// 生成分组徽章（显示分组名；未分组显示「全部」，非 TAG_MAP 分组用默认中性样式）
function getGroupBadgeHtml(group) {
    // 未分组 / 空：显示「全部」
    if (!group || group === '未分组') {
        return '<span class="label-tag">全部</span>';
    }
    // 命中统一标签系统：彩色药丸徽章（含图标）
    if (TAG_MAP[group]) {
        const { icon, class: cls } = TAG_MAP[group];
        return `<span class="tag-badge ${cls}"${tagInlineStyle(TAG_MAP[group])}><i class="fas ${icon} mr-1"></i>${group}</span>`;
    }
    // 文件夹分组（非 TAG_MAP 标签）：默认中性样式显示分组名
    return `<span class="label-tag">${group}</span>`;
}

// 生成文章标签列表（矩形小圆角，用于详情页底部）
function getLabelsHtml(labels) {
    if (!labels || !labels.length) return '';
    return labels.map(label =>
        `<span class="label-tag">${label}</span>`
    ).join('');
}

// 卡片用：有分组则显示分组徽章（分类标签），未分组则回退显示文章标签；两者都没有则不显示
function getCardTagHtml(group, tags) {
    if (group && group !== '未分组') return getGroupBadgeHtml(group);
    return getLabelsHtml(tags);
}

// 应用分组颜色到元素（用于详情页顶部徽章）
function applyGroupColor(el, group) {
    if (!el || !TAG_MAP[group]) return;
    const { icon, class: cls } = TAG_MAP[group];
    el.className = `tag-badge ${cls}`;
    el.setAttribute('style', tagInlineStyle(TAG_MAP[group]).replace(/^ style="|"$/g, ''));
    el.innerHTML = `<i class="fas ${icon} mr-1"></i>${group}`;
}

// 兼容旧调用：保留 getTagsHtml 和 applyTagColor（默认取 tags[0] 作为分组）
function getTagsHtml(tags) {
    if (!tags || !tags.length) return '';
    const group = tags[0];
    if (!group || !TAG_MAP[group]) return '';
    const { icon, class: cls } = TAG_MAP[group];
    return `<span class="tag-badge ${cls}"${tagInlineStyle(TAG_MAP[group])}><i class="fas ${icon} mr-1"></i>${group}</span>`;
}

function applyTagColor(el, tag) {
    if (!el || !TAG_MAP[tag]) return;
    el.className = `tag-badge ${TAG_MAP[tag].class}`;
    el.setAttribute('style', tagInlineStyle(TAG_MAP[tag]).replace(/^ style="|"$/g, ''));
    el.textContent = tag;
}

// 生成标签列表（卡片上的多标签）：默认灰底灰字，选中态淡蓝底蓝字（无边框，两处项目卡统一）
// selected=true 表示「选中」语义（首页精选项目卡），否则默认态（项目列表卡）
function getTagListHtml(tags, selected = false) {
    if (!tags || !tags.length) return '';
    const cls = selected ? 'proj-tag proj-tag-selected' : 'proj-tag';
    return tags.map(tag => `<span class="${cls}">${tag}</span>`).join(' ');
}

// HTML 转义，防止 XSS
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * 解析项目卡片点击后的跳转目标（首页 / 项目列表页共用）。
 *
 * 规则（统一走「演示链接」，不再区分 App / Web）：
 *   有 demo_url → 新窗口打开产品（网站或应用商店都可以填在这里）
 *   没有 demo_url → 进项目详情页（兜底，避免点了没反应）
 *
 * @param {object} project    项目对象（含 demo_url）
 * @param {string} detailHref 兜底详情页链接
 * @returns {{href: string, external: boolean, label: string}}
 */
/**
 * 解析内容 ID —— 优先「真实路径」，回退「旧查询参数」
 *
 * 背景：详情页现在有两种 URL（都能用 ✓）
 *   新（预渲染）：/blog/6/、/projects/4/   ← 静态 HTML，爬虫能直接读到正文 ✓
 *   旧（兼容）  ：/blog/detail.html?id=6   ← 老外链/已收录页面不 404 ✓
 * 归一化靠 canonical：旧链接的 canonical 指向新路径 ✓（见 js/seo.js）
 *
 * @param {string} kind 路径片段：blog | projects
 * @returns {number} 内容 ID（解析不到返回 0）
 */
function resolveContentId(kind) {
    // ① 真实路径：/blog/6/ 或 /blog/6/index.html
    const m = location.pathname.match(new RegExp('/' + kind + '/(\\d+)(?:/|/index\\.html)?$'));
    if (m) return parseInt(m[1], 10) || 0;
    // ② 旧查询参数：?id=6
    const q = new URLSearchParams(location.search).get('id');
    return (q && parseInt(q, 10)) || 0;
}

/**
 * 解析专题 ID —— 优先「真实路径」，回退「旧查询参数」
 *   新（预渲染）：/topics/6/ 、/topics/6/5/   ← 静态 HTML，爬虫能直接读到正文 ✓
 *   旧（兼容）  ：/topics/detail.html?series=6
 * @returns {number} 专题 ID（解析不到返回 0）
 */
function resolveSeriesId() {
    const m = location.pathname.match(/\/topics\/(\d+)(?:\/(\d+))?(?:\/|\/index\.html)?$/);
    if (m) return parseInt(m[1], 10) || 0;
    const q = new URLSearchParams(location.search).get('series');
    return (q && parseInt(q, 10)) || 0;
}

/**
 * 解析专题内文章 ID —— 优先 /topics/{series}/{article}/，回退 ?article=
 * @returns {number} 文章 ID（解析不到返回 0）
 */
function resolveArticleId() {
    const m = location.pathname.match(/\/topics\/(\d+)\/(\d+)(?:\/|\/index\.html)?$/);
    if (m) return parseInt(m[2], 10) || 0;
    const q = new URLSearchParams(location.search).get('article');
    return (q && parseInt(q, 10)) || 0;
}

function resolveProjectLink(project, detailHref) {
    // 产品卡片（产品列表 / 首页精选项目）统一进入「二级详情页」，不再直接跳 demo_url；
    // 产品页的真实入口放在详情页的「在线预览」按钮上（见 projects/detail.html，用 project.demo_url）。
    // 如需恢复「有 demo_url 时卡片直跳外链」，放开下面两行即可。
    // const demo = String((project && project.demo_url) || '').trim();
    // if (demo) return { href: demo, external: true, label: '查看产品' };
    return { href: detailHref, external: false, label: '查看详情' };
}

/* ==================== 工具：本地开发时用【本地工具】 ====================
 * 背景（实测问题）：项目数据里的工具入口是【写死的线上绝对地址】
 *     projects.demo_url = https://www.hacore.cn/tools/compress/
 *   → 本地打开站点点「在线预览」会跳到线上工具 ✗（用的是线上服务）
 *
 * 设计（2026-10-15 收敛）：开发环境 → 统一走 http://dev.hacore.cn/tools/…（无端口 ✓）；
 *   线上 → 原样用线上地址 ✓（https://www.hacore.cn/tools/… ✓）
 *   ⚠️ 前提：本机 nginx（dev.hacore.cn:80 ✓）与工具自己的服务（8661 / 8662 ✓）都在跑
 *      → my_server/scripts/dev_all.sh 会一并拉起 ✓（没起时按钮连不上 = 预期行为 ✓）
 *
 * ⚠️ 浏览器【禁止】从 http 页面跳 file:// ✗ → 本地工具必须用 http 伺服
 *      （tools_dev.sh 已帮你起好；纯静态页也仍可直接双击打开，两不冲突 ✓）
 * =================================================================== */
const TOOL_LOCAL_MAP = {
    //  线上路径           → 开发环境地址（统一走域名 ✓ 无端口 ✓）
    //  ⚠️ 由本机 nginx :80 按路径分发到【工具自己的服务 ✓】（页面静态 ✓ 压缩接口 → :8661 ✓）
    //     不再直连 127.0.0.1:8661 / :8662 ✗
    '/tools/compress/': 'http://dev.hacore.cn/tools/compress/',
    '/tools/rename/': 'http://dev.hacore.cn/tools/rename/',
};

/** 当前是否为「本地/开发」环境（线上访客永远 false → 直接用线上工具 ✓） */
function isLocalSiteEnv() {
    const h = location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === 'dev.hacore.cn';
}

/** 线上工具地址 → 本地工具地址（非本地环境或无映射 → 原样返回） */
function localToolUrl(onlineUrl) {
    const u = String(onlineUrl || '').trim();
    if (!isLocalSiteEnv()) return u;
    for (const key in TOOL_LOCAL_MAP) {
        if (u.indexOf(key) !== -1) return TOOL_LOCAL_MAP[key];
    }
    return u;
}
