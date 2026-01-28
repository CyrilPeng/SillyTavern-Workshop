// SillyTavern Workshop Plugin - 酒馆创意工坊
// 主入口文件

import { extension_settings, getContext, loadExtensionSettings } from '../../../extensions.js';
import { saveSettingsDebounced, eventSource, event_types } from '../../../../script.js';
import { getWorldInfoSettings } from '../../../world-info.js';

// 插件名称常量
const EXTENSION_NAME = 'SillyTavernWorkshop';
const API_BASE_URL = 'https://st-api.pengcyril.dpdns.org';
const WORKSHOP_BASE_URL = 'https://st-workshop.pengcyril.dpdns.org';

// 默认设置
const defaultSettings = {
    lastUploadTime: null,
    uploadHistory: [],
    downloadHistory: []
};

// 当前状态
let currentState = {
    selectedWorldBookEntries: new Set(),
    selectedLocalStorageKeys: new Set(),
    selectedIndexedDBItems: new Set(),
    currentIDBSelection: null, // 当前选中的 IndexedDB 数据
    currentWorldbookName: null, // 当前使用的世界书名称
    workshopData: null,
    workshopCurrentPage: 1, // 当前分页
    currentTab: 'upload'
};

// ==================== 初始化 ====================

jQuery(async () => {
    console.log(`[${EXTENSION_NAME}] 正在加载插件...`);
    
    // 加载设置
    loadSettings();
    
    // 创建 UI
    await createUI();
    
    // 绑定事件
    bindEvents();
    
    // 初始化数据
    await initializeData();
    
    console.log(`[${EXTENSION_NAME}] 插件加载完成`);
});

// 加载插件设置
function loadSettings() {
    extension_settings[EXTENSION_NAME] = extension_settings[EXTENSION_NAME] || {};
    Object.assign(extension_settings[EXTENSION_NAME], defaultSettings, extension_settings[EXTENSION_NAME]);
}

// ==================== UI 创建 ====================

async function createUI() {
    // 创建顶部菜单按钮
    const menuButton = `
        <div id="workshop-menu-button" class="list-group-item flex-container flexGap5" title="酒馆创意工坊">
            <i class="fa-solid fa-store extensionsMenuExtensionButton"></i>
            <span>创意工坊</span>
        </div>
    `;
    
    $('#extensionsMenu').append(menuButton);
    
    // 创建主面板
    const mainPanel = `
        <div id="workshop-panel" class="workshop-panel" style="display: none;">
            <div class="workshop-container">
                <!-- 头部 -->
                <div class="workshop-header">
                    <div class="workshop-title">
                        <i class="fa-solid fa-store"></i>
                        <h2>酒馆创意工坊</h2>
                    </div>
                    <button id="workshop-close-btn" class="workshop-close-btn">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
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
    
    $('body').append(mainPanel);

    // 创建详情弹窗
    const detailModal = `
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
    $('body').append(detailModal);
}

function createUploadPage() {
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
                
                <div class="form-row">
                    <div class="form-group half">
                        <label for="field-version">
                            <i class="fa-solid fa-code-branch"></i> 版本
                            <span class="required">*</span>
                        </label>
                        <input type="text" id="field-version" placeholder="如: 1.0" pattern="\\d+\\.\\d+" />
                        <span class="field-hint">格式: X.X</span>
                    </div>
                    
                    <div class="form-group half">
                        <label for="field-type">
                            <i class="fa-solid fa-tags"></i> 类型
                            <span class="required">*</span>
                        </label>
                        <select id="field-type">
                            <option value="Lorebook">世界书</option>
                            <option value="ChatData">聊天数据</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="field-tags">
                        <i class="fa-solid fa-hashtag"></i> 标签
                    </label>
                    <input type="text" id="field-tags" placeholder="用逗号分隔，最多5个标签" />
                    <span class="field-hint">每个标签最多5个字符</span>
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
                    <button class="data-tab active" data-source="worldbook">
                        <i class="fa-solid fa-book"></i> 世界书
                    </button>
                    <button class="data-tab" data-source="chatdata">
                        <i class="fa-solid fa-comments"></i> 聊天数据
                    </button>
                </div>

                <!-- 数据区域容器：左右布局 -->
                <div class="data-content-wrapper">
                    <!-- 左侧：数据选择 -->
                    <div class="data-select-panel">
                        <!-- 世界书选择区 -->
                        <div id="worldbook-section" class="data-source-section active">
                            <div class="section-header">
                                <h4>选择世界书词条</h4>
                                <div class="section-actions">
                                    <button id="wb-select-all" class="small-btn">全选</button>
                                    <button id="wb-deselect-all" class="small-btn">取消</button>
                                    <button id="wb-refresh" class="small-btn">
                                        <i class="fa-solid fa-refresh"></i>
                                    </button>
                                </div>
                            </div>
                            <div id="worldbook-list" class="checkbox-list">
                                <div class="loading-spinner">
                                    <i class="fa-solid fa-spinner fa-spin"></i> 加载中...
                                </div>
                            </div>
                        </div>

                        <!-- 聊天数据选择区 -->
                        <div id="chatdata-section" class="data-source-section">
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
                                <div id="indexeddb-list" class="checkbox-list">
                                    <div class="loading-spinner">
                                        <i class="fa-solid fa-spinner fa-spin"></i> 加载中...
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 右侧：文件预览区 -->
                    <div class="file-preview-panel">
                        <div class="section-header">
                            <h4><i class="fa-solid fa-file-code"></i> 文件预览 (JSON)</h4>
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

function createDownloadPage() {
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
                        <option value="type">类型</option>
                        <option value="tags">标签</option>
                    </select>
                    
                    <select id="filter-type">
                        <option value="all">所有类型</option>
                        <option value="Lorebook">世界书</option>
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
            
            <!-- 注入选项 -->
            <div id="inject-options" class="inject-options" style="display: none;">
                <div class="inject-header">
                    <h4>选择注入目标</h4>
                    <button id="inject-close-btn" class="inject-close-btn">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="inject-targets">
                    <label class="inject-option">
                        <input type="radio" name="inject-target" value="worldbook" checked />
                        <i class="fa-solid fa-book"></i> 注入到世界书
                    </label>
                    <label class="inject-option">
                        <input type="radio" name="inject-target" value="chatdata" />
                        <i class="fa-solid fa-comments"></i> 注入到聊天数据
                    </label>
                </div>
                <button id="inject-confirm-btn" class="workshop-btn primary">
                    <i class="fa-solid fa-file-import"></i> 确认注入
                </button>
            </div>
        </div>
    `;
}

// ==================== 事件绑定 ====================

function bindEvents() {
    // 菜单按钮点击
    $('#workshop-menu-button').on('click', togglePanel);
    
    // 关闭按钮
    $('#workshop-close-btn').on('click', () => $('#workshop-panel').hide());
    
    // 点击遮罩关闭
    $('#workshop-panel').on('click', function(e) {
        if (e.target === this) $(this).hide();
    });
    
    // 标签页切换
    $('.workshop-tab').on('click', function() {
        const tab = $(this).data('tab');
        switchTab(tab);
    });
    
    // 数据源标签页切换
    $('.data-tab').on('click', function() {
        const source = $(this).data('source');
        switchDataSource(source);
    });

    // 聊天数据子标签页切换 (LocalStorage / IndexedDB)
    $(document).on('click', '.chatdata-tab', function() {
        const target = $(this).data('target');
        $('.chatdata-tab').removeClass('active');
        $(this).addClass('active');
        $('.chatdata-panel').removeClass('active');
        $(`#${target}-panel`).addClass('active');
    });
    
    // 字段计数器
    $('#field-name').on('input', function() {
        $('#name-count').text($(this).val().length);
    });
    
    $('#field-author').on('input', function() {
        $('#author-count').text($(this).val().length);
    });
    
    $('#field-description').on('input', function() {
        $('#desc-count').text($(this).val().length);
    });
    
    // 世界书操作按钮
    $('#wb-select-all').on('click', () => selectAllWorldBook(true));
    $('#wb-deselect-all').on('click', () => selectAllWorldBook(false));
    $('#wb-refresh').on('click', loadWorldBookEntries);

    // LocalStorage 操作按钮
    $('#ls-select-all').on('click', () => selectAllLocalStorage(true));
    $('#ls-deselect-all').on('click', () => selectAllLocalStorage(false));
    $('#ls-refresh').on('click', loadLocalStorageData);

    // IndexedDB 操作按钮
    $('#idb-select-all').on('click', () => selectAllIndexedDB(true));
    $('#idb-deselect-all').on('click', () => selectAllIndexedDB(false));
    $('#idb-refresh').on('click', loadIndexedDBData);
    
    // JSON 操作按钮
    $('#copy-json-btn').on('click', copyJsonToClipboard);
    $('#clear-json-btn').on('click', () => $('#field-file').val(''));
    
    // 上传按钮
    $('#upload-submit-btn').on('click', handleUpload);
    
    // 下载页面
    $('#workshop-search').on('input', debounce(filterWorkshopResults, 300));
    $('#filter-field, #filter-type').on('change', filterWorkshopResults);
    $('#refresh-workshop-btn').on('click', loadWorkshopData);
    $('#inject-confirm-btn').on('click', handleInject);
    $('#inject-close-btn').on('click', () => {
        $('#inject-options').hide();
        selectedInjectIndex = null;
    });

    // 详情弹窗关闭
    $('#modal-close-btn').on('click', closeDetailModal);
    $('#workshop-detail-modal').on('click', function(e) {
        if (e.target === this) closeDetailModal();
    });
}

// ==================== 数据加载 ====================

async function initializeData() {
    // 加载当前角色卡名称
    updateCurrentCharacterCard();

    // 监听角色卡切换 - 使用正确的事件类型
    // SillyTavern 中的事件类型: CHAT_CHANGED 会在切换角色/群组时触发
    const chatChangedEvent = event_types.CHAT_CHANGED;
    if (chatChangedEvent) {
        eventSource.on(chatChangedEvent, updateCurrentCharacterCard);
    } else {
        console.warn('[SillyTavernWorkshop] 事件类型 CHAT_CHANGED 不存在，跳过事件监听');
    }
}

function updateCurrentCharacterCard() {
    const context = getContext();
    const charName = context.name2 || '未选择角色卡';
    $('#field-cardname').val(charName);
}

// 加载世界书词条
async function loadWorldBookEntries() {
    const $list = $('#worldbook-list');
    $list.html('<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> 加载中...</div>');

    try {
        // 先检查 TavernHelper 是否可用
        if (typeof TavernHelper === 'undefined') {
            $list.html('<div class="empty-message"><i class="fa-solid fa-exclamation-circle"></i> TavernHelper 插件未安装</div>');
            return;
        }

        // 检查是否有绑定的世界书 - 使用 getCharWorldbookNames
        const charWorldbooks = TavernHelper.getCharWorldbookNames('current');
        if (!charWorldbooks || (!charWorldbooks.primary && (!charWorldbooks.additional || charWorldbooks.additional.length === 0))) {
            $list.html('<div class="empty-message"><i class="fa-solid fa-inbox"></i> 当前角色卡未绑定世界书</div>');
            return;
        }

        // 获取世界书词条
        const worldInfoData = await fetchWorldInfo();

        // 获取世界书名称用于显示
        const worldbookNames = [];
        if (charWorldbooks.primary) worldbookNames.push(charWorldbooks.primary);
        if (charWorldbooks.additional) worldbookNames.push(...charWorldbooks.additional);
        const displayName = worldbookNames.join(', ');

        if (!worldInfoData || worldInfoData.length === 0) {
            $list.html(`<div class="empty-message"><i class="fa-solid fa-inbox"></i> 世界书 "${escapeHtml(displayName)}" 暂无词条</div>`);
            return;
        }

        let html = `<div class="list-header"><small>世界书: ${escapeHtml(displayName)} (${worldInfoData.length} 个词条)</small></div>`;
        worldInfoData.forEach((entry, index) => {
            const entryId = `wb-entry-${index}`;
            const checked = currentState.selectedWorldBookEntries.has(index) ? 'checked' : '';

            // 获取词条名称（TavernHelper 格式用 name，原生格式用 comment）
            const entryName = entry.name || entry.comment || `词条 ${index + 1}`;

            // 获取关键词（TavernHelper 格式用 strategy.keys，原生格式用 key/keys）
            let keyArray = [];
            if (entry.strategy && entry.strategy.keys) {
                keyArray = entry.strategy.keys;
            } else if (entry.key) {
                keyArray = Array.isArray(entry.key) ? entry.key : [entry.key];
            } else if (entry.keys) {
                keyArray = Array.isArray(entry.keys) ? entry.keys : [entry.keys];
            }
            const keywords = keyArray.map(k => String(k)).join(', ');

            html += `
                <label class="checkbox-item" data-index="${index}">
                    <input type="checkbox" id="${entryId}" ${checked} />
                    <span class="checkbox-label">
                        <strong>${escapeHtml(entryName)}</strong>
                        ${keywords ? `<span class="entry-key">关键词: ${escapeHtml(keywords.substring(0, 50))}</span>` : ''}
                    </span>
                </label>
            `;
        });

        $list.html(html);

        // 绑定选择事件
        $list.find('input[type="checkbox"]').on('change', function() {
            const index = $(this).closest('.checkbox-item').data('index');
            if (this.checked) {
                currentState.selectedWorldBookEntries.add(index);
            } else {
                currentState.selectedWorldBookEntries.delete(index);
            }
            updateFilePreview();
        });

    } catch (error) {
        console.error('[酒馆创意工坊] 加载世界书失败:', error);
        $list.html('<div class="error-message"><i class="fa-solid fa-exclamation-triangle"></i> 加载失败: ' + escapeHtml(error.message) + '</div>');
    }
}

// 获取世界书信息 - 仅获取当前聊天绑定的世界书
async function fetchWorldInfo() {
    const allEntries = [];

    console.log('[酒馆创意工坊] 开始获取世界书数据...');

    // 检查 TavernHelper 是否可用
    if (typeof TavernHelper === 'undefined') {
        console.warn('[酒馆创意工坊] TavernHelper 未定义');
        return allEntries;
    }

    // 使用 TavernHelper.getCharWorldbookNames 获取角色卡绑定的世界书
    const charWorldbooks = TavernHelper.getCharWorldbookNames('current');
    console.log('[酒馆创意工坊] 角色卡绑定的世界书:', charWorldbooks);

    if (!charWorldbooks) {
        console.log('[酒馆创意工坊] 当前角色卡未绑定世界书');
        return allEntries;
    }

    // charWorldbooks 结构: { primary: string | null, additional: string[] }
    const worldbookNames = [];
    if (charWorldbooks.primary) {
        worldbookNames.push(charWorldbooks.primary);
    }
    if (charWorldbooks.additional && Array.isArray(charWorldbooks.additional)) {
        worldbookNames.push(...charWorldbooks.additional);
    }

    if (worldbookNames.length === 0) {
        console.log('[酒馆创意工坊] 当前角色卡未绑定任何世界书');
        return allEntries;
    }

    // 保存第一个世界书名称到状态（用于上传和注入）
    currentState.currentWorldbookName = worldbookNames[0];

    // 遍历所有绑定的世界书
    for (const worldbookName of worldbookNames) {
        console.log(`[酒馆创意工坊] 正在加载世界书: ${worldbookName}`);

        try {
            const result = TavernHelper.getWorldbook(worldbookName);
            let entries;
            // 检查是否是 Promise
            if (result && typeof result.then === 'function') {
                entries = await result;
            } else {
                entries = result;
            }
            console.log(`[酒馆创意工坊] TavernHelper.getWorldbook(${worldbookName}) 返回:`, entries);
            console.log('[酒馆创意工坊] 返回类型:', typeof entries, Array.isArray(entries) ? `数组长度: ${entries.length}` : '');

            if (entries && Array.isArray(entries)) {
                entries.forEach((entry, index) => {
                    const exportEntry = {
                        ...entry,
                        _source: worldbookName,
                        _uid: `${worldbookName}_${entry.uid !== undefined ? entry.uid : index}`
                    };
                    allEntries.push(exportEntry);
                });
            }
        } catch (e) {
            console.error(`[酒馆创意工坊] TavernHelper.getWorldbook(${worldbookName}) 调用失败:`, e);
        }
    }

    console.log(`[酒馆创意工坊] 共获取 ${allEntries.length} 个世界书词条`);
    return allEntries;
}

// 根据名称加载世界书 - 使用 TavernHelper API
async function loadWorldBookByName(worldName, sourceName, allEntries, addedUIDs) {
    try {
        let entries = [];

        // 优先使用 TavernHelper.getWorldbook
        if (typeof TavernHelper !== 'undefined' && TavernHelper.getWorldbook) {
            try {
                entries = await TavernHelper.getWorldbook(worldName);
                console.log(`[酒馆创意工坊] TavernHelper 加载世界书 ${worldName}:`, entries);
            } catch (e) {
                console.warn(`[酒馆创意工坊] TavernHelper.getWorldbook 失败:`, e);
            }
        }

        // 如果 TavernHelper 失败，回退到 API
        if (!entries || entries.length === 0) {
            const context = getContext();
            try {
                const response = await fetch('/api/worldinfo/get', {
                    method: 'POST',
                    headers: context.getRequestHeaders(),
                    body: JSON.stringify({ name: worldName })
                });
                if (response.ok) {
                    const worldData = await response.json();
                    if (worldData && worldData.entries) {
                        entries = Object.values(worldData.entries);
                    }
                }
            } catch (e) {
                console.warn(`[酒馆创意工坊] API 获取世界书失败:`, e);
            }
        }

        // 处理条目
        if (entries && entries.length > 0) {
            entries.forEach(entry => {
                const entryId = entry.uid !== undefined ? `${worldName}_${entry.uid}` : `${worldName}_${Math.random()}`;
                if (!addedUIDs.has(entryId)) {
                    // 转换 TavernHelper 格式为通用导出格式
                    const exportEntry = convertToExportFormat(entry, worldName);
                    exportEntry._source = sourceName;
                    exportEntry._uid = entryId;
                    allEntries.push(exportEntry);
                    addedUIDs.add(entryId);
                }
            });
        }
    } catch (e) {
        console.warn(`[酒馆创意工坊] 加载世界书 ${worldName} 失败:`, e);
    }
}

// 将世界书条目转换为导出格式（兼容 TavernHelper 和原生格式）
function convertToExportFormat(entry, worldName) {
    // 检测是否为 TavernHelper 嵌套格式（有 strategy 字段）
    const isTavernHelperFormat = entry.strategy !== undefined;

    if (isTavernHelperFormat) {
        // TavernHelper 格式：展平嵌套结构
        return {
            uid: entry.uid,
            comment: entry.name || '',
            content: entry.content || '',
            enabled: entry.enabled !== undefined ? entry.enabled : true,

            // 从 strategy 提取
            constant: entry.strategy?.type === 'constant',
            selective: entry.strategy?.type === 'selective',
            vectorized: entry.strategy?.type === 'vectorized',
            key: entry.strategy?.keys || [],
            keysecondary: entry.strategy?.keys_secondary?.keys || [],
            selectiveLogic: getSelectiveLogicValue(entry.strategy?.keys_secondary?.logic),
            scanDepth: entry.strategy?.scan_depth === 'same_as_global' ? null : entry.strategy?.scan_depth,

            // 从 position 提取
            position: getPositionValue(entry.position?.type),
            order: entry.position?.order || 100,
            depth: entry.position?.depth || 4,
            role: getRoleValue(entry.position?.role),

            // 其他字段
            probability: entry.probability || 100,
            excludeRecursion: entry.recursion?.prevent_incoming || false,
            preventRecursion: entry.recursion?.prevent_outgoing || false,
            delayUntilRecursion: entry.recursion?.delay_until !== null,
            sticky: entry.effect?.sticky || 0,
            cooldown: entry.effect?.cooldown || 0,
            delay: entry.effect?.delay || 0,

            extra: entry.extra
        };
    } else {
        // SillyTavern 原生格式：直接使用，只做少量标准化
        return {
            uid: entry.uid,
            comment: entry.comment || entry.name || '',
            content: entry.content || '',
            key: entry.key || entry.keys || [],
            keysecondary: entry.keysecondary || entry.secondary_keys || [],
            selective: entry.selective !== undefined ? entry.selective : true,
            selectiveLogic: entry.selectiveLogic || 0,
            constant: entry.constant || false,
            vectorized: entry.vectorized || false,
            order: entry.order || entry.insertion_order || 100,
            position: entry.position || 0,
            depth: entry.depth || 4,
            role: entry.role || 0,
            disable: entry.disable || false,
            excludeRecursion: entry.excludeRecursion || false,
            preventRecursion: entry.preventRecursion || false,
            delayUntilRecursion: entry.delayUntilRecursion || false,
            probability: entry.probability || 100,
            scanDepth: entry.scanDepth,
            caseSensitive: entry.caseSensitive,
            matchWholeWords: entry.matchWholeWords,
            group: entry.group || '',
            groupWeight: entry.groupWeight || 100,
            sticky: entry.sticky || 0,
            cooldown: entry.cooldown || 0,
            delay: entry.delay || 0,
            // 保留其他可能的字段
            addMemo: entry.addMemo,
            useProbability: entry.useProbability,
            displayIndex: entry.displayIndex
        };
    }
}

// 选择逻辑值转换
function getSelectiveLogicValue(logic) {
    const logicMap = {
        'and_any': 0,
        'and_all': 1,
        'not_all': 2,
        'not_any': 3
    };
    return logicMap[logic] || 0;
}

// 位置值转换
function getPositionValue(type) {
    const positionMap = {
        'before_character_definition': 0,
        'after_character_definition': 1,
        'before_example_messages': 2,
        'after_example_messages': 3,
        'before_author_note': 4,
        'after_author_note': 5,
        'at_depth': 6
    };
    return positionMap[type] || 0;
}

// 角色值转换
function getRoleValue(role) {
    const roleMap = {
        'system': 0,
        'user': 1,
        'assistant': 2
    };
    return roleMap[role] || 0;
}

// 将导出格式转换为 TavernHelper WorldbookEntry 格式
function convertToTavernHelperFormat(entry) {
    // 如果已经是 TavernHelper 格式（有 strategy 字段），直接返回清理后的数据
    if (entry.strategy !== undefined) {
        // 已经是 TavernHelper 格式，保留所有字段
        const tavernEntry = {
            name: entry.name || '',
            content: entry.content || '',
            enabled: entry.enabled !== false,

            strategy: {
                type: entry.strategy.type || 'selective',
                keys: entry.strategy.keys || [],
                keys_secondary: entry.strategy.keys_secondary || { logic: 'and_any', keys: [] },
                scan_depth: entry.strategy.scan_depth !== undefined ? entry.strategy.scan_depth : 'same_as_global'
            },

            position: {
                type: entry.position?.type || 'before_character_definition',
                role: entry.position?.role || 'system',
                depth: entry.position?.depth || 4,
                order: entry.position?.order || 100
            },

            probability: entry.probability !== undefined ? entry.probability : 100,

            recursion: {
                prevent_incoming: entry.recursion?.prevent_incoming || false,
                prevent_outgoing: entry.recursion?.prevent_outgoing || false,
                delay_until: entry.recursion?.delay_until !== undefined ? entry.recursion.delay_until : null
            },

            effect: {
                sticky: entry.effect?.sticky !== undefined ? entry.effect.sticky : null,
                cooldown: entry.effect?.cooldown !== undefined ? entry.effect.cooldown : null,
                delay: entry.effect?.delay !== undefined ? entry.effect.delay : null
            }
        };

        // 保留额外字段
        if (entry.extra) {
            tavernEntry.extra = entry.extra;
        }

        return tavernEntry;
    }

    // 以下是从 SillyTavern 原生格式转换的逻辑
    // 确定激活策略类型
    let strategyType = 'selective';
    if (entry.constant === true) {
        strategyType = 'constant';
    } else if (entry.vectorized === true) {
        strategyType = 'vectorized';
    }

    // 处理关键词 - 支持多种格式
    let keys = [];
    if (Array.isArray(entry.key)) {
        keys = entry.key;
    } else if (typeof entry.key === 'string' && entry.key) {
        keys = entry.key.split(',').map(k => k.trim()).filter(k => k);
    } else if (Array.isArray(entry.keys)) {
        keys = entry.keys;
    }

    // 处理次要关键词
    let keysSecondary = [];
    if (Array.isArray(entry.keysecondary)) {
        keysSecondary = entry.keysecondary;
    } else if (typeof entry.keysecondary === 'string' && entry.keysecondary) {
        keysSecondary = entry.keysecondary.split(',').map(k => k.trim()).filter(k => k);
    }

    // 次要关键词逻辑转换
    const selectiveLogicMap = {
        0: 'and_any',
        1: 'and_all',
        2: 'not_all',
        3: 'not_any'
    };
    const secondaryLogic = selectiveLogicMap[entry.selectiveLogic] || 'and_any';

    // 位置类型转换
    const positionTypeMap = {
        0: 'before_character_definition',
        1: 'after_character_definition',
        2: 'before_example_messages',
        3: 'after_example_messages',
        4: 'before_author_note',
        5: 'after_author_note',
        6: 'at_depth'
    };
    const positionType = positionTypeMap[entry.position] || 'before_character_definition';

    // 角色类型转换
    const roleTypeMap = {
        0: 'system',
        1: 'user',
        2: 'assistant'
    };
    const roleType = roleTypeMap[entry.role] || 'system';

    // 构建 TavernHelper 格式
    const tavernEntry = {
        name: entry.comment || entry.name || '',
        content: entry.content || '',
        enabled: entry.disable !== true && entry.enabled !== false,

        strategy: {
            type: strategyType,
            keys: keys,
            keys_secondary: {
                logic: secondaryLogic,
                keys: keysSecondary
            },
            scan_depth: entry.scanDepth === null ? 'same_as_global' : (entry.scanDepth || 'same_as_global')
        },

        position: {
            type: positionType,
            role: roleType,
            depth: entry.depth || 4,
            order: entry.order || 100
        },

        probability: entry.probability || 100,

        recursion: {
            prevent_incoming: entry.excludeRecursion || false,
            prevent_outgoing: entry.preventRecursion || false,
            delay_until: entry.delayUntilRecursion ? 1 : null
        },

        effect: {
            sticky: entry.sticky || null,
            cooldown: entry.cooldown || null,
            delay: entry.delay || null
        }
    };

    // 保留额外字段
    if (entry.extra) {
        tavernEntry.extra = entry.extra;
    }

    return tavernEntry;
}

// 获取世界书列表 - 使用 TavernHelper API
async function getWorldInfoList() {
    try {
        // 优先使用 TavernHelper.getWorldbookNames
        if (typeof TavernHelper !== 'undefined' && TavernHelper.getWorldbookNames) {
            const names = TavernHelper.getWorldbookNames();
            console.log('[酒馆创意工坊] TavernHelper 世界书列表:', names);
            return names || [];
        }

        // 回退到 API
        const context = getContext();
        const response = await fetch('/api/worldinfo/getall', {
            method: 'POST',
            headers: context.getRequestHeaders(),
            body: JSON.stringify({})
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn('[酒馆创意工坊] 获取世界书列表失败:', e);
    }
    return [];
}

// 加载聊天数据 (localStorage 和 IndexedDB)
async function loadChatData() {
    await Promise.all([
        loadLocalStorageData(),
        loadIndexedDBData()
    ]);
}

// 加载 localStorage 数据 - 列出所有键
async function loadLocalStorageData() {
    const $list = $('#localstorage-list');
    $list.html('<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> 加载中...</div>');

    try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                keys.push(key);
            }
        }

        // 按键名排序
        keys.sort();

        if (keys.length === 0) {
            $list.html('<div class="empty-message"><i class="fa-solid fa-inbox"></i> 暂无 LocalStorage 数据</div>');
            return;
        }

        let html = `<div class="list-header"><small>共 ${keys.length} 项</small></div>`;
        keys.forEach((key, index) => {
            const value = localStorage.getItem(key);
            const size = value ? new Blob([value]).size : 0;
            const checked = currentState.selectedLocalStorageKeys.has(key) ? 'checked' : '';
            html += `
                <label class="checkbox-item" data-key="${escapeHtml(key)}">
                    <input type="checkbox" ${checked} />
                    <span class="checkbox-label">
                        <strong>${escapeHtml(key.length > 50 ? key.substring(0, 50) + '...' : key)}</strong>
                        <span class="entry-size">${formatSize(size)}</span>
                    </span>
                </label>
            `;
        });

        $list.html(html);

        // 绑定选择事件
        $list.find('input[type="checkbox"]').on('change', function() {
            const key = $(this).closest('.checkbox-item').data('key');
            if (this.checked) {
                currentState.selectedLocalStorageKeys.add(key);
            } else {
                currentState.selectedLocalStorageKeys.delete(key);
            }
            updateFilePreview();
        });

    } catch (error) {
        console.error('[酒馆创意工坊] 加载 localStorage 失败:', error);
        $list.html('<div class="error-message"><i class="fa-solid fa-exclamation-triangle"></i> 加载失败: ' + escapeHtml(error.message) + '</div>');
    }
}

// 获取当前站点下所有的 IDB 数据库
async function getAllDatabases() {
    const dbs = await indexedDB.databases();
    return dbs.map(db => db.name).filter(name => name); // 过滤空名称
}

// 获取选中数据库中的所有"表"（Object Stores）
function getObjectStores(dbName) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = (event) => {
            const db = event.target.result;
            const stores = Array.from(db.objectStoreNames);
            db.close();
            resolve(stores);
        };
        request.onerror = (err) => reject(err);
    });
}

// 获取指定数据库和表的全部内容
function getStoreData(dbName, storeName) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = (event) => {
            const db = event.target.result;
            try {
                const transaction = db.transaction(storeName, 'readonly');
                const store = transaction.objectStore(storeName);
                const getAllRequest = store.getAll();
                const getAllKeysRequest = store.getAllKeys();

                getAllRequest.onsuccess = () => {
                    const result = getAllRequest.result.map((val, index) => ({
                        key: getAllKeysRequest.result[index],
                        value: val
                    }));
                    resolve(result);
                };
                getAllRequest.onerror = (err) => reject(err);
                transaction.oncomplete = () => db.close();
            } catch (e) {
                db.close();
                reject(e);
            }
        };
        request.onerror = (err) => reject(err);
    });
}

// 加载 IndexedDB 数据 - 使用复选框列表形式（与 LocalStorage 一致）
async function loadIndexedDBData() {
    const $list = $('#indexeddb-list');
    $list.html('<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> 加载中...</div>');

    try {
        // 检查 indexedDB.databases() 是否可用
        if (typeof indexedDB.databases !== 'function') {
            $list.html(`
                <div class="info-message">
                    <i class="fa-solid fa-info-circle"></i>
                    <p>当前浏览器不支持列出 IndexedDB 数据库。</p>
                    <p>请使用 Chrome 或 Edge 浏览器获取完整功能。</p>
                </div>
            `);
            return;
        }

        // 获取所有数据库和表的数据
        const allItems = [];
        const dbList = await getAllDatabases();
        console.log('[酒馆创意工坊] IndexedDB 数据库列表:', dbList);

        for (const dbName of dbList) {
            try {
                const stores = await getObjectStores(dbName);
                for (const storeName of stores) {
                    const itemId = `idb-${dbName}-${storeName}`;
                    allItems.push({
                        id: itemId,
                        dbName: dbName,
                        storeName: storeName,
                        displayName: `${dbName} / ${storeName}`
                    });
                }
            } catch (e) {
                console.warn(`[酒馆创意工坊] 读取数据库 ${dbName} 失败:`, e);
            }
        }

        if (allItems.length === 0) {
            $list.html('<div class="empty-message"><i class="fa-solid fa-inbox"></i> 暂无 IndexedDB 数据</div>');
            return;
        }

        let html = `<div class="list-header"><small>共 ${allItems.length} 个数据表</small></div>`;
        allItems.forEach((item) => {
            const checked = currentState.selectedIndexedDBItems.has(item.id) ? 'checked' : '';
            html += `
                <label class="checkbox-item" data-id="${escapeHtml(item.id)}" data-db="${escapeHtml(item.dbName)}" data-store="${escapeHtml(item.storeName)}">
                    <input type="checkbox" ${checked} />
                    <span class="checkbox-label">
                        <strong>${escapeHtml(item.dbName)}</strong>
                        <span class="entry-key">${escapeHtml(item.storeName)}</span>
                    </span>
                </label>
            `;
        });

        $list.html(html);

        // 存储所有项目供后续使用
        currentState.allIDBItems = allItems;

        // 绑定选择事件
        $list.find('input[type="checkbox"]').on('change', async function() {
            const $item = $(this).closest('.checkbox-item');
            const id = $item.data('id');
            const dbName = $item.data('db');
            const storeName = $item.data('store');

            if (this.checked) {
                // 选中时加载数据
                try {
                    const data = await getStoreData(dbName, storeName);
                    currentState.selectedIndexedDBItems.add(id);
                    // 存储数据供导出使用
                    if (!currentState.idbDataCache) {
                        currentState.idbDataCache = {};
                    }
                    currentState.idbDataCache[id] = {
                        dbName: dbName,
                        storeName: storeName,
                        data: data
                    };
                } catch (e) {
                    console.error('[酒馆创意工坊] 加载 IndexedDB 数据失败:', e);
                    $(this).prop('checked', false);
                    toastr.error('加载数据失败: ' + e.message);
                    return;
                }
            } else {
                currentState.selectedIndexedDBItems.delete(id);
                if (currentState.idbDataCache) {
                    delete currentState.idbDataCache[id];
                }
            }
            updateFilePreview();
        });

    } catch (error) {
        console.error('[酒馆创意工坊] 加载 IndexedDB 失败:', error);
        $list.html('<div class="error-message"><i class="fa-solid fa-exclamation-triangle"></i> 加载失败: ' + escapeHtml(error.message) + '</div>');
    }
}

function renderIndexedDBList(data) {
    const $list = $('#indexeddb-list');
    
    if (data.length === 0) {
        $list.html('<div class="empty-message"><i class="fa-solid fa-inbox"></i> 暂无相关数据</div>');
        return;
    }
    
    let html = '';
    data.forEach((item, index) => {
        const itemId = `idb-item-${index}`;
        const checked = currentState.selectedIndexedDBItems.has(itemId) ? 'checked' : '';
        html += `
            <label class="checkbox-item" data-id="${itemId}" data-store="${escapeHtml(item.store)}" data-key="${escapeHtml(String(item.key))}">
                <input type="checkbox" ${checked} />
                <span class="checkbox-label">
                    <strong>${escapeHtml(item.store)}</strong>
                    <span class="entry-key">${escapeHtml(String(item.key).substring(0, 30))}</span>
                </span>
            </label>
        `;
    });
    
    $list.html(html);
    
    // 绑定选择事件
    $list.find('input[type="checkbox"]').on('change', function() {
        const id = $(this).closest('.checkbox-item').data('id');
        if (this.checked) {
            currentState.selectedIndexedDBItems.add(id);
        } else {
            currentState.selectedIndexedDBItems.delete(id);
        }
        updateFilePreview();
    });
}

async function readIndexedDB(dbName) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = () => {
            const db = request.result;
            const stores = Array.from(db.objectStoreNames);
            const results = [];
            
            if (stores.length === 0) {
                db.close();
                resolve(results);
                return;
            }
            
            let completed = 0;
            stores.forEach(storeName => {
                try {
                    const tx = db.transaction(storeName, 'readonly');
                    const store = tx.objectStore(storeName);
                    const allRequest = store.getAllKeys();
                    
                    allRequest.onsuccess = () => {
                        allRequest.result.forEach(key => {
                            results.push({ db: dbName, store: storeName, key });
                        });
                        completed++;
                        if (completed === stores.length) {
                            db.close();
                            resolve(results);
                        }
                    };
                    
                    allRequest.onerror = () => {
                        completed++;
                        if (completed === stores.length) {
                            db.close();
                            resolve(results);
                        }
                    };
                } catch (e) {
                    completed++;
                    if (completed === stores.length) {
                        db.close();
                        resolve(results);
                    }
                }
            });
        };
    });
}

async function getIndexedDBData() {
    // 尝试获取 SillyTavern 常用的 IndexedDB 数据
    const results = [];
    
    try {
        const dbs = await indexedDB.databases();
        for (const dbInfo of dbs) {
            if (dbInfo.name) {
                const data = await readIndexedDB(dbInfo.name);
                results.push(...data.slice(0, 50)); // 限制数量
            }
        }
    } catch (e) {
        console.warn('[酒馆创意工坊] IndexedDB 访问受限:', e);
    }
    
    return results;
}

// ==================== 文件预览更新 ====================

async function updateFilePreview() {
    const $preview = $('#field-file');
    const exportData = {
        version: '1.0',
        exportTime: new Date().toISOString(),
        worldBook: [],
        localStorage: {},
        indexedDB: [],
        // 存储路径信息，用于注入时还原数据位置
        paths: {
            localStorage: [],
            indexedDB: []
        }
    };

    // 收集世界书数据
    if (currentState.selectedWorldBookEntries.size > 0) {
        const worldInfoData = await fetchWorldInfo();
        currentState.selectedWorldBookEntries.forEach(index => {
            if (worldInfoData[index]) {
                exportData.worldBook.push(worldInfoData[index]);
            }
        });
    }

    // 收集 localStorage 数据
    currentState.selectedLocalStorageKeys.forEach(key => {
        try {
            const value = localStorage.getItem(key);
            exportData.localStorage[key] = JSON.parse(value);
        } catch {
            exportData.localStorage[key] = localStorage.getItem(key);
        }
        // 记录路径信息
        exportData.paths.localStorage.push(key);
    });

    // 收集 IndexedDB 数据（使用缓存）
    if (currentState.idbDataCache) {
        for (const id of currentState.selectedIndexedDBItems) {
            const cached = currentState.idbDataCache[id];
            if (cached) {
                exportData.indexedDB.push({
                    database: cached.dbName,
                    store: cached.storeName,
                    data: cached.data
                });
                // 记录路径信息
                exportData.paths.indexedDB.push({
                    database: cached.dbName,
                    store: cached.storeName
                });
            }
        }
    }

    // 更新预览
    const jsonStr = JSON.stringify(exportData, null, 2);
    $preview.val(jsonStr);
}

// ==================== 创意工坊数据加载 ====================

async function loadWorkshopData() {
    const $results = $('#workshop-results');
    $results.html('<div class="loading-spinner"><i class="fa-solid fa-spinner fa-spin"></i> 正在加载创意工坊数据...</div>');
    
    try {
        const response = await fetch(`${WORKSHOP_BASE_URL}/index.json`);
        if (!response.ok) {
            throw new Error('获取创意工坊目录失败');
        }
        
        const data = await response.json();
        currentState.workshopData = data;
        
        renderWorkshopResults(data);
        
    } catch (error) {
        console.error('[酒馆创意工坊] 加载创意工坊数据失败:', error);
        $results.html(`
            <div class="error-message">
                <i class="fa-solid fa-exclamation-triangle"></i>
                <p>加载失败: ${error.message}</p>
                <button onclick="loadWorkshopData()" class="workshop-btn secondary">重试</button>
            </div>
        `);
    }
}

function renderWorkshopResults(data) {
    const $results = $('#workshop-results');

    if (!data || data.length === 0) {
        $results.html('<div class="empty-message"><i class="fa-solid fa-inbox"></i> 创意工坊暂无内容</div>');
        return;
    }

    // 分页状态
    const pageSize = 10;
    const totalPages = Math.ceil(data.length / pageSize);
    let currentPage = currentState.workshopCurrentPage || 1;

    // 确保页码有效
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    currentState.workshopCurrentPage = currentPage;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, data.length);
    const pageData = data.slice(startIndex, endIndex);

    let html = '<div class="results-grid">';

    pageData.forEach((item, idx) => {
        const index = startIndex + idx;
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
        const shortDesc = item.description
            ? (item.description.length > 50 ? item.description.substring(0, 50) + '...' : item.description)
            : '';

        html += `
            <div class="workshop-item" data-index="${index}">
                <div class="item-header">
                    <h4>${escapeHtml(item.name || '未命名')}</h4>
                    <span class="item-type ${item.type === 'Lorebook' ? 'lorebook' : 'chatdata'}">
                        ${item.type === 'Lorebook' ? '世界书' : '聊天数据'}
                    </span>
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
    });

    html += '</div>';

    // 分页控件
    if (totalPages > 1) {
        html += `
            <div class="pagination">
                <button class="pagination-btn" data-page="1" ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="fa-solid fa-angles-left"></i>
                </button>
                <button class="pagination-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <span class="pagination-info">第 ${currentPage} / ${totalPages} 页 (共 ${data.length} 项)</span>
                <button class="pagination-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
                <button class="pagination-btn" data-page="${totalPages}" ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="fa-solid fa-angles-right"></i>
                </button>
            </div>
        `;
    }

    $results.html(html);

    // 绑定查看详情按钮
    $('.view-detail-btn').on('click', function(e) {
        e.stopPropagation();
        const index = $(this).data('index');
        showDetailModal(index);
    });

    // 绑定卡片点击打开详情
    $('.workshop-item').on('click', function(e) {
        if ($(e.target).closest('.workshop-btn').length) return;
        const index = $(this).data('index');
        showDetailModal(index);
    });

    // 绑定下载和注入按钮
    $('.download-item-btn').on('click', function(e) {
        e.stopPropagation();
        const index = $(this).data('index');
        downloadWorkshopItem(index);
    });

    $('.inject-item-btn').on('click', function(e) {
        e.stopPropagation();
        const index = $(this).data('index');
        showInjectOptions(index);
    });

    // 绑定分页按钮
    $('.pagination-btn').on('click', function() {
        const page = $(this).data('page');
        if (page >= 1 && page <= totalPages) {
            currentState.workshopCurrentPage = page;
            renderWorkshopResults(data);
            $('#workshop-results').scrollTop(0);
        }
    });
}

// 显示详情弹窗
function showDetailModal(index) {
    const item = currentState.workshopData[index];
    if (!item) return;

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

    // 设置标题
    $('#modal-title').text(item.name || '未命名');

    // 设置内容
    const bodyHtml = `
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
                <span class="detail-value">
                    <span class="item-type ${item.type === 'Lorebook' ? 'lorebook' : 'chatdata'}">
                        ${item.type === 'Lorebook' ? '世界书' : '聊天数据'}
                    </span>
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
    $('#modal-body').html(bodyHtml);

    // 设置底部按钮
    const footerHtml = `
        <button class="workshop-btn primary" id="modal-download-btn" data-index="${index}">
            <i class="fa-solid fa-download"></i> 下载
        </button>
        <button class="workshop-btn secondary" id="modal-inject-btn" data-index="${index}">
            <i class="fa-solid fa-file-import"></i> 注入
        </button>
    `;
    $('#modal-footer').html(footerHtml);

    // 绑定弹窗内按钮事件
    $('#modal-download-btn').on('click', function() {
        const idx = $(this).data('index');
        closeDetailModal();
        downloadWorkshopItem(idx);
    });

    $('#modal-inject-btn').on('click', function() {
        const idx = $(this).data('index');
        closeDetailModal();
        showInjectOptions(idx);
    });

    // 显示弹窗
    $('#workshop-detail-modal').show();
}

// 关闭详情弹窗
function closeDetailModal() {
    $('#workshop-detail-modal').hide();
}

function filterWorkshopResults() {
    const searchText = $('#workshop-search').val().toLowerCase();
    const filterField = $('#filter-field').val();
    const filterType = $('#filter-type').val();

    if (!currentState.workshopData) return;

    const filtered = currentState.workshopData.filter(item => {
        // 类型筛选
        if (filterType !== 'all' && item.type !== filterType) {
            return false;
        }

        // 搜索筛选
        if (searchText) {
            if (filterField === 'all') {
                return Object.values(item).some(val =>
                    String(val).toLowerCase().includes(searchText)
                );
            } else {
                return String(item[filterField] || '').toLowerCase().includes(searchText);
            }
        }

        return true;
    });

    // 筛选后重置到第一页
    currentState.workshopCurrentPage = 1;
    renderWorkshopResults(filtered);
}

// ==================== 下载和注入 ====================

async function downloadWorkshopItem(index) {
    const item = currentState.workshopData[index];
    if (!item || !item.file_name) {
        showToast('下载失败：文件信息不完整', 'error');
        return;
    }
    
    try {
        showToast('正在下载...', 'info');
        
        const response = await fetch(`${WORKSHOP_BASE_URL}/${item.file_name}`);
        if (!response.ok) {
            throw new Error('下载失败');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('下载完成！', 'success');
        
    } catch (error) {
        console.error('[酒馆创意工坊] 下载失败:', error);
        showToast('下载失败: ' + error.message, 'error');
    }
}

let selectedInjectIndex = null;

function showInjectOptions(index) {
    selectedInjectIndex = index;
    $('#inject-options').show();
    
    // 滚动到注入选项区域
    $('#inject-options')[0].scrollIntoView({ behavior: 'smooth' });
}

async function handleInject() {
    if (selectedInjectIndex === null) {
        showToast('请先选择要注入的内容', 'warning');
        return;
    }
    
    const item = currentState.workshopData[selectedInjectIndex];
    const target = $('input[name="inject-target"]:checked').val();
    
    try {
        showToast('正在下载并注入...', 'info');
        
        // 下载文件内容
        const response = await fetch(`${WORKSHOP_BASE_URL}/${item.file_name}`);
        if (!response.ok) {
            throw new Error('下载失败');
        }
        
        const data = await response.json();
        
        if (target === 'worldbook') {
            await injectToWorldBook(data);
        } else {
            await injectToChatData(data);
        }
        
        showToast('注入成功！', 'success');
        $('#inject-options').hide();
        selectedInjectIndex = null;
        
    } catch (error) {
        console.error('[酒馆创意工坊] 注入失败:', error);
        showToast('注入失败: ' + error.message, 'error');
    }
}

async function injectToWorldBook(data) {
    if (!data.worldBook || data.worldBook.length === 0) {
        throw new Error('没有可注入的世界书数据');
    }

    // 检查 TavernHelper 是否可用
    if (typeof TavernHelper === 'undefined' || !TavernHelper.createWorldbookEntries) {
        throw new Error('TavernHelper 不可用，请确保已安装 TavernHelper 插件');
    }

    // 优先使用已保存的世界书名称
    let worldbookName = currentState.currentWorldbookName;

    // 如果没有保存的世界书名称，尝试使用 getCharWorldbookNames 获取
    if (!worldbookName) {
        const charWorldbooks = TavernHelper.getCharWorldbookNames('current');
        if (charWorldbooks && charWorldbooks.primary) {
            worldbookName = charWorldbooks.primary;
        }
    }

    // 如果还是没有，尝试获取列表中的第一个
    if (!worldbookName) {
        const worldInfoList = await getWorldInfoList();
        if (worldInfoList && worldInfoList.length > 0) {
            worldbookName = worldInfoList[0];
        }
    }

    if (!worldbookName) {
        throw new Error('没有可用的世界书，请先创建或绑定一个世界书');
    }

    console.log('[酒馆创意工坊] 注入世界书:', worldbookName);
    console.log('[酒馆创意工坊] 要注入的词条:', data.worldBook);

    // 将导出格式转换为 TavernHelper WorldbookEntry 格式
    const newEntries = data.worldBook.map(entry => convertToTavernHelperFormat(entry));

    console.log('[酒馆创意工坊] 转换后的词条:', newEntries);

    try {
        const result = await TavernHelper.createWorldbookEntries(worldbookName, newEntries, { render: 'debounced' });
        console.log('[酒馆创意工坊] 注入成功:', result);
        return result;
    } catch (e) {
        console.error('[酒馆创意工坊] 注入世界书失败:', e);
        throw new Error(`注入世界书失败: ${e.message}`);
    }
}

async function injectToChatData(data) {
    let successCount = 0;
    let failCount = 0;

    // 注入 localStorage 数据
    // 优先使用 paths.localStorage 中的键名，确保数据写入正确位置
    if (data.localStorage && Object.keys(data.localStorage).length > 0) {
        const keys = data.paths?.localStorage || Object.keys(data.localStorage);
        for (const key of keys) {
            if (data.localStorage.hasOwnProperty(key)) {
                try {
                    const value = data.localStorage[key];
                    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                    console.log(`[酒馆创意工坊] localStorage 写入成功: ${key}`);
                    successCount++;
                } catch (e) {
                    console.warn('[酒馆创意工坊] 写入 localStorage 失败:', key, e);
                    failCount++;
                }
            }
        }
    }

    // 注入 IndexedDB 数据
    // 使用 paths.indexedDB 中的数据库和表信息来还原数据
    if (data.indexedDB && data.indexedDB.length > 0) {
        for (const idbItem of data.indexedDB) {
            const { database, store, data: storeData } = idbItem;
            if (database && store && storeData) {
                try {
                    await writeToIndexedDB(database, store, storeData);
                    console.log(`[酒馆创意工坊] IndexedDB 写入成功: ${database}/${store}`);
                    successCount++;
                } catch (e) {
                    console.warn(`[酒馆创意工坊] 写入 IndexedDB 失败: ${database}/${store}`, e);
                    failCount++;
                }
            }
        }
    }

    if (failCount > 0) {
        showToast(`注入完成，成功 ${successCount} 项，失败 ${failCount} 项`, 'warning');
    }
}

// 写入数据到 IndexedDB
async function writeToIndexedDB(dbName, storeName, data) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName);

        request.onerror = () => reject(request.error);

        request.onupgradeneeded = (event) => {
            // 如果数据库不存在，创建它和对应的 store
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { autoIncrement: true });
            }
        };

        request.onsuccess = () => {
            const db = request.result;

            // 检查 store 是否存在
            if (!db.objectStoreNames.contains(storeName)) {
                db.close();
                // 需要升级数据库版本来创建新 store
                const version = db.version + 1;
                const upgradeRequest = indexedDB.open(dbName, version);

                upgradeRequest.onupgradeneeded = (event) => {
                    const upgradedDb = event.target.result;
                    upgradedDb.createObjectStore(storeName, { autoIncrement: true });
                };

                upgradeRequest.onsuccess = () => {
                    const upgradedDb = upgradeRequest.result;
                    writeDataToStore(upgradedDb, storeName, data)
                        .then(resolve)
                        .catch(reject);
                };

                upgradeRequest.onerror = () => reject(upgradeRequest.error);
                return;
            }

            writeDataToStore(db, storeName, data)
                .then(resolve)
                .catch(reject);
        };
    });
}

// 将数据写入指定的 store
function writeDataToStore(db, storeName, data) {
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);

            // data 是一个数组，每个元素包含 key 和 value
            if (Array.isArray(data)) {
                data.forEach(item => {
                    if (item.key !== undefined) {
                        store.put(item.value, item.key);
                    } else {
                        store.add(item.value || item);
                    }
                });
            }

            transaction.oncomplete = () => {
                db.close();
                resolve();
            };

            transaction.onerror = () => {
                db.close();
                reject(transaction.error);
            };
        } catch (e) {
            db.close();
            reject(e);
        }
    });
}

// ==================== 上传功能 ====================

async function handleUpload() {
    // 验证表单
    const validation = validateForm();
    if (!validation.valid) {
        showToast(validation.message, 'error');
        return;
    }
    
    const formData = new FormData();
    
    // 获取字段值
    const cardname = $('#field-cardname').val();
    const name = $('#field-name').val();
    const author = $('#field-author').val();
    const version = $('#field-version').val();
    const type = $('#field-type').val();
    const tags = $('#field-tags').val();
    const description = $('#field-description').val();
    const fileContent = $('#field-file').val();
    
    // 创建 JSON 文件
    const blob = new Blob([fileContent], { type: 'application/json' });
    const fileName = `${name.replace(/\s+/g, '_')}_${Date.now()}.json`;
    const file = new File([blob], fileName, { type: 'application/json' });
    
    // 添加到 FormData
    formData.append('file', file);
    formData.append('cardname', cardname);
    formData.append('name', name);
    formData.append('author', author);
    formData.append('version', version);
    formData.append('type', type);
    if (tags) formData.append('tags', tags);
    if (description) formData.append('description', description);
    
    try {
        $('#upload-submit-btn').prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> 上传中...');
        
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || '上传失败');
        }
        
        const result = await response.json();
        
        showToast('上传成功！', 'success');
        
        // 记录上传历史
        extension_settings[EXTENSION_NAME].uploadHistory.push({
            name,
            time: new Date().toISOString()
        });
        saveSettingsDebounced();
        
        // 清空表单
        clearUploadForm();
        
    } catch (error) {
        console.error('[酒馆创意工坊] 上传失败:', error);
        showToast('上传失败: ' + error.message, 'error');
    } finally {
        $('#upload-submit-btn').prop('disabled', false).html('<i class="fa-solid fa-cloud-arrow-up"></i> 上传到创意工坊');
    }
}

function validateForm() {
    const cardname = $('#field-cardname').val().trim();
    const name = $('#field-name').val().trim();
    const author = $('#field-author').val().trim();
    const version = $('#field-version').val().trim();
    const type = $('#field-type').val();
    const tags = $('#field-tags').val().trim();
    const fileContent = $('#field-file').val().trim();
    
    if (!cardname) {
        return { valid: false, message: '请先选择角色卡' };
    }
    
    if (!name || name.length > 20) {
        return { valid: false, message: '名称必填，且不超过20个字符' };
    }
    
    if (!author || author.length > 20) {
        return { valid: false, message: '作者必填，且不超过20个字符' };
    }
    
    if (!version || !/^\d+\.\d+$/.test(version)) {
        return { valid: false, message: '版本号格式错误，请使用 X.X 格式' };
    }
    
    if (!type) {
        return { valid: false, message: '请选择类型' };
    }
    
    // 验证标签
    if (tags) {
        const tagList = tags.split(',').map(t => t.trim()).filter(t => t);
        if (tagList.length > 5) {
            return { valid: false, message: '最多设置5个标签' };
        }
        for (const tag of tagList) {
            if (tag.length > 5) {
                return { valid: false, message: '每个标签最多5个字符' };
            }
        }
    }
    
    if (!fileContent) {
        return { valid: false, message: '请选择或输入文件内容' };
    }
    
    // 验证 JSON 格式
    try {
        JSON.parse(fileContent);
    } catch {
        return { valid: false, message: '文件内容不是有效的 JSON 格式' };
    }
    
    return { valid: true };
}

function clearUploadForm() {
    $('#field-name').val('');
    $('#field-author').val('');
    $('#field-version').val('');
    $('#field-tags').val('');
    $('#field-description').val('');
    $('#field-file').val('');
    $('#name-count, #author-count, #desc-count').text('0');
    currentState.selectedWorldBookEntries.clear();
    currentState.selectedLocalStorageKeys.clear();
    currentState.selectedIndexedDBItems.clear();
}

// ==================== UI 辅助函数 ====================

function togglePanel() {
    const $panel = $('#workshop-panel');
    const isVisible = $panel.is(':visible');
    
    if (!isVisible) {
        $panel.show();
        // 加载初始数据
        if (currentState.currentTab === 'upload') {
            loadWorldBookEntries();
            loadChatData();
        } else {
            loadWorkshopData();
        }
    } else {
        $panel.hide();
    }
}

function switchTab(tab) {
    currentState.currentTab = tab;
    
    $('.workshop-tab').removeClass('active');
    $(`.workshop-tab[data-tab="${tab}"]`).addClass('active');
    
    $('.workshop-page').removeClass('active');
    $(`#${tab}-page`).addClass('active');
    
    // 加载对应数据
    if (tab === 'upload') {
        loadWorldBookEntries();
        loadChatData();
    } else {
        loadWorkshopData();
    }
}

function switchDataSource(source) {
    $('.data-tab').removeClass('active');
    $(`.data-tab[data-source="${source}"]`).addClass('active');
    
    $('.data-source-section').removeClass('active');
    $(`#${source}-section`).addClass('active');
}

function selectAllWorldBook(select) {
    $('#worldbook-list input[type="checkbox"]').prop('checked', select).each(function() {
        const index = $(this).closest('.checkbox-item').data('index');
        if (select) {
            currentState.selectedWorldBookEntries.add(index);
        } else {
            currentState.selectedWorldBookEntries.delete(index);
        }
    });
    updateFilePreview();
}

function selectAllLocalStorage(select) {
    $('#localstorage-list input[type="checkbox"]')
        .prop('checked', select).each(function() {
            const key = $(this).closest('.checkbox-item').data('key');
            if (key) {
                if (select) {
                    currentState.selectedLocalStorageKeys.add(key);
                } else {
                    currentState.selectedLocalStorageKeys.delete(key);
                }
            }
        });
    updateFilePreview();
}

async function selectAllIndexedDB(select) {
    const $checkboxes = $('#indexeddb-list input[type="checkbox"]');

    for (const checkbox of $checkboxes) {
        const $item = $(checkbox).closest('.checkbox-item');
        const id = $item.data('id');
        const dbName = $item.data('db');
        const storeName = $item.data('store');

        if (select) {
            if (!currentState.selectedIndexedDBItems.has(id)) {
                try {
                    const data = await getStoreData(dbName, storeName);
                    currentState.selectedIndexedDBItems.add(id);
                    if (!currentState.idbDataCache) {
                        currentState.idbDataCache = {};
                    }
                    currentState.idbDataCache[id] = {
                        dbName: dbName,
                        storeName: storeName,
                        data: data
                    };
                    $(checkbox).prop('checked', true);
                } catch (e) {
                    console.error('[酒馆创意工坊] 加载 IndexedDB 数据失败:', e);
                }
            }
        } else {
            currentState.selectedIndexedDBItems.delete(id);
            if (currentState.idbDataCache) {
                delete currentState.idbDataCache[id];
            }
            $(checkbox).prop('checked', false);
        }
    }
    updateFilePreview();
}

async function copyJsonToClipboard() {
    const content = $('#field-file').val();
    if (!content) {
        showToast('没有内容可复制', 'warning');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(content);
        showToast('已复制到剪贴板', 'success');
    } catch (error) {
        showToast('复制失败', 'error');
    }
}

// ==================== 工具函数 ====================

function showToast(message, type = 'info') {
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const toast = $(`
        <div class="workshop-toast ${type}">
            <i class="fa-solid ${iconMap[type]}"></i>
            <span>${escapeHtml(message)}</span>
        </div>
    `);
    
    $('body').append(toast);
    
    setTimeout(() => toast.addClass('show'), 10);
    setTimeout(() => {
        toast.removeClass('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// 导出供外部使用
window.SillyTavernWorkshop = {
    togglePanel,
    loadWorkshopData,
    refreshWorldBook: loadWorldBookEntries
};
