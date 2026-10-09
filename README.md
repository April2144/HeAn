# HeAn - 禾安个人展示网站

面向用户的展示网站，展示项目作品、技术博客、个人简介等信息。采用 HTML + JS + Tailwind CSS 构建，无需构建工具。

> ⚠️ **它现在是"混合"的**（2026-10-10 阶段 3 之后）：
> **首页与列表页是本站的静态文件** ✓；**详情页（博客/产品/专题/专题文章）由后端 `my_server` SSR 渲染** ✓。
> 详见 `my_server/ARCHITECTURE.md` ✓

## 线上路由（谁在服务）

| URL | 服务者 |
|---|---|
| `/`、`/about/`、`/blog/`、`/topics/`、`/projects/` | **本站静态文件** ✓（nginx `location =` 精确匹配 ✓） |
| `/blog/{id}/`、`/projects/{id}/`、`/topics/{sid}/`、`/topics/{sid}/{aid}/` | **后端 SSR** ✓（nginx 前缀转发到 8000 ✓） |
| 不存在的 URL | **404** ✓（不再回退首页 ✗） |

### ⚠️ 阶段 3 后的约定（别踩坑）

1. `blog/*/`、`projects/*/`、`topics/*/`、`topics/*/*/` 下**只有列表页 `index.html`** ✓ —— **详情页静态文件已全部删除** ✗（改由 SSR ✓）
2. `{blog,projects,topics}/detail.html` 是**源模板** ✓（SSR 模板由它派生 ✓ 回滚也要用它 ✓）→ nginx 已屏蔽对外访问（返回 404 ✓）
3. **不要**重新生成详情页静态文件 ✗ —— `my_server/scripts/gen_static.py` 每次运行都会**幂等清理**它们 ✓
4. 改页面模板时**两侧同步** ✓：`HeAn/*/detail.html`（源）↔ `my_server/projects/hean/templates/*_detail.html`（SSR）
5. 改了 `js/renderer.js` **必须升版本号**（`?v=N`）✗ 否则老访客的浏览器会用旧版（实测踩过 ✗）

## 页面结构

| 页面 | 说明 |
|------|------|
| 首页 | Hero + 关于我 + 精选专题 + 精选项目 + 最新博文 |
| 关于我 | 个人详细介绍 |
| 专题 | 领域分组筛选 + 专题列表（横向滚动卡片）+ 专题详情页 |
| 项目作品 | 项目列表 + 详情页 |
| 博客 | 博客列表 + 文章详情页（含章节导航） |
| 联系合作 | 联系表单 / 公众号引流 |
| 产品 · 工具展示 | ⭐ **本站不含任何工具代码** —— 两个工具（批量重命名 / 图片压缩）的源码都在 **`tools/` 仓库**，各自是完整独立项目，独立部署在 `hacore.cn/tools/…`。本站只通过 `projects` 表的 `demo_url` **链接过去**（产品列表 → 详情页 →「在线预览」按钮）|

## 技术特点

### 重要模块
- **首页精选模块**：精选专题（横向滚动）、精选项目、最新博文三个内容模块，间距统一协调
- **专题筛选**：左侧领域分组列表，hover/选中态淡蓝高亮，icon+标题垂直居中
- **离线缓存兜底（双层降级）**：优先从后端 API 获取实时数据；后端不可用时自动降级读取 localForage 本地缓存；本地无缓存时回落内置纯净初始数据（`data/*.json` 镜像），保证站点始终可访问。HeAn 为纯展示端，内容由 admin 后台统一管理配置，自身不支持编辑
- **博客详情**：章节导航（上一篇/下一篇）、系列文章关联

### 功能特性
- 站点品牌 logo：默认本地资源统一置于 `assets/`（`assets/logo-mark.svg`），后台配置 `logo_url` 时可覆盖
- 暗黑模式切换
- 响应式设计（适配移动端/平板/桌面）
- 项目分组展示
- Newsletter 订阅
- 系统标签徽章（分组标识 + 图标）
- 图片懒加载 + 默认占位图
- SEO 友好的 meta 标签
- **favicon**：`favicon.ico`（16/32/48 三尺寸 ✓ 透明 ✓）+ `<link rel="icon">` 指向 `assets/logo-mark.svg` ✓
- **robots.txt / sitemap.xml**：`sitemap.xml` 由 `my_server/scripts/gen_sitemap.py` 生成 ✓ 勿手改 ✗
- **首页三个列表的静态卡片**：由 `my_server/scripts/gen_home_cards.py` 注入（在 `HOME_CARDS:*` 标记之间 ✓ 爬虫可见 ✓ 前端 JS 加载后会覆盖 ✓）
- **后端故障兜底页**：`maintenance.html`（由 nginx `@maintenance` 唤起 ✓ 带 noindex ✓ 直接访问 404 ✓）

## 技术栈

- HTML5 + Tailwind CSS
- 原生 JavaScript（模块化）
- 无框架、无构建工具
