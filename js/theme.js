/**
 * HeAn 主题切换模块
 * 三模式：light / dark / system
 * localStorage key: 'theme-mode'（与 admin 一致）
 * 支持 URL 参数 ?theme=light|dark|system
 */

/** 获取系统主题偏好 */
function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** 初始化主题：读取 localStorage / URL 参数，应用 dark class */
function initTheme() {
    const urlMode = new URLSearchParams(location.search).get('theme');
    let mode;
    if (urlMode && ['light', 'dark', 'system'].includes(urlMode)) {
        mode = urlMode;
    } else {
        const saved = localStorage.getItem('theme-mode');
        mode = (saved && ['light', 'dark', 'system'].includes(saved)) ? saved : 'system';
    }

    const effective = mode === 'system' ? getSystemTheme() : mode;
    document.documentElement.classList.toggle('dark', effective === 'dark');

    updateThemeIcon(mode);

    // 监听系统主题变化（仅在 system 模式下生效）
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', () => {
        const current = localStorage.getItem('theme-mode') || 'system';
        if (current === 'system') {
            document.documentElement.classList.toggle('dark', getSystemTheme() === 'dark');
        }
    });

    // 绑定切换按钮
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', toggleTheme);
}

/** 三模式循环切换: light -> dark -> system -> light */
function toggleTheme() {
    const modes = ['light', 'dark', 'system'];
    const current = localStorage.getItem('theme-mode') || 'system';
    const i = modes.indexOf(current);
    const next = modes[(i + 1) % modes.length];

    localStorage.setItem('theme-mode', next);

    // 如果是从 URL 参数进入，清除参数
    if (new URLSearchParams(location.search).get('theme')) {
        const u = new URL(location.href);
        u.searchParams.delete('theme');
        history.replaceState(null, '', u.toString());
    }

    const effective = next === 'system' ? getSystemTheme() : next;
    document.documentElement.classList.toggle('dark', effective === 'dark');
    updateThemeIcon(next);
}

/** 更新三个 SVG 图标的可见性 */
function updateThemeIcon(mode) {
    const light = document.querySelectorAll('.theme-icon-light');
    const dark = document.querySelectorAll('.theme-icon-dark');
    const system = document.querySelectorAll('.theme-icon-system');
    const show = (els, visible) => els.forEach(el => el.style.display = visible ? '' : 'none');
    show(light, mode === 'light');
    show(dark, mode === 'dark');
    show(system, mode === 'system');
}

// ========== 滚动阴影 ==========
function initScrollShadow() {
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        if (navbar) navbar.classList.toggle('shadow-md', window.scrollY > 20);
    });
}

// ========== 应用初始化 ==========
function initApp(activePage) {
    initTheme();
    initNavbar(activePage);
    renderFooter();
    initScrollShadow();
    requestAnimationFrame(() => {
        document.body.classList.add('ready');
    });
}
