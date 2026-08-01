/**
 * HeAn 数据加载层
 * 优先从 FastAPI 接口获取数据，失败时降级读取本地 JSON
 * 适配后端新接口：分组结构（groups）替代旧的分类结构
 *
 * API_BASE: 后端服务地址
 * - 本地开发（localhost/127.0.0.1）：默认 http://localhost:8000
 * - 本地开发（dev.hacore.cn）：默认 http://dev.hacore.cn:8000
 * - 生产环境（hacore.cn）：同源请求（空字符串）
 */

const API_BASE = (() => {
    // 可通过 URL 参数 ?api=xxx 动态指定，方便开发调试
    const param = new URLSearchParams(window.location.search).get('api');
    if (param) return param;
    const h = window.location.hostname;
    if (h === 'dev.hacore.cn') return 'http://dev.hacore.cn:8000';
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:8000';
    return '';
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

// ---------- 降级：读取本地 JSON ----------
function getRoot() {
    // 通过 <script src=".../api.js"> 的相对路径推导根目录
    // 根页面: src="./js/api.js" → 返回 "."
    // 子页面: src="../js/api.js" → 返回 ".."
    const script = document.querySelector('script[src*="api.js"]');
    if (script) {
        const src = script.getAttribute('src');
        const match = src.match(/^((?:\.\.\/)+)js\//);
        if (match) return match[1].replace(/\/$/, '');
        return '.';
    }
    // fallback: 路径深度计算
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
 * 将 API 的 groups 结构转为兼容旧代码的 { personal, collab } 结构
 * groups: [{ group_id, group_name, projects: [...] }, ...]
 */
function mapProjectsGroups(groups) {
    const personal = [];
    const collab = [];
    (groups || []).forEach(group => {
        const items = (group.projects || []);
        // 跳过空分组（没有已发布项目的不展示）
        if (items.length === 0) return;
        const isPersonal = /个人|personal/i.test(group.group_name || '');
        const mapped = items.map(p => ({
            ...p,
            id: String(p.id),
            category: isPersonal ? 'personal' : 'collab',
        }));
        if (isPersonal) {
            personal.push(...mapped);
        } else {
            collab.push(...mapped);
        }
    });
    return { personal, collab };
}

/**
 * 将 API 的 groups 结构转为兼容旧代码的 { blogs: [...] } 结构
 * groups: [{ group_id, group_name, articles: [...] }, ...]
 */
function mapBlogsGroups(groups) {
    const blogs = [];
    (groups || []).forEach(group => {
        // 跳过未分组的文章
        if (group.group_id == null) return;
        const articles = (group.articles || []);
        // 跳过空分组（没有已发布文章的不展示）
        if (articles.length === 0) return;
        articles.forEach(article => {
            blogs.push({
                ...article,
                group: group.group_name,
                // 后端 tags 可能为空数组，此时用 group_name 作为默认标签
                tags: (article.tags && article.tags.length > 0) ? article.tags : [group.group_name],
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
        if (group.group_id == null) continue;
        const items = group[itemKey] || [];
        for (const item of items) {
            if (parseInt(item.id) === idNum) {
                return { ...item, id: String(item.id), group: group.group_name };
            }
        }
    }
    return null;
}

// ---------- 项目 ----------
async function loadProjects() {
    // 优先 API（新分组结构，只获取已发布内容）
    const apiData = await apiGet('/site/projects?public_only=1');
    if (apiData && apiData.groups) {
        return mapProjectsGroups(apiData.groups);
    }
    // 兼容旧 API 结构
    if (apiData && (apiData.personal || apiData.collab)) {
        return apiData;
    }

    // 降级本地 JSON
    const local = await loadLocalJson('projects.json');
    if (!local || !local.projects) return null;
    const personal = local.projects.filter(p => p.category === 'personal');
    const collab = local.projects.filter(p => p.category === 'collab');
    return { personal, collab };
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
    if (data) return data; // { config: {...}, services: [...] }

    // 降级：使用 config.js 中的 SITE 对象
    return {
        config: { site_name: SITE.name, bio: SITE.bio, avatar_url: '', seo_title: '', seo_description: '' },
        services: []
    };
}

async function loadProfile() {
    const data = await apiGet('/site/profile');
    if (data) return data; // { about: {...} }

    return null;
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
