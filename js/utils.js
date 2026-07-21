/**
 * HeAn 通用工具函数
 * 包含：分组徽章 HTML 生成、标签 HTML 生成、标签样式应用
 */

// 生成分组徽章（单色药丸形，显示分组名）
function getGroupBadgeHtml(group) {
    if (!group || !TAG_MAP[group]) return '';
    const { icon, class: cls } = TAG_MAP[group];
    return `<span class="tag-badge ${cls}"><i class="fas ${icon} mr-1"></i>${group}</span>`;
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
    el.innerHTML = `<i class="fas ${icon} mr-1"></i>${group}`;
}

// 兼容旧调用：保留 getTagsHtml 和 applyTagColor（默认取 tags[0] 作为分组）
function getTagsHtml(tags) {
    if (!tags || !tags.length) return '';
    const group = tags[0];
    if (!group || !TAG_MAP[group]) return '';
    const { icon, class: cls } = TAG_MAP[group];
    return `<span class="tag-badge ${cls}"><i class="fas ${icon} mr-1"></i>${group}</span>`;
}

function applyTagColor(el, tag) {
    if (!el || !TAG_MAP[tag]) return;
    el.className = `tag-badge ${TAG_MAP[tag].class}`;
    el.textContent = tag;
}