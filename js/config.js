/**
 * HeAn 网站全局配置
 * 包含：Tailwind 配置、站点信息、标签映射、技术栈图标
 */

const TAILWIND_CONFIG = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: '#3B82F6',
                secondary: '#10B981',
                dark: '#0F172A',
                light: '#F8FAFC'
            },
            fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
        }
    }
};

const SITE = {
    name: '禾安',
    bio: '独立开发者 · 专注 iOS 移动端开发'
};

// 本地兜底 TAG_MAP（扁平结构：groupName → {icon, class}）
const TAG_MAP_FALLBACK = {
    '技术博客': { icon: 'fa-code',       class: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    '商业洞察': { icon: 'fa-chart-line', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    '个人思考': { icon: 'fa-lightbulb',  class: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
};

// 运行时 TAG_MAP（优先从 API 填充，兜底用 FALLBACK）
let TAG_MAP = { ...TAG_MAP_FALLBACK };

// 本地兜底分组列表
const GROUP_LIST_FALLBACK = ['技术博客', '商业洞察', '个人思考'];

// 运行时分组列表（优先从 API）
let GROUP_LIST = [...GROUP_LIST_FALLBACK];

// 默认分组颜色序列（API 未提供颜色时使用）
const GROUP_COLORS = [
    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
];

const GROUP_ICONS = ['fa-code', 'fa-chart-line', 'fa-lightbulb', 'fa-cube', 'fa-heart'];

/** 从后端 API 获取分组标签数据，失败则用本地兜底 */
async function initTagMapFromAPI() {
    try {
        const resp = await fetch('/site/tags/grouped');
        if (!resp.ok) throw new Error('API unavailable');
        const json = await resp.json();
        const data = json.data || json;

        // 重建 TAG_MAP（系列标签，使用扁平结构）
        const newMap = {};
        let colorIdx = 0;

        const seriesTags = data.series_tags || [];

        // 系列
        seriesTags.forEach(s => {
            newMap[s.name] = {
                icon: s.icon || 'fa-bookmark',
                class: s.color || GROUP_COLORS[colorIdx % GROUP_COLORS.length],
                scope: 'series',
            };
            colorIdx++;
        });

        if (Object.keys(newMap).length > 0) {
            TAG_MAP = { ...TAG_MAP_FALLBACK, ...newMap };
        }
    } catch (e) {
        // API 不可用时使用本地兜底
        TAG_MAP = { ...TAG_MAP_FALLBACK };
        GROUP_LIST = [...GROUP_LIST_FALLBACK];
    }
}

const TECH_ICONS = {
    'React': { icon: 'fab fa-react', color: 'text-blue-500' },
    'Tailwind': { icon: 'fab fa-css3-alt', color: 'text-cyan-500' },
    'ECharts': { icon: 'fas fa-chart-bar', color: 'text-green-500' },
    'TypeScript': { icon: 'fas fa-code', color: 'text-purple-500' },
    'Vue3': { icon: 'fab fa-vuejs', color: 'text-green-600' },
    'Pinia': { icon: 'fas fa-store', color: 'text-yellow-500' },
    'LocalStorage': { icon: 'fas fa-database', color: 'text-orange-500' },
    'Node.js': { icon: 'fab fa-node-js', color: 'text-green-600' },
    'Markdown': { icon: 'fab fa-markdown', color: 'text-slate-600' },
    'SEO': { icon: 'fas fa-search', color: 'text-blue-600' },
    'Swift': { icon: 'fab fa-apple', color: 'text-slate-700' },
    'SwiftUI': { icon: 'fab fa-apple', color: 'text-blue-600' },
    'Flutter': { icon: 'fas fa-mobile-alt', color: 'text-cyan-500' },
    'Objective-C': { icon: 'fab fa-apple', color: 'text-slate-600' }
};
