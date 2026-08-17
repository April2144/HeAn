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
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    const cb = () => navbar.classList.toggle('shadow-md', window.scrollY > 20);
    // 立即检查初始滚动位置，避免延迟触发 shadow 过渡动画
    cb();
    window.addEventListener('scroll', cb, { passive: true });
}

// ========== 环境切换（仅开发环境显示）==========
function initEnvSwitcher() {
    var h = location.hostname;
    // 生产环境不显示
    if (h === 'hacore.cn' || h === 'www.hacore.cn') return;

    var envMode = localStorage.getItem('env-mode') || 'auto';
    var hasApiParam = new URLSearchParams(location.search).has('api');
    var labelText = hasApiParam ? 'URL' : (envMode === 'offline' ? '本地' : envMode === 'cloud' ? '云端' : '自动');

    var container = document.createElement('div');
    container.id = 'env-switcher';
    container.innerHTML = `
        <style>
            #env-switcher { position: fixed; bottom: 20px; right: 20px; z-index: 9998; }
            #env-float-btn {
                display: flex; align-items: center; gap: 6px;
                padding: 6px 12px; border-radius: 20px;
                border: 1px solid rgba(148,163,184,0.3);
                background: rgba(255,255,255,0.7); backdrop-filter: blur(8px);
                font-size: 12px; font-weight: 500; color: #475569;
                cursor: pointer; transition: all 0.2s; opacity: 0.5;
            }
            #env-float-btn:hover { opacity: 1; border-color: #4f8cf7; color: #4f8cf7; }
            .dark #env-float-btn {
                background: rgba(15,23,42,0.7); color: #94a3b8;
                border-color: rgba(71,85,105,0.3);
            }
            .dark #env-float-btn:hover { border-color: #4f8cf7; color: #60a5fa; }
            #env-float-dropdown {
                display: none; position: absolute; bottom: calc(100% + 8px); right: 0;
                min-width: 200px; padding: 6px; border-radius: 10px;
                border: 1px solid rgba(148,163,184,0.2);
                background: rgba(255,255,255,0.95); backdrop-filter: blur(12px);
                box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            }
            .dark #env-float-dropdown {
                background: rgba(15,23,42,0.95); border-color: rgba(71,85,105,0.2);
            }
            #env-float-dropdown.show { display: block; }
            .env-float-title {
                font-size: 11px; font-weight: 600; color: #94a3b8;
                padding: 6px 10px 4px; text-transform: uppercase; letter-spacing: 0.5px;
            }
            .env-float-option {
                display: block; width: 100%; text-align: left;
                padding: 7px 10px; border: none; background: transparent;
                cursor: pointer; border-radius: 6px; font-size: 13px;
                color: inherit; transition: all 0.15s;
            }
            .env-float-option:hover { background: rgba(79,140,247,0.1); }
            .env-float-option.active { background: rgba(79,140,247,0.15); color: #4f8cf7; font-weight: 600; }
        </style>
        <button id="env-float-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
            <span>${labelText}</span>
        </button>
        <div id="env-float-dropdown">
            <div class="env-float-title">切换调试环境</div>
            <button class="env-float-option ${envMode === 'auto' && !hasApiParam ? 'active' : ''}" data-env="auto">自动检测</button>
            <button class="env-float-option ${envMode === 'offline' && !hasApiParam ? 'active' : ''}" data-env="offline">本地 localhost:8000</button>
            <button class="env-float-option ${envMode === 'cloud' && !hasApiParam ? 'active' : ''}" data-env="cloud">云端 175.178.7.7:8000</button>
        </div>
    `;
    document.body.appendChild(container);

    var btn = document.getElementById('env-float-btn');
    var dropdown = document.getElementById('env-float-dropdown');

    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('show');
    });
    document.addEventListener('click', function() { dropdown.classList.remove('show'); });
    dropdown.addEventListener('click', function(e) { e.stopPropagation(); });

    dropdown.querySelectorAll('.env-float-option').forEach(function(opt) {
        opt.addEventListener('click', function() {
            var env = opt.dataset.env;
            if (env === 'auto') localStorage.removeItem('env-mode');
            else localStorage.setItem('env-mode', env);
            var url = new URL(location.href);
            url.searchParams.delete('api');
            location.href = url.toString();
        });
    });
}

// ========== 应用初始化 ==========
function initApp(activePage) {
    initTheme();
    initNavbar(activePage);
    renderFooter();
    initScrollShadow();
    initEnvSwitcher();
    requestAnimationFrame(() => {
        document.body.classList.add('ready');
    });

    // 加载 contacts 后重新渲染 footer（使联系入口在所有页面生效）
    (async () => {
        try {
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
