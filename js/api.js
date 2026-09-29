/**
 * HeAn 数据加载层
 * 优先从 FastAPI 接口获取数据，失败时降级读取本地 JSON
 * 适配后端新接口：分组结构（groups）替代旧的分类结构
 *
 * API_BASE: 后端服务地址
 * 公开站点固定自动检测：localhost/127.0.0.1 → 本机；dev.hacore.cn → 内网开发；hacore.cn → 同源。
 * 调试可用 ?api=xxx 临时覆盖。
 */

// 公开前端固定走自动检测（不再读取任何持久化环境开关，避免与私有后台共享 localStorage key）。
// 调试时可用 URL 参数 ?api=http://xxx:8000 临时覆盖。
const API_BASE = (() => {
    // 1. URL 参数覆盖（最高优先级，临时调试用，不留持久状态）
    const param = new URLSearchParams(window.location.search).get('api');
    if (param) return param;

    // 2. 自动检测（基于当前域名，公开站点永远请求同源/本地后端）
    const h = window.location.hostname;
    if (h === 'dev.hacore.cn') return 'http://dev.hacore.cn:8000';
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:8000';
    return ''; // 生产环境（hacore.cn）同源请求
})();

/**
 * 是否存在「可上报的后端」。
 *
 * ⚠️ 不能用 `if (!API_BASE)` 判断：生产环境是同域部署，API_BASE **就是空串（合法）**，
 * 那样会把「同域部署」误判成「本地无后端静态环境」→ 全站埋点（pageview / click）静默失效 ✗
 * （这也是后台统计里 PV/UV/点击一直为空的真正原因）。
 * 判定标准改为「页面是否运行在 http(s) 下」：是则有后端（同域或自动检测出的地址）。
 */
const HAS_BACKEND = (() => {
    const proto = window.location.protocol;
    return proto === 'http:' || proto === 'https:';
})();

// 只读 Token（JWT），用于 API 鉴权
// 生成方式：python3 -c "import jwt; print(jwt.encode({'role':'read'}, '你的ACCESS_TOKEN_SECRET', algorithm='HS256'))"
/**
 * 公开站点的 READ_TOKEN 已停用（不再随请求发送）：
 * 后端公开只读/提交接口已支持匿名访问（不携带 Authorization 头），
 * 匿名访问时后端自动仅返回已发布内容，避免公开站点依赖 read token 造成全站鉴权锁死。
 * 如需恢复 read token（例如临时用 read 角色读取未发布内容），在此填入有效 token 即可自动生效。
 */
const READ_TOKEN = '';

// ---------- 离线缓存层（localForage） ----------
// 真离线模式：联网成功时把数据写入本地缓存，断网时优先读缓存，最后才退回静态 data/*.json
// 注：localforage 由 index.html 通过 CDN 引入；若 CDN 不可用（离线/被墙），
// 本层自动降级为“不缓存”，不影响正常联网请求。
let _heanCache = null;
function _getCache() {
    if (_heanCache === null && typeof localforage !== 'undefined') {
        _heanCache = localforage.createInstance({ name: 'hean_site', storeName: 'offline' });
    }
    return _heanCache;
}
async function cachePut(key, data) {
    const c = _getCache();
    if (!c) return;
    try { await c.setItem('hean_' + key, { ts: Date.now(), data }); } catch (e) { /* ignore */ }
}
async function cacheGet(key) {
    const c = _getCache();
    if (!c) return null;
    try {
        const item = await c.getItem('hean_' + key);
        return item ? item.data : null;
    } catch (e) { return null; }
}

// ---------- 统一请求封装 ----------
async function apiGet(path) {
    try {
        const headers = {};
        if (READ_TOKEN) headers['Authorization'] = `Bearer ${READ_TOKEN}`;
        const res = await fetch(`${API_BASE}${path}`, { headers });
        const json = await res.json();
        if (json.code !== 200) {
            console.error('API 错误:', json.msg);
            return null;
        }
        return json.data;
    } catch (err) {
        console.warn(`API ${path} 不可用，将读取本地数据:`, err.message);
        return null;
    }
}

// ---------- 统计分析埋点（前端不展示，仅上报后端） ----------
// 架构：后端中间件记录基础数据（visitor_id/IP/User-Agent），前端只补业务数据。
//   展示类：trackPageView(page_type, page_id)         → POST /site/analytics/pageview
//   操作类：trackClick(action, event, section, page)  → POST /site/analytics/action
//     - action ：具体按钮动作标识，如 'click_follow_btn'
//     - event  ：业务事件语义，如 'follow' / 'subscribe' / 'like' / 'favorite'
//     - section：发生位置区域，如 'zhuanti_card'
//     - page   ：发生位置页面，如 'home'
// 页面加载自动上报 pageview；关闭前上报停留时长 stay_duration。
function _buildHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (READ_TOKEN) headers['Authorization'] = `Bearer ${READ_TOKEN}`;
    return headers;
}

// 展示类埋点：页面浏览（自动触发，页面加载即上报）
//   trackPageView('blog', 12) / trackPageView('home', 0)
function trackPageView(pageType, pageId = 0, stayDuration = 0) {
    try {
        if (!HAS_BACKEND) return; // 仅本地静态环境（file:// 打开，无后端）不上报
        const payload = {
            path: window.location.pathname,
            page_type: pageType,
            page_id: pageId || 0,
            referer: document.referrer || '',
        };
        if (stayDuration > 0) payload.stay_duration = stayDuration;
        fetch(`${API_BASE}/site/analytics/pageview`, {
            method: 'POST',
            headers: _buildHeaders(),
            body: JSON.stringify(payload),
            keepalive: true,
        });
    } catch (err) {
        console.debug('[analytics] pageview 上报失败:', err.message);
    }
}

// 操作类埋点：点击/操作
//   trackClick('click_follow_btn', 'follow', 'zhuanti_card', 'home')
function trackClick(action, event, section = '', page = '', targetType = '', targetId = 0, extra = {}) {
    try {
        if (!HAS_BACKEND) return;
        const payload = {
            action_type: 'click',
            target_type: targetType || section || '',
            target_id: targetId || null,
            target_path: window.location.pathname,
            result: event || action,
            extra: { action, event, section, page, ...extra },
        };
        fetch(`${API_BASE}/site/analytics/action`, {
            method: 'POST',
            headers: _buildHeaders(),
            body: JSON.stringify(payload),
            keepalive: true,
        });
    } catch (err) {
        console.debug('[analytics] action 上报失败:', err.message);
    }
}

// 页面加载自动上报一次 pageview（需页面在引入 api.js 后调用 trackPageViewAuto）
let _pageLoadTime = null;
let _stayReported = false;
function trackPageViewAuto(pageType, pageId = 0) {
    _pageLoadTime = Date.now();
    _stayReported = false;
    trackPageView(pageType, pageId);
    // 关闭/跳转前上报停留时长（仅补报一次，避免 beforeunload 与 visibilitychange 重复）
    const reportStay = () => {
        if (!_pageLoadTime || _stayReported) return;
        const stay = Math.round((Date.now() - _pageLoadTime) / 1000);
        _stayReported = true;
        if (stay > 0) trackPageView(pageType, pageId, stay);
    };
    window.addEventListener('beforeunload', reportStay);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') reportStay();
    });
}

// 埋点的 page_type / page_id 统一【按 URL 路径】判定（列表页/详情页共用这一个入口）
//
// ⚠️ 为什么不用各页面传入的 activePage：它是"导航 tab 高亮用"的页面名，不是内容类型 ✗
//    · projects/detail.html 传 'projects' → 被记成 project_list ✗
//      → 后台「内容分析 → 产品」按 page_type='project' 过滤时查不到 → 全是 0 ✗（实测事故）
//    · blog/index.html（列表页）传 'blog' → 记成 blog 且 id=0 ✗
//      → 列表 PV 全堆到"博客 id=0"上，把真实文章的数据盖住 ✗
//    · 专题详情页传 'topics' → 记成 topics_list ✗（详情被算进列表）
//    路径是唯一可靠来源 ✓（预渲染后的真实路径 /blog/6/、/projects/4/、/topics/1/47/ 都能正确解析 ✓）
var _PAGE_TYPE_MAP = {          // 仅作旧式 URL（未预渲染、走 ?id= 查询参数）的兜底
    home: 'home', blog: 'blog', blogs: 'blog_list',
    project: 'project', projects: 'project_list',
    topics: 'topics_list', series: 'series', about: 'about',
};

/** 按路径解析内容类型与 ID（规则与 gen_sitemap/gen_static 的真实路径保持一致 ✓） */
function _pathTypeInfo(pathname) {
    var p = (pathname || location.pathname || '').replace(/\/index\.html$/, '/');
    var m;
    if ((m = p.match(/^\/blog\/(\d+)\/?$/)))      return { type: 'blog', id: parseInt(m[1], 10) };
    if ((m = p.match(/^\/projects\/(\d+)\/?$/)))  return { type: 'project', id: parseInt(m[1], 10) };
    // 专题：/topics/1/（系列）与 /topics/1/47/（系列内文章）都归到系列，id = 系列号 ✓
    if ((m = p.match(/^\/topics\/(\d+)(?:\/\d+)?\/?$/))) return { type: 'series', id: parseInt(m[1], 10) };
    if (/^\/blog\/?$/.test(p))     return { type: 'blog_list', id: 0 };
    if (/^\/projects\/?$/.test(p)) return { type: 'project_list', id: 0 };
    if (/^\/topics\/?$/.test(p))   return { type: 'topics_list', id: 0 };
    if (/^\/about\/?$/.test(p))    return { type: 'about', id: 0 };
    if (p === '/' || p === '')     return { type: 'home', id: 0 };
    return null;   // 认不出来 → 走旧式兜底 ✓
}

function autoTrackPageView(activePage) {
    var info = _pathTypeInfo(location.pathname);
    if (!info) {
        // 兜底：未预渲染的旧式 URL（如 /blog/detail.html?id=6，或带 ?series= 的旧链接）
        var params = new URLSearchParams(window.location.search);
        var isSeriesDetail = !!params.get('series');
        var pageType = isSeriesDetail ? 'series' : (_PAGE_TYPE_MAP[activePage] || activePage || 'page');
        var pageId = 0;
        var id = params.get('id') || params.get('series') || params.get('article') || params.get('topic');
        if (id) pageId = parseInt(id) || 0;
        info = { type: pageType, id: pageId };
    }
    trackPageViewAuto(info.type, info.id);
}

// ---------- 降级：读取本地 JSON ----------
function getRoot() {
    // 通过 <script src=".../api.js"> 的路径推导站点根目录前缀，与部署目录深度彻底解耦
    // 相对引入:
    //   根页面  src="./js/api.js"     → "."
    //   子页面  src="../js/api.js"     → ".."
    // 绝对引入（防御性，当前站点未使用）:
    //   根域名  src="/js/api.js"        → "."
    //   子目录  src="/HeAn/js/api.js"   → "/HeAn"
    // 注：统一为“末尾不带斜杠”，与 views.js 的同名函数完全一致（两者会互相覆盖，行为必须相同）
    const script = document.querySelector('script[src*="api.js"]');
    if (script) {
        const src = script.getAttribute('src').replace(/^\.\//, '');
        // 相对路径：以若干 ../ 开头
        const rel = src.match(/^((?:\.\.\/)+)js\//);
        if (rel) return rel[1].replace(/\/$/, '');
        // 绝对路径：以 / 开头
        if (src.startsWith('/')) {
            const abs = src.match(/^(.*?)\/js\//);
            return abs ? abs[1] : '.';
        }
        // 兜底：./js/api.js 或 js/api.js
        return '.';
    }
    // fallback: 路径深度计算（极端情况 script 不可见时）
    const path = window.location.pathname;
    const depth = (path.match(/\//g) || []).length - 1;
    return depth <= 0 ? '.' : Array(depth).fill('..').join('/');
}

async function loadLocalJson(filename) {
    try {
        const root = getRoot();
        const res = await fetch(`${root}/data/${filename}`);
        return await res.json();
    } catch (err) {
        console.error(`加载本地 ${filename} 失败:`, err);
        return null;
    }
}

// ---------- 工具：API 分组结构 → 旧结构兼容 ----------

/**
 * 将 API 的 groups 结构转为统一 { projects } 结构
 * groups: [{ folder_id, folder_name, projects: [...] }, ...]
 * 注：旧代码曾用 { personal, collab } 结构，现已统一为 projects，调用方直接用 projectData.projects
 */
function mapProjectsGroups(groups) {
    const projects = [];
    (groups || []).forEach(group => {
        // 跳过未分组的项目
        if (group.folder_id == null) return;
        const items = (group.projects || []);
        // 跳过空分组（没有已发布项目的不展示）
        if (items.length === 0) return;
        items.forEach(p => {
            projects.push({
                ...p,
                id: String(p.id),
                group: group.folder_name,
                // 后端 tags 可能为空数组，此时用 folder_name 作为默认标签
                tags: (p.tags && p.tags.length > 0) ? p.tags : [group.folder_name],
            });
        });
    });
    return { projects };
}

/**
 * 将 API 的 groups 结构转为兼容旧代码的 { blogs: [...] } 结构
 * groups: [{ folder_id, folder_name, articles: [...] }, ...]
 */
function mapBlogsGroups(groups) {
    const blogs = [];
    const seenIds = new Set();
    (groups || []).forEach(group => {
        const articles = (group.articles || []);
        // 跳过空分组（没有已发布文章的不展示）
        if (articles.length === 0) return;
        articles.forEach(article => {
            // 按 id 去重：数据库存在重复记录时页面不展示重复内容
            if (seenIds.has(article.id)) return;
            seenIds.add(article.id);
            blogs.push({
                ...article,
                group: group.folder_name,
                // 后端 tags 可能为空数组，此时用 folder_name 作为默认标签
                tags: (article.tags && article.tags.length > 0) ? article.tags : [group.folder_name],
            });
        });
    });
    return { blogs };
}

/**
 * 从 groups 中查找指定 id 的单条记录（项目或博客）
 */
function findInGroups(groups, id, itemKey = 'projects') {
    const idNum = parseInt(id);
    for (const group of (groups || [])) {
        // 未分组数据：项目端仍跳过（项目列表不展示未分组）；博客端保留，使「全部」中的未分组文章可正常打开详情
        if (group.folder_id == null && itemKey === 'projects') continue;
        const items = group[itemKey] || [];
        for (const item of items) {
            if (parseInt(item.id) === idNum) {
                return { ...item, id: String(item.id), group: group.folder_name };
            }
        }
    }
    return null;
}

// ---------- 项目 ----------
async function loadProjects() {
    // 优先 API（按 folder 动态分区，只获取已发布内容）
    const apiData = await apiGet('/site/projects?public_only=1');
    if (apiData && apiData.groups) {
        const result = mapProjectsGroups(apiData.groups);
        await cachePut('projects', result);   // 联网成功 → 写入本地缓存
        return result;
    }

    // 第一层降级：本地缓存（localForage，断网时最新同步数据）
    const cached = await cacheGet('projects');
    if (cached && cached.projects) return cached;

    // 第二层降级：静态本地 JSON（旧结构含 category: personal/collab，转换为 projects 结构）
    const local = await loadLocalJson('projects.json');
    if (!local || !local.projects) return null;
    const projects = local.projects.map(p => ({
        ...p,
        id: String(p.id),
        group: p.category === 'collab' ? '合作项目' : '个人项目',
        tags: (p.tags && p.tags.length > 0) ? p.tags : [p.category === 'collab' ? '合作项目' : '个人项目'],
    }));
    return { projects };
}

async function loadProject(projectId) {
    // 优先 API：从分组列表中查找（只获取已发布内容）
    const apiData = await apiGet('/site/projects?public_only=1');
    if (apiData && apiData.groups) {
        const found = findInGroups(apiData.groups, projectId, 'projects');
        if (found) return found;
    }

    // 降级本地缓存
    const cached = await cacheGet('projects');
    if (cached && cached.projects) {
        const found = cached.projects.find(p => p.id === projectId);
        if (found) return found;
    }

    // 降级静态本地 JSON
    const local = await loadLocalJson('projects.json');
    if (!local || !local.projects) return null;
    return local.projects.find(p => p.id === projectId) || local.projects[0];
}

// ---------- 首页「最新更新」（混排博客 + 专题文章） ----------
async function loadUpdates(limit = 8) {
    // 后端已按时间倒序混排，且只返回已发布内容
    const apiData = await apiGet(`/site/updates?limit=${limit}`);
    if (apiData && apiData.items) {
        await cachePut('updates', apiData);   // 联网成功 → 写入本地缓存
        return apiData;
    }

    // 降级：本地缓存（断网时仍能显示最近一次同步到的更新）
    const cached = await cacheGet('updates');
    if (cached && cached.items) return cached;

    return { items: [], total: 0 };
}

// ---------- 博客 ----------
async function loadBlogs(tag) {
    // 优先 API（新分组结构，只获取已发布内容，后端不再支持 tag 参数）
    const apiData = await apiGet('/site/blogs?public_only=1');
    if (apiData && apiData.groups) {
        const mapped = mapBlogsGroups(apiData.groups);
        await cachePut('blogs', mapped);   // 联网成功 → 写入本地缓存
        // 前端过滤分组（因为后端不再支持 tag 查询参数）
        if (tag && tag !== 'all') {
            mapped.blogs = mapped.blogs.filter(b =>
                b.group === tag
            );
        }
        return mapped;
    }
    // 兼容旧 API 结构
    if (apiData && apiData.articles) {
        return { blogs: apiData.articles };
    }

    // 第一层降级：本地缓存
    const cached = await cacheGet('blogs');
    if (cached && cached.blogs) {
        const mapped = { ...cached };
        if (tag && tag !== 'all') mapped.blogs = mapped.blogs.filter(b => b.group === tag);
        return mapped;
    }

    // 第二层降级：静态本地 JSON
    const local = await loadLocalJson('blogs.json');
    if (!local || !local.blogs) return null;
    return local;
}

async function loadBlog(blogId) {
    // 优先 API：从分组列表中查找（只获取已发布内容）
    const apiData = await apiGet('/site/blogs?public_only=1');
    if (apiData && apiData.groups) {
        const found = findInGroups(apiData.groups, blogId, 'articles');
        if (found) return found;
    }

    // 降级本地缓存
    const cached = await cacheGet('blogs');
    if (cached && cached.blogs) {
        const found = cached.blogs.find(b => b.id === blogId);
        if (found) return found;
    }

    // 降级静态本地 JSON
    const local = await loadLocalJson('blogs.json');
    if (!local || !local.blogs) return null;
    return local.blogs.find(b => b.id === blogId) || local.blogs[0];
}

// ---------- 站点配置 ----------

/**
 * 把「登录入口开关」同步缓存到 localStorage。
 * 用途：theme.js 的 initApp 必须【同步】决定右上角登录区是否显示（显示=占宽度），
 * 不能等 /site/config 请求返回 —— 否则登录按钮晚出现约 100ms，导航 tab 行会整体平移。
 * 缺省（未缓存 / 隐私模式）按「显示」处理，与后端默认值 1 一致。
 */
function cacheLoginEntryFlag(cfg) {
    try {
        if (cfg && cfg.enable_login_entry !== undefined) {
            localStorage.setItem('hean_login_entry', Number(cfg.enable_login_entry) === 1 ? '1' : '0');
        }
    } catch (e) { /* 隐私模式等场景忽略 */ }
}

/** 同步读取登录入口开关：有缓存用缓存，无缓存（首次访问）按显示处理 */
function isLoginEntryEnabled() {
    try {
        const v = localStorage.getItem('hean_login_entry');
        if (v === '0') return false;
        if (v === '1') return true;
    } catch (e) { /* 隐私模式等场景忽略 */ }
    return true;
}

async function loadBaseConfig() {
    const data = await apiGet('/site/config');
    if (data) {
        // 缓存完整配置到全局，供 auth/theme 等模块读取（如登录入口开关）
        if (data.config) window.SITE_CONFIG = data.config;
        // 站点名单独缓存到 localStorage：让二次访问"首屏就渲染正确品牌名"，
        // 避免先兜底名后替换 → 品牌区宽度变化 → 导航 tab 行左右平移。
        try {
            if (data.config && data.config.site_name) {
                localStorage.setItem('hean_site_name', data.config.site_name);
            }
        } catch (e) { /* 隐私模式等场景忽略 */ }
        // 登录入口开关也落本地缓存（供 initAuthSync 同步读取，避免导航位移）
        cacheLoginEntryFlag(data.config);
        await cachePut('baseConfig', data);
        return data; // { config: {...}, services: [...] }
    }

    // 第一层降级：本地缓存
    const cached = await cacheGet('baseConfig');
    if (cached) {
        if (cached.config) window.SITE_CONFIG = cached.config;
        cacheLoginEntryFlag(cached.config);
        return cached;
    }

    // 第二层降级：使用 config.js 中的 SITE 对象
    const fallback = {
        config: {
            site_name: SITE.name, bio: SITE.bio, logo_url: '', seo_title: '', seo_description: '',
            filing_no: SITE.filing_no || '', filing_url: SITE.filing_url || '',
            // 协议配置：接口不可用时的兜底（默认关闭 → 页脚不显示）
            user_policy_url: SITE.user_policy_url || '',
            enable_user_policy: Number(SITE.enable_user_policy ?? 0),
            privacy_policy_url: SITE.privacy_policy_url || '',
            enable_privacy_policy: Number(SITE.enable_privacy_policy ?? 0),
        },
        services: []
    };
    window.SITE_CONFIG = fallback.config;
    return fallback;
}

async function loadProfile() {
    const data = await apiGet('/site/profile');
    if (data) {
        await cachePut('profile', data);
        return data; // { about: {...} }
    }

    // 降级本地缓存
    return await cacheGet('profile');
}

// ---------- 专题（学习领域 → 专题 → 层级 → 文章） ----------

/**
 * 获取单个专题详情（含层级和文章）
 * 个人网站走 public_only=1，后端在无任何已发布文章时返回 null
 */
async function loadTopicDetail(topicId) {
    const apiData = await apiGet(`/site/learning/series/${topicId}?public_only=1`);
    console.log('[Topics] loadTopicDetail:', topicId, '=>', apiData ? 'OK' : 'NULL');
    if (apiData) {
        await cachePut('topic_' + topicId, apiData);
        return apiData;
    }
    // 降级本地缓存
    const cached = await cacheGet('topic_' + topicId);
    if (cached) return cached;
    // 第三级降级：本地种子（data/series.json 的 detail，首次访问无后端内容时展示）
    const local = await loadLocalJson('series.json');
    const seed = local && local.detail ? local.detail[String(topicId)] : null;
    if (seed) {
        await cachePut('topic_' + topicId, seed);
        return seed;
    }
    return null;
}

/**
 * 获取全部已发布专题（用于首页最新专题卡片 & 专题列表页筛选/搜索）
 * 返回: [{ id, series_key, name, cover_image, description, tags, updated_at, ... }]
 */
async function loadAllSeries() {
    const apiData = await apiGet('/site/learning/series?public_only=1');
    console.log('[Topics] loadAllSeries =>', apiData ? apiData.items?.length : 'NULL');
    if (apiData && Array.isArray(apiData.items)) {
        await cachePut('allSeries', apiData.items);
        return apiData.items;
    }
    // 降级本地缓存
    const cached = await cacheGet('allSeries');
    if (Array.isArray(cached) && cached.length) return cached;
    // 第三级降级：本地种子（data/series.json，首次访问无后端内容时展示）
    const local = await loadLocalJson('series.json');
    const seedItems = local && Array.isArray(local.items) ? local.items : [];
    if (seedItems.length) {
        await cachePut('allSeries', seedItems);
        return seedItems;
    }
    return [];
}

// ---------- Newsletter 订阅 ----------
async function subscribeNewsletter(email) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (READ_TOKEN) headers['Authorization'] = `Bearer ${READ_TOKEN}`;
        const res = await fetch(`${API_BASE}/site/newsletter/subscribers`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ email }),
        });
        const json = await res.json();
        return { success: json.code === 200, message: json.msg || json.data?.message || '订阅失败' };
    } catch (err) {
        console.error('订阅请求失败:', err.message);
        return { success: false, message: '网络错误，请稍后重试' };
    }
}

// ---------- 联系邮件（合作意向） ----------
async function sendContactEmail(payload) {
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (READ_TOKEN) headers['Authorization'] = `Bearer ${READ_TOKEN}`;
        const res = await fetch(`${API_BASE}/site/contact/email`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        return { success: json.code === 200, message: json.msg || '发送失败' };
    } catch (err) {
        console.error('邮件发送失败:', err.message);
        return { success: false, message: '网络错误，请稍后重试' };
    }
}
