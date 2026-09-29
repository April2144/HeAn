// ============================================================
// topics.js - 专题模块（专题 → 层级 → 文章，无领域层）
// ============================================================

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
function renderTagChip(name, withIcon = true) {
    const meta = (typeof TAG_MAP !== 'undefined' && TAG_MAP[name]) ? TAG_MAP[name] : null;
    const icon = (withIcon && meta && meta.icon) ? `<i class="fa-solid ${meta.icon} mr-1"></i>` : '';
    const cls = meta && meta.class
        ? meta.class
        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    // 字号/粗细走后端配置（tagInlineStyle），缺省由 CSS 兜底（默认不加粗）
    const style = (typeof tagInlineStyle !== 'undefined') ? tagInlineStyle(meta) : '';
    return `<span class="text-xs px-2.5 py-1 rounded-md ${cls} whitespace-nowrap"${style}>${icon}${escapeHtml(name)}</span>`;
}

// 专题封面：有封面图渲染 <img>；无封面则复用 admin web 端专题列表卡片的图片占位符（书本图标 + 渐变底）
function renderTopicCover(item) {
    const cover = item.cover_image || '';
    if (cover) {
        return `<img src="${escapeHtml(cover)}" alt="${escapeHtml(item.name || '')}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500">`;
    }
    return `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-slate-400 dark:text-slate-500 text-3xl">
        <i class="fa-solid fa-book-open"></i>
    </div>`;
}

// ---------- 首页精选专题（按后台 is_featured 配置读取；首页用横向卡片，专题页用简单列表） ----------
// 隐藏逻辑与渲染容器解耦：无论哪个页面，无推荐数据都先隐藏 #topics 模块，再按页面容器渲染
async function loadHomeTopics() {
    console.log('[Topics] loadHomeTopics 开始');
    // 拉取统一标签系统（general_tags / tech_stacks），供详情页/卡片/筛选使用
    await initTagMapFromAPI();
    const series = await loadAllSeries();
    console.log('[Topics] loadHomeTopics 获取到', series.length, '个专题');

    // 仅保留「首页推荐」且「有已发布文章」的专题，按 featured_order 升序
    const sorted = (series || [])
        .filter(s => (s.is_featured === 1) && (s.article_count || 0) > 0)
        .slice()
        .sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0));

    // 无推荐数据：直接隐藏模块（首页 #topics 与专题页 #topics 通用），不再依赖渲染容器是否存在
    const section = document.getElementById('topics');
    if (!sorted.length) {
        if (section) section.style.display = 'none';
        return;
    }
    if (section) section.style.display = ''; // 有推荐数据才显示热门专题区块（默认隐藏，避免空态闪现）

    // 首页容器：横向卡片（#topics-grid）
    const grid = document.getElementById('topics-grid');
    if (grid) {
        // 半空状态：仅 1 个推荐专题时去掉横向滚动/吸附，改为左对齐单卡片（避免孤卡 + 大片空白）
        if (sorted.length >= 2) {
            grid.className = 'flex gap-6 overflow-x-auto pb-4 pt-4 -mt-4 snap-x snap-mandatory scrollbar-hide';
            grid.style.overflowX = 'auto';
        } else {
            grid.className = 'flex gap-6 pb-4 pt-4 -mt-4';
            grid.style.overflowX = 'visible';
        }
        grid.innerHTML = sorted.map(t => {
            const updatedAt = (t.updated_at || '').slice(0, 10);
            const desc = (t.description || '').trim();
            return `
                <a href="topics/detail.html?series=${t.id}&from=home" class="block group flex-shrink-0 w-56 snap-start"
                   onclick="trackClick('click_zhuanti','open_series','zhuanti_card','home','series',${t.id})">
                    <article class="card-hover flex flex-col w-56 aspect-square rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700">
                        <div class="h-2/3 overflow-hidden bg-slate-100 dark:bg-slate-800">
                            ${renderTopicCover(t)}
                        </div>
                        <div class="h-1/3 flex flex-col justify-center px-3 text-left gap-1">
                            <p class="text-xs leading-snug text-slate-600 dark:text-slate-300 line-clamp-2" title="${escapeHtml(desc)}">${escapeHtml(desc || '暂无简介')}</p>
                            <div class="flex items-center justify-between text-slate-400 text-xs whitespace-nowrap mt-0.5">
                                <span class="inline-flex items-center"><i class="fa-solid fa-eye mr-1"></i>${t.view_count ?? 0}</span>
                                <span class="inline-flex items-center"><i class="fas fa-clock mr-1"></i>${updatedAt}</span>
                            </div>
                        </div>
                    </article>
                </a>`;
        }).join('');
    }
    const list = document.getElementById('topics-list');
    if (list) {
        list.innerHTML = sorted.map((t, i) => {
            const title = (t.name || '').length > 20 ? (t.name.slice(0, 20) + '…') : (t.name || '');
            const desc = (t.description || '点击查看专题详情');
            const shortDesc = desc.length > 40 ? (desc.slice(0, 40) + '…') : desc;
            return `
                <li class="topic-simple-item">
                    <span class="topic-simple-index">${i + 1}</span>
                    <a href="detail.html?series=${t.id}&from=topics" class="block group min-w-0"
                       onclick="trackClick('click_topic','open_series','topics_list','topics','series',${t.id})">
                        <h4 class="font-semibold text-sm text-slate-800 dark:text-slate-100 group-hover:text-primary transition-theme-color truncate">${escapeHtml(title)}</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">${escapeHtml(shortDesc)}</p>
                    </a>
                </li>`;
        }).join('');
    }
}

// ---------- 专题列表页（筛选分类 + 搜索 + 卡片列表） ----------
let _allSeriesCache = [];   // 全部专题缓存
let _currentFilter = 'all'; // 当前筛选分类（领域）
let _currentTagFilter = ''; // 当前按标签筛选（与领域筛选解耦，专事专用）
let _currentKeyword = '';   // 当前搜索关键词

async function loadTopicsPage() {
    console.log('[Topics] loadTopicsPage 开始');
    // 拉取统一标签系统（general_tags / tech_stacks），供卡片/筛选使用
    await initTagMapFromAPI();

    // 一次拉取全部专题，仅保留有已发布文章的专题（无内容的专题不展示）
    const all = await loadAllSeries();
    _allSeriesCache = all.filter(s => (s.article_count || 0) > 0);
    console.log('[Topics] loadTopicsPage 获取到', all.length, '个专题，含已发布内容', _allSeriesCache.length, '个');

    // 完全没有专题数据：直接渲染整页空态，隐藏搜索/筛选/侧边栏等与数据相关的 UI
    if (_allSeriesCache.length === 0) {
        renderEmptyState();
        return;
    }

    renderFilterSidebar();
    renderSearchBox();
    renderSeriesList();

    // 右侧侧边栏：热门专题（复用首页精选专题逻辑，渲染到 #topics-grid）
    loadHomeTopics();
    // 右侧侧边栏：产品推荐（复用首页项目逻辑，渲染到 #projects-grid）
    renderSidebarProjects();
}

// 整页空态：全站没有任何已发布专题时展示（与筛选/搜索后无结果的列表小空态解耦，专事专用）
function renderEmptyState() {
    // 隐藏顶部大标题区（避免与实际空数据矛盾）
    const header = document.getElementById('topic-page-header');
    if (header) header.style.display = 'none';
    // 隐藏右侧侧边栏（搜索框/技术栈筛选/热门专题/产品推荐均无数据可展示）
    const aside = document.querySelector('aside');
    if (aside) aside.style.display = 'none';
    // 主内容区渲染居中的完整空态（清除网格布局，复用公共空态组件）
    const grid = document.getElementById('series-list');
    if (grid) {
        grid.className = '';
        renderPageEmptyState(grid, {
            icon: 'fa-book-open',
            title: '暂无专题内容',
            description: '专题内容正在筹备中，敬请期待。',
            links: [
                { href: navHref('projects/index.html'), label: '项目作品' },
                { href: navHref('blog/index.html'), label: '博客文章' },
            ],
        });
    }
}

// 渲染筛选区：技术栈标签筛选（搜索框上方），整体左对齐
function renderFilterSidebar() {
    renderTagFilter();
}

// 右侧侧边栏「产品推荐」：复用首页项目推荐逻辑，渲染为简单列表（仅产品名 + 介绍，无封面）
async function renderSidebarProjects() {
    const projectData = await loadProjects();
    if (!projectData) { document.getElementById('projects').style.display = 'none'; return; }

    const list = document.getElementById('projects-list');
    if (!list) return;

    // 只展示后台开启「首页推荐」的项目，按推荐序号升序（与首页逻辑一致）
    const allProjects = (projectData.projects || [])
        .filter(p => (p.is_featured ?? 0) === 1)
        .sort((a, b) => (a.featured_order ?? 0) - (b.featured_order ?? 0));

    if (!allProjects.length) {
        document.getElementById('projects').style.display = 'none';
        return;
    }

    // 有推荐项目才显示产品推荐区块（默认隐藏，避免空态闪现）
    const projectsSection = document.getElementById('projects');
    if (projectsSection) projectsSection.style.display = '';

    // 简单列表：仅产品名 + 介绍，无封面，带图标点缀
    list.innerHTML = allProjects.map(project => {
        const _descText = tiptapJsonToPlainText(parseTiptapJson(project.description));
        const desc = _descText.length > 40 ? (_descText.slice(0, 40) + '…') : _descText;
        return `
            <li class="topic-simple-item">
                <i class="fa-solid fa-cube topic-simple-icon"></i>
                <a href="../projects/${project.id}/?from=topics" class="block group min-w-0">
                    <h4 class="font-semibold text-sm text-slate-800 dark:text-slate-100 group-hover:text-primary transition-theme-color truncate">${escapeHtml(project.title)}</h4>
                    <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">${escapeHtml(desc)}</p>
                </a>
            </li>`;
    }).join('');
}

// 技术栈筛选：放搜索框上方平铺展示，无标题
function renderTagFilter() {
    const el = document.getElementById('topic-tags');
    if (!el) return;

    // 标签筛选区：严格从 TAG_MAP（tags 系统 tech_stacks）读取
    // 取「全部专题真实使用 ∩ TAG_MAP 存在」的标签，保证既来自 tags 系统、又有专题使用
    const tagSet = new Set();
    _allSeriesCache.forEach(s => {
        normalizeTags(s.tags).forEach(tag => {
            if (TAG_MAP[tag]) tagSet.add(tag); // 只收 tags 系统中存在的标签
        });
    });
    const tagList = Array.from(tagSet).sort();

    // 无可用标签：整块隐藏技术栈筛选区（空态即默认无数据状态，不显示"暂无标签"占位）
    if (!tagList.length) { el.style.display = 'none'; return; }
    el.style.display = '';

    const tagChips = tagList.length
        ? tagList.map(tag => {
            const active = _currentTagFilter === tag ? 'filter-selected' : '';
            return `<span class="topic-tag-item ${active}" onclick="selectTagFilter('${escapeHtml(tag)}')">${renderTagChip(tag, false)}</span>`;
        }).join('')
        : '<span class="topic-tag-empty">该分类下暂无标签</span>';

    const clearBtn = _currentTagFilter
        ? `<button class="topic-tag-clear" onclick="selectTagFilter('')">清除筛选</button>`
        : '';

    el.innerHTML = `<div class="topic-tag-body">${tagChips}${clearBtn}</div>`;
}

// 按单个技术栈标签筛选（与领域筛选解耦）
function selectTagFilter(tag) {
    _currentTagFilter = (_currentTagFilter === tag) ? '' : tag; // 点同一个则取消
    // 增量切换标签按钮选中态，不整块重写（避免闪烁）
    document.querySelectorAll('#topic-tags .topic-tag-item').forEach(item => {
        const t = (item.getAttribute('onclick') || '').match(/'([^']+)'\)/);
        item.classList.toggle('filter-selected', t && t[1] === _currentTagFilter && _currentTagFilter !== '');
    });
    // 清除按钮按需显隐
    const clearBtn = document.querySelector('.topic-tag-clear');
    if (clearBtn) clearBtn.style.display = _currentTagFilter ? '' : 'none';
    renderSeriesList();
}

function renderSearchBox() {
    const el = document.getElementById('topic-search');
    if (!el) return;
    el.innerHTML = `
        <div class="relative">
            <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
            <input type="text" id="topic-search-input" placeholder="搜索专题标题或技术栈…"
                class="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value="${escapeHtml(_currentKeyword)}" oninput="onTopicSearchInput(this.value)">
            <button id="topic-search-clear" type="button" onclick="clearTopicSearch()"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ${_currentKeyword ? '' : 'hidden'}">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>`;
}

function onTopicSearchInput(val) {
    _currentKeyword = val.trim().toLowerCase();
    const clearBtn = document.getElementById('topic-search-clear');
    if (clearBtn) clearBtn.classList.toggle('hidden', !_currentKeyword);
    renderSeriesList();
}

// 一键清空搜索框：清空输入、隐藏 X、重置关键词并重新渲染
function clearTopicSearch() {
    const input = document.getElementById('topic-search-input');
    const clearBtn = document.getElementById('topic-search-clear');
    if (input) input.value = '';
    if (clearBtn) clearBtn.classList.add('hidden');
    _currentKeyword = '';
    renderSeriesList();
}

// 渲染筛选/搜索后的专题卡片列表
function renderSeriesList() {
    const grid = document.getElementById('series-list');
    if (!grid) return;

    let list = _allSeriesCache.slice();

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
        grid.innerHTML = '<div class="w-full flex flex-col items-center justify-center py-16 text-slate-400"><i class="fa-solid fa-magnifying-glass text-3xl mb-3"></i><p>没有符合条件的专题</p></div>';
        return;
    }

    grid.innerHTML = list.map(s => {
        const updatedAt = (s.updated_at || '').slice(0, 10);
        const desc = (s.description || '').trim();
        return `
        <a href="detail.html?series=${s.id}&from=topics" class="block group">
            <article class="card-hover flex flex-col aspect-square rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700">
                <div class="h-2/3 overflow-hidden bg-slate-100 dark:bg-slate-800">
                    ${renderTopicCover(s)}
                </div>
                <div class="h-1/3 flex flex-col justify-center px-3 text-left gap-1">
                    <p class="text-xs leading-snug text-slate-600 dark:text-slate-300 line-clamp-2" title="${escapeHtml(desc)}">${escapeHtml(desc || '暂无简介')}</p>
                    <div class="flex items-center justify-between text-slate-400 text-xs whitespace-nowrap mt-0.5">
                        <span class="inline-flex items-center"><i class="fa-solid fa-eye mr-1"></i>${s.view_count ?? 0}</span>
                        <span class="inline-flex items-center"><i class="fas fa-clock mr-1"></i>${updatedAt}</span>
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

    // 拉取统一标签系统（general_tags / tech_stacks），供详情页文章标签使用
    await initTagMapFromAPI();

    // 调用 api.js 中的真实加载函数（该函数名与本文定义过的加载函数冲突，故本页加载入口单独命名）
    currentTopic = await loadTopicDetail(topicId);
    if (!currentTopic) { showDetailError('该专题暂无已发布内容'); return; }

    // 过滤掉没有任何已发布文章的章节（左侧目录不展示空章节文件夹）
    currentTopic.chapters = (currentTopic.chapters || []).filter(lv => (lv.articles || []).length > 0);

    // 更新页面标题 + SEO（真实摘要 / 分享卡片 / 结构化数据，统一走 seo.js 单点）✓
    if (window.HeAnSeo) {
        const _topicDesc = HeAnSeo.plainText(currentTopic.description);
        HeAnSeo.apply({
            title: `${currentTopic.name} | 禾安`,
            description: _topicDesc,
            image: currentTopic.cover_image || '',
            type: 'article',
            jsonLd: HeAnSeo.jsonLd.course({
                title: currentTopic.name,
                description: _topicDesc,
                image: currentTopic.cover_image || '',
            }),
        });
    } else {
        document.title = `${currentTopic.name} | 禾安`;
    }

    // 隐形埋点：专题详情曝光 + 开始学习（前端不展示，仅上报后端统计）
    const seriesId = parseInt(topicId) || 0;
    trackClick('start_learn', 'learn_start', 'series_detail', 'detail', 'series', seriesId);

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

// 从文章内容中提取 h2/h3 作为左侧子目录，并保留标题级别
function extractHeadingsWithLevel(article) {
    if (!article || !article.content) {
        return (article?.headings || []).map(text => ({ text, level: 2 }));
    }
    const tmp = document.createElement('div');
    tmp.innerHTML = renderContent(article.content);
    const out = [];
    tmp.querySelectorAll('h2, h3').forEach(h => {
        out.push({ text: h.textContent.trim(), level: h.tagName === 'H2' ? 2 : 3 });
    });
    return out.length ? out : (article.headings || []).map(text => ({ text, level: 2 }));
}

// 点击文章标题整行：有章节标题则切换展开/收起；若当前未选中则同时加载内容。
// 无章节标题（无子标题块）时：仅加载内容，不展开空白背景块。
function handleArticleClick(artId) {
    const node = document.querySelector(`.outline-article-node[data-article-id="${artId}"]`);
    const btn = node?.querySelector(':scope > .outline-article-btn');
    const isSelected = btn?.classList.contains('filter-selected');
    const hasSubheads = !!node?.querySelector(':scope > .outline-subheads');

    if (isSelected) {
        if (hasSubheads) toggleArticle(artId);   // 已选中且有子标题：折叠/展开
        // 已选中但无子标题：点击不再做任何切换，保持内容显示
    } else {
        selectArticle(artId);   // 未选中：直接加载内容（selectArticle 内部会重新渲染目录）
    }
}

function renderOutlineTree() {
    const tree = document.getElementById('outline-tree');
    if (!tree || !currentTopic) return;

    const levels = currentTopic.chapters || [];
    if (!levels.length) {
        tree.innerHTML = '<div class="text-slate-400 text-sm text-center py-8">暂无章节内容</div>';
        return;
    }

    const currentArticleId = currentArticle ? String(currentArticle.id || currentArticle.article_key) : null;

    tree.innerHTML = levels.map((lv, lvIdx) => {
        const articles = lv.articles || [];
        const lvId = `lv-${lv.id ?? lvIdx}`;
        const hasCurrentArticle = currentArticleId && articles.some(a => String(a.id || a.article_key) === currentArticleId);
        const isFirst = lvIdx === 0;
        const isLevelExpanded = isFirst || hasCurrentArticle;

        const articlesHtml = articles.map((art, artIdx) => {
            const artId = String(art.id || art.article_key);
            const isArtSelected = artId === currentArticleId;
            const isArtExpanded = isArtSelected;
            // 解析 h2/h3 并保留级别，用于左侧目录缩进区分
            const parsedHeadings = extractHeadingsWithLevel(art);
            const hasHeadings = parsedHeadings.length > 0;

            // 无章节标题：不显示折叠箭头，也不渲染空背景块（点击仅加载内容）
            const subheads = hasHeadings ? parsedHeadings.map((h, hi) => `
                <a href="javascript:void(0)"
                   class="outline-subhead truncate"
                   data-article-id="${artId}"
                   data-heading-level="${h.level}"
                   onclick="scrollToHeading('${artId}', ${hi})"
                   title="${escapeHtml(h.text)}">
                    ${escapeHtml(h.text)}
                </a>
            `).join('') : '';

            return `
            <div class="outline-article-node ${isArtExpanded ? 'expanded' : ''} ${hasHeadings ? '' : 'no-subheads'}" data-article-id="${artId}" data-level-id="${lvId}">
                <button class="outline-article-btn w-full flex items-center justify-between ${isArtSelected ? 'filter-selected' : ''}"
                        onclick="handleArticleClick('${artId}', event)">
                    <span class="flex items-center gap-2">
                        <span class="outline-article-label">${escapeHtml(art.title || '无标题')}</span>
                    </span>
                </button>
                ${hasHeadings ? `<div class="outline-subheads">${subheads}</div>` : ''}
            </div>`;
        }).join('');

        return `
        <div class="outline-level ${isLevelExpanded ? 'expanded' : ''}" data-level-id="${lvId}">
            <button class="outline-level-btn w-full flex items-center justify-between"
                    onclick="toggleLevel('${lvId}')">
                <span class="flex items-center gap-2">
                    <i class="fa-solid fa-caret-right outline-chevron ${isLevelExpanded ? 'rotate-90' : ''}"></i>
                    <span>${escapeHtml(lv.name || `章节 ${lvIdx + 1}`)}</span>
                </span>
            </button>
            <div class="outline-articles">
                ${articlesHtml}
            </div>
        </div>`;
    }).join('');
}

function toggleLevel(lvId) {
    const level = document.querySelector(`.outline-level[data-level-id="${lvId}"]`);
    if (!level) return;
    const isExpanded = level.classList.toggle('expanded');
    const chevron = level.querySelector(':scope > .outline-level-btn .outline-chevron');
    if (chevron) chevron.classList.toggle('rotate-90', isExpanded);
}

function toggleArticle(artId) {
    const node = document.querySelector(`.outline-article-node[data-article-id="${artId}"]`);
    if (!node) return;
    const isExpanded = node.classList.toggle('expanded');
    const chevron = node.querySelector(':scope > .outline-article-btn .outline-chevron');
    if (chevron) chevron.classList.toggle('rotate-90', isExpanded);
}

function selectArticle(articleId) {
    if (!currentTopic) return;

    const targetId = String(articleId);

    // 查找目标文章
    let article = null;
    let articleLevelId = null;
    for (const level of (currentTopic.chapters || [])) {
        const lvId = `lv-${level.id ?? ''}`;
        const found = (level.articles || []).find(a => String(a.id || a.article_key) === targetId);
        if (found) { article = found; articleLevelId = lvId; break; }
    }
    if (!article) return;
    currentArticle = article;

    // 重新渲染目录，确保当前文章所在章节和文章节点都展开
    renderOutlineTree();

    // 隐形埋点：文章打开（前端不展示，仅上报后端统计）
    const artId = article.id || article.article_key;
    if (artId) {
        trackClick('open_article', 'learn_start', 'article_item', 'detail', 'article', parseInt(artId) || artId);
        startArticleProgressTracking(parseInt(artId) || artId);
    }

    renderArticleDetail(article);
}

// 阅读进度追踪：监听内容区滚动，按最大可见比例上报 learn_progress（去抖 + 完成标记）
let _progressTimer = null;
let _progressMax = 0;
let _progressCompleted = false;
function startArticleProgressTracking(articleId) {
    const area = document.getElementById('detail-content-area');
    const bodyEl = document.getElementById('article-body');
    if (!area || !bodyEl) return;

    _progressMax = 0;
    _progressCompleted = false;

    const report = () => {
        const scrollTop = area.scrollTop;
        const scrollHeight = area.scrollHeight - area.clientHeight;
        let ratio = scrollHeight > 0 ? scrollTop / scrollHeight : (bodyEl.scrollHeight <= area.clientHeight ? 1 : 0);
        ratio = Math.max(0, Math.min(1, ratio));
        const percent = Math.round(ratio * 100);
        if (percent > _progressMax) _progressMax = percent;
        const completed = _progressMax >= 90;
        if (completed && !_progressCompleted) {
            _progressCompleted = true;
        }
        trackClick('read_progress', 'learn_progress', 'article_body', 'detail', 'article', articleId, {
            progress: _progressMax,
            completed: completed,
        });
    };

    area.onscroll = () => {
        if (_progressTimer) clearTimeout(_progressTimer);
        _progressTimer = setTimeout(report, 800);
    };
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
        // 根因：offsetTop 的 offsetParent 不是滚动容器（#detail-content-area），直接用它会导致滚过头、标题被藏。
        // 用 getBoundingClientRect 计算目标相对滚动容器的真实偏移，并预留 24px，确保标题完整露出。
        const delta = target.getBoundingClientRect().top - area.getBoundingClientRect().top;
        const top = Math.max(0, area.scrollTop + delta - 24);
        area.scrollTo({ top, behavior: 'smooth' });
    }
}

// 与 admin 中后台预览完全一致的渲染。
// 正文统一为 Tiptap JSON 文档模型，按 JSON 渲染。
function renderMarkdown(src) {
    const html = renderContent(src || '');
    if (!html) {
        return `<pre class="whitespace-pre-wrap font-sans text-sm leading-relaxed">${escapeHtml(src || '')}</pre>`;
    }

    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    // 1. 所有图片懒加载 + 圆角
    tmp.querySelectorAll('img').forEach(img => {
        img.setAttribute('loading', 'lazy');
        img.classList.add('blog-img');
    });

    // 2. 表格包裹滚动容器，移动端/窄屏可横向滚动
    tmp.querySelectorAll('table').forEach(table => {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
        table.classList.add('blog-table');
    });

    // 3. 代码块：用不滚动的 wrapper 包裹 pre，语言标签（左上）+ 复制按钮（右上）挂到 wrapper 上，
    //    这样横向滚动 pre 内容时，按钮固定在右上角、不跟随移动
    tmp.querySelectorAll('pre').forEach(pre => {
        const code = pre.querySelector('code');
        if (!code) return;
        const cls = code.className || '';
        const langMatch = cls.match(/language-([\w-]+)/);
        const lang = langMatch ? langMatch[1] : '';

        // 包裹层（不滚动、position: relative，作为按钮/语言标签的定位上下文）
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block';
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        if (lang) {
            const tag = document.createElement('span');
            tag.className = 'code-lang-tag';
            tag.textContent = lang;
            wrapper.appendChild(tag);
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'code-copy-btn';
        btn.setAttribute('aria-label', '复制代码');
        btn.innerHTML = '复制';
        btn.setAttribute('onclick', 'copyCodeFromButton(this)');
        wrapper.appendChild(btn);
    });

    return tmp.innerHTML;
}

/** 代码块复制按钮：复制 pre 内 code 文本 */
function copyCodeFromButton(btn) {
    const block = btn.closest('.code-block');
    const pre = block && block.querySelector('pre');
    const code = pre && pre.querySelector('code');
    if (!code) return;
    copyToClipboard(code.textContent);
    showToast('代码已复制');
    const original = btn.textContent;
    btn.textContent = '已复制';
    setTimeout(() => { btn.textContent = original; }, 1500);
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

    // Markdown 内容（与 admin 中后台预览保持一致：renderMarkdown + .preview-blog-content 样式）
    const bodyEl = document.getElementById('article-body');
    const artId = article.id || article.article_key;
    if (article.content) {
        bodyEl.classList.remove('empty-body');
        const inner = renderMarkdown(article.content);
        bodyEl.innerHTML = `<div class="preview-blog-content">${inner}</div>`;
        // 为 h2/h3 添加锚点 id，便于左侧目录第三级定位
        let hi = 0;
        bodyEl.querySelectorAll('h2, h3').forEach(h => {
            h.id = `heading-${artId}-${hi}`;
            hi++;
        });
    } else {
        bodyEl.classList.add('empty-body');
        bodyEl.innerHTML = `
            <div class="text-center">
                <i class="fa-regular fa-file-lines empty-state-icon"></i>
                <p class="empty-state-text">暂无内容</p>
            </div>
        `;
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

    // 无上一篇且无下一篇（如单篇文章）时，隐藏整个上下篇区块及其分割线
    const navContainer = document.getElementById('article-nav');
    if (navContainer) {
        const hasNav = prevEl.innerHTML.trim() !== '' || nextEl.innerHTML.trim() !== '';
        navContainer.style.display = hasNav ? '' : 'none';
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
