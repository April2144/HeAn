/**
 * HeAn 通用工具函数
 * 包含：标签 HTML 生成、标签样式应用
 */

function getTagsHtml(tags) {
    if (!tags || !tags.length) return '';
    return tags.map(tag => {
        const color = TAG_MAP.colors[tag] || '';
        const icon = TAG_MAP.icons[tag] || '';
        return `<span class="tag-badge ${color}"><i class="fas ${icon} mr-1"></i>${tag}</span>`;
    }).join(' ');
}

function applyTagColor(el, tag) {
    if (!el) return;
    el.className = `tag-badge ${TAG_MAP.colors[tag] || ''}`;
    el.textContent = tag;
}