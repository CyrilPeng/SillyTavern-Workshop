/**
 * @fileoverview 事件绑定模块
 * 统一管理所有 jQuery/DOM 事件绑定
 */

import { state } from '../state.js';
import { debounce, showToast, validateTagLength, getBeijingTimeISO, getByteSize, formatSize } from '../utils.js';
import { MAX_TAGS, MAX_JSON_SIZE, CONTENT_TYPE } from '../constants.js';
import { getModalManager } from './modal.js';

/**
 * 事件绑定管理器类
 */
export class EventBinder {
    /**
     * @param {Object} services - 服务依赖
     * @param {Object} services.worldInfoService - 世界书服务
     * @param {Object} services.databaseService - 数据库服务
     * @param {Object} services.workshopApi - 创意工坊 API
     * @param {Object} services.authModule - 鉴权模块
     * @param {Object} services.renderer - UI 渲染器
     * @param {Function} services.getContext - SillyTavern getContext 函数
     */
    constructor(services) {
        this.worldInfoService = services.worldInfoService;
        this.databaseService = services.databaseService;
        this.workshopApi = services.workshopApi;
        this.authModule = services.authModule;
        this.renderer = services.renderer;
        this.getContext = services.getContext;

        /** @type {Array} 缓存的世界书词条 */
        this.cachedWorldInfoEntries = [];
    }

    /**
     * 绑定所有事件
     */
    bindAll() {
        this.bindPanelEvents();
        this.bindTabEvents();
        this.bindDataSourceEvents();
        this.bindWorldInfoEvents();
        this.bindLocalStorageEvents();
        this.bindIndexedDBEvents();
        this.bindTagEvents();
        this.bindJsonPreviewEvents();
        this.bindFormEvents();
        this.bindUploadEvents();
        this.bindDownloadEvents();
        this.bindModalEvents();
        this.bindAuthEvents();
    }

    // ==================== 面板事件 ====================

    bindPanelEvents() {
        // 打开面板
        $(document).on('click', '#workshop-menu-button', () => {
            this.renderer.togglePanel(true);
            this.onPanelOpen();
        });

        // 关闭面板
        $(document).on('click', '#workshop-close-btn', () => {
            this.renderer.togglePanel(false);
        });

        // 点击面板背景关闭
        $(document).on('click', '#workshop-panel', (e) => {
            if (e.target.id === 'workshop-panel') {
                this.renderer.togglePanel(false);
            }
        });

        // ESC 关闭面板
        $(document).on('keydown', (e) => {
            if (e.key === 'Escape') {
                // 先关闭弹窗，再关闭面板
                if ($('#workshop-detail-modal').is(':visible')) {
                    this.renderer.closeDetailModal();
                } else if ($('#workshop-panel').is(':visible')) {
                    this.renderer.togglePanel(false);
                }
            }
        });
    }

    // ==================== 标签页事件 ====================

    bindTabEvents() {
        // 主标签页切换
        $(document).on('click', '.workshop-tab', (e) => {
            const tab = $(e.currentTarget).data('tab');
            this.renderer.switchTab(tab);

            // 切换到下载页时加载数据
            if (tab === 'download' && !state.workshopData) {
                this.loadWorkshopData();
            }
        });

        // 数据源切换
        $(document).on('click', '.data-tab', (e) => {
            const source = $(e.currentTarget).data('source');
            this.renderer.switchDataSource(source);
        });

        // 聊天数据子标签页切换
        $(document).on('click', '.chatdata-tab', (e) => {
            const target = $(e.currentTarget).data('target');
            this.renderer.switchChatDataTab(target);
        });
    }

    // ==================== 数据源事件 ====================

    bindDataSourceEvents() {
        // 刷新世界书
        $(document).on('click', '#wi-refresh', () => {
            this.loadWorldInfoEntries();
        });

        // 刷新 LocalStorage
        $(document).on('click', '#ls-refresh', () => {
            this.loadLocalStorageData();
        });

        // 刷新 IndexedDB
        $(document).on('click', '#idb-refresh', () => {
            this.loadIndexedDBStores();
        });
    }

    // ==================== 世界书事件 ====================

    bindWorldInfoEvents() {
        // 世界书词条勾选
        $(document).on('change', '#worldInfo-list input[type="checkbox"]', (e) => {
            const $item = $(e.target).closest('.checkbox-item');
            const index = parseInt($item.data('index'));

            if (e.target.checked) {
                state.selectedWorldInfoEntries.add(index);
            } else {
                state.selectedWorldInfoEntries.delete(index);
            }

            this.updatePreviewFromSelection();
        });

        // 全选世界书
        $(document).on('click', '#wi-select-all', () => {
            $('#worldInfo-list input[type="checkbox"]').prop('checked', true).trigger('change');
            // 手动添加所有索引
            $('#worldInfo-list .checkbox-item').each((_, el) => {
                state.selectedWorldInfoEntries.add(parseInt($(el).data('index')));
            });
            this.updatePreviewFromSelection();
        });

        // 取消全选世界书
        $(document).on('click', '#wi-deselect-all', () => {
            $('#worldInfo-list input[type="checkbox"]').prop('checked', false);
            state.selectedWorldInfoEntries.clear();
            this.updatePreviewFromSelection();
        });
    }

    // ==================== LocalStorage 事件 ====================

    bindLocalStorageEvents() {
        // LocalStorage 勾选
        $(document).on('change', '#localstorage-list input[type="checkbox"]', (e) => {
            const $item = $(e.target).closest('.checkbox-item');
            const key = $item.data('key');

            if (e.target.checked) {
                state.selectedLocalStorageKeys.add(key);
            } else {
                state.selectedLocalStorageKeys.delete(key);
            }

            this.updatePreviewFromSelection();
        });

        // 全选 LocalStorage
        $(document).on('click', '#ls-select-all', () => {
            $('#localstorage-list input[type="checkbox"]').prop('checked', true);
            $('#localstorage-list .checkbox-item').each((_, el) => {
                state.selectedLocalStorageKeys.add($(el).data('key'));
            });
            this.updatePreviewFromSelection();
        });

        // 取消全选 LocalStorage
        $(document).on('click', '#ls-deselect-all', () => {
            $('#localstorage-list input[type="checkbox"]').prop('checked', false);
            state.selectedLocalStorageKeys.clear();
            this.updatePreviewFromSelection();
        });
    }

    // ==================== IndexedDB 事件 ====================

    bindIndexedDBEvents() {
        // IndexedDB 数据表选择
        $(document).on('change', '#idb-store-select', async (e) => {
            const value = $(e.target).val();
            if (!value) {
                this.renderer.showIndexedDBSelectPrompt();
                state.currentIDBStore = null;
                state.currentIDBKeys = [];
                state.currentIDBKey = null;
                state.currentIDBKeyValue = null;
                return;
            }

            const [dbName, storeName] = value.split('|||');
            state.currentIDBStore = { dbName, storeName };
            state.currentIDBKey = null;
            state.currentIDBKeyValue = null;

            this.renderer.showIndexedDBLoading();

            try {
                const keys = await this.databaseService.getStoreKeys(dbName, storeName);
                state.currentIDBKeys = keys;
                this.renderer.renderIndexedDBKeySelector(keys, dbName, storeName);
            } catch (e) {
                console.error('[EventBinder] 获取 IndexedDB 键失败:', e);
                this.renderer.showIndexedDBError('获取键值失败');
            }
        });

        // IndexedDB 键选择
        $(document).on('change', '#idb-key-select', async (e) => {
            const keyIndex = $(e.target).val();
            if (keyIndex === '' || keyIndex === null) {
                state.currentIDBKey = null;
                state.currentIDBKeyValue = null;
                $('#indexeddb-list').html('<div class="empty-message"><i class="fa-solid fa-hand-pointer"></i> 请从上方选择键</div>');
                return;
            }

            const { dbName, storeName } = state.currentIDBStore;
            const key = state.currentIDBKeys[parseInt(keyIndex)];
            state.currentIDBKey = key;

            this.renderer.showIndexedDBLoading();

            try {
                const value = await this.databaseService.getStoreValue(dbName, storeName, key);
                state.currentIDBKeyValue = value;
                this.renderer.renderIndexedDBSubItemsList(value, dbName, storeName, key);
            } catch (e) {
                console.error('[EventBinder] 获取 IndexedDB 值失败:', e);
                this.renderer.showIndexedDBError('获取数据失败');
            }
        });

        // IndexedDB 子项勾选
        $(document).on('change', '#indexeddb-list input[type="checkbox"]', (e) => {
            const $item = $(e.target).closest('.checkbox-item');
            const itemId = $item.data('id');
            const dbName = $item.data('db');
            const storeName = $item.data('store');
            // Fix: 直接使用 state 中的当前 key，而不是从 DOM 读取（DOM 中可能没有或被转成字符串）
            const currentKey = state.currentIDBKey;
            const subIndex = parseInt($item.data('sub-index'));

            if (e.target.checked) {
                state.selectedIndexedDBItems.add(itemId);

                // 缓存数据
                if (!state.idbDataCache[itemId]) {
                    let data;
                    if (subIndex === -1) {
                        // 非数组值，取整个值
                        data = state.currentIDBKeyValue;
                    } else {
                        // 数组元素
                        data = state.currentIDBKeyValue[subIndex];
                    }

                    state.idbDataCache[itemId] = {
                        database: dbName,
                        store: storeName,
                        key: currentKey,
                        subIndex: subIndex,
                        data: data
                    };
                }
            } else {
                state.selectedIndexedDBItems.delete(itemId);
                delete state.idbDataCache[itemId];
            }

            this.updatePreviewFromSelection();
        });

        // 全选 IndexedDB
        $(document).on('click', '#idb-select-all', () => {
            const checkboxes = $('#indexeddb-list input[type="checkbox"]');
            if (checkboxes.length === 0) return;

            // 检查是否已选择数据表和键
            if (!state.currentIDBStore || !state.currentIDBKey || state.currentIDBKeyValue === null) {
                showToast('请先选择数据表和键', 'warning');
                return;
            }

            checkboxes.prop('checked', true);

            const { dbName, storeName } = state.currentIDBStore;
            const currentKey = state.currentIDBKey;

            checkboxes.closest('.checkbox').each((_, el) => {
                const $item = $(el);
                const itemId = $item.data('id');
                const subIndex = parseInt($item.data('sub-index'));

                state.selectedIndexedDBItems.add(itemId);

                if (!state.idbDataCache[itemId]) {
                    let data;
                    if (subIndex === -1) {
                        data = state.currentIDBKeyValue;
                    } else {
                        data = state.currentIDBKeyValue[subIndex];
                    }

                    state.idbDataCache[itemId] = {
                        database: dbName,
                        store: storeName,
                        key: currentKey,
                        subIndex: subIndex,
                        data: data
                    };
                }
            });

            this.updatePreviewFromSelection();
        });

        // 取消全选 IndexedDB（只取消当前键的子项）
        $(document).on('click', '#idb-deselect-all', () => {
            const checkboxes = $('#indexeddb-list input[type="checkbox"]');
            checkboxes.prop('checked', false);

            // 只删除当前显示的子项
            checkboxes.closest('.checkbox-item').each((_, el) => {
                const itemId = $(el).data('id');
                state.selectedIndexedDBItems.delete(itemId);
                delete state.idbDataCache[itemId];
            });

            this.updatePreviewFromSelection();
        });
    }

    // ==================== 标签事件 ====================

    bindTagEvents() {
        // 添加标签按钮
        $(document).on('click', '#add-tag-btn', () => {
            this.addTagFromInput();
        });

        // 回车添加标签
        $(document).on('keydown', '#tag-input', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTagFromInput();
            }
        });

        // 删除标签
        $(document).on('click', '#tag-chips .fa-xmark', (e) => {
            const index = $(e.target).data('index');
            state.removeTag(index);
            this.renderer.renderTags();
        });
    }

    /**
     * 从输入框添加标签
     */
    addTagFromInput() {
        const $input = $('#tag-input');
        const tag = $input.val().trim();

        if (!tag) return;

        if (state.getTags().length >= MAX_TAGS) {
            showToast('最多只能添加5个标签', 'warning');
            return;
        }

        const validation = validateTagLength(tag);
        if (!validation.valid) {
            showToast('标签过长：最多5汉字或10英文字符', 'warning');
            return;
        }

        if (state.addTag(tag)) {
            this.renderer.renderTags();
            $input.val('');
        } else {
            showToast('标签重复或无效', 'warning');
        }
    }

    // ==================== JSON 预览事件 ====================

    bindJsonPreviewEvents() {
        // 复制 JSON
        $(document).on('click', '#copy-json-btn', () => {
            const content = $('#field-file').val();
            if (!content) {
                showToast('没有内容可复制', 'warning');
                return;
            }

            navigator.clipboard.writeText(content).then(() => {
                showToast('已复制到剪贴板', 'success');
            }).catch(() => {
                showToast('复制失败', 'error');
            });
        });

        // 清空 JSON
        $(document).on('click', '#clear-json-btn', () => {
            this.renderer.clearJsonPreview();
            state.resetAllSelections();

            // 取消所有复选框
            $('#worldInfo-list input[type="checkbox"], #localstorage-list input[type="checkbox"], #indexeddb-list input[type="checkbox"]')
                .prop('checked', false);
        });

        // 手动输入 JSON 时更新计数
        $(document).on('input', '#field-file', debounce(() => {
            this.renderer.checkJsonLength();
        }, 300));
    }

    // ==================== 表单事件 ====================

    bindFormEvents() {
        // 字段计数器
        $(document).on('input', '#field-name', () => {
            this.renderer.updateFieldCounter('field-name', 'name-count');
        });

        $(document).on('input', '#field-author', () => {
            this.renderer.updateFieldCounter('field-author', 'author-count');
        });

        $(document).on('input', '#field-description', () => {
            this.renderer.updateFieldCounter('field-description', 'desc-count');
        });

        // 版本号变化时更新预览
        $(document).on('input', '#field-version', debounce(() => {
            this.updatePreviewFromSelection();
        }, 300));
    }

    // ==================== 上传事件 ====================

    bindUploadEvents() {
        $(document).on('click', '#upload-submit-btn', async () => {
            await this.handleUpload();
        });
    }

    /**
     * 处理上传
     */
    async handleUpload() {
        // 检查登录状态
        if (!this.authModule || !this.authModule.isAuthenticated()) {
            showToast('请先登录 Discord', 'warning');
            return;
        }

        const formData = this.renderer.getUploadFormData();

        // 表单验证
        if (!formData.cardname || formData.cardname === '未选择角色卡') {
            showToast('请先选择角色卡', 'warning');
            return;
        }
        if (!formData.name) {
            showToast('请输入名称', 'warning');
            return;
        }
        if (!formData.author) {
            showToast('请输入作者', 'warning');
            return;
        }
        if (!formData.version) {
            showToast('请输入版本号', 'warning');
            return;
        }
        if (!/^\d+\.\d+$/.test(formData.version)) {
            showToast('版本号格式错误，应为 X.X 或 XX.XX', 'warning');
            return;
        }
        if (!formData.fileContent) {
            showToast('请选择要上传的数据', 'warning');
            return;
        }

        // 验证 JSON
        let parsedJson;
        try {
            parsedJson = JSON.parse(formData.fileContent);
        } catch {
            showToast('JSON 格式错误', 'error');
            return;
        }

        // 验证大小（字节）
        const byteSize = getByteSize(formData.fileContent);
        if (byteSize > MAX_JSON_SIZE) {
            showToast(`文件大小超过限制 (${formatSize(byteSize)} > ${formatSize(MAX_JSON_SIZE)})`, 'error');
            return;
        }

        // 根据 JSON 内容确定类型
        const type = this.determineContentType(parsedJson);
        if (!type) {
            showToast('数据中没有有效内容', 'warning');
            return;
        }

        this.renderer.setUploadButtonLoading(true);

        try {
            await this.workshopApi.uploadToWorkshop({
                ...formData,
                type
            });

            showToast('上传成功！', 'success');
            this.renderer.clearUploadForm();

            // 刷新下载列表
            state.workshopData = null;

        } catch (e) {
            console.error('[EventBinder] 上传失败:', e);
            showToast(e.message || '上传失败', 'error');
        } finally {
            this.renderer.setUploadButtonLoading(false);
        }
    }

    // ==================== 下载事件 ====================

    /**
     * 根据 JSON 内容确定类型
     * @param {Object} jsonData - 解析后的 JSON 数据
     * @returns {string|null} 类型字符串，如 "WorldInfo"、"ChatData"、"WorldInfo,ChatData" 或 null
     */
    determineContentType(jsonData) {
        const types = [];

        // 检查是否包含世界书词条
        const hasWorldInfo = (
            (Array.isArray(jsonData.worldInfoEntries) && jsonData.worldInfoEntries.length > 0) ||
            (Array.isArray(jsonData.lorebookEntries) && jsonData.lorebookEntries.length > 0)
        );
        if (hasWorldInfo) {
            types.push(CONTENT_TYPE.WORLD_INFO);
        }

        // 检查是否包含聊天数据（LocalStorage 或 IndexedDB）
        const hasLocalStorage = jsonData.localStorage && Object.keys(jsonData.localStorage).length > 0;
        const hasIndexedDB = Array.isArray(jsonData.indexedDB) && jsonData.indexedDB.length > 0;
        if (hasLocalStorage || hasIndexedDB) {
            types.push(CONTENT_TYPE.CHAT_DATA);
        }

        return types.length > 0 ? types.join(',') : null;
    }

    bindDownloadEvents() {
        // 搜索
        const searchHandler = debounce(() => {
            this.filterAndRenderWorkshopResults();
        }, 300);

        $(document).on('input', '#workshop-search', searchHandler);
        $(document).on('change', '#filter-field, #filter-type', searchHandler);

        // 刷新
        $(document).on('click', '#refresh-workshop-btn', () => {
            state.workshopData = null;
            this.loadWorkshopData();
        });

        // 重试
        $(document).on('click', '#workshop-retry-btn', () => {
            this.loadWorkshopData();
        });

        // 分页
        $(document).on('click', '.pagination-btn:not(:disabled)', (e) => {
            const page = parseInt($(e.currentTarget).data('page'));
            if (!isNaN(page)) {
                state.workshopCurrentPage = page;
                this.filterAndRenderWorkshopResults();
            }
        });

        // 查看详情
        $(document).on('click', '.view-detail-btn', (e) => {
            const index = parseInt($(e.currentTarget).data('index'));
            if (state.workshopData && state.workshopData[index]) {
                this.renderer.showDetailModal(state.workshopData[index], index);
            }
        });

        // 点击卡片查看详情
        $(document).on('click', '.workshop-item', (e) => {
            // 避免按钮点击触发
            if ($(e.target).closest('button').length) return;

            const index = parseInt($(e.currentTarget).data('index'));
            if (state.workshopData && state.workshopData[index]) {
                this.renderer.showDetailModal(state.workshopData[index], index);
            }
        });

        // 下载按钮
        $(document).on('click', '.download-item-btn, #modal-download-btn', async (e) => {
            e.stopPropagation();
            const index = parseInt($(e.currentTarget).data('index'));
            await this.handleDownload(index);
        });

        // 注入按钮
        $(document).on('click', '.inject-item-btn, #modal-inject-btn', (e) => {
            e.stopPropagation();
            const index = parseInt($(e.currentTarget).data('index'));
            this.renderer.showInjectModal(index);
            this.renderer.closeDetailModal();
        });

        // 删除按钮
        $(document).on('click', '#modal-delete-btn', async (e) => {
            e.stopPropagation();
            const index = parseInt($(e.currentTarget).data('index'));
            await this.handleDelete(index);
        });

        // 注入弹窗事件
        $(document).on('click', '#inject-modal-close-btn, #inject-modal-cancel-btn', () => {
            this.renderer.hideInjectModal();
        });

        $(document).on('click', '#workshop-inject-modal', (e) => {
            if (e.target.id === 'workshop-inject-modal') {
                this.renderer.hideInjectModal();
            }
        });

        $(document).on('click', '#inject-modal-confirm-btn', async () => {
            this.renderer.setInjectButtonLoading(true);
            await this.handleInject();
            this.renderer.setInjectButtonLoading(false);
        });
    }

    /**
     * 处理下载
     * @param {number} index - 条目索引
     */
    async handleDownload(index) {
        const item = state.workshopData?.[index];
        // 支持 download_url（完整URL）或 file_name（文件名）
        const downloadUrl = item?.download_url;
        const fileName = item?.file_name || item?.file;

        if (!item || (!downloadUrl && !fileName)) {
            showToast('无法获取下载链接', 'error');
            return;
        }

        try {
            const blob = downloadUrl
                ? await this.workshopApi.downloadWorkshopItemAsBlobFromUrl(downloadUrl)
                : await this.workshopApi.downloadWorkshopItemAsBlob(fileName);
            this.workshopApi.triggerDownload(blob, fileName || downloadUrl.split('/').pop());
            showToast('下载成功', 'success');
        } catch (e) {
            console.error('[EventBinder] 自动下载失败，尝试直接打开链接:', e);
            if (downloadUrl) {
                // 降级处理：直接打开链接
                window.open(downloadUrl, '_blank');
                showToast('自动下载失败，已尝试在浏览器中打开', 'warning');
            } else {
                showToast('下载失败，且无直接链接可用', 'error');
            }
        }
    }

    /**
     * 处理删除
     * @param {number} index - 条目索引
     */
    async handleDelete(index) {
        const item = state.workshopData?.[index];
        if (!item) return;

        const confirmed = await getModalManager().confirm({
            title: '确认删除',
            message: `确定要删除 "${item.name}" 吗？此操作无法撤销。`,
            confirmText: '删除',
            cancelText: '取消'
        });

        if (!confirmed) return;

        try {
            await this.workshopApi.deleteWorkshopItem(item.id);
            showToast('删除成功', 'success');
            this.renderer.closeDetailModal();
            // 刷新列表
            state.workshopData = null;
            this.loadWorkshopData();
        } catch (e) {
            console.error('[EventBinder] 删除失败:', e);
            showToast(e.message || '删除失败', 'error');
        }
    }

    /**
     * 处理注入
     * 自动检测 JSON 中有哪些字段就注入哪些字段
     */
    async handleInject() {
        const index = state.selectedInjectIndex;
        if (index === null) return;

        const item = state.workshopData?.[index];
        // 支持 download_url（完整URL）或 file_name（文件名）
        const downloadUrl = item?.download_url;
        const fileName = item?.file_name || item?.file;

        if (!item || (!downloadUrl && !fileName)) {
            showToast('无法获取数据', 'error');
            return;
        }

        try {
            const fileData = downloadUrl
                ? await this.workshopApi.downloadWorkshopItemFromUrl(downloadUrl)
                : await this.workshopApi.downloadWorkshopItem(fileName);

            // 自动检测并注入所有可用数据
            await this.injectAllData(fileData);

            this.renderer.hideInjectModal();
        } catch (e) {
            console.error('[EventBinder] 注入失败:', e);
            showToast(e.message || '注入失败', 'error');
        }
    }

    /**
     * 自动检测并注入所有可用数据
     * @param {Object} fileData - 文件数据
     */
    async injectAllData(fileData) {
        const results = {
            worldInfo: { success: 0, failed: 0 },
            localStorage: { success: 0, failed: 0 },
            indexedDB: { success: 0, failed: 0 }
        };

        // 检测并注入世界书词条
        const worldInfoEntries = fileData.worldInfoEntries || fileData.lorebookEntries || [];
        if (worldInfoEntries.length > 0) {
            try {
                const boundWorldInfos = this.worldInfoService.getCharacterBoundWorldInfoNames();
                if (boundWorldInfos && boundWorldInfos.primary) {
                    const targetWorldInfoName = boundWorldInfos.primary;
                    const normalizedEntries = worldInfoEntries.map(e => this.worldInfoService.normalizeFromExportFormat(e));
                    await this.worldInfoService.createWorldInfoEntries(targetWorldInfoName, normalizedEntries);
                    results.worldInfo.success = normalizedEntries.length;
                    // 刷新世界书列表
                    await this.loadWorldInfoEntries();
                } else {
                    console.warn('[EventBinder] 当前角色卡未绑定世界书，跳过世界书注入');
                    results.worldInfo.failed = worldInfoEntries.length;
                }
            } catch (e) {
                console.error('[EventBinder] 世界书注入失败:', e);
                results.worldInfo.failed = worldInfoEntries.length;
            }
        }

        // 检测并注入 LocalStorage
        if (fileData.localStorage && Object.keys(fileData.localStorage).length > 0) {
            try {
                const result = this.databaseService.setMultipleLocalStorageValues(fileData.localStorage);
                results.localStorage.success = result.success;
                results.localStorage.failed = result.failed;
            } catch (e) {
                console.error('[EventBinder] LocalStorage 注入失败:', e);
                results.localStorage.failed = Object.keys(fileData.localStorage).length;
            }
        }

        // 检测并注入 IndexedDB
        if (fileData.indexedDB && Array.isArray(fileData.indexedDB) && fileData.indexedDB.length > 0) {
            try {
                const result = await this.databaseService.writeMultipleStores(fileData.indexedDB);
                results.indexedDB.success = result.success;
                results.indexedDB.failed = result.failed;
            } catch (e) {
                console.error('[EventBinder] IndexedDB 注入失败:', e);
                results.indexedDB.failed = fileData.indexedDB.length;
            }
        }

        // 汇总结果
        const totalSuccess = results.worldInfo.success + results.localStorage.success + results.indexedDB.success;
        const totalFailed = results.worldInfo.failed + results.localStorage.failed + results.indexedDB.failed;

        if (totalSuccess === 0 && totalFailed === 0) {
            showToast('数据中没有可注入的内容', 'warning');
            return;
        }

        // 构建详细消息
        const parts = [];
        if (results.worldInfo.success > 0) parts.push(`世界书 ${results.worldInfo.success} 条`);
        if (results.localStorage.success > 0) parts.push(`LocalStorage ${results.localStorage.success} 项`);
        if (results.indexedDB.success > 0) parts.push(`IndexedDB ${results.indexedDB.success} 项`);

        if (totalFailed > 0) {
            showToast(`注入完成: ${parts.join(', ')}。失败 ${totalFailed} 项`, 'warning');
        } else {
            showToast(`注入成功: ${parts.join(', ')}`, 'success');
        }
    }

    /**
     * 注入到世界书
     * @param {Object} fileData - 文件数据
     */
    async injectToWorldInfo(fileData) {
        // 获取世界书条目
        const entries = fileData.worldInfoEntries || fileData.lorebookEntries || [];
        if (entries.length === 0) {
            throw new Error('数据中没有世界书词条');
        }

        // 获取当前角色卡绑定的世界书
        const boundWorldInfos = this.worldInfoService.getCharacterBoundWorldInfoNames();
        if (!boundWorldInfos || !boundWorldInfos.primary) {
            throw new Error('当前角色卡未绑定世界书，无法注入');
        }

        const targetWorldInfoName = boundWorldInfos.primary;

        // 使用世界书服务转换并注入
        const normalizedEntries = entries.map(e => this.worldInfoService.normalizeFromExportFormat(e));
        await this.worldInfoService.createWorldInfoEntries(targetWorldInfoName, normalizedEntries);

        // 刷新世界书列表
        await this.loadWorldInfoEntries();
    }

    /**
     * 注入到聊天数据
     * @param {Object} fileData - 文件数据
     */
    async injectToChatData(fileData) {
        let success = 0;
        let failed = 0;

        // 处理 LocalStorage
        if (fileData.localStorage && Object.keys(fileData.localStorage).length > 0) {
            const result = this.databaseService.setMultipleLocalStorageValues(fileData.localStorage);
            success += result.success;
            failed += result.failed;
        }

        // 处理 IndexedDB
        if (fileData.indexedDB && Array.isArray(fileData.indexedDB) && fileData.indexedDB.length > 0) {
            const result = await this.databaseService.writeMultipleStores(fileData.indexedDB);
            success += result.success;
            failed += result.failed;
        }

        if (success === 0 && failed === 0) {
            throw new Error('数据中没有可注入的聊天数据');
        }

        if (failed > 0) {
            showToast(`注入完成，成功 ${success} 项，失败 ${failed} 项`, 'warning');
        }
    }

    // ==================== 弹窗事件 ====================

    bindModalEvents() {
        // 关闭弹窗
        $(document).on('click', '#modal-close-btn', () => {
            this.renderer.closeDetailModal();
        });

        // 点击背景关闭弹窗
        $(document).on('click', '#workshop-detail-modal', (e) => {
            if (e.target.id === 'workshop-detail-modal') {
                this.renderer.closeDetailModal();
            }
        });
    }

    // ==================== 鉴权事件 ====================

    bindAuthEvents() {
        if (this.authModule) {
            this.authModule.bindEvents();
        }
    }

    // ==================== 数据加载 ====================

    /**
     * 面板打开时的初始化
     */
    async onPanelOpen() {
        // 更新角色卡名称
        const context = this.getContext();
        const charName = context.name2 || '未选择角色卡';
        this.renderer.updateCardName(charName);

        // 更新鉴权状态
        this.renderer.updateAuthButton();
        this.renderer.updateUploadButtonState();

        // 加载数据
        await this.loadWorldInfoEntries();
        await this.loadLocalStorageData();
        await this.loadIndexedDBStores();
    }

    /**
     * 加载世界书词条
     */
    async loadWorldInfoEntries() {
        if (!this.worldInfoService.isTavernHelperAvailable()) {
            this.renderer.showTavernHelperNotInstalled();
            return;
        }

        this.renderer.showWorldInfoLoading();

        try {
            const entries = await this.worldInfoService.getCharacterBoundWorldInfoEntries();
            this.cachedWorldInfoEntries = entries;

            if (entries.length === 0) {
                this.renderer.showWorldInfoNotBound();
            } else {
                // 获取显示名称
                const boundWorldInfos = this.worldInfoService.getCharacterBoundWorldInfoNames();
                const displayName = boundWorldInfos?.primary || '未知';
                state.setCurrentWorldInfoName(displayName);
                this.renderer.renderWorldInfoList(entries, displayName);
            }
        } catch (e) {
            console.error('[EventBinder] 加载世界书词条失败:', e);
            this.renderer.showWorldInfoError('加载失败');
        }
    }

    /**
     * 加载 LocalStorage 数据
     */
    async loadLocalStorageData() {
        this.renderer.showLocalStorageLoading();

        try {
            const items = this.databaseService.getLocalStorageKeysWithMeta();
            this.renderer.renderLocalStorageList(items);
        } catch (e) {
            console.error('[EventBinder] 加载 LocalStorage 失败:', e);
            this.renderer.showLocalStorageError('加载失败');
        }
    }

    /**
     * 加载 IndexedDB 数据表
     */
    async loadIndexedDBStores() {
        if (!this.databaseService.isIndexedDBDatabasesSupported()) {
            this.renderer.showIndexedDBNotSupported();
            return;
        }

        try {
            const stores = await this.databaseService.getAllStores();
            state.allIDBStores = stores;
            this.renderer.renderIndexedDBStoreSelector(stores);
        } catch (e) {
            console.error('[EventBinder] 加载 IndexedDB 数据表失败:', e);
        }
    }

    /**
     * 加载创意工坊数据
     */
    async loadWorkshopData() {
        this.renderer.showWorkshopLoading();

        try {
            const data = await this.workshopApi.getWorkshopIndex();
            state.workshopData = data;
            state.workshopCurrentPage = 1;
            this.filterAndRenderWorkshopResults();
        } catch (e) {
            console.error('[EventBinder] 加载创意工坊数据失败:', e);
            this.renderer.showWorkshopError(e.message || '加载失败');
        }
    }

    /**
     * 过滤并渲染创意工坊结果
     */
    filterAndRenderWorkshopResults() {
        if (!state.workshopData) return;

        const keyword = $('#workshop-search').val().toLowerCase().trim();
        const filterField = $('#filter-field').val();
        const filterType = $('#filter-type').val();

        // 为每个项目添加原始索引
        let filteredData = state.workshopData.map((item, idx) => ({
            ...item,
            _originalIndex: idx
        }));

        // 类型过滤
        if (filterType && filterType !== 'all') {
            filteredData = filteredData.filter(item => {
                const types = (item.type || '').split(',').map(t => t.trim());
                return types.includes(filterType);
            });
        }

        // 关键词过滤
        if (keyword) {
            filteredData = filteredData.filter(item => {
                if (filterField === 'all') {
                    return ['name', 'cardname', 'author', 'type', 'tags', 'description'].some(field => {
                        const value = String(item[field] || '').toLowerCase();
                        return value.includes(keyword);
                    });
                } else {
                    const value = String(item[filterField] || '').toLowerCase();
                    return value.includes(keyword);
                }
            });
        }

        this.renderer.renderWorkshopResults(filteredData);
    }

    /**
     * 从选择更新预览
     */
    updatePreviewFromSelection() {
        const exportData = this.buildExportData();
        this.renderer.updateJsonPreview(exportData);
    }

    /**
     * 构建导出数据
     * 【重要】合并所有选中的数据，不受当前选项卡影响
     * @returns {Object}
     */
    buildExportData() {
        const exportData = {
            _meta: {
                version: $('#field-version').val().trim() || '1.0',
                exportTime: getBeijingTimeISO(),
                source: 'SillyTavernWorkshop'
            }
        };

        // 始终导出世界书词条（如果有选中）
        if (state.selectedWorldInfoEntries.size > 0) {
            const selectedEntries = [];

            state.selectedWorldInfoEntries.forEach(index => {
                if (this.cachedWorldInfoEntries[index]) {
                    const entry = this.cachedWorldInfoEntries[index];
                    selectedEntries.push(this.worldInfoService.convertToExportFormat(entry));
                }
            });

            if (selectedEntries.length > 0) {
                exportData.worldInfoEntries = selectedEntries;
            }
        }

        // 始终导出 LocalStorage 数据（如果有选中）
        if (state.selectedLocalStorageKeys.size > 0) {
            const lsData = {};
            state.selectedLocalStorageKeys.forEach(key => {
                lsData[key] = this.databaseService.getLocalStorageValue(key);
            });
            if (Object.keys(lsData).length > 0) {
                exportData.localStorage = lsData;
            }
        }

        // 始终导出 IndexedDB 数据（如果有选中）
        if (state.selectedIndexedDBItems.size > 0 && Object.keys(state.idbDataCache).length > 0) {
            // 按 database + store + key 分组，合并同一个键下的选中子项
            const groupedData = {};

            Object.values(state.idbDataCache).forEach(item => {
                const groupKey = `${item.database}|||${item.store}|||${item.key}`;

                if (!groupedData[groupKey]) {
                    groupedData[groupKey] = {
                        database: item.database,
                        store: item.store,
                        key: item.key,
                        isSingleValue: false,
                        singleValue: null,
                        values: []
                    };
                }

                // 如果是非数组值（subIndex === -1），直接存储整个值
                if (item.subIndex === -1) {
                    groupedData[groupKey].isSingleValue = true;
                    groupedData[groupKey].singleValue = item.data;
                } else {
                    // 数组元素，添加到值数组中
                    groupedData[groupKey].values.push(item.data);
                }
            });

            // 转换为最终格式
            const idbData = [];
            Object.values(groupedData).forEach(group => {
                let value;
                if (group.isSingleValue) {
                    // 非数组值，直接使用
                    value = group.singleValue;
                } else {
                    // 数组元素，使用收集的值数组
                    value = group.values;
                }

                idbData.push({
                    database: group.database,
                    store: group.store,
                    data: [{ key: group.key, value: value }]
                });
            });

            if (idbData.length > 0) {
                exportData.indexedDB = idbData;
            }
        }

        return exportData;
    }
}

/**
 * 获取 EventBinder 实例
 * @param {Object} services - 服务依赖
 * @returns {EventBinder}
 */
export function createEventBinder(services) {
    return new EventBinder(services);
}
