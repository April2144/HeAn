/**
 * HeAn 主题切换模块
 * 双模式：light / dark（⭐ 不支持"跟随系统" ✗）
 * 默认：light ✓（首次打开 / 无记录 / 记录值非法时）
 * localStorage key: 'hean-theme-mode'
 *   ⚠️ 与后台 admin 的 'theme-mode'【完全解耦】✓ 互不影响 ✓（2026-10-11 前后台分离）
 * 支持 URL 参数 ?theme=light|dark
 */

/** 初始化主题：读取 localStorage / URL 参数，应用 dark class */
function initTheme() {
    const urlMode = new URLSearchParams(location.search).get('theme');
    let mode;
    if (urlMode && ['light', 'dark'].includes(urlMode)) {
        mode = urlMode;
    } else {
        const saved = localStorage.getItem('hean-theme-mode');
        // ⭐ 默认 light ✓；历史遗留的 'system'（或任何非法值）也一律归为 light ✓
        mode = (saved === 'dark') ? 'dark' : 'light';
    }

    document.documentElement.classList.toggle('dark', mode === 'dark');
    updateThemeIcon(mode);

    // ⚠️ 已移除：监听系统主题变化的 matchMedia 监听器 ✗
    //    规范：HeAn 只支持 light/dark 手动切换，不支持随系统 ✓（2026-10-11）
}

/** 绑定主题切换按钮：必须在导航栏渲染（initNavbar）之后调用，此时 #theme-toggle 才存在 */
function bindThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', toggleTheme);
}

/** 双模式切换：light ⇄ dark */
function toggleTheme() {
    const cur = localStorage.getItem('hean-theme-mode') === 'dark' ? 'dark' : 'light';
    const next = cur === 'dark' ? 'light' : 'dark';

    localStorage.setItem('hean-theme-mode', next);

    // 如果是从 URL 参数进入，清除参数
    if (new URLSearchParams(location.search).get('theme')) {
        const u = new URL(location.href);
        u.searchParams.delete('theme');
        history.replaceState(null, '', u.toString());
    }

    document.documentElement.classList.toggle('dark', next === 'dark');
    updateThemeIcon(next);
}

/** 更新两个 SVG 图标的可见性（light / dark ✓） */
function updateThemeIcon(mode) {
    const light = document.querySelectorAll('.theme-icon-light');
    const dark = document.querySelectorAll('.theme-icon-dark');
    const show = (els, visible) => els.forEach(el => el.style.display = visible ? '' : 'none');
    show(light, mode !== 'dark');
    show(dark, mode === 'dark');
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

// ========== 页脚联系方式缓存 ==========
// 为什么要缓存：页脚联系方式来自 /site/profile（网络请求），原先"先 renderFooter() 精简版 →
// 数据到后再 renderFooter(contacts)"会把页脚整体换掉（实测 FOOTER 位移，CLS 高达 0.137）。
// 缓存后二次访问首屏即渲染完整页脚，且仅当数据真的变化时才重渲染。
const CONTACTS_KEY = 'hean_contacts';
function readCachedContacts() {
    try { return JSON.parse(localStorage.getItem(CONTACTS_KEY) || 'null'); } catch (e) { return null; }
}
function writeCachedContacts(c) {
    try { localStorage.setItem(CONTACTS_KEY, JSON.stringify(c)); } catch (e) { /* 隐私模式等场景忽略 */ }
}

// ========== 应用初始化 ==========
function initApp(activePage, opts = {}) {
    initTheme();
    initNavbar(activePage, opts);
    // 【关键】导航骨架渲染后，立刻【同步】挂载右上角登录区（登录按钮/头像）。
    // 登录态读 localStorage、入口开关读本地缓存，都无需等待网络 → 首屏即渲染出最终宽度，
    // 避免"导航画好后约 100ms 才插入登录按钮"导致 tab 行整体平移（实测位移 30px 的闪动）。
    if (typeof HeAnAuth !== 'undefined' && HeAnAuth.initAuthSync) {
        HeAnAuth.initAuthSync({ skipLoginBtn: opts.type === 'login' });
    }
    // 导航栏渲染后，按当前主题同步一次图标（initTheme 执行时导航栏尚不存在，跨页跳转时图标需在此补刷新）
    updateThemeIcon(localStorage.getItem('hean-theme-mode'));
    bindThemeToggle();
    // 首屏用缓存的联系方式渲染页脚（二次访问即完整），避免数据到达后再整体替换 → 页脚跳变
    renderFooter(readCachedContacts() || undefined);
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
            // 同时统一刷新品牌名：此前只有首页/关于我页做了替换，导致各页面显示不一致
            if (typeof applySiteName === 'function') applySiteName();
            // ⚠️ 配置到齐后补渲染页脚：首屏那次 renderFooter 可能因 SITE_CONFIG 未到而渲染出"没有备案号"的页脚 ✗
            //    （列表页实测 bug：备案号只在首页/关于我页出现）。
            //    仅在【页脚确实缺备案号】时补一次 → 正常路径不重渲染，避免页脚跳变（CLS）✓
            if (typeof footerMissingBeian === 'function' && footerMissingBeian()) {
                renderFooter(readCachedContacts() || undefined);
            }
            const skipLoginBtn = opts.type === 'login';
            const hideAuth = Number((cfg && cfg.config && cfg.config.enable_login_entry) ?? 1) !== 1;
            if (typeof HeAnAuth !== 'undefined' && HeAnAuth.initAuth) {
                HeAnAuth.initAuth({ skipLoginBtn, hideAuth });
            }

            const data = await loadProfile();
            const contacts = data && data.about && data.about.contacts;
            // 仅当联系方式与"已渲染/已缓存"的确实不同时才重渲染，避免页脚无谓跳变（CLS）
            if (contacts && JSON.stringify(contacts) !== JSON.stringify(readCachedContacts())) {
                renderFooter(contacts);
                writeCachedContacts(contacts);
            }
        } catch(e) {}
    })();

    // 页面级浏览埋点（统一由 initApp 上报，详情页/列表页共用，互不重复）
    if (typeof autoTrackPageView === 'function') {
        autoTrackPageView(activePage);
    }
}
