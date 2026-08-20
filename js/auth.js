/*
 * HeAn 网站登录态管理（纯前端会话态 + 后端访客账户）
 * - 支持两种登录方式：邮箱验证码登录 / 邮箱密码登录
 * - 未注册用户首次用验证码登录自动注册（后端处理）
 * - 登录态存 localStorage：hean_token（JWT）+ hean_user（用户资料）
 * - 右上角：未登录显示"登录"按钮；已登录显示头像，hover 下拉菜单（昵称 / 用户ID+复制 / 退出登录）
 * 依赖：HeAn/js/api.js 中已定义的 API_BASE / READ_TOKEN / getRoot()
 */
const HeAnAuth = (function () {
  const TOKEN_KEY = 'hean_token';
  const USER_KEY = 'hean_user';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function currentUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function _buildHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (READ_TOKEN) headers['Authorization'] = `Bearer ${READ_TOKEN}`;
    return headers;
  }

  function _store(d) {
    localStorage.setItem(TOKEN_KEY, d.token);
    localStorage.setItem(USER_KEY, JSON.stringify({
      user_id: d.user_id, nickname: d.nickname, role: d.role,
    }));
  }

  // 邮箱验证码登录（未注册自动注册）
  async function loginByCode(email, code) {
    const res = await fetch(`${API_BASE}/site/auth/login/code`, {
      method: 'POST',
      headers: _buildHeaders(),
      body: JSON.stringify({ email, code }),
    });
    const json = await res.json();
    if (json.code !== 200 || !json.data || !json.data.token) {
      throw new Error(json.msg || '验证码登录失败');
    }
    _store(json.data);
    return json.data;
  }

  // 邮箱 + 密码登录
  async function loginByPassword(email, password) {
    const res = await fetch(`${API_BASE}/site/auth/login/password`, {
      method: 'POST',
      headers: _buildHeaders(),
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (json.code !== 200 || !json.data || !json.data.token) {
      throw new Error(json.msg || '密码登录失败');
    }
    _store(json.data);
    return json.data;
  }

  async function sendCode(email, purpose = 'login') {
    const res = await fetch(`${API_BASE}/site/auth/send-code`, {
      method: 'POST',
      headers: _buildHeaders(),
      body: JSON.stringify({ email, purpose }),
    });
    return res.json();
  }

  // 拉取最新用户资料（登录后 / 页面加载时同步状态）
  async function fetchMe() {
    const token = getToken();
    if (!token) return null;
    const res = await fetch(`${API_BASE}/site/auth/me`, {
      method: 'GET',
      headers: Object.assign(_buildHeaders(), { 'Authorization': `Bearer ${token}` }),
    });
    const json = await res.json();
    if (json.code !== 200 || !json.data) return null;
    localStorage.setItem(USER_KEY, JSON.stringify({
      user_id: json.data.id,
      nickname: json.data.nickname,
      role: json.data.role,
      avatar_url: json.data.avatar_url,
      email: json.data.email,
      is_vip: json.data.is_vip,
    }));
    return json.data;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // 压缩路径中多余斜杠（保留协议 https:// 的双斜杠），如 /HeAn//////index.html → /HeAn/index.html
  function cleanPath(p) {
    if (!p) return p;
    // 先把协议头 https:// http:// 暂存，避免被误压缩
    const m = p.match(/^(https?:\/\/)(.*)$/);
    if (m) return m[1] + m[2].replace(/\/+/g, '/');
    return p.replace(/\/+/g, '/');
  }

  // 回到来源页并刷新登录态（back 优先取 URL 参数，其次 localStorage）
  function goBackAfterLogin() {
    const url = new URLSearchParams(location.search);
    let back = url.get('back');
    if (!back) back = localStorage.getItem('hean_login_back') || './index.html';
    localStorage.removeItem('hean_login_back');
    location.href = cleanPath(back);
  }

  function rememberBack() {
    if (!new URLSearchParams(location.search).get('back')) {
      localStorage.setItem('hean_login_back', cleanPath(location.pathname + location.search));
    }
  }

  // 复制到剪贴板（带降级）
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta);
      return true;
    }
  }

  // 渲染右上角登录区（挂载到 #auth-area，不存在则创建）
  function mountAuthArea(opts) {
    opts = opts || {};
    // 后端开关关闭时，全局隐藏登录/个人中心入口（既不渲染登录按钮，也不渲染头像菜单）
    if (opts.hideAuth) {
      const existing = document.getElementById('auth-area');
      if (existing) existing.innerHTML = '';
      return;
    }
    let host = document.getElementById('auth-area');
    if (!host) {
      host = document.createElement('div');
      host.id = 'auth-area';
      host.className = 'flex items-center';
      const toggle = document.getElementById('theme-toggle');
      const bar = toggle ? toggle.parentElement : null;
      if (bar) bar.insertBefore(host, toggle);
    }
    if (host.dataset.mounted) return;
    host.dataset.mounted = '1';
    renderAuthArea(host, opts);
  }

  function renderAuthArea(host, opts) {
    opts = opts || {};
    host.innerHTML = '';
    if (!isLoggedIn()) {
      // 登录页自身不渲染"登录"按钮（已在登录流程中）
      if (opts.skipLoginBtn) return;
      // 登录按钮：复用主界面按钮令牌（蓝底白字，dark/light 自适应）
      const btn = document.createElement('button');
      btn.id = 'login-btn';
      btn.className = 'btn-primary text-sm font-medium px-4 py-2 rounded-lg';
      btn.textContent = '登录';
      btn.addEventListener('click', () => {
        rememberBack();
        const base = (typeof getRoot === 'function') ? getRoot() : '.';
        location.href = `${cleanPath(base + '/login.html')}?back=${encodeURIComponent(location.pathname + location.search)}`;
      });
      host.appendChild(btn);
    } else {
      const u = currentUser() || {};
      const wrap = document.createElement('div');
      wrap.className = 'auth-dropdown-wrap relative';

      const avatar = document.createElement('button');
      avatar.className = 'auth-avatar w-9 h-9 rounded-full overflow-hidden flex items-center justify-center border border-slate-200/40 hover:opacity-80 transition-opacity';
      if (u.avatar_url) {
        const img = document.createElement('img');
        img.src = u.avatar_url;
        img.alt = u.nickname || '用户';
        img.className = 'w-full h-full object-cover';
        avatar.appendChild(img);
      } else {
        // 默认"小人形"图标
        avatar.innerHTML = '<i class="fas fa-user text-slate-300 text-lg"></i>';
      }

      const menu = document.createElement('div');
      menu.className = 'auth-dropdown hidden absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50';
      menu.innerHTML = `
        <div class="px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">${escapeHtml(u.nickname || '用户')}</div>
        <div class="flex items-center justify-between px-4 py-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span>（ID：${u.user_id}）</span>
          <button class="auth-copy-id ml-2 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="复制用户 ID"><i class="fas fa-copy"></i></button>
        </div>
        <div class="my-1 border-t border-slate-100 dark:border-slate-700"></div>
        <button class="auth-logout w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">退出登录</button>
      `;

      // 下拉显隐：hover 打开（移动端点击切换）
      let hideTimer = null;
      const show = () => { clearTimeout(hideTimer); menu.classList.remove('hidden'); };
      const hide = () => { hideTimer = setTimeout(() => menu.classList.add('hidden'), 120); };
      wrap.addEventListener('mouseenter', show);
      wrap.addEventListener('mouseleave', hide);
      avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
      });
      document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) menu.classList.add('hidden');
      });

      menu.querySelector('.auth-copy-id').addEventListener('click', async (e) => {
        e.stopPropagation();
        const ok = await copyText(String(u.user_id));
        if (ok) {
          const btn = e.currentTarget;
          btn.innerHTML = '<i class="fas fa-check text-green-500"></i>';
          setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy"></i>'; }, 1200);
        }
      });
      menu.querySelector('.auth-logout').addEventListener('click', () => {
        logout();
        location.reload();
      });

      wrap.appendChild(avatar);
      wrap.appendChild(menu);
      host.appendChild(wrap);
    }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 页面加载时挂载登录区。
  // 注意：登录系统独立运行，不影响任何网站数据加载。
  // 仅当已登录（本地有 token）时才向 /auth/me 同步资料；未登录不发任何请求，
  // 避免无谓的 401 请求，也确保未登录/登录的数据加载走完全相同的路径。
  async function initAuth(opts) {
    mountAuthArea(opts);
    if (isLoggedIn()) {
      try {
        await fetchMe();
      } catch (e) {
        // token 失效则清理登录态
        logout();
      }
      const host = document.getElementById('auth-area');
      if (host) renderAuthArea(host, opts);
    }
    // 未登录：仅渲染"登录"按钮（除非 skipLoginBtn），不触发任何数据请求
  }

  return {
    getToken, isLoggedIn, currentUser,
    loginByCode, loginByPassword, sendCode, fetchMe, logout,
    mountAuthArea, mountLoginButton: mountAuthArea, renderAuthArea, initAuth,
    goBackAfterLogin,
  };
})();
