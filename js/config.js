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
    bio: '独立开发者 · 专注 iOS 移动端开发',
    filing_no: '',                          // 备案号（后台配置，空则不显示页脚备案）
    filing_url: 'https://beian.mps.gov.cn', // 公安联网备案平台链接
    icp_filing_no: '',                      // ICP 备案号（后台配置，空则不显示）
    icp_filing_url: 'https://beian.miit.gov.cn' // ICP 备案平台链接
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

const GROUP_ICONS = ['fa-code', 'fa-chart-line', 'fa-lightbulb', 'fa-cube', 'fa-heart'];

/** 从后端 API 获取分组标签数据，失败则用本地兜底 */
async function initTagMapFromAPI() {
    try {
        const data = await apiGet('/site/tags/grouped');
        if (!data) throw new Error('API unavailable');

        // 重建 TAG_MAP：专题标签统一复用 tech_stacks，避免 series/general 冗余
        // 颜色取法与「关于我-技术栈」保持一致（独立颜色字段，全空则降级蓝系）
        const newMap = {};

        const buildEntry = (t, defaultIcon) => {
            const bg = t.bg_color || 'bg-blue-100';
            const txt = t.text_color || 'text-blue-600';
            const darkBg = t.dark_bg_color || 'dark:bg-blue-900/30';
            const darkTxt = t.dark_text_color || 'dark:text-blue-400';
            // 字号/粗细：后端配置存在则读取，不存在用默认值（默认不加粗）
            const fontSize = t.font_size || '';   // 如 '12px'，缺省空串走 CSS 默认 12px
            const fontWeight = t.font_weight || 'normal';
            return {
                icon: t.icon || defaultIcon,
                class: `${bg} ${txt} ${darkBg} ${darkTxt}`,
                fontSize,
                fontWeight,
            };
        };

        // 技术栈（关于我/专题/项目共用的标签库）
        (data.tech_stacks || []).forEach(t => {
            newMap[t.name] = buildEntry(t, 'fa-code');
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
