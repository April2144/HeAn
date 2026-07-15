/**
 * HeAn 共用视图组件
 * 导航栏和页脚为纯静态 HTML，JS 仅负责：高亮当前 tab、汉堡菜单、主题切换
 */

function initNavbar(activePage) {
    const nav = document.getElementById('navbar');
    if (!nav) return;

    // 高亮当前页 tab
    nav.querySelectorAll('[data-nav]').forEach(link => {
        if (link.dataset.nav === activePage) {
            link.classList.add('text-primary', 'font-medium');
            link.classList.remove('hover:text-primary');
        }
    });

    // 汉堡菜单切换
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
}

function renderFooter(contacts = {}) {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const root = getRoot();
    const githubUrl = contacts.github_url || '#';
    const twitterUrl = contacts.twitter_url || '#';
    const email = contacts.email ? `mailto:${contacts.email}` : '#';
    footer.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
            <div class="mb-4 md:mb-0">
                <a href="${root}/index.html" class="font-bold text-lg">${SITE.name}</a>
                <p class="text-sm text-slate-500 mt-1">&copy; ${new Date().getFullYear()} All rights reserved.</p>
            </div>
            <div class="flex space-x-6">
                <a href="${twitterUrl}" target="_blank" rel="noopener" class="text-slate-400 hover:text-primary"><i class="fab fa-twitter"></i></a>
                <a href="${githubUrl}" target="_blank" rel="noopener" class="text-slate-400 hover:text-primary"><i class="fab fa-github"></i></a>
                <a href="#" class="text-slate-400 hover:text-primary"><i class="fab fa-weixin"></i></a>
                <a href="${email}" class="text-slate-400 hover:text-primary"><i class="fas fa-envelope"></i></a>
            </div>
        </div>
    `;
}
