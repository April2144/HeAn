// ============================================================
// topics.js - 专题模块（领域 → 专题 → 层级 → 文章）
// ============================================================

// ---------- 领域配置（由后端 /site/learning/domains 动态获取，不再写死） ----------
// _domainList：后端返回的已启用领域列表（含 id / domain_key / name / icon 等）
let _domainList = [];

// 默认视觉样式（后端领域不存储 Tailwind 渐变类，沿用统一配色）
const DOMAIN_DEFAULT_STYLE = {
    icon: 'fa-book',
    bg: 'from-slate-500 to-gray-500',
    light: 'bg-slate-50',
    textLight: 'text-slate-700',
    darkBg: 'dark:bg-slate-900/30',
    darkText: 'dark:text-slate-400',
};

// 按 domain_key 从后端领域配置取元数据（图标 / 名称）
function getDomainMeta(domainKey) {
    const d = _domainList.find(x => x.domain_key === domainKey);
    if (d) {
        return { ...DOMAIN_DEFAULT_STYLE, icon: d.icon || DOMAIN_DEFAULT_STYLE.icon };
    }
    return { ...DOMAIN_DEFAULT_STYLE };
}

// 取领域显示名：优先后端 _domainList 的 name，其次专题自带的 domain_name
function getDomainDisplayName(domain) {
    const key = domain.domain_key || domain.key;
    if (key) {
        const d = _domainList.find(x => x.domain_key === key);
        if (d && d.name) return d.name;
    }
    return domain.name || domain.domain_name || String(domain.id || '未知领域');
}

// 专题 tags 可能是字符串或数组，统一为数组
function normalizeTags(tags) {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.map(t => typeof t === 'string' ? t : (t.name || ''));
    if (typeof tags === 'string') {
        const s = tags.trim();
        if (!s) return [];
        try {
            const parsed = JSON.parse(s);
            if (Array.isArray(parsed)) return parsed.map(t => String(t));
        } catch (e) {}
        return s.split(/[,，、]/).map(t => t.trim()).filter(Boolean);
    }
    return [];
}

// 统一标签徽章：优先取统一 TagsModel（TAG_MAP）的 icon/颜色，无则降级纯文字
// isDomain=true 时按领域名匹配 _domainList，使用「领域 icon + 对应颜色配置」（DOMAIN_DEFAULT_STYLE 的 light/darkBg/darkText）
function renderTagChip(name, withIcon = true, isDomain = false) {
    if (isDomain && typeof _domainList !== 'undefined') {
        const d = _domainList.find(x => x.name === name || x.domain_key === name);
        const dm = d ? { ...DOMAIN_DEFAULT_STYLE, icon: d.icon || DOMAIN_DEFAULT_STYLE.icon } : DOMAIN_DEFAULT_STYLE;
        const icon = (withIcon && dm.icon) ? `<i class="fa-solid ${dm.icon} mr-1"></i>` : '';
        const cls = `${dm.light} ${dm.textLight} ${dm.darkBg} ${dm.darkText}`;
        return `<span class="text-xs px-2.5 py-1 rounded-md ${cls} whitespace-nowrap">${icon}${escapeHtml(name)}</span>`;
    }
    const meta = (typeof TAG_MAP !== 'undefined' && TAG_MAP[name]) ? TAG_MAP[name] : null;
    const icon = (withIcon && meta && meta.icon) ? `<i class="fa-solid ${meta.icon} mr-1"></i>` : '';
    const cls = meta && meta.class
        ? meta.class
        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    // 字号/粗细走后端配置（tagInlineStyle），缺省由 CSS 兜底（默认不加粗）
    const style = (typeof tagInlineStyle !== 'undefined') ? tagInlineStyle(meta) : '';
    return `<span class="text-xs px-2.5 py-1 rounded-md ${cls} whitespace-nowrap"${style}>${icon}${escapeHtml(name)}</span>`;
}

// ---------- 首页精选专题（横向滚动的多卡片列表，按后台 is_featured 配置读取） ----------
async function loadHomeTopics() {
    console.log('[Topics] loadHomeTopics 开始');
    // 拉取统一标签系统（series_tags），供详情页/卡片/筛选使用
    await initTagMapFromAPI();
    // 先拉取后端领域配置，确保领域名/图标正确显示
    _domainList = await loadDomains();
    const series = await loadAllSeries();
    console.log('[Topics] loadHomeTopics 获取到', series.length, '个专题');
    const grid = document.getElementById('topics-grid');
    if (!grid) { console.warn('[Topics] #topics-grid 未找到'); return; }

    // 仅保留「首页推荐」且「有已发布文章」的专题，按 featured_order 升序
    const sorted = (series || [])
        .filter(s => (s.is_featured === 1) && (s.article_count || 0) > 0)
        .slice()
        .sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0));

    if (!sorted.length) {
        // 没有任何推荐专题时不显示模块内容
        const section = document.getElementById('topics');
        if (section) section.style.display = 'none';
        return;
    }

    grid.className = 'flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide';
    grid.style.overflowX = 'auto';
    grid.innerHTML = sorted.map(t => {
        const meta = getDomainMeta(t.domain_key);
        const tags = normalizeTags(t.tags).slice(0, 4);
        const cover = t.cover_image || '';
        const title = (t.name || '').length > 20 ? (t.name.slice(0, 20) + '…') : (t.name || '');
        const desc = (t.description || '点击查看专题详情');
        const shortDesc = desc.length > 60 ? (desc.slice(0, 60) + '…') : desc;
        const updatedAt = (t.updated_at || '').slice(0, 10);
        const domainName = t.domain_name || getDomainDisplayName({ domain_key: t.domain_key });
        return `
            <a href="topics/detail.html?series=${t.id}&from=home" class="block group flex-shrink-0 w-56 snap-start">
                <article class="card-hover relative w-56 aspect-[3/4] rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700">
                    <img src="${cover}" alt="${escapeHtml(t.name || '')}" class="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                    <div class="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <h3 class="font-bold text-lg mb-1.5 line-clamp-1 drop-shadow" title="${escapeHtml(t.name || '')}">${escapeHtml(title)}</h3>
                        <p class="text-white/90 text-sm mb-2 line-clamp-2">${escapeHtml(shortDesc)}</p>
                        <div class="flex flex-wrap gap-1.5 mb-2">
                            ${tags.map(tag => `<span class="tag-chip" style="background:rgba(255,255,255,0.25);color:#fff;">${escapeHtml(tag)}</span>`).join('')}
                        </div>
                        <div class="flex items-center justify-between text-white/80 text-xs whitespace-nowrap">
                            <span><i class="fas fa-eye mr-1"></i>${t.view_count || 0}</span>
                            <span><i class="fas fa-clock mr-1"></i>${updatedAt}</span>
                        </div>
                    </div>
                </article>
            </a>`;
    }).join('');
}

// ---------- 专题列表页（筛选分类 + 搜索 + 卡片列表） ----------
let _allSeriesCache = [];   // 全部专题缓存
let _currentFilter = 'all'; // 当前筛选分类（领域）
let _currentTagFilter = ''; // 当前按标签筛选（与领域筛选解耦，专事专用）
let _currentKeyword = '';   // 当前搜索关键词

async function loadTopicsPage() {
    console.log('[Topics] loadTopicsPage 开始');
    // 拉取统一标签系统（series_tags），供卡片/筛选使用
    await initTagMapFromAPI();

    // 先拉取后端领域配置（数据库 learning_domains，仅已启用的）
    _domainList = await loadDomains();

    // 一次拉取全部专题，仅保留有已发布文章的专题（无内容的专题不展示）
    const all = await loadAllSeries();
    _allSeriesCache = all.filter(s => (s.article_count || 0) > 0);
    console.log('[Topics] loadTopicsPage 获取到', all.length, '个专题，含已发布内容', _allSeriesCache.length, '个');

    renderFilterSidebar();
    renderSearchBox();
    renderSeriesList();
}

// 渲染左侧竖向筛选分类（分类来自后端领域配置）
// 标签严格从 tags 系统读取（TAG_MAP / tech_stacks），与后端配置一致，不读 articles.tags 作为标签来源
function renderFilterSidebar() {
    const el = document.getElementById('topic-filter');
    if (!el) return;

    // 动态构建分类列表：全部(固定) + 后端领域（按 display_order 排序）
    const filters = [{ key: 'all', name: '全部', icon: DOMAIN_DEFAULT_STYLE.icon }]
        .concat((_domainList || []).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map(d => ({ key: d.domain_key, name: d.name, icon: d.icon || DOMAIN_DEFAULT_STYLE.icon })));

    // 领域按钮（仅切领域，不堆标签）
    const filterBtns = filters.map(f => {
        const active = _currentFilter === f.key ? 'filter-selected' : '';
        return `<button class="topic-filter-item ${active} flex items-center gap-2" onclick="selectTopicFilter('${f.key}')">
            <i class="fas ${f.icon}"></i><span>${escapeHtml(f.name)}</span>
        </button>`;
    }).join('');

    // 标签筛选区：严格从 TAG_MAP（tags 系统 tech_stacks）读取
    // 取「当前领域下专题真实使用 ∩ TAG_MAP 存在」的标签，保证既来自 tags 系统、又在该领域有专题使用
    const tagSet = new Set();
    const scopeSeries = _currentFilter === 'all'
        ? _allSeriesCache
        : _allSeriesCache.filter(s => s.domain_key === _currentFilter);
    scopeSeries.forEach(s => {
        normalizeTags(s.tags).forEach(tag => {
            if (TAG_MAP[tag]) tagSet.add(tag); // 只收 tags 系统中存在的标签
        });
    });
    const tagList = Array.from(tagSet).sort();

    const tagChips = tagList.length
        ? tagList.map(tag => {
            const active = _currentTagFilter === tag ? 'filter-selected' : '';
            return `<span class="topic-tag-item ${active}" onclick="selectTagFilter('${escapeHtml(tag)}')">${renderTagChip(tag, false)}</span>`;
        }).join('')
        : '<span class="topic-tag-empty">该分类下暂无标签</span>';

    const clearBtn = _currentTagFilter
        ? `<button class="topic-tag-clear" onclick="selectTagFilter('')">清除筛选</button>`
        : '';

    el.innerHTML = `
        <div class="topic-filter-list">${filterBtns}</div>
        <div class="topic-tag-filter">
            <div class="topic-tag-filter-head">
                <span>技术栈筛选</span>${clearBtn}
            </div>
            <div class="topic-tag-filter-body">${tagChips}</div>
        </div>`;
}

function selectTopicFilter(key) {
    _currentFilter = key;
    _currentTagFilter = ''; // 切领域时清空标签筛选（专事专用，互不干涉）

    // 增量更新选中态 class，不整块重写 innerHTML（避免标题重绘闪烁）
    document.querySelectorAll('#topic-filter .topic-filter-item').forEach(b => {
        const k = (b.getAttribute('onclick') || '').match(/'([^']+)'\)/);
        b.classList.toggle('filter-selected', k && k[1] === key);
    });
    // 切领域后标签筛选区需按新领域重建（标签集合变了），但领域按钮态只增量切换
    renderFilterSidebarKeepSelection();
    renderSeriesList();
}

// 按单个技术栈标签筛选（与领域筛选解耦）
function selectTagFilter(tag) {
    _currentTagFilter = (_currentTagFilter === tag) ? '' : tag; // 点同一个则取消
    // 增量切换标签按钮选中态，不整块重写（避免闪烁）
    document.querySelectorAll('#topic-filter .topic-tag-item').forEach(item => {
        const t = (item.getAttribute('onclick') || '').match(/'([^']+)'\)/);
        item.classList.toggle('filter-selected', t && t[1] === _currentTagFilter && _currentTagFilter !== '');
    });
    // 清除按钮按需显隐
    const clearBtn = document.querySelector('.topic-tag-clear');
    if (clearBtn) clearBtn.style.display = _currentTagFilter ? '' : 'none';
    renderSeriesList();
}

// 领域切换后重建标签筛选区，但保留领域按钮当前选中态（不闪烁）
function renderFilterSidebarKeepSelection() {
    const el = document.getElementById('topic-filter');
    if (!el) return;
    const prevFilter = _currentFilter;

    const tagSet = new Set();
    const scopeSeries = prevFilter === 'all'
        ? _allSeriesCache
        : _allSeriesCache.filter(s => s.domain_key === prevFilter);
    scopeSeries.forEach(s => {
        normalizeTags(s.tags).forEach(tag => { if (TAG_MAP[tag]) tagSet.add(tag); });
    });
    const tagList = Array.from(tagSet).sort();
    const tagChips = tagList.length
        ? tagList.map(tag => {
            const active = _currentTagFilter === tag ? 'filter-selected' : '';
            return `<span class="topic-tag-item ${active}" onclick="selectTagFilter('${escapeHtml(tag)}')">${renderTagChip(tag, false)}</span>`;
        }).join('')
        : '<span class="topic-tag-empty">该分类下暂无标签</span>';
    const clearBtn = _currentTagFilter
        ? `<button class="topic-tag-clear" onclick="selectTagFilter('')">清除筛选</button>`
        : '';

    // 只替换「标签筛选区」子块，领域按钮列表不变（无闪烁）
    const body = el.querySelector('.topic-tag-filter-body');
    const head = el.querySelector('.topic-tag-filter-head');
    if (body) body.innerHTML = tagChips;
    if (head) head.innerHTML = `<span>技术栈筛选</span>${clearBtn}`;
}

function renderSearchBox() {
    const el = document.getElementById('topic-search');
    if (!el) return;
    el.innerHTML = `<input type="text" id="topic-search-input" placeholder="搜索专题标题或技术栈…"
        class="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        value="${escapeHtml(_currentKeyword)}" oninput="onTopicSearchInput(this.value)">`;
}

function onTopicSearchInput(val) {
    _currentKeyword = val.trim().toLowerCase();
    renderSeriesList();
}

// 渲染筛选/搜索后的专题卡片列表
function renderSeriesList() {
    const grid = document.getElementById('series-list');
    if (!grid) return;

    let list = _allSeriesCache.slice();

    // 按分类筛选
    if (_currentFilter !== 'all') {
        list = list.filter(s => s.domain_key === _currentFilter);
    }

    // 按标签筛选（技术栈，来自 tags 系统）
    if (_currentTagFilter) {
        list = list.filter(s => normalizeTags(s.tags).includes(_currentTagFilter));
    }

    // 按关键词搜索（标题或技术栈）
    if (_currentKeyword) {
        list = list.filter(s => {
            const title = (s.name || '').toLowerCase();
            const tags = normalizeTags(s.tags).join(' ').toLowerCase();
            return title.includes(_currentKeyword) || tags.includes(_currentKeyword);
        });
    }

    // 按更新/创建时间倒序
    list.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));

    // 列表为空则不显示任何专题卡片（空态提示）
    if (!list.length) {
        grid.innerHTML = '<div class="col-span-full text-center py-16 text-slate-400"><i class="fa-solid fa-magnifying-glass text-3xl mb-3 block"></i><p>没有符合条件的专题</p></div>';
        return;
    }

    grid.innerHTML = list.map(s => {
        const meta = getDomainMeta(s.domain_key);
        const tags = normalizeTags(s.tags);
        const cover = s.cover_image || '';
        const updatedAt = (s.updated_at || '').slice(0, 10);
        return `
        <a href="detail.html?series=${s.id}&from=topics" class="block group w-56">
            <article class="card-hover relative w-56 aspect-[3/4] rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700">
                <img src="${cover}" alt="${escapeHtml(s.name)}" class="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500">
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                <div class="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 class="font-bold text-lg mb-1.5 line-clamp-1 drop-shadow" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</h3>
                    <p class="text-white/90 text-sm mb-2 line-clamp-2">${escapeHtml(s.description || '')}</p>
                    <div class="flex flex-wrap gap-1.5 mb-2">
                        ${tags.map(tag => `<span class="tag-chip" style="background:rgba(255,255,255,0.25);color:#fff;">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                    <div class="flex items-center justify-between text-white/80 text-xs whitespace-nowrap">
                        <span><i class="fas fa-eye mr-1"></i>${s.view_count || 0}</span>
                        <span><i class="fas fa-clock mr-1"></i>${updatedAt}</span>
                    </div>
                </div>
            </article>
        </a>`;
    }).join('');
}

// ---------- 专题详情页 ----------
let currentTopic = null;
let currentArticle = null;

async function loadTopicDetailPage() {
    const params = new URLSearchParams(location.search);
    const topicId = params.get('series');
    if (!topicId) { showDetailError('缺少专题 ID'); return; }

    // 拉取统一标签系统（series_tags），供详情页文章标签使用
    await initTagMapFromAPI();

    // 调用 api.js 中的真实加载函数（该函数名与本文定义过的加载函数冲突，故本页加载入口单独命名）
    currentTopic = await loadTopicDetail(topicId);
    if (!currentTopic) { showDetailError('该专题暂无已发布内容'); return; }

    // 更新页面标题
    document.title = `${currentTopic.name} | 禾安`;

    // 顶部左侧显示该专题标题
    const titleEl = document.getElementById('detail-topic-title');
    if (titleEl) {
        titleEl.textContent = currentTopic.name || '';
    }

    // 渲染侧边栏目录树
    renderOutlineTree();

    // 默认选中第一篇文章
    const firstArticle = findFirstArticle(currentTopic);
    if (firstArticle) {
        selectArticle(firstArticle.id || firstArticle.article_key);
    }
}

function findFirstArticle(topic) {
    for (const level of (topic.chapters || [])) {
        if (level.articles && level.articles.length > 0) {
            return level.articles[0];
        }
    }
    return null;
}

function renderOutlineTree() {
    const tree = document.getElementById('outline-tree');
    if (!tree || !currentTopic) return;

    const levels = currentTopic.chapters || [];
    if (!levels.length) {
        tree.innerHTML = '<div class="text-slate-400 text-sm text-center py-8">暂无章节内容</div>';
        return;
    }

    tree.innerHTML = levels.map((lv, lvIdx) => {
        const articles = lv.articles || [];
        const lvId = `lv-${lv.id || lvIdx}`;
        const isFirst = lvIdx === 0;

        let articlesHtml = articles.map((art, artIdx) => {
            const artId = art.id || art.article_key;
            const subheads = (art.headings || []).map((h, hi) => `
                <a href="javascript:void(0)"
                   class="outline-subhead hidden block pl-12 pr-4 py-1 text-xs text-slate-500 dark:text-slate-500 hover:text-primary dark:hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors truncate"
                   data-subheads-for="${artId}"
                   onclick="scrollToHeading('${artId}', ${hi})"
                   title="${escapeHtml(h)}">
                    <span class="mr-1.5 text-[10px] text-slate-300 dark:text-slate-600">-</span>${escapeHtml(h)}
                </a>
            `).join('');
            return `
            <a href="javascript:void(0)"
               class="outline-article block px-8 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-primary dark:hover:text-primary transition-colors truncate"
               data-article-id="${artId}"
               data-level-id="${lvId}"
               onclick="selectArticle('${artId}')"
               title="${escapeHtml(art.title || '')}">
                ${escapeHtml(art.title || '无标题')}
            </a>
            ${subheads}`;
        }).join('');

        return `
        <div class="outline-level" data-level-id="${lvId}">
            <button class="outline-level-btn w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onclick="toggleLevel('${lvId}')">
                <span class="flex items-center gap-2">
                    <i class="fa-solid fa-chevron-right outline-chevron text-xs text-slate-400 transition-transform duration-200 ${isFirst ? 'rotate-90' : ''}" data-chevron="${lvId}"></i>
                    <span>${escapeHtml(lv.name || `章节 ${lvIdx + 1}`)}</span>
                </span>
                <span class="text-xs text-slate-400">${articles.length}</span>
            </button>
            <div class="outline-articles ${isFirst ? '' : 'hidden'}" data-articles="${lvId}">
                ${articlesHtml}
            </div>
        </div>`;
    }).join('');
}

function toggleLevel(lvId) {
    const articles = document.querySelector(`[data-articles="${lvId}"]`);
    const chevron = document.querySelector(`[data-chevron="${lvId}"]`);
    if (!articles) return;

    const isHidden = articles.classList.contains('hidden');
    if (isHidden) {
        articles.classList.remove('hidden');
        if (chevron) chevron.classList.add('rotate-90');
    } else {
        articles.classList.add('hidden');
        if (chevron) chevron.classList.remove('rotate-90');
    }
}

function selectArticle(articleId) {
    if (!currentTopic) return;

    // 更新侧边栏高亮
    document.querySelectorAll('.outline-article').forEach(el => {
        el.classList.toggle('active', el.dataset.articleId === String(articleId));
    });

    // 仅显示当前选中文章的章节标题（其它文章收起）
    document.querySelectorAll('.outline-subhead').forEach(el => {
        el.classList.toggle('hidden', el.dataset.subheadsFor !== String(articleId));
    });

    // 在整个 topic 中查找文章，并展开其所属层级
    let article = null;
    let articleLevelId = null;
    for (const level of (currentTopic.chapters || [])) {
        const lvId = `lv-${level.id ?? ''}`;
        const found = (level.articles || []).find(a => String(a.id || a.article_key) === String(articleId));
        if (found) { article = found; articleLevelId = lvId; break; }
    }

    if (articleLevelId) {
        const articlesBox = document.querySelector(`[data-articles="${articleLevelId}"]`);
        const chevron = document.querySelector(`[data-chevron="${articleLevelId}"]`);
        if (articlesBox) articlesBox.classList.remove('hidden');
        if (chevron) chevron.classList.add('rotate-90');
    }

    if (!article) return;
    currentArticle = article;
    renderArticleDetail(article);
}

// 点击文章内重点章节标题：先确保选中该文章，再滚动到对应锚点
function scrollToHeading(articleId, headingIndex) {
    const currentId = currentArticle?.id || currentArticle?.article_key;
    if (String(currentId) !== String(articleId)) {
        selectArticle(articleId);
    }
    const target = document.getElementById(`heading-${articleId}-${headingIndex}`);
    const area = document.getElementById('detail-content-area');
    if (target && area) {
        area.scrollTo({ top: target.offsetTop - 20, behavior: 'smooth' });
    }
}

function renderArticleDetail(article) {
    // 标题
    document.getElementById('article-title').textContent = article.title || '无标题';

    // 标签（统一标签系统，从 TAG_MAP 取 icon/颜色）
    const tagsEl = document.getElementById('article-tags');
    const tags = normalizeTags(article.tags);
    if (tags.length > 0) {
        tagsEl.innerHTML = tags.map(t => renderTagChip(t, false)).join('');
        tagsEl.style.display = '';
    } else {
        tagsEl.style.display = 'none';
    }

    // 发布/更新时间
    const timeEl = document.getElementById('article-time');
    const timeVal = article.updated_at || article.created_at || '';
    if (timeVal) {
        const label = article.updated_at ? '更新于' : '发布于';
        const d = new Date(timeVal);
        const dateStr = isNaN(d) ? timeVal : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        timeEl.textContent = `${label} ${dateStr}`;
        timeEl.style.display = '';
    } else {
        timeEl.style.display = 'none';
    }

    // 摘要
    const summaryEl = document.getElementById('article-summary');
    if (article.summary) {
        summaryEl.textContent = article.summary;
        summaryEl.style.display = '';
    } else {
        summaryEl.style.display = 'none';
    }

    // 实践项目
    const practiceEl = document.getElementById('article-practice');
    const practiceSectionEl = document.getElementById('article-practice-section');
    if (article.practice) {
        if (/^https?:\/\//.test(article.practice)) {
            practiceEl.innerHTML = `<a href="${escapeHtml(article.practice)}" target="_blank" rel="noopener" class="text-primary hover:underline">${escapeHtml(article.practice)} <i class="fa-solid fa-external-link text-xs ml-1"></i></a>`;
        } else {
            practiceEl.textContent = article.practice;
        }
        practiceSectionEl.style.display = '';
    } else {
        practiceSectionEl.style.display = 'none';
    }

    // Markdown 内容
    const bodyEl = document.getElementById('article-body');
    const artId = article.id || article.article_key;
    if (article.content) {
        if (typeof marked !== 'undefined') {
            const html = marked.parse(article.content);
            bodyEl.innerHTML = html;
            // 为 h2/h3 添加锚点 id，便于左侧目录第三级定位
            let hi = 0;
            bodyEl.querySelectorAll('h2, h3').forEach(h => {
                h.id = `heading-${artId}-${hi}`;
                hi++;
            });
        } else {
            bodyEl.innerHTML = `<pre class="whitespace-pre-wrap font-sans text-sm leading-relaxed">${escapeHtml(article.content)}</pre>`;
        }
    } else {
        bodyEl.innerHTML = '<div class="text-slate-400 text-center py-12">暂无内容</div>';
    }

    // 上一页 / 下一页
    updateArticleNavigation(article);

    // 滚动到顶部
    document.getElementById('detail-content-area').scrollTop = 0;
}

function updateArticleNavigation(article) {
    const prevEl = document.getElementById('nav-prev');
    const nextEl = document.getElementById('nav-next');

    if (!currentTopic) return;

    // 扁平化所有文章
    let allArticles = [];
    (currentTopic.chapters || []).forEach(lv => {
        (lv.articles || []).forEach(a => allArticles.push(a));
    });

    const idx = allArticles.findIndex(a => String(a.id || a.article_key) === String(article.id || article.article_key));

    // 第一篇不显示左侧“上一篇”
    if (idx > 0) {
        const prev = allArticles[idx - 1];
        prevEl.innerHTML = `<p class="text-xs text-slate-400 dark:text-slate-500 mb-1">上一篇</p><p class="nav-title text-sm text-slate-700 dark:text-slate-200 cursor-pointer">${escapeHtml(prev.title || '上一篇')}</p>`;
        prevEl.className = 'text-left';
        prevEl.onclick = () => selectArticle(prev.id || prev.article_key);
    } else {
        prevEl.innerHTML = '';
        prevEl.className = 'text-left';
        prevEl.onclick = null;
    }

    // 最后一篇不显示右侧“下一篇”
    if (idx < allArticles.length - 1) {
        const next = allArticles[idx + 1];
        nextEl.innerHTML = `<p class="text-xs text-slate-400 dark:text-slate-500 mb-1">下一篇</p><p class="nav-title text-sm text-slate-700 dark:text-slate-200 cursor-pointer">${escapeHtml(next.title || '下一篇')}</p>`;
        nextEl.className = 'text-right';
        nextEl.onclick = () => selectArticle(next.id || next.article_key);
    } else {
        nextEl.innerHTML = '';
        nextEl.className = 'text-right';
        nextEl.onclick = null;
    }
}

function showDetailError(msg) {
    const content = document.getElementById('detail-content-area');
    if (content) {
        content.innerHTML = `<div class="flex items-center justify-center h-64 text-slate-400"><i class="fa-solid fa-triangle-exclamation mr-2"></i>${msg}</div>`;
    }
}

// 移动端侧边栏切换
function toggleSidebar() {
    const sidebar = document.getElementById('outline-sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('-translate-x-full');
    sidebar.classList.toggle('translate-x-0');
}
