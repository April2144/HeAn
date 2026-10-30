/* 百度统计 —— 只在正式站点上报（全站唯一入口 ✓ 2026-10-30）
 *
 * 为什么需要域名白名单：
 *   百度统计的 JS 在本地调试时也会上报 ✗
 *   → 实测（2026-10-30 后台「网站概况」）：Top10 入口页里
 *     localhost:8000/hean/ 占 28.7%、dev.hacore.cn 占 3.7%、localhost:8666 占 1.85%
 *   → 合计三分之一以上的"流量"是自己开发时的访问 ✗
 *     新访客比例、停留时长、来源网站全被污染 ✗（数据不可用）
 * 所以：只有正式域名才加载 hm.js ✓ 其它（localhost / 127.0.0.1 / dev.hacore.cn / IP）一律不上报 ✓
 *
 * 为什么抽成单独文件：
 *   原先同一段代码复制在 13 个 HTML（含 3 个 SSR 模板）里 ✗
 *   → 改统计 ID / 改上报策略要改 13 处，漏一个就前后不一致 ✗
 *   现在只改这里一处 ✓（与项目「全站统一逻辑必须单点」的约束一致 ✓）
 */
(function () {
    // 只认正式域名；留空/其它一律跳过（含 file:// 打开时 hostname 为空 ✓）
    var ALLOW = { 'www.hacore.cn': 1, 'hacore.cn': 1 };
    if (!ALLOW[location.hostname]) return;

    // 统计 ID 固定，勿改（与百度统计后台的站点一一对应）
    window._hmt = window._hmt || [];
    var hm = document.createElement('script');
    hm.async = true;
    hm.src = 'https://hm.baidu.com/hm.js?e6e31f2ba1cd1d461d0cd134ddc464df';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(hm, s);
})();
