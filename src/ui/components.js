/**
 * @fileoverview UI 组件模块
 * 纯 HTML 模板字符串生成函数，不包含任何 DOM 操作
 * 【注意】所有 UI 文本中的 "世界书" 对应内部变量名 worldInfo
 */

import { escapeHtml, truncate, formatSize } from '../utils.js';
import { CONTENT_TYPE, MAX_JSON_SIZE } from '../constants.js';

/**
 * 创建主面板 HTML
 * @param {string} authButtonHtml - 鉴权按钮 HTML
 * @returns {string}
 */
export function createMainPanel(authButtonHtml) {
    return `
        <div id="workshop-panel" class="workshop-panel" style="display: none;">
            <div class="workshop-container">
                <!-- 头部 -->
                <div class="workshop-header">
                    <div class="workshop-title">
                        <i class="fa-solid fa-store"></i>
                        <h2>酒馆创意工坊</h2>
                        <a href="https://github.com/CyrilPeng/SillyTavern-Workshop" target="_blank" class="github-link" title="请给个Star✨~高星项目可以申请到更好的服务器来服务大家">
                            <i class="fa-brands fa-github"></i>
                        </a>
                    </div>

                    <!-- 右侧操作区：登录按钮 + 关闭按钮 -->
                    <div style="display:flex; align-items:center;">
                        <div id="workshop-auth-container">${authButtonHtml}</div>
                        <button id="workshop-close-btn" class="workshop-close-btn">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>

                <!-- 标签页切换 -->
                <div class="workshop-tabs">
                    <button class="workshop-tab active" data-tab="upload">
                        <i class="fa-solid fa-upload"></i> 上传
                    </button>
                    <button class="workshop-tab" data-tab="download">
                        <i class="fa-solid fa-download"></i> 下载
                    </button>
                </div>

                <!-- 上传页面 -->
                <div id="upload-page" class="workshop-page active">
                    ${createUploadPage()}
                </div>

                <!-- 下载页面 -->
                <div id="download-page" class="workshop-page">
                    ${createDownloadPage()}
                </div>
            </div>
        </div>
    `;
}

/**
 * 创建菜单按钮 HTML
 * @returns {string}
 */
export function createMenuButton() {
    return `
        <div id="workshop-menu-button" class="list-group-item flex-container flexGap5" title="酒馆创意工坊">
            <i class="fa-solid fa-store extensionsMenuExtensionButton"></i>
            <span>创意工坊</span>
        </div>
    `;
}

/**
 * 创建上传页面 HTML
 * @returns {string}
 */
export function createUploadPage() {
    return `
        <div class="upload-container">
            <!-- 左侧：表单字段 -->
            <div class="upload-form-section">
                <h3><i class="fa-solid fa-file-lines"></i> 基本信息</h3>

                <div class="form-group">
                    <label for="field-cardname">
                        <i class="fa-solid fa-id-card"></i> 角色卡
                        <span class="required">*</span>
                    </label>
                    <input type="text" id="field-cardname" readonly placeholder="自动读取当前角色卡" />
                    <span class="field-hint">自动读取，不可修改</span>
                </div>

                <div class="form-group">
                    <label for="field-name">
                        <i class="fa-solid fa-signature"></i> 名称
                        <span class="required">*</span>
                    </label>
                    <input type="text" id="field-name" maxlength="20" placeholder="最多20个字符" />
                    <span class="field-counter"><span id="name-count">0</span>/20</span>
                </div>

                <div class="form-group">
                    <label for="field-author">
                        <i class="fa-solid fa-user-pen"></i> 作者
                        <span class="required">*</span>
                    </label>
                    <input type="text" id="field-author" maxlength="20" placeholder="最多20个字符" />
                    <span class="field-counter"><span id="author-count">0</span>/20</span>
                </div>

                <div class="form-group">
                    <label for="field-version">
                        <i class="fa-solid fa-code-branch"></i> 版本
                        <span class="required">*</span>
                    </label>
                    <input type="text" id="field-version" placeholder="如: 1.0、22.22" pattern="\\d{1,2}\\.\\d{1,2}" maxlength="5" />
                    <span class="field-hint">格式: XX.XX，最多5个字符</span>
                </div>

                <div class="form-group">
                    <label>
                        <i class="fa-solid fa-hashtag"></i> 标签 (最多5个)
                    </label>
                    <div class="tag-container" id="tag-container">
                        <div class="tag-chips" id="tag-chips"></div>
                        <div class="tag-input-wrapper">
                            <input type="text" id="tag-input" placeholder="输入标签按回车或点击+" maxlength="20">
                            <button id="add-tag-btn" class="tag-add-btn"><i class="fa-solid fa-plus"></i></button>
                        </div>
                    </div>
                    <span class="field-hint">每个标签最多5汉字或10英文字符</span>
                </div>

                <div class="form-group">
                    <label for="field-description">
                        <i class="fa-solid fa-align-left"></i> 描述
                    </label>
                    <textarea id="field-description" maxlength="200" rows="3" placeholder="最多200个字符"></textarea>
                    <span class="field-counter"><span id="desc-count">0</span>/200</span>
                </div>

                <button id="upload-submit-btn" class="workshop-btn primary">
                    <i class="fa-solid fa-cloud-arrow-up"></i> 上传到创意工坊
                </button>
            </div>

            <!-- 右侧：数据选择和预览 -->
            <div class="upload-data-section">
                <div class="data-source-tabs">
                    <button class="data-tab" data-source="worldInfo" style="display: none;">
                        <i class="fa-solid fa-book"></i> 世界书
                    </button>
                    <button class="data-tab active" data-source="chatdata">
                        <i class="fa-solid fa-comments"></i> 聊天数据
                    </button>
                </div>

                <!-- 数据区域容器：左右布局 -->
                <div class="data-content-wrapper">
                    <!-- 左侧：数据选择 -->
                    <div class="data-select-panel">
                        <!-- 世界书选择区 -->
                        <div id="worldInfo-section" class="data-source-section">
                            <div class="section-header">
                                <h4>选择世界书词条</h4>
                                <div class="section-actions">
                                    <button id="wi-select-all" class="small-btn">全选</button>
                                    <button id="wi-deselect-all" class="small-btn">取消</button>
                                    <button id="wi-refresh" class="small-btn">
                                        <i class="fa-solid fa-refresh"></i>
                                    </button>
                                </div>
                            </div>
                            <div id="worldInfo-list" class="checkbox-list">
                                <div class="loading-spinner">
                                    <i class="fa-solid fa-spinner fa-spin"></i> 加载中...
                                </div>
                            </div>
                        </div>

                        <!-- 聊天数据选择区 -->
                        <div id="chatdata-section" class="data-source-section active">
                            <!-- 标签页切换 -->
                            <div class="chatdata-tabs">
                                <button class="chatdata-tab active" data-target="localstorage">
                                    <i class="fa-solid fa-database"></i> LocalStorage
                                </button>
                                <button class="chatdata-tab" data-target="indexeddb">
                                    <i class="fa-solid fa-hard-drive"></i> IndexedDB
                                </button>
                            </div>

                            <!-- LocalStorage 面板 -->
                            <div id="localstorage-panel" class="chatdata-panel active">
                                <div class="section-header">
                                    <h5>选择 LocalStorage 数据</h5>
                                    <div class="section-actions">
                                        <button id="ls-select-all" class="small-btn">全选</button>
                                        <button id="ls-deselect-all" class="small-btn">取消</button>
                                        <button id="ls-refresh" class="small-btn">
                                            <i class="fa-solid fa-refresh"></i>
                                        </button>
                                    </div>
                                </div>
                                <div id="localstorage-list" class="checkbox-list">
                                    <div class="loading-spinner">
                                        <i class="fa-solid fa-spinner fa-spin"></i> 加载中...
                                    </div>
                                </div>
                            </div>

                            <!-- IndexedDB 面板 -->
                            <div id="indexeddb-panel" class="chatdata-panel">
                                <div class="section-header">
                                    <h5>选择 IndexedDB 数据</h5>
                                    <div class="section-actions">
                                        <button id="idb-select-all" class="small-btn">全选</button>
                                        <button id="idb-deselect-all" class="small-btn">取消</button>
                                        <button id="idb-refresh" class="small-btn">
                                            <i class="fa-solid fa-refresh"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="idb-selectors">
                                    <div class="idb-store-selector">
                                        <label>数据表:</label>
                                        <select id="idb-store-select" class="form-select">
                                            <option value="">-- 请先选择数据表 --</option>
                                        </select>
                                    </div>
                                    <div class="idb-key-selector">
                                        <label>键:</label>
                                        <select id="idb-key-select" class="form-select" disabled>
                                            <option value="">-- 请先选择数据表 --</option>
                                        </select>
                                    </div>
                                </div>
                                <div id="indexeddb-list" class="checkbox-list">
                                    <div class="empty-message"><i class="fa-solid fa-hand-pointer"></i> 请先从上方选择数据表和键</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 右侧：文件预览区 -->
                    <div class="file-preview-panel">
                        <div class="section-header">
                            <h4>
                                <i class="fa-solid fa-file-code"></i> 文件预览 (JSON)
                                <span id="json-length-counter" class="char-counter">0 B / ${formatSize(MAX_JSON_SIZE)}</span>
                                <span id="json-length-warning" class="validation-warning-text" style="display:none; margin-left: 10px; font-size: 12px; color: var(--workshop-error);">
                                    <i class="fa-solid fa-exclamation-triangle"></i> 文件大小不得超过 ${formatSize(MAX_JSON_SIZE)}
                                </span>
                            </h4>
                            <div class="section-actions">
                                <button id="copy-json-btn" class="small-btn">
                                    <i class="fa-solid fa-copy"></i> 复制
                                </button>
                                <button id="clear-json-btn" class="small-btn">
                                    <i class="fa-solid fa-eraser"></i> 清空
                                </button>
                            </div>
                        </div>
                        <textarea id="field-file" class="json-preview" placeholder="选择左侧数据或手动输入 JSON..."></textarea>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * 创建下载页面 HTML
 * @returns {string}
 */
export function createDownloadPage() {
    return `
        <div class="download-container">
            <!-- 搜索和筛选区 -->
            <div class="search-filter-section">
                <div class="search-box">
                    <i class="fa-solid fa-search"></i>
                    <input type="text" id="workshop-search" placeholder="搜索创意工坊内容..." />
                </div>

                <div class="filter-options">
                    <select id="filter-field">
                        <option value="all">所有字段</option>
                        <option value="cardname">角色卡</option>
                        <option value="name">名称</option>
                        <option value="author">作者</option>
                        <option value="tags">标签</option>
                    </select>

                    <select id="filter-type">
                        <option value="all">所有类型</option>
                        <option value="WorldInfo">世界书</option>
                        <option value="ChatData">聊天数据</option>
                    </select>

                    <button id="refresh-workshop-btn" class="workshop-btn secondary">
                        <i class="fa-solid fa-refresh"></i> 刷新
                    </button>
                </div>
            </div>

            <!-- 结果列表 -->
            <div id="workshop-results" class="workshop-results">
                <div class="loading-spinner">
                    <i class="fa-solid fa-spinner fa-spin"></i> 正在加载创意工坊数据...
                </div>
            </div>
        </div>
    `;
}

/**
 * 创建详情弹窗 HTML
 * @returns {string}
 */
export function createDetailModal() {
    return `
        <div id="workshop-detail-modal" class="workshop-modal" style="display: none;">
            <div class="workshop-modal-content">
                <div class="modal-header">
                    <h3 id="modal-title">详情</h3>
                    <button id="modal-close-btn" class="modal-close-btn">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="modal-body" id="modal-body">
                    <!-- 动态内容 -->
                </div>
                <div class="modal-footer" id="modal-footer">
                    <!-- 动态按钮 -->
                </div>
            </div>
        </div>
    `;
}

/**
 * 创建注入确认弹窗 HTML
 * @returns {string}
 */
export function createInjectModal() {
    return `
        <div id="workshop-inject-modal" class="workshop-modal" style="display: none;">
            <div class="workshop-modal-content workshop-modal-small">
                <div class="modal-header">
                    <h3><i class="fa-solid fa-file-import"></i> 注入确认</h3>
                    <button id="inject-modal-close-btn" class="modal-close-btn">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p id="inject-modal-message">将自动检测数据类型并注入到对应位置（世界书、LocalStorage、IndexedDB）。</p>
                    <div id="inject-modal-item-info" class="inject-item-info">
                        <!-- 动态显示条目信息 -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="inject-modal-cancel-btn" class="workshop-btn secondary">
                        <i class="fa-solid fa-xmark"></i> 取消
                    </button>
                    <button id="inject-modal-confirm-btn" class="workshop-btn primary">
                        <i class="fa-solid fa-file-import"></i> 注入
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * 创建创意工坊条目卡片 HTML
 * @param {Object} item - 条目数据
 * @param {number} index - 条目索引
 * @returns {string}
 */
export function createWorkshopItemCard(item, index) {
    // 处理 tags：可能是字符串或数组
    let tagsHtml = '';
    if (item.tags) {
        const tagList = Array.isArray(item.tags)
            ? item.tags
            : (typeof item.tags === 'string' ? item.tags.split(',') : []);
        tagsHtml = tagList.map(t =>
            `<span class="tag">${escapeHtml(String(t).trim())}</span>`
        ).join('');
    }

    // 截断描述用于预览
    const shortDesc = truncate(item.description, 50);

    // 处理类型显示
    const typeHtml = (item.type || '').split(',').map(t => {
        const isWorldInfo = t.trim() === CONTENT_TYPE.WORLD_INFO;
        const label = isWorldInfo ? '世界书' : '聊天数据';
        const cls = isWorldInfo ? 'lorebook' : 'chatdata';
        return `<span class="item-type ${cls}">${label}</span>`;
    }).join('');

    return `
        <div class="workshop-item" data-index="${index}">
            <div class="item-header">
                <h4>${escapeHtml(item.name || '未命名')}</h4>
                <div class="item-badges" style="display:flex; gap:4px;">
                    ${typeHtml}
                </div>
            </div>
            <div class="item-meta">
                <span><i class="fa-solid fa-id-card"></i> ${escapeHtml(item.cardname || '-')}</span>
                <span><i class="fa-solid fa-user"></i> ${escapeHtml(item.author || '-')}</span>
                <span><i class="fa-solid fa-code-branch"></i> v${escapeHtml(item.version || '1.0')}</span>
            </div>
            ${shortDesc ? `<p class="item-description">${escapeHtml(shortDesc)}</p>` : ''}
            ${tagsHtml ? `<div class="item-tags">${tagsHtml}</div>` : ''}
            <div class="item-actions">
                <button class="workshop-btn secondary view-detail-btn" data-index="${index}">
                    <i class="fa-solid fa-eye"></i> 详情
                </button>
                <button class="workshop-btn primary download-item-btn" data-index="${index}">
                    <i class="fa-solid fa-download"></i> 下载
                </button>
                <button class="workshop-btn secondary inject-item-btn" data-index="${index}">
                    <i class="fa-solid fa-file-import"></i> 注入
                </button>
            </div>
        </div>
    `;
}

/**
 * 创建详情弹窗内容 HTML
 * @param {Object} item - 条目数据
 * @param {number} index - 条目索引
 * @returns {{ body: string, footer: string }}
 */
export function createDetailModalContent(item, index) {
    // 处理 tags
    let tagsHtml = '';
    if (item.tags) {
        const tagList = Array.isArray(item.tags)
            ? item.tags
            : (typeof item.tags === 'string' ? item.tags.split(',') : []);
        tagsHtml = tagList.map(t =>
            `<span class="tag">${escapeHtml(String(t).trim())}</span>`
        ).join('');
    }

    // 处理类型显示
    const typeHtml = (item.type || '').split(',').map(t => {
        const isWorldInfo = t.trim() === CONTENT_TYPE.WORLD_INFO;
        const label = isWorldInfo ? '世界书' : '聊天数据';
        const cls = isWorldInfo ? 'lorebook' : 'chatdata';
        return `<span class="item-type ${cls}">${label}</span>`;
    }).join('');

    const body = `
        <div class="modal-detail-section">
            <div class="detail-row">
                <span class="detail-label"><i class="fa-solid fa-id-card"></i> 角色卡:</span>
                <span class="detail-value">${escapeHtml(item.cardname || '-')}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label"><i class="fa-solid fa-user"></i> 作者:</span>
                <span class="detail-value">${escapeHtml(item.author || '-')}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label"><i class="fa-solid fa-code-branch"></i> 版本:</span>
                <span class="detail-value">v${escapeHtml(item.version || '1.0')}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label"><i class="fa-solid fa-tags"></i> 类型:</span>
                <span class="detail-value" style="display:flex; gap:4px;">
                    ${typeHtml}
                </span>
            </div>
            ${item.description ? `
            <div class="detail-row detail-row-full">
                <span class="detail-label"><i class="fa-solid fa-align-left"></i> 描述:</span>
                <span class="detail-value detail-description">${escapeHtml(item.description)}</span>
            </div>
            ` : ''}
            ${tagsHtml ? `
            <div class="detail-row detail-row-full">
                <span class="detail-label"><i class="fa-solid fa-hashtag"></i> 标签:</span>
                <div class="detail-tags">${tagsHtml}</div>
            </div>
            ` : ''}
        </div>
    `;

    const footer = `
        <button class="workshop-btn primary" id="modal-download-btn" data-index="${index}">
            <i class="fa-solid fa-download"></i> 下载
        </button>
        <button class="workshop-btn secondary" id="modal-inject-btn" data-index="${index}">
            <i class="fa-solid fa-file-import"></i> 注入
        </button>
    `;

    return { body, footer };
}

/**
 * 创建分页控件 HTML
 * @param {number} currentPage - 当前页码
 * @param {number} totalPages - 总页数
 * @param {number} totalItems - 总条目数
 * @returns {string}
 */
export function createPagination(currentPage, totalPages, totalItems) {
    if (totalPages <= 1) return '';

    return `
        <div class="pagination">
            <button class="pagination-btn" data-page="1" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fa-solid fa-angles-left"></i>
            </button>
            <button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <span class="pagination-info">第 ${currentPage} / ${totalPages} 页 (共 ${totalItems} 项)</span>
            <button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-right"></i>
            </button>
            <button class="pagination-btn" data-page="${totalPages}" ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="fa-solid fa-angles-right"></i>
            </button>
        </div>
    `;
}

/**
 * 创建世界书词条列表项 HTML
 * @param {Object} entry - 词条数据
 * @param {number} index - 索引
 * @param {boolean} checked - 是否选中
 * @returns {string}
 */
export function createWorldInfoListItem(entry, index, checked) {
    const entryId = `wi-entry-${index}`;
    const entryName = entry.name || entry.comment || `词条 ${index + 1}`;
    const keywords = (entry.keys || []).map(k => String(k)).join(', ');

    return `
        <label class="checkbox-item" data-index="${index}">
            <input type="checkbox" id="${entryId}" ${checked ? 'checked' : ''} />
            <span class="checkbox-label">
                <strong>${escapeHtml(entryName)}</strong>
                ${keywords ? `<span class="entry-key">关键词: ${escapeHtml(truncate(keywords, 50))}</span>` : ''}
            </span>
        </label>
    `;
}

/**
 * 创建 LocalStorage 列表项 HTML
 * @param {Object} item - 数据项
 * @param {boolean} checked - 是否选中
 * @returns {string}
 */
export function createLocalStorageListItem(item, checked) {
    return `
        <label class="checkbox-item" data-key="${escapeHtml(item.key)}">
            <input type="checkbox" ${checked ? 'checked' : ''} />
            <span class="checkbox-label">
                <strong>${escapeHtml(truncate(item.key, 50))}</strong>
                <span class="entry-size">${item.sizeFormatted}</span>
            </span>
        </label>
    `;
}

/**
 * 创建 IndexedDB 列表项 HTML
 * @param {Object} item - 数据项
 * @param {number} index - 索引
 * @param {boolean} checked - 是否选中
 * @returns {string}
 */
export function createIndexedDBListItem(item, index, checked) {
    const keyId = `idb-key-${item.dbName}-${item.storeName}-${index}`;
    const keyStr = typeof item.key === 'object' ? JSON.stringify(item.key) : String(item.key);

    return `
        <label class="checkbox-item" data-id="${escapeHtml(keyId)}" data-db="${escapeHtml(item.dbName)}" data-store="${escapeHtml(item.storeName)}" data-key-index="${index}">
            <input type="checkbox" ${checked ? 'checked' : ''} />
            <span class="checkbox-label">
                <strong>${escapeHtml(keyStr)}</strong>
            </span>
        </label>
    `;
}

/**
 * 创建标签芯片 HTML
 * @param {string} tag - 标签文本
 * @param {number} index - 索引
 * @returns {string}
 */
export function createTagChip(tag, index) {
    return `
        <div class="tag-chip">
            <span>${escapeHtml(tag)}</span>
            <i class="fa-solid fa-xmark" data-index="${index}"></i>
        </div>
    `;
}

/**
 * 创建加载中提示 HTML
 * @param {string} [message] - 提示消息
 * @returns {string}
 */
export function createLoadingSpinner(message = '加载中...') {
    return `
        <div class="loading-spinner">
            <i class="fa-solid fa-spinner fa-spin"></i> ${escapeHtml(message)}
        </div>
    `;
}

/**
 * 创建空消息提示 HTML
 * @param {string} message - 提示消息
 * @param {string} [icon] - 图标类名
 * @returns {string}
 */
export function createEmptyMessage(message, icon = 'fa-inbox') {
    return `
        <div class="empty-message">
            <i class="fa-solid ${icon}"></i> ${escapeHtml(message)}
        </div>
    `;
}

/**
 * 创建错误消息提示 HTML
 * @param {string} message - 错误消息
 * @returns {string}
 */
export function createErrorMessage(message) {
    return `
        <div class="error-message">
            <i class="fa-solid fa-exclamation-triangle"></i> ${escapeHtml(message)}
        </div>
    `;
}
