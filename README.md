# HeAn - 禾安个人展示网站

面向用户的纯静态个人网站，展示项目作品、技术博客、个人简介等信息。采用 HTML + JS + Tailwind CSS 构建，无需构建工具。

## 技术栈

- HTML5 + Tailwind CSS（暗黑模式切换）
- 原生 JavaScript（模块化）
- 双层降级数据加载（API 优先 → 本地 JSON）

## 运行方式

```bash
cd /Users/lmz/Desktop/GitHub/HeAn
python3 -m http.server 8080
```

启动后访问 `http://localhost:8080`。

## 数据加载机制

HeAn 采用**双层降级**策略：

1. **优先从后端 API 获取数据**（需先启动 `my_server` 后端）
   - `http://localhost:8000/site/config` → 站点配置
   - `http://localhost:8000/site/profile` → 个人信息、技术栈
   - `http://localhost:8000/site/projects?public_only=1` → 项目列表
   - `http://localhost:8000/site/blogs?public_only=1` → 博客列表

2. **后端不可用时降级读取本地 JSON**
   - `data/projects.json` → 项目静态数据
   - `data/blogs.json` → 博客静态数据
   - `js/config.js` 中的 `SITE` 对象 → 站点基础信息

这种设计使 HeAn 可以**独立运行**（仅展示本地数据），也可以**联调运行**（实时读取数据库内容）。

## 页面结构

| 页面 | 文件 | 说明 |
|------|------|------|
| 首页 | `index.html` | Hero + 关于我 + 精选项目 + 最新博文 + 联系 |
| 关于我 | `about/index.html` | 个人详细介绍 |
| 项目作品 | `projects/index.html` | 项目列表；`detail.html` 项目详情 |
| 博客 | `blog/index.html` | 博客列表；`detail.html` 文章详情 |
| 联系合作 | `contact/index.html` | 联系表单 / 公众号引流 |

## JS 模块说明

```
js/
├── config.js    # 全局配置（Tailwind 主题、站点信息、标签映射、技术栈图标）
├── api.js       # 数据加载层（API 请求 + 本地 JSON 降级）
├── utils.js     # 工具函数
├── views.js     # 视图渲染函数
└── theme.js     # 暗黑模式切换
```

## 封面图 & picsum.photos

网站使用 `cover_image` 字段展示文章和项目的封面图。当后端未配置封面图时，页面会使用 [picsum.photos](https://picsum.photos) 提供的占位图作为默认图片。

### picsum.photos 是什么

一个免费的图片占位服务，无需注册，直接通过 URL 参数获取随机精美图片。适用于原型开发、UI 测试、内容填充等场景。

### 使用方法

| 用途 | URL 格式 | 示例 |
|------|----------|------|
| 随机图片（指定尺寸） | `https://picsum.photos/{宽}/{高}` | `https://picsum.photos/800/400` |
| 固定图片（按 ID） | `https://picsum.photos/id/{id}/{宽}/{高}` | `https://picsum.photos/id/237/800/400` |
| 正方形图片 | `https://picsum.photos/{尺寸}` | `https://picsum.photos/300` |
| 带随机种子的图片 | `https://picsum.photos/seed/{seed}/{宽}/{高}` | `https://picsum.photos/seed/blog1/800/400` |
| 灰度图片 | 加 `?grayscale` 参数 | `https://picsum.photos/800/400?grayscale` |
| 模糊图片 | 加 `?blur` 参数 | `https://picsum.photos/800/400?blur=2` |

### 在 HeAn 中的使用

各页面 HTML 中 `cover_image` 的初始 `src` 使用了 picsum.photos 占位图：

- **项目详情页**：`https://picsum.photos/1200/600?dashboard`
- **博客详情页**：`https://picsum.photos/1000/400?article`

当后端 API 返回真实封面图数据后，JS 会动态替换 `src` 为实际图片 URL。你也可以在 admin 后台中为每条内容/项目设置自定义封面图。
