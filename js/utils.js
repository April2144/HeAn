/**
 * HeAn 通用工具函数
 * 包含：分组徽章 HTML 生成、标签 HTML 生成、标签样式应用
 */

// 拼接标签内联样式：字号/粗细优先走后端配置，缺省由 CSS .tag-badge 兜底（默认不加粗）
function tagInlineStyle(entry) {
    if (!entry) return '';
    const style = [];
    if (entry.fontSize) style.push(`font-size:${entry.fontSize}`);
    if (entry.fontWeight) style.push(`font-weight:${entry.fontWeight}`);
    return style.length ? ` style="${style.join(';')}"` : '';
}

// 生成分组徽章（显示分组名；未分组显示「全部」，非 TAG_MAP 分组用默认中性样式）
function getGroupBadgeHtml(group) {
    // 未分组 / 空：显示「全部」
    if (!group || group === '未分组') {
        return '<span class="label-tag">全部</span>';
    }
    // 命中统一标签系统：彩色药丸徽章（含图标）
    if (TAG_MAP[group]) {
        const { icon, class: cls } = TAG_MAP[group];
        return `<span class="tag-badge ${cls}"${tagInlineStyle(TAG_MAP[group])}><i class="fas ${icon} mr-1"></i>${group}</span>`;
    }
    // 文件夹分组（非 TAG_MAP 标签）：默认中性样式显示分组名
    return `<span class="label-tag">${group}</span>`;
}

// 生成文章标签列表（矩形小圆角，用于详情页底部）
function getLabelsHtml(labels) {
    if (!labels || !labels.length) return '';
    return labels.map(label =>
        `<span class="label-tag">${label}</span>`
    ).join('');
}

// 应用分组颜色到元素（用于详情页顶部徽章）
function applyGroupColor(el, group) {
    if (!el || !TAG_MAP[group]) return;
    const { icon, class: cls } = TAG_MAP[group];
    el.className = `tag-badge ${cls}`;
    el.setAttribute('style', tagInlineStyle(TAG_MAP[group]).replace(/^ style="|"$/g, ''));
    el.innerHTML = `<i class="fas ${icon} mr-1"></i>${group}`;
}

// 兼容旧调用：保留 getTagsHtml 和 applyTagColor（默认取 tags[0] 作为分组）
function getTagsHtml(tags) {
    if (!tags || !tags.length) return '';
    const group = tags[0];
    if (!group || !TAG_MAP[group]) return '';
    const { icon, class: cls } = TAG_MAP[group];
    return `<span class="tag-badge ${cls}"${tagInlineStyle(TAG_MAP[group])}><i class="fas ${icon} mr-1"></i>${group}</span>`;
}

function applyTagColor(el, tag) {
    if (!el || !TAG_MAP[tag]) return;
    el.className = `tag-badge ${TAG_MAP[tag].class}`;
    el.setAttribute('style', tagInlineStyle(TAG_MAP[tag]).replace(/^ style="|"$/g, ''));
    el.textContent = tag;
}

// 生成标签列表（卡片上的多标签）：默认灰底灰字，选中态淡蓝底蓝字（无边框，两处项目卡统一）
// selected=true 表示「选中」语义（首页精选项目卡），否则默认态（项目列表卡）
function getTagListHtml(tags, selected = false) {
    if (!tags || !tags.length) return '';
    const cls = selected ? 'proj-tag proj-tag-selected' : 'proj-tag';
    return tags.map(tag => `<span class="${cls}">${tag}</span>`).join(' ');
}

// HTML 转义，防止 XSS
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}