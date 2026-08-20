/*
 * 登录页交互：邮箱验证码 / 邮箱密码两种模式
 * 依赖：HeAn/js/auth.js（HeAnAuth）、HeAn/js/api.js（API_BASE / READ_TOKEN / getRoot）
 */
(function () {
  // 已登录直接回来源页
  if (HeAnAuth.isLoggedIn()) {
    const back = new URLSearchParams(location.search).get('back');
    location.href = back || './index.html';
    return;
  }

  const tabCode = document.getElementById('tab-code');
  const tabPwd = document.getElementById('tab-password');
  const formCode = document.getElementById('form-code');
  const formPwd = document.getElementById('form-password');

  let mode = 'code';
  function switchMode(next) {
    mode = next;
    const codeActive = next === 'code';
    formCode.classList.toggle('hidden', !codeActive);
    formPwd.classList.toggle('hidden', codeActive);
    // 表单内小文字按钮：激活态用主色，非激活态用次级灰
    tabCode.classList.toggle('text-primary', codeActive);
    tabCode.classList.toggle('text-slate-500', !codeActive);
    tabCode.classList.toggle('dark:text-slate-400', !codeActive);
    tabPwd.classList.toggle('text-primary', !codeActive);
    tabPwd.classList.toggle('text-slate-500', codeActive);
    tabPwd.classList.toggle('dark:text-slate-400', codeActive);
    // 底部圆角指示 line：选中显示、未选中隐藏（与文字同色）
    const lineCode = tabCode.querySelector('.tab-line');
    const linePwd = tabPwd.querySelector('.tab-line');
    if (lineCode) lineCode.classList.toggle('hidden', !codeActive);
    if (linePwd) linePwd.classList.toggle('hidden', codeActive);
  }
  tabCode.addEventListener('click', () => switchMode('code'));
  tabPwd.addEventListener('click', () => switchMode('password'));

  function showErr(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }
  function clearErr(el) {
    el.classList.add('hidden');
    el.textContent = '';
  }

  // ---- 发送验证码 + 60s 倒计时 ----
  const sendBtn = document.getElementById('send-code-btn');
  let timer = null;
  sendBtn.addEventListener('click', async () => {
    clearErr(document.getElementById('err-code'));
    const email = document.getElementById('code-email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showErr(document.getElementById('err-code'), '请输入有效的邮箱地址');
      return;
    }
    sendBtn.disabled = true;
    sendBtn.textContent = '发送中…';
    try {
      const json = await HeAnAuth.sendCode(email, 'login');
      if (json.code === 200) {
        if (json.data && json.data.sent === false) {
          showErr(document.getElementById('err-code'), '邮件服务未配置，验证码发送失败，请联系站长');
        } else {
          startCountdown(60);
        }
      } else {
        showErr(document.getElementById('err-code'), json.msg || '验证码发送失败');
        sendBtn.disabled = false;
        sendBtn.textContent = '发送验证码';
      }
    } catch (e) {
      showErr(document.getElementById('err-code'), e.message || '网络错误');
      sendBtn.disabled = false;
      sendBtn.textContent = '发送验证码';
    }
  });

  function startCountdown(sec) {
    let left = sec;
    sendBtn.disabled = true;
    sendBtn.textContent = `${left}s`;
    timer = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(timer);
        sendBtn.disabled = false;
        sendBtn.textContent = '发送验证码';
      } else {
        sendBtn.textContent = `${left}s`;
      }
    }, 1000);
  }

  // ---- 验证码登录提交 ----
  formCode.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('err-code');
    clearErr(errEl);
    const btn = document.getElementById('submit-code');
    btn.disabled = true;
    btn.textContent = '登录中…';
    try {
      const email = document.getElementById('code-email').value.trim();
      const code = document.getElementById('code-input').value.trim();
      await HeAnAuth.loginByCode(email, code);
      HeAnAuth.goBackAfterLogin();
    } catch (err) {
      showErr(errEl, err.message || '登录失败');
    } finally {
      btn.disabled = false;
      btn.textContent = '登录';
    }
  });

  // ---- 密码登录提交 ----
  formPwd.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('err-pwd');
    clearErr(errEl);
    const btn = document.getElementById('submit-pwd');
    btn.disabled = true;
    btn.textContent = '登录中…';
    const email = document.getElementById('pwd-email').value.trim();
    try {
      const password = document.getElementById('pwd-input').value;
      await HeAnAuth.loginByPassword(email, password);
      HeAnAuth.goBackAfterLogin();
    } catch (err) {
      const msg = err.message || '登录失败';
      showErr(errEl, msg);
      // 未注册：toast 提示并自动切换到验证码登录，带回邮箱（验证码登录即注册）
      // 复用项目通用 showToast，避免切换 tab 太快看不到表单内错误提示
      if (msg.indexOf('未注册') !== -1) {
        if (typeof showToast === 'function') showToast(msg);
        switchMode('code');
        document.getElementById('code-email').value = email;
      }
    } finally {
      btn.disabled = false;
      btn.textContent = '登录';
    }
  });
})();
