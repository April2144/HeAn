/**
 * HeAn 主题与交互初始化
 * 包含：暗黑模式、滚动阴影、应用级初始化
 */

function initTheme() {
    const html = document.documentElement;
    // 确保与 localStorage 同步（内联脚本已设置，此处做二次保障）
    if (localStorage.theme === 'dark') {
        html.classList.add('dark');
    } else if (localStorage.theme === 'light') {
        html.classList.remove('dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.classList.add('dark');
    }
    // 主题切换事件
    document.addEventListener('click', (e) => {
        if (e.target.closest('#theme-toggle')) {
            html.classList.toggle('dark');
            localStorage.theme = html.classList.contains('dark') ? 'dark' : 'light';
        }
    });
}

function initScrollShadow() {
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        if (navbar) navbar.classList.toggle('shadow-md', window.scrollY > 20);
    });
}

function initApp(activePage) {
    initTheme();          // 先同步主题状态
    initNavbar(activePage);  // 只做高亮和事件绑定，不替换 DOM
    renderFooter();
    initScrollShadow();
    // 页面就绪，启用颜色过渡动画
    requestAnimationFrame(() => {
        document.body.classList.add('ready');
    });
}
