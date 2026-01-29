/**
 * @fileoverview UI 渲染器模块
 * 负责 DOM 更新和页面渲染逻辑
 */

import { state } from '../state.js';
import { PAGE_SIZE, MAX_JSON_SIZE, CONTENT_TYPE } from '../constants.js';
import { escapeHtml, getBeijingTimeISO, getByteSize, formatSize } from '../utils.js';
import {
    createMainPanel,
    createMenuButton,
    createDetailModal,
    createInjectModal,
    createWorkshopItemCard,
    createDetailModalContent,
    createPagination,
    createWorldInfoListItem,
    createLocalStorageListItem,
    createIndexedDBListItem,
    createTagChip,
    createLoadingSpinner,
    createEmptyMessage,
    createErrorMessage
} from './components.js';

/**
 * UI 渲染器类
 */
export class UIRenderer {
    /**
     * @param {Object} services - 服务依赖
     * @param {Object} services.worldInfoService - 世界书服务
     * @param {Object} services.databaseService - 数据库服务
     * @param {Object} services.authModule - 鉴权模块
     */
    constructor(services) {
        this.worldInfoService = services.worldInfoService;
        this.databaseService = services.databaseService;
        this.authModule = services.authModule;
    }

    /**
     * 初始化 UI
     */
    async initUI() {
        // 创建顶部菜单按钮
        $('#extensionsMenu').append(createMenuButton());

        // 创建主面板
        const authButtonHtml = this.authModule ? this.authModule.renderButton() : '';
        $('body').append(createMainPanel(authButtonHtml));

        // 创建详情弹窗
        $('body').append(createDetailModal());

        // 创建注入确认弹窗
        $('body').append(createInjectModal());

        // 插入禁用按钮样式和注入弹窗样式
        $('head').append(`<style>
            .disabled-upload { opacity: 0.6; cursor: not-allowed !important; background: #333 !important; position: relative; }
            .disabled-upload:hover::after {
                content: "上传创意工坊需登录 Discord";
                position: absolute; bottom: 110%; left: 50%; transform: translateX(-50%);
                background: rgba(0,0,0,0.9); padding: 5px 8px; border-radius: 4px;
                white-space: nowrap; font-size: 12px; pointer-events: none; z-index: 9999;
            }
            .workshop-modal-small .modal-body { padding: 15px 20px; }
            .workshop-modal-small .modal-body p { margin: 0 0 15px 0; color: #ccc; font-size: 14px; }
            .inject-item-info { background: rgba(255,255,255,0.05); border-radius: 6px; padding: 12px; }
            .inject-item-info .item-name { font-weight: bold; color: #fff; margin-bottom: 5px; }
            .inject-item-info .item-meta { font-size: 12px; color: #888; }
            .github-link {
                margin-left: 10px;
                color: #888;
                font-size: 18px;
                transition: color 0.2s, transform 0.2s;
                text-decoration: none;
                position: relative;
            }
            .github-link:hover {
                color: #fff;
                transform: scale(1.1);
            }
            .github-link[title]:hover::after {
                content: attr(title);
                position: absolute;
                left: 50%;
                top: 100%;
                transform: translateX(-50%);
                margin-top: 8px;
                background: rgba(0,0,0,0.95);
                color: #ffd700;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                white-space: nowrap;
                z-index: 9999;
                pointer-events: none;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            }
        </style>`);
    }

    // ==================== 面板操作 ====================

    /**
     * 切换面板显示
     * @param {boolean} [show] - 是否显示，不传则切换
     */
    togglePanel(show) {
        const $panel = $('#workshop-panel');
        if (show === undefined) {
            show = !$panel.is(':visible');
        }
        if (show) {
            $panel.show();
        } else {
            $panel.hide();
        }
        return show;
    }

    /**
     * 切换标签页
     * @param {string} tab - 标签页名称: 'upload' | 'download'
     */
    switchTab(tab) {
        state.currentTab = tab;

        $('.workshop-tab').removeClass('active');
        $(`.workshop-tab[data-tab="${tab}"]`).addClass('active');

        $('.workshop-page').removeClass('active');
        $(`#${tab}-page`).addClass('active');
    }

    /**
     * 切换数据源
     * @param {string} source - 数据源: 'worldInfo' | 'chatdata'
     */
    switchDataSource(source) {
        $('.data-tab').removeClass('active');
        $(`.data-tab[data-source="${source}"]`).addClass('active');

        $('.data-source-section').removeClass('active');
        $(`#${source}-section`).addClass('active');
    }

    /**
     * 切换聊天数据子标签页
     * @param {string} target - 目标: 'localstorage' | 'indexeddb'
     */
    switchChatDataTab(target) {
        $('.chatdata-tab').removeClass('active');
        $(`.chatdata-tab[data-target="${target}"]`).addClass('active');

        $('.chatdata-panel').removeClass('active');
        $(`#${target}-panel`).addClass('active');
    }

    // ==================== 世界书渲染 ====================

    /**
     * 渲染世界书列表
     * @param {Array} entries - 世界书词条数组
     * @param {string} displayName - 显示名称
     */
    renderWorldInfoList(entries, displayName) {
        const $list = $('#worldInfo-list');

        if (!entries || entries.length === 0) {
            $list.html(createEmptyMessage(`世界书 "${escapeHtml(displayName)}" 暂无词条`));
            return;
        }

        let html = `<div class="list-header"><small>世界书: ${escapeHtml(displayName)} (${entries.length} 个词条)</small></div>`;

        entries.forEach((entry, index) => {
            const checked = state.selectedWorldInfoEntries.has(index);
            html += createWorldInfoListItem(entry, index, checked);
        });

        $list.html(html);
    }

    /**
     * 显示世界书加载中状态
     */
    showWorldInfoLoading() {
        $('#worldInfo-list').html(createLoadingSpinner('加载中...'));
    }

    /**
     * 显示世界书错误状态
     * @param {string} message - 错误消息
     */
    showWorldInfoError(message) {
        $('#worldInfo-list').html(createErrorMessage(message));
    }

    /**
     * 显示世界书未绑定提示
     */
    showWorldInfoNotBound() {
        $('#worldInfo-list').html(createEmptyMessage('当前角色卡未绑定世界书'));
    }

    /**
     * 显示 TavernHelper 未安装提示
     */
    showTavernHelperNotInstalled() {
        $('#worldInfo-list').html(createEmptyMessage('TavernHelper 插件未安装', 'fa-exclamation-circle'));
    }

    // ==================== LocalStorage 渲染 ====================

    /**
     * 渲染 LocalStorage 列表
     * @param {Array} items - 数据项数组
     */
    renderLocalStorageList(items) {
        const $list = $('#localstorage-list');

        if (items.length === 0) {
            $list.html(createEmptyMessage('暂无 LocalStorage 数据'));
            return;
        }

        let html = `<div class="list-header"><small>共 ${items.length} 项</small></div>`;

        items.forEach(item => {
            const checked = state.selectedLocalStorageKeys.has(item.key);
            html += createLocalStorageListItem(item, checked);
        });

        $list.html(html);
    }

    /**
     * 显示 LocalStorage 加载中状态
     */
    showLocalStorageLoading() {
        $('#localstorage-list').html(createLoadingSpinner('加载中...'));
    }

    /**
     * 显示 LocalStorage 错误状态
     * @param {string} message - 错误消息
     */
    showLocalStorageError(message) {
        $('#localstorage-list').html(createErrorMessage(message));
    }

    // ==================== IndexedDB 渲染 ====================

    /**
     * 渲染 IndexedDB 表选择器
     * @param {Array} stores - 数据表数组
     */
    renderIndexedDBStoreSelector(stores) {
        const $select = $('#idb-store-select');

        if (stores.length === 0) {
            $select.html('<option value="">暂无数据表</option>');
            return;
        }

        let html = `<option value="">-- 请选择数据表 (${stores.length} 个) --</option>`;
        stores.forEach(store => {
            html += `<option value="${escapeHtml(store.value)}">${escapeHtml(store.displayName)}</option>`;
        });

        $select.html(html);
    }

    /**
     * 渲染 IndexedDB 键列表
     * @param {Array} keys - 键数组
     * @param {string} dbName - 数据库名
     * @param {string} storeName - 表名
     */
    renderIndexedDBKeysList(keys, dbName, storeName) {
        const $list = $('#indexeddb-list');

        if (keys.length === 0) {
            $list.html(createEmptyMessage('该数据表为空'));
            return;
        }

        let html = `<div class="list-header"><small>${escapeHtml(dbName)} / ${escapeHtml(storeName)} - 共 ${keys.length} 个键</small></div>`;

        keys.forEach((key, index) => {
            const keyId = `idb-key-${dbName}-${storeName}-${index}`;
            const checked = state.selectedIndexedDBItems.has(keyId);
            html += createIndexedDBListItem({ key, dbName, storeName }, index, checked);
        });

        $list.html(html);
    }

    /**
     * 显示 IndexedDB 加载中状态
     */
    showIndexedDBLoading() {
        $('#indexeddb-list').html(createLoadingSpinner('加载键值中...'));
    }

    /**
     * 显示 IndexedDB 未选择表提示
     */
    showIndexedDBSelectPrompt() {
        $('#indexeddb-list').html(createEmptyMessage('请先从上方下拉框选择数据表', 'fa-hand-pointer'));
    }

    /**
     * 显示 IndexedDB 浏览器不支持提示
     */
    showIndexedDBNotSupported() {
        $('#idb-store-select').html('<option value="">浏览器不支持</option>');
        $('#indexeddb-list').html(`
            <div class="info-message">
                <i class="fa-solid fa-info-circle"></i>
                <p>当前浏览器不支持列出 IndexedDB 数据库。</p>
                <p>请使用 Chrome 或 Edge 浏览器获取完整功能。</p>
            </div>
        `);
    }

    /**
     * 显示 IndexedDB 错误状态
     * @param {string} message - 错误消息
     */
    showIndexedDBError(message) {
        $('#indexeddb-list').html(createErrorMessage(message));
    }

    // ==================== 标签渲染 ====================

    /**
     * 渲染标签列表
     */
    renderTags() {
        const $container = $('#tag-chips');
        $container.empty();

        state.getTags().forEach((tag, index) => {
            $container.append(createTagChip(tag, index));
        });
    }

    // ==================== JSON 预览 ====================

    /**
     * 更新 JSON 预览
     * @param {Object} exportData - 导出数据对象
     */
    updateJsonPreview(exportData) {
        const jsonStr = JSON.stringify(exportData, null, 2);
        $('#field-file').val(jsonStr);
        this.checkJsonLength();
    }

    /**
     * 检查 JSON 大小（字节）
     * @returns {boolean} 是否在限制内
     */
    checkJsonLength() {
        const content = $('#field-file').val();
        const byteSize = getByteSize(content);

        const $counter = $('#json-length-counter');
        const $warning = $('#json-length-warning');
        const $textarea = $('#field-file');

        // 显示格式: "5.2 KB / 8 KB"
        $counter.text(`${formatSize(byteSize)} / ${formatSize(MAX_JSON_SIZE)}`);

        if (byteSize > MAX_JSON_SIZE) {
            $warning.show();
            $textarea.addClass('validation-error');
            $counter.addClass('error');
            return false;
        } else {
            $warning.hide();
            $textarea.removeClass('validation-error');
            $counter.removeClass('error');
            return true;
        }
    }

    /**
     * 清空 JSON 预览
     */
    clearJsonPreview() {
        $('#field-file').val('');
        $('#json-length-warning').hide();
        $('#field-file').removeClass('validation-error');
        $('#json-length-counter').text('0 B / 8 KB').removeClass('error');
    }

    // ==================== 创意工坊结果渲染 ====================

    /**
     * 渲染创意工坊结果列表
     * @param {Array} data - 数据数组
     */
    renderWorkshopResults(data) {
        const $results = $('#workshop-results');

        if (!data || data.length === 0) {
            $results.html(createEmptyMessage('创意工坊暂无内容'));
            return;
        }

        // 分页状态
        const totalPages = Math.ceil(data.length / PAGE_SIZE);
        let currentPage = state.workshopCurrentPage || 1;

        // 确保页码有效
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        state.workshopCurrentPage = currentPage;

        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const endIndex = Math.min(startIndex + PAGE_SIZE, data.length);
        const pageData = data.slice(startIndex, endIndex);

        let html = '<div class="results-grid">';

        pageData.forEach((item) => {
            // 使用原始索引（如果有），否则回退到 item 在原始数据中的位置
            const originalIndex = item._originalIndex !== undefined ? item._originalIndex : data.indexOf(item);
            html += createWorkshopItemCard(item, originalIndex);
        });

        html += '</div>';

        // 分页控件
        html += createPagination(currentPage, totalPages, data.length);

        $results.html(html);
    }

    /**
     * 显示创意工坊加载中状态
     */
    showWorkshopLoading() {
        $('#workshop-results').html(createLoadingSpinner('正在加载创意工坊数据...'));
    }

    /**
     * 显示创意工坊错误状态
     * @param {string} message - 错误消息
     */
    showWorkshopError(message) {
        $('#workshop-results').html(`
            <div class="error-message">
                <i class="fa-solid fa-exclamation-triangle"></i>
                <p>加载失败: ${escapeHtml(message)}</p>
                <button id="workshop-retry-btn" class="workshop-btn secondary">重试</button>
            </div>
        `);
    }

    // ==================== 详情弹窗 ====================

    /**
     * 显示详情弹窗
     * @param {Object} item - 条目数据
     * @param {number} index - 条目索引
     */
    showDetailModal(item, index) {
        if (!item) return;

        $('#modal-title').text(item.name || '未命名');

        const { body, footer } = createDetailModalContent(item, index);
        $('#modal-body').html(body);
        $('#modal-footer').html(footer);

        $('#workshop-detail-modal').show();
    }

    /**
     * 关闭详情弹窗
     */
    closeDetailModal() {
        $('#workshop-detail-modal').hide();
    }

    // ==================== 注入弹窗 ====================

    /**
     * 显示注入确认弹窗
     * @param {number} index - 条目索引
     */
    showInjectModal(index) {
        const item = state.workshopData?.[index];
        if (!item) return;

        state.selectedInjectIndex = index;

        // 构建条目信息展示
        const itemInfoHtml = `
            <div class="item-name">${escapeHtml(item.name || '未命名')}</div>
            <div class="item-meta">
                <span><i class="fa-solid fa-id-card"></i> ${escapeHtml(item.cardname || '-')}</span>
                <span style="margin-left: 10px;"><i class="fa-solid fa-user"></i> ${escapeHtml(item.author || '-')}</span>
            </div>
        `;
        $('#inject-modal-item-info').html(itemInfoHtml);

        $('#workshop-inject-modal').show();
    }

    /**
     * 隐藏注入确认弹窗
     */
    hideInjectModal() {
        $('#workshop-inject-modal').hide();
        state.selectedInjectIndex = null;
    }

    /**
     * 设置注入按钮加载状态
     * @param {boolean} loading - 是否加载中
     */
    setInjectButtonLoading(loading) {
        const $btn = $('#inject-modal-confirm-btn');
        if (loading) {
            $btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> 注入中...');
        } else {
            $btn.prop('disabled', false).html('<i class="fa-solid fa-file-import"></i> 注入');
        }
    }

    // 兼容旧方法名（如果有其他地方调用）
    showInjectOptions(index) {
        this.showInjectModal(index);
    }

    hideInjectOptions() {
        this.hideInjectModal();
    }

    // ==================== 鉴权 UI 更新 ====================

    /**
     * 更新鉴权按钮
     */
    updateAuthButton() {
        if (this.authModule) {
            $('#workshop-auth-container').html(this.authModule.renderButton());
            this.authModule.bindEvents();
        }
    }

    /**
     * 更新上传按钮状态
     */
    updateUploadButtonState() {
        const btn = $('#upload-submit-btn');
        if (this.authModule && this.authModule.isAuthenticated()) {
            btn.removeClass('disabled-upload')
                .prop('disabled', false)
                .html('<i class="fa-solid fa-cloud-arrow-up"></i> 上传到创意工坊');
        } else {
            btn.addClass('disabled-upload')
                .prop('disabled', true)
                .html('<i class="fa-brands fa-discord"></i> 请先登录');
        }
    }

    /**
     * 设置上传按钮加载状态
     * @param {boolean} loading - 是否加载中
     */
    setUploadButtonLoading(loading) {
        const btn = $('#upload-submit-btn');
        if (loading) {
            btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> 上传中...');
        } else {
            this.updateUploadButtonState();
        }
    }

    // ==================== 表单操作 ====================

    /**
     * 更新当前角色卡名称
     * @param {string} name - 角色卡名称
     */
    updateCardName(name) {
        $('#field-cardname').val(name || '未选择角色卡');
    }

    /**
     * 获取上传表单数据
     * @returns {Object} 表单数据
     */
    getUploadFormData() {
        return {
            cardname: $('#field-cardname').val().trim(),
            name: $('#field-name').val().trim(),
            author: $('#field-author').val().trim(),
            version: $('#field-version').val().trim(),
            description: $('#field-description').val().trim(),
            fileContent: $('#field-file').val().trim(),
            tags: state.getTags().join(',')
        };
    }

    /**
     * 清空上传表单
     */
    clearUploadForm() {
        $('#field-name').val('');
        $('#field-author').val('');
        $('#field-version').val('');
        $('#tag-input').val('');
        state.clearTags();
        this.renderTags();
        $('#field-description').val('');
        this.clearJsonPreview();
        $('#name-count, #author-count, #desc-count').text('0');
        state.resetAllSelections();
    }

    /**
     * 更新字段计数器
     * @param {string} fieldId - 字段ID
     * @param {string} counterId - 计数器ID
     */
    updateFieldCounter(fieldId, counterId) {
        const length = $(`#${fieldId}`).val().length;
        $(`#${counterId}`).text(length);
    }
}

// 导出单例
let rendererInstance = null;

/**
 * 获取 UIRenderer 单例
 * @param {Object} services - 服务依赖
 * @returns {UIRenderer}
 */
export function getUIRenderer(services) {
    if (!rendererInstance) {
        rendererInstance = new UIRenderer(services);
    }
    return rendererInstance;
}
