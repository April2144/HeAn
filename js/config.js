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

const TAG_MAP = {
    colors: {
        '技术博客': 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        '商业洞察': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        '个人思考': 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
    },
    icons: { '技术博客': 'fa-code', '商业洞察': 'fa-chart-line', '个人思考': 'fa-lightbulb' }
};

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
