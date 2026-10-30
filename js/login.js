/*
 * 登录页交互：邮箱验证码 / 邮箱密码 / 重置密码 三种模式
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
  const formReset = document.getElementById('form-reset');

  let mode = 'code';
  function switchMode(next) {
    mode = next;
    const codeActive = next === 'code';
    const pwdActive = next === 'password';
    formCode.classList.toggle('hidden', !codeActive);
    formPwd.classList.toggle('hidden', !pwdActive);
    formReset.classList.toggle('hidden', next !== 'reset');
    // 表单内小文字按钮：激活态用主色，非激活态用次级灰
    tabCode.classList.toggle('text-primary', codeActive);
    tabCode.classList.toggle('text-slate-500', !codeActive);
    tabCode.classList.toggle('dark:text-slate-400', !codeActive);
    tabPwd.classList.toggle('text-primary', pwdActive);
    tabPwd.classList.toggle('text-slate-500', !pwdActive);
    tabPwd.classList.toggle('dark:text-slate-400', !pwdActive);
    // 底部圆角指示 line：选中显示、未选中隐藏（与文字同色）
    const lineCode = tabCode.querySelector('.tab-line');
    const linePwd = tabPwd.querySelector('.tab-line');
    if (lineCode) lineCode.classList.toggle('hidden', !codeActive);
    if (linePwd) linePwd.classList.toggle('hidden', !pwdActive);
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

  // 邮箱格式（后端会再校验一次）
  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  // ---- 60s 倒计时（每个发送按钮独立计时）----
  function startCountdown(btn, sec) {
    let left = sec;
    btn.disabled = true;
    btn.textContent = `${left}s`;
    const t = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(t);
        btn.disabled = false;
        btn.textContent = '发送验证码';
      } else {
        btn.textContent = `${left}s`;
      }
    }, 1000);
  }

  // ---- 验证码登录：发送 ----
  const sendBtn = document.getElementById('send-code-btn');
  sendBtn.addEventListener('click', async () => {
    const errEl = document.getElementById('err-code');
    clearErr(errEl);
    const email = document.getElementById('code-email').value.trim();
    if (!isEmail(email)) {
      showErr(errEl, '请输入有效的邮箱地址');
      return;
    }
    sendBtn.disabled = true;
    sendBtn.textContent = '发送中…';
    try {
      const json = await HeAnAuth.sendCode(email, 'login');
      if (json.code === 200) {
        if (json.data && json.data.sent === false) {
          showErr(errEl, '邮件服务未配置，验证码发送失败，请联系站长');
        } else {
          startCountdown(sendBtn, 60);
        }
      } else {
        showErr(errEl, json.msg || '验证码发送失败');
        sendBtn.disabled = false;
        sendBtn.textContent = '发送验证码';
      }
    } catch (e) {
      showErr(errEl, e.message || '网络错误');
      sendBtn.disabled = false;
      sendBtn.textContent = '发送验证码';
    }
  });

  // ---- 验证码登录：提交 ----
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

  // ---- 密码登录：提交 ----
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

  // ---- 忘记密码：切到重置面板（带回已填邮箱）----
  const forgotLink = document.getElementById('link-forgot');
  if (forgotLink) {
    forgotLink.addEventListener('click', () => {
      const email = document.getElementById('pwd-email').value.trim();
      if (email) document.getElementById('reset-email').value = email;
      clearErr(document.getElementById('err-reset'));
      clearErr(document.getElementById('ok-reset'));
      switchMode('reset');
    });
  }
  const backLink = document.getElementById('link-back-login');
  if (backLink) backLink.addEventListener('click', () => switchMode('password'));

  // ---- 重置密码：发送验证码（purpose=reset）----
  const resetSendBtn = document.getElementById('reset-send-btn');
  resetSendBtn.addEventListener('click', async () => {
    const errEl = document.getElementById('err-reset');
    clearErr(errEl);
    const email = document.getElementById('reset-email').value.trim();
    if (!isEmail(email)) {
      showErr(errEl, '请输入有效的邮箱地址');
      return;
    }
    resetSendBtn.disabled = true;
    resetSendBtn.textContent = '发送中…';
    try {
      const json = await HeAnAuth.sendCode(email, 'reset');
      if (json.code === 200) {
        if (json.data && json.data.sent === false) {
          showErr(errEl, '邮件服务未配置，验证码发送失败，请联系站长');
        } else {
          startCountdown(resetSendBtn, 60);
        }
      } else {
        showErr(errEl, json.msg || '验证码发送失败');
        resetSendBtn.disabled = false;
        resetSendBtn.textContent = '发送验证码';
      }
    } catch (e) {
      showErr(errEl, e.message || '网络错误');
      resetSendBtn.disabled = false;
      resetSendBtn.textContent = '发送验证码';
    }
  });

  // ---- 重置密码：提交 ----
  formReset.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('err-reset');
    const okEl = document.getElementById('ok-reset');
    clearErr(errEl);
    clearErr(okEl);

    const email = document.getElementById('reset-email').value.trim();
    const code = document.getElementById('reset-code').value.trim();
    const pwd = document.getElementById('reset-pwd').value;
    const pwd2 = document.getElementById('reset-pwd2').value;

    if (!isEmail(email)) return showErr(errEl, '请输入有效的邮箱地址');
    if (!code) return showErr(errEl, '请输入验证码');
    if (pwd.length < 6 || pwd.length > 32) return showErr(errEl, '密码长度需为 6~32 位');
    if (pwd !== pwd2) return showErr(errEl, '两次输入的密码不一致');

    const btn = document.getElementById('submit-reset');
    btn.disabled = true;
    btn.textContent = '提交中…';
    try {
      const res = await HeAnAuth.resetPassword(email, code, pwd);
      okEl.textContent = res.msg || '密码已重置，请用新密码登录';
      okEl.classList.remove('hidden');
      // 清空敏感字段并回到密码登录，带回邮箱
      document.getElementById('reset-code').value = '';
      document.getElementById('reset-pwd').value = '';
      document.getElementById('reset-pwd2').value = '';
      document.getElementById('pwd-email').value = email;
      setTimeout(() => switchMode('password'), 1200);
    } catch (err) {
      showErr(errEl, err.message || '重置失败');
    } finally {
      btn.disabled = false;
      btn.textContent = '重置密码';
    }
  });
})();
