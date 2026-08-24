/**
 * HeAn 数据加载层
 * 优先从 FastAPI 接口获取数据，失败时降级读取本地 JSON
 * 适配后端新接口：分组结构（groups）替代旧的分类结构
 *
 * API_BASE: 后端服务地址
 * 优先级：URL 参数 ?api=xxx > localStorage['env-mode'] > 自动检测
 * - localStorage 切换：通过右下角环境切换按钮设置（offline/cloud/auto）
 * - 自动检测：根据当前页面域名推断后端地址
 */

const API_BASE = (() => {
    // 1. URL 参数覆盖（最高优先级，临时调试用）
    const param = new URLSearchParams(window.location.search).get('api');
    if (param) return param;

    // 2. localStorage 环境切换（通过右下角按钮设置）
    const envMode = localStorage.getItem('env-mode');
    if (envMode === 'offline') return 'http://localhost:8000';
    if (envMode === 'cloud') return 'http://175.178.7.7:8000';

    // 3. 自动检测
    const h = window.location.hostname;
    if (h === '175.178.7.7') return 'http://175.178.7.7:8000';
    if (h === 'dev.hacore.cn') return 'http://dev.hacore.cn:8000';
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:8000';
    return ''; // 生产环境（hacore.cn）同源请求
})();

// 只读 Token（JWT），用于 API 鉴权
// 生成方式：python3 -c "import jwt; print(jwt.encode({'role':'read'}, '你的ACCESS_TOKEN_SECRET', algorithm='HS256'))"
// const READ_TOKEN = '';
const READ_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoicmVhZCJ9.GvryC3oRA2aGr4AmMSTY3jcf7fL_3Yr1FQ8gOmgoliE';

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
        if (!API_BASE) return; // 本地静态环境（无后端）不上报
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
        if (!API_BASE) return;
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

// 由页面 activePage 与 URL 参数自动解析 page_type/page_id 并上报（列表页/详情页统一入口）
const _PAGE_TYPE_MAP = {
    home: 'home',
    blog: 'blog',
    blogs: 'blog_list',
    project: 'project',
    projects: 'project_list',
    topics: 'topics_list',
    series: 'series',
    about: 'about',
};
function autoTrackPageView(activePage) {
    const pageType = _PAGE_TYPE_MAP[activePage] || activePage || 'page';
    let pageId = 0;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || params.get('series') || params.get('article') || params.get('topic');
    if (id) pageId = parseInt(id) || 0;
    trackPageViewAuto(pageType, pageId);
}

// ---------- 降级：读取本地 JSON ----------
function getRoot() {
    // 通过 <script src=".../api.js"> 的路径推导站点根目录前缀，与部署目录深度彻底解耦
    // 相对引入:
    //   根页面  src="./js/api.js"     → "."
    //   子页面  src="../js/api.js"     → ".."
    // 绝对引入（防御性，当前站点未使用）:
    //   根域名  src="/js/api.js"        → "."
    //   子目录  src="/HeAn/js/api.js"   → "/HeAn/"
    const script = document.querySelector('script[src*="api.js"]');
    if (script) {
        const src = script.getAttribute('src').replace(/^\.\//, '');
        // 相对路径：以若干 ../ 开头
        const rel = src.match(/^((?:\.\.\/)+)js\//);
        if (rel) return rel[1].replace(/\/$/, '');
        // 绝对路径：以 / 开头
        if (src.startsWith('/')) {
            const abs = src.match(/^(.*?)\/js\//);
            return abs ? abs[1] + '/' : '.';
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
        // 跳过未分组的文章
        if (group.folder_id == null) return;
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
        // 跳过未分组的数据
        if (group.folder_id == null) continue;
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
        return mapProjectsGroups(apiData.groups);
    }

    // 降级本地 JSON（旧结构含 category: personal/collab，转换为 projects 结构）
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

    // 降级本地 JSON
    const local = await loadLocalJson('projects.json');
    if (!local || !local.projects) return null;
    return local.projects.find(p => p.id === projectId) || local.projects[0];
}

// ---------- 博客 ----------
async function loadBlogs(tag) {
    // 优先 API（新分组结构，只获取已发布内容，后端不再支持 tag 参数）
    const apiData = await apiGet('/site/blogs?public_only=1');
    if (apiData && apiData.groups) {
        const mapped = mapBlogsGroups(apiData.groups);
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

    // 降级本地 JSON
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

    // 降级本地 JSON
    const local = await loadLocalJson('blogs.json');
    if (!local || !local.blogs) return null;
    return local.blogs.find(b => b.id === blogId) || local.blogs[0];
}

// ---------- 站点配置 ----------
async function loadBaseConfig() {
    const data = await apiGet('/site/config');
    if (data) {
        // 缓存完整配置到全局，供 auth/theme 等模块读取（如登录入口开关）
        if (data.config) window.SITE_CONFIG = data.config;
        return data; // { config: {...}, services: [...] }
    }

    // 降级：使用 config.js 中的 SITE 对象
    const fallback = {
        config: { site_name: SITE.name, bio: SITE.bio, logo_url: '', seo_title: '', seo_description: '' },
        services: []
    };
    window.SITE_CONFIG = fallback.config;
    return fallback;
}

async function loadProfile() {
    const data = await apiGet('/site/profile');
    if (data) return data; // { about: {...} }

    return null;
}

// ---------- 专题（学习领域 → 专题 → 层级 → 文章） ----------

/**
 * 获取单个专题详情（含层级和文章）
 * 个人网站走 public_only=1，后端在无任何已发布文章时返回 null
 */
async function loadTopicDetail(topicId) {
    const apiData = await apiGet(`/site/learning/series/${topicId}?public_only=1`);
    console.log('[Topics] loadTopicDetail:', topicId, '=>', apiData ? 'OK' : 'NULL');
    return apiData || null;
}

/**
 * 获取全部已发布专题（用于首页最新专题卡片 & 专题列表页筛选/搜索）
 * 返回: [{ id, domain_id, series_key, name, cover_image, description, tags, updated_at, ... }]
 */
async function loadAllSeries() {
    const apiData = await apiGet('/site/learning/series?public_only=1');
    console.log('[Topics] loadAllSeries =>', apiData ? apiData.items?.length : 'NULL');
    if (apiData && Array.isArray(apiData.items)) return apiData.items;
    return [];
}

// 拉取学习领域配置（数据库 learning_domains，仅已启用的）
async function loadDomains() {
    try {
        const apiData = await apiGet('/site/learning/domains?public_only=1');
        if (apiData && Array.isArray(apiData.items)) return apiData.items;
    } catch (err) {
        console.error('[Topics] loadDomains 失败:', err.message);
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
