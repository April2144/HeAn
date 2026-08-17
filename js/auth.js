/*
 * HeAn 网站登录态管理（轻量、纯前端会话态）
 * - 登录成功后后端返回 JWT（user_id），存 localStorage
 * - 不强制跳转，调用方自行决定刷新当前页
 * 依赖：HeAn/js/api.js 中已定义的 API_BASE / READ_TOKEN / _buildBasePath()
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

  async function login(account, password) {
    const res = await fetch(`${API_BASE}/site/auth/login`, {
      method: 'POST',
      headers: _buildHeaders(),
      body: JSON.stringify({ account, password }),
    });
    const json = await res.json();
    if (json.code !== 200 || !json.data || !json.data.token) {
      throw new Error(json.msg || '登录失败');
    }
    const d = json.data;
    localStorage.setItem(TOKEN_KEY, d.token);
    localStorage.setItem(USER_KEY, JSON.stringify({
      user_id: d.user_id, nickname: d.nickname, role: d.role,
    }));
    return d;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // 在 theme-toggle 前插入登录/退出按钮（幂等）
  function mountLoginButton() {
    const host = document.querySelector('.flex.items-center.space-x-3');
    if (!host || host.querySelector('#login-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'login-btn';
    btn.className = 'px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 ' +
      'hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200';
    render(btn);
    const toggle = host.querySelector('#theme-toggle');
    if (toggle) host.insertBefore(btn, toggle);
    else host.appendChild(btn);
    btn.addEventListener('click', () => {
      if (isLoggedIn()) {
        if (confirm('确定退出登录？')) { logout(); location.reload(); }
      } else {
        const back = encodeURIComponent(location.pathname + location.search);
        const base = (typeof _buildBasePath === 'function') ? _buildBasePath() : '.';
        location.href = `${base}/login.html?back=${back}`;
      }
    });
  }

  function render(btn) {
    btn.textContent = isLoggedIn()
      ? ((currentUser() || {}).nickname || '已登录')
      : '登录';
  }

  return { getToken, isLoggedIn, currentUser, login, logout, mountLoginButton };
})();
