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
}

/** 绑定主题切换按钮：必须在导航栏渲染（initNavbar）之后调用，此时 #theme-toggle 才存在 */
function bindThemeToggle() {
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
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    const cb = () => navbar.classList.toggle('shadow-md', window.scrollY > 20);
    // 立即检查初始滚动位置，避免延迟触发 shadow 过渡动画
    cb();
    window.addEventListener('scroll', cb, { passive: true });
}

// ========== 应用初始化 ==========
function initApp(activePage, opts = {}) {
    initTheme();
    initNavbar(activePage, opts);
    // 导航栏渲染后，按当前主题同步一次图标（initTheme 执行时导航栏尚不存在，跨页跳转时图标需在此补刷新）
    updateThemeIcon(localStorage.getItem('theme-mode') || 'system');
    bindThemeToggle();
    renderFooter();
    initScrollShadow();
    requestAnimationFrame(() => {
        document.body.classList.add('ready');
    });

    // 加载 contacts 后重新渲染 footer（使联系入口在所有页面生效）
    (async () => {
        try {
            // 右上角登录态：挂载登录按钮 / 头像下拉，并同步最新用户资料
            // 依赖站点配置中的 enable_login_entry 判断全局是否显示入口
            const cfg = await loadBaseConfig();
            // 站点配置加载完成后，统一刷新品牌 logo（导航/页脚）
            if (typeof applySiteLogo === 'function') applySiteLogo();
            const skipLoginBtn = opts.type === 'login';
            const hideAuth = Number((cfg && cfg.config && cfg.config.enable_login_entry) ?? 1) !== 1;
            if (typeof HeAnAuth !== 'undefined' && HeAnAuth.initAuth) {
                HeAnAuth.initAuth({ skipLoginBtn, hideAuth });
            }

            const data = await loadProfile();
            if (data && data.about && data.about.contacts) {
                renderFooter(data.about.contacts);
            }
        } catch(e) {}
    })();

    // 页面级浏览埋点（统一由 initApp 上报，详情页/列表页共用，互不重复）
    if (typeof autoTrackPageView === 'function') {
        autoTrackPageView(activePage);
    }
}
