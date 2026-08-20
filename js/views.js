/**
 * HeAn 共用视图组件
 * 导航栏抽离为单点定义：renderNavbar 生成骨架，initNavbar 负责高亮与事件绑定
 * 两种类型：
 *   - main：完整导航（logo + tabs + 右上角登录/主题 + 汉堡菜单），用于各列表/首页
 *   - detail：简洁导航（返回 + 返回标签 + 右上角登录/主题），用于二级详情页
 *   - login：登录页导航（logo + 右上角登录/主题，无 tabs、无汉堡），复用主界面样式
 */

// 全站 tabs 配置（单点定义，main 导航复用）
const NAV_TABS = [
    { key: 'home',     label: '首页',   href: 'index.html' },
    { key: 'topics',   label: '专题',   href: 'topics/index.html' },
    { key: 'projects', label: '项目',   href: 'projects/index.html' },
    { key: 'blog',     label: '博客',   href: 'blog/index.html' },
    { key: 'about',    label: '关于我', href: 'about/index.html' },
];

// 相对路径前缀：根目录页（/hean/index.html）用 './'，子目录页（/hean/blog/index.html 等）用 '../'
function getRoot() {
    // 按 pathname 目录层级段数判断，避免"以 index.html 结尾"误判子目录页
    // ['hean','index.html']=2 段 → './'；['hean','blog','index.html']=3 段 → '../'
    const segs = location.pathname.split('/').filter(Boolean);
    return segs.length >= 3 ? '../' : './';
}

// 根据当前页相对于站点根目录的深度，返回正确的资源/链接前缀
function navHref(href) {
    return getRoot() + href;
}

/** 生成 tab 链接 HTML（当前页高亮用 text-primary 区分） */
function navTabLinks(activePage, isMobile) {
    return NAV_TABS.map(t => {
        const active = t.key === activePage;
        const cls = isMobile
            ? `block px-3 py-2 rounded-lg transition-colors ${active ? 'text-primary font-medium bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`
            : `${active ? 'text-primary font-medium' : 'hover:text-primary'} transition-colors`;
        return `<a href="${navHref(t.href)}" data-nav="${t.key}" class="${cls}">${t.label}</a>`;
    }).join('');
}

/** 主题切换按钮 HTML（三态图标，由 theme.js 控制显隐） */
function navThemeToggle() {
    return `<button id="theme-toggle" class="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="切换主题 (亮色/暗色/跟随系统)">
        <span class="theme-icon-light"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg></span>
        <span class="theme-icon-dark" style="display:none"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg></span>
        <span class="theme-icon-system" style="display:none"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></span>
    </button>`;
}

/** 右上角区：登录/头像（auth.js 挂载） + 主题切换 + 汉堡（仅 main 桌面外） */
function navRightArea(type) {
    const menuToggle = (type === 'main')
        ? `<button id="menu-toggle" class="md:hidden p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
               <i class="fas fa-bars" id="menu-icon-open"></i>
               <i class="fas fa-times hidden" id="menu-icon-close"></i>
           </button>`
        : '';
    return `<div class="flex items-center space-x-3">
        <div id="auth-area" class="flex items-center"></div>
        ${navThemeToggle()}
        ${menuToggle}
    </div>`;
}

/** 全站导航抽离：根据 type 生成骨架，写入 #navbar 容器 */
function renderNavbar(opts = {}) {
    const { type = 'main', activePage = '' } = opts;
    const nav = document.getElementById('navbar');
    if (!nav) return;

    const logo = `<a href="${navHref('index.html')}" class="flex-shrink-0 flex items-center">
        <img src="${getRoot()}logo/logo-mark.svg" alt="禾安" class="h-8 w-8 mr-2">
        <span class="font-bold text-xl tracking-tight" id="site-name">禾安</span>
    </a>`;

    if (type === 'login') {
        // 登录页：复用主界面导航样式，但不显示页面 tabs、无汉堡菜单（仅 logo + 右上角登录/主题）
        nav.className = 'fixed w-full z-50 glass-effect border-b border-slate-200 dark:border-slate-800 transition-shadow duration-300';
        nav.innerHTML = `<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
                ${logo}
                <div class="flex-1"></div>
                ${navRightArea('login')}
            </div>
        </div>`;
        return;
    }

    if (type === 'detail') {
        // 详情页：返回 + 返回标签 + 左上自定义插槽（如侧栏按钮）+ 右上角登录/主题（无 tab、无汉堡）
        nav.className = 'fixed top-0 left-0 right-0 z-50 glass-effect border-b border-slate-200 dark:border-slate-800 h-16 flex items-center';
        nav.innerHTML = `<div class="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
            <button onclick="goBack()" class="-ml-2 flex items-center gap-1 p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="返回">
                <i class="fa-solid fa-angle-left text-lg"></i>
                <span class="text-base">返回</span>
            </button>
            <div id="nav-left-custom" class="hidden ml-2"></div>
            <div class="flex-1"></div>
            ${navRightArea('detail')}
        </div>`;
        return;
    }

    // main：完整导航
    nav.className = 'fixed w-full z-50 glass-effect border-b border-slate-200 dark:border-slate-800 transition-shadow duration-300';
    nav.innerHTML = `<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
            ${logo}
            <div class="hidden md:flex space-x-8">
                ${navTabLinks(activePage, false)}
            </div>
            ${navRightArea('main')}
        </div>
        <div class="md:hidden hidden" id="mobile-menu">
            <div class="pb-4 space-y-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                ${navTabLinks(activePage, true)}
            </div>
        </div>
    </div>`;
}

function initNavbar(activePage, opts = {}) {
    const { type = 'main' } = opts;
    const nav = document.getElementById('navbar');
    if (!nav) return;

    // 生成导航骨架
    renderNavbar(opts);

    // 高亮当前页 tab（仅用颜色区分，不加粗，避免 flex 导航行重排位移）
    nav.querySelectorAll('[data-nav]').forEach(link => {
        if (link.dataset.nav === activePage) {
            link.classList.add('text-primary');
            link.classList.remove('hover:text-primary');
        }
    });

    // 汉堡菜单切换（仅 main）
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const iconOpen = document.getElementById('menu-icon-open');
    const iconClose = document.getElementById('menu-icon-close');
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            iconOpen.classList.toggle('hidden');
            iconClose.classList.toggle('hidden');
        });
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                iconOpen.classList.remove('hidden');
                iconClose.classList.add('hidden');
            });
        });
    }

    // 详情页：无返回标签（已移除），无需额外处理
}

function renderFooter(contacts = {}) {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const root = getRoot();

    // 小红书官方 SVG icon（来源：simple-icons）
    const xhsIcon = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M22.405 9.879c.002.016.01.02.07.019h.725a.797.797 0 0 0 .78-.972.794.794 0 0 0-.884-.618.795.795 0 0 0-.692.794c0 .101-.002.666.001.777zm-11.509 4.808c-.203.001-1.353.004-1.685.003a2.528 2.528 0 0 1-.766-.126.025.025 0 0 0-.03.014L7.7 16.127a.025.025 0 0 0 .01.032c.111.06.336.124.495.124.66.01 1.32.002 1.981 0 .01 0 .02-.006.023-.015l.712-1.545a.025.025 0 0 0-.024-.036zM.477 9.91c-.071 0-.076.002-.076.01a.834.834 0 0 0-.01.08c-.027.397-.038.495-.234 3.06-.012.24-.034.389-.135.607-.026.057-.033.042.003.112.046.092.681 1.523.787 1.74.008.015.011.02.017.02.008 0 .033-.026.047-.044.147-.187.268-.391.371-.606.306-.635.44-1.325.486-1.706.014-.11.021-.22.03-.33l.204-2.616.022-.293c.003-.029 0-.033-.03-.034zm7.203 3.757a1.427 1.427 0 0 1-.135-.607c-.004-.084-.031-.39-.235-3.06a.443.443 0 0 0-.01-.082c-.004-.011-.052-.008-.076-.008h-1.48c-.03.001-.034.005-.03.034l.021.293c.076.982.153 1.964.233 2.946.05.4.186 1.085.487 1.706.103.215.223.419.37.606.015.018.037.051.048.049.02-.003.742-1.642.804-1.765.036-.07.03-.055.003-.112zm3.861-.913h-.872a.126.126 0 0 1-.116-.178l1.178-2.625a.025.025 0 0 0-.023-.035l-1.318-.003a.148.148 0 0 1-.135-.21l.876-1.954a.025.025 0 0 0-.023-.035h-1.56c-.01 0-.02.006-.024.015l-.926 2.068c-.085.169-.314.634-.399.938a.534.534 0 0 0-.02.191.46.46 0 0 0 .23.378.981.981 0 0 0 .46.119h.59c.041 0-.688 1.482-.834 1.972a.53.53 0 0 0-.023.172.465.465 0 0 0 .23.398c.15.092.342.12.475.12l1.66-.001c.01 0 .02-.006.023-.015l.575-1.28a.025.025 0 0 0-.024-.035zm-6.93-4.937H3.1a.032.032 0 0 0-.034.033c0 1.048-.01 2.795-.01 6.829 0 .288-.269.262-.28.262h-.74c-.04.001-.044.004-.04.047.001.037.465 1.064.555 1.263.01.02.03.033.051.033.157.003.767.009.938-.014.153-.02.3-.06.438-.132.3-.156.49-.419.595-.765.052-.172.075-.353.075-.533.002-2.33 0-4.66-.007-6.991a.032.032 0 0 0-.032-.032zm11.784 6.896c0-.014-.01-.021-.024-.022h-1.465c-.048-.001-.049-.002-.05-.049v-4.66c0-.072-.005-.07.07-.07h.863c.08 0 .075.004.075-.074V8.393c0-.082.006-.076-.08-.076h-3.5c-.064 0-.075-.006-.075.073v1.445c0 .083-.006.077.08.077h.854c.075 0 .07-.004.07.07v4.624c0 .095.008.084-.085.084-.37 0-1.11-.002-1.304 0-.048.001-.06.03-.06.03l-.697 1.519s-.014.025-.008.036c.006.01.013.008.058.008 1.748.003 3.495.002 5.243.002.03-.001.034-.006.035-.033v-1.539zm4.177-3.43c0 .013-.007.023-.02.024-.346.006-.692.004-1.037.004-.014-.002-.022-.01-.022-.024-.005-.434-.007-.869-.01-1.303 0-.072-.006-.071.07-.07l.733-.003c.041 0 .081.002.12.015.093.025.16.107.165.204.006.431.002 1.153.001 1.153zm2.67.244a1.953 1.953 0 0 0-.883-.222h-.18c-.04-.001-.04-.003-.042-.04V10.21c0-.132-.007-.263-.025-.394a1.823 1.823 0 0 0-.153-.53 1.533 1.533 0 0 0-.677-.71 2.167 2.167 0 0 0-1-.258c-.153-.003-.567 0-.72 0-.07 0-.068.004-.068-.065V7.76c0-.031-.01-.041-.046-.039H17.93s-.016 0-.023.007c-.006.006-.008.012-.008.023v.546c-.008.036-.057.015-.082.022h-.95c-.022.002-.028.008-.03.032v1.481c0 .09-.004.082.082.082h.913c.082 0 .072.128.072.128V11.19s.003.117-.06.117h-1.482c-.068 0-.06.082-.06.082v1.445s-.01.068.064.068h1.457c.082 0 .076-.006.076.079v3.225c0 .088-.007.081.082.081h1.43c.09 0 .082.007.082-.08v-3.27c0-.029.006-.035.033-.035l2.323-.003c.098 0 .191.02.28.061a.46.46 0 0 1 .274.407c.008.395.003.79.003 1.185 0 .259-.107.367-.33.367h-1.218c-.023.002-.029.008-.028.033.184.437.374.871.57 1.303a.045.045 0 0 0 .04.026c.17.005.34.002.51.003.15-.002.517.004.666-.01a2.03 2.03 0 0 0 .408-.075c.59-.18.975-.698.976-1.313v-1.981c0-.128-.01-.254-.034-.38 0 .078-.029-.641-.724-.998z"/></svg>`;

    const icons = [];

    // 邮箱：点击弹出联系意向弹窗
    if (contacts.email) {
        icons.push(`<a href="#" class="footer-contact-icon footer-email text-slate-400 hover:text-primary" title="发送邮件"><i class="fas fa-envelope"></i></a>`);
    }

    // 微信：仅当后端配置了公众号二维码时显示，点击弹窗展示公众号（专事专用，不再依赖微信号）
    if (contacts.mp_qrcode) {
        icons.push(`<a href="#" class="footer-contact-icon footer-wechat text-slate-400 hover:text-primary" data-mp-qrcode="${contacts.mp_qrcode}" data-mp-name="${contacts.mp_name || ''}" title="微信公众号"><i class="fab fa-weixin"></i></a>`);
    }

    // 小红书：链接则跳转，昵称则复制
    if (contacts.xiaohongshu) {
        const val = contacts.xiaohongshu;
        const isUrl = /^https?:\/\//i.test(val);
        if (isUrl) {
            icons.push(`<a href="${val}" target="_blank" rel="noopener" class="footer-contact-icon text-slate-400 hover:text-primary" title="小红书">${xhsIcon}</a>`);
        } else {
            icons.push(`<a href="#" class="footer-contact-icon footer-xhs text-slate-400 hover:text-primary" data-xhs="${val}" title="点击复制，${val}">${xhsIcon}</a>`);
        }
    }

    // GitHub：新窗口跳转
    if (contacts.github_url) {
        icons.push(`<a href="${contacts.github_url}" target="_blank" rel="noopener" class="footer-contact-icon text-slate-400 hover:text-primary" title="GitHub"><i class="fab fa-github"></i></a>`);
    }

    // Twitter：新窗口跳转
    if (contacts.twitter_url) {
        icons.push(`<a href="${contacts.twitter_url}" target="_blank" rel="noopener" class="footer-contact-icon text-slate-400 hover:text-primary" title="Twitter"><i class="fab fa-twitter"></i></a>`);
    }

    footer.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
            <div class="mb-4 md:mb-0 flex items-center gap-3">
                <img src="${root}/logo/logo-mark.svg" alt="${SITE.name}" class="h-8 w-8"
                     style="width:32px;height:32px;">
                <div>
                    <a href="${root}/index.html" class="font-bold text-lg leading-tight block">${SITE.name}</a>
                    <p class="text-xs text-slate-500 mt-0.5">&copy; ${new Date().getFullYear()} All rights reserved.</p>
                </div>
            </div>
            <div class="flex space-x-4 text-xl">
                ${icons.reverse().join('')}
            </div>
        </div>
    `;

    // 绑定微信点击：弹出公众号弹窗（不在 hover/click 复制微信号）
    footer.querySelectorAll('.footer-wechat').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWechatPopup(el);
        });
    });

    // 绑定小红书昵称复制事件
    footer.querySelectorAll('.footer-xhs').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const xhs = el.dataset.xhs;
            copyToClipboard(xhs);
            showToast('小红书号已复制，请打开小红书搜索关注');
        });
    });

    // 绑定邮箱点击事件 → 弹出联系弹窗
    footer.querySelectorAll('.footer-email').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            openContactModal();
        });
    });
}

/**
 * 微信公众号弹窗：在微信 icon 正上方居中显示缩小版公众号卡片
 * - 底部贴 icon 顶部（留少量 padding），水平相对 icon 居中对齐
 * - 点击弹窗外任意处关闭
 */
let _wechatPopupEl = null;

function toggleWechatPopup(trigger) {
    // 已存在则关闭
    if (_wechatPopupEl) {
        closeWechatPopup();
        return;
    }

    const qr = trigger.dataset.mpQrcode;
    const name = trigger.dataset.mpName || '';
    if (!qr) return;

    const rect = trigger.getBoundingClientRect();
    const popupW = 150;

    const popup = document.createElement('div');
    popup.className = 'wechat-popup';
    popup.innerHTML = `
        <div class="wechat-popup-qr">
            <img src="${qr}" alt="公众号二维码">
        </div>
        ${name ? `<p class="wechat-popup-name">「${escapeHtml(name)}」</p>` : ''}
        <p class="wechat-popup-tip">扫码关注公众号</p>
    `;
    document.body.appendChild(popup);
    _wechatPopupEl = popup;

    // 定位：相对微信 icon 居中对齐，底部贴 icon 顶部留 padding
    const left = rect.left + rect.width / 2 - popupW / 2;
    popup.style.left = Math.max(8, left) + 'px';
    popup.style.top = (rect.top - popup.offsetHeight - 8) + 'px';

    // 点击弹窗外关闭（延迟绑定，避免触发本次点击立即关闭）
    setTimeout(() => {
        document.addEventListener('click', _onDocClickCloseWechat, true);
    }, 0);
}

function _onDocClickCloseWechat(e) {
    if (_wechatPopupEl && !_wechatPopupEl.contains(e.target)) {
        closeWechatPopup();
    }
}

function closeWechatPopup() {
    if (_wechatPopupEl) {
        _wechatPopupEl.remove();
        _wechatPopupEl = null;
    }
    document.removeEventListener('click', _onDocClickCloseWechat, true);
}

/** 复制文本到剪贴板 */
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
    }
}

/** Toast 轻提示（非阻塞，自动消失） */
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    Object.assign(toast.style, {
        position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '8px 20px', borderRadius: '20px',
        fontSize: '13px', fontWeight: '500', zIndex: '9999',
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        opacity: '0', transition: 'opacity 0.3s',
        pointerEvents: 'none'
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// ========== 联系意向弹窗 ==========

let _contactModalInitialized = false;

function openContactModal() {
    if (!_contactModalInitialized) {
        _createContactModal();
        _contactModalInitialized = true;
    }
    const modal = document.getElementById('contact-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeContactModal() {
    const modal = document.getElementById('contact-modal');
    if (modal) modal.classList.add('hidden');
}

function _createContactModal() {
    const isDark = document.documentElement.classList.contains('dark');
    const modal = document.createElement('div');
    modal.id = 'contact-modal';
    modal.className = 'hidden fixed inset-0 z-[9999] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/50" onclick="closeContactModal()"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6 space-y-4">
            <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold">发送合作意向</h3>
                <button onclick="closeContactModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <p class="text-sm text-slate-500 dark:text-slate-400">填写以下信息，我会尽快回复您。</p>
            <form id="contact-modal-form" class="space-y-3">
                <div>
                    <label class="block text-sm font-medium mb-1">您的称呼</label>
                    <input type="text" id="modal-contact-name" placeholder="怎么称呼您" required
                        class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-sm focus:ring-2 focus:ring-primary outline-none transition-colors">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">联系方式</label>
                    <input type="text" id="modal-contact-info" placeholder="邮箱或微信号" required
                        class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-sm focus:ring-2 focus:ring-primary outline-none transition-colors">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">需求描述</label>
                    <textarea id="modal-contact-content" rows="3" placeholder="简单描述您的需求..." required
                        class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent text-sm focus:ring-2 focus:ring-primary outline-none transition-colors resize-none"></textarea>
                </div>
                <button type="submit" id="modal-contact-btn"
                    class="w-full py-2.5 rounded-lg bg-primary text-white font-medium text-sm hover:bg-blue-600 transition-colors">
                    <i class="fas fa-paper-plane mr-2"></i>发送
                </button>
                <div id="modal-contact-success" class="hidden text-center py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">
                    <i class="fas fa-check-circle mr-1"></i> 已发送，我会尽快回复您！
                </div>
                <div id="modal-contact-error" class="hidden text-center py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
                    <i class="fas fa-exclamation-circle mr-1"></i> <span id="modal-contact-error-msg">发送失败</span>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const form = modal.querySelector('#contact-modal-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = modal.querySelector('#modal-contact-name').value.trim();
        const contact = modal.querySelector('#modal-contact-info').value.trim();
        const content = modal.querySelector('#modal-contact-content').value.trim();
        if (!name || !contact || !content) return;

        const btn = modal.querySelector('#modal-contact-btn');
        const okEl = modal.querySelector('#modal-contact-success');
        const errEl = modal.querySelector('#modal-contact-error');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>发送中...';
        okEl.classList.add('hidden');
        errEl.classList.add('hidden');

        const result = await sendContactEmail({ name, contact, content, cooperation_type: '' });

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>发送';

        if (result.success) {
            okEl.classList.remove('hidden');
            form.reset();
            setTimeout(() => closeContactModal(), 2000);
        } else {
            modal.querySelector('#modal-contact-error-msg').textContent = result.message || '发送失败';
            errEl.classList.remove('hidden');
        }
    });
}
