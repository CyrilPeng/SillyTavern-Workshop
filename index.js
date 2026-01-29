/**
 * @fileoverview SillyTavern Workshop 创意工坊插件
 * 主入口文件 - 负责初始化和模块组装
 *
 * 【命名规范说明】
 * 本插件内部统一使用 worldInfo（驼峰）命名世界书相关概念。
 * - 变量/属性: worldInfo, worldInfoEntry, worldInfoEntries
 * - 类名: WorldInfo, WorldInfoService, WorldInfoEntry
 *
 * 注意：调用第三方 API（如 TavernHelper）时，保持原始函数名不变：
 * - TavernHelper.getWorldbook() - 不改名
 * - TavernHelper.getCharWorldbookNames() - 不改名
 * - TavernHelper.createWorldbookEntries() - 不改名
 */

// ==================== SillyTavern 模块导入 ====================
import { extension_settings, getContext } from '../../../extensions.js';
import { saveSettingsDebounced, eventSource, event_types } from '../../../../script.js';

// ==================== 导入模块 ====================
// 常量和工具
import { EXTENSION_NAME, API_BASE_URL } from './src/constants.js';
import { showToast } from './src/utils.js';

// 状态管理
import { state, PluginSettings } from './src/state.js';

// 服务层
import { getWorldInfoService } from './src/services/WorldInfoService.js';
import { getDatabaseService } from './src/services/DatabaseService.js';

// API 层
import { DiscordAuthModule } from './src/api/discordAuth.js';
import { getWorkshopApi } from './src/api/workshopApi.js';

// UI 层
import { getUIRenderer } from './src/ui/renderers.js';
import { createEventBinder } from './src/ui/eventBinder.js';
import { getModalManager } from './src/ui/modal.js';

// ==================== 初始化 ====================

/**
 * 插件主类
 */
class SillyTavernWorkshop {
    constructor() {
        /** @type {PluginSettings|null} 插件设置管理器 */
        this.settings = null;

        /** @type {DiscordAuthModule|null} Discord 鉴权模块 */
        this.authModule = null;

        /** @type {Object|null} 世界书服务 */
        this.worldInfoService = null;

        /** @type {Object|null} 数据库服务 */
        this.databaseService = null;

        /** @type {Object|null} 创意工坊 API */
        this.workshopApi = null;

        /** @type {Object|null} UI 渲染器 */
        this.renderer = null;

        /** @type {Object|null} 事件绑定器 */
        this.eventBinder = null;

        /** @type {Object|null} 弹窗管理器 */
        this.modalManager = null;
    }

    /**
     * 初始化插件
     */
    async init() {
        console.log(`[${EXTENSION_NAME}] 正在初始化...`);

        try {
            // 1. 初始化设置
            this.initSettings();

            // 2. 初始化服务层
            this.initServices();

            // 3. 初始化 UI
            await this.initUI();

            // 4. 绑定事件
            this.bindEvents();

            // 5. 监听角色卡切换
            this.bindSillyTavernEvents();

            console.log(`[${EXTENSION_NAME}] 初始化完成`);
        } catch (error) {
            console.error(`[${EXTENSION_NAME}] 初始化失败:`, error);
            showToast('创意工坊插件初始化失败', 'error');
        }
    }

    /**
     * 初始化设置
     */
    initSettings() {
        this.settings = new PluginSettings(extension_settings, EXTENSION_NAME);
        this.settings.init();
    }

    /**
     * 初始化服务层
     */
    initServices() {
        // 世界书服务（防腐层）
        this.worldInfoService = getWorldInfoService(getContext);

        // 数据库服务
        this.databaseService = getDatabaseService();

        // Discord 鉴权模块
        this.authModule = new DiscordAuthModule({
            apiBaseUrl: API_BASE_URL,
            onAuthChange: (isLoggedIn, username) => {
                console.log(`[${EXTENSION_NAME}] 登录状态变化:`, isLoggedIn, username);
                if (this.renderer) {
                    this.renderer.updateAuthButton();
                    this.renderer.updateUploadButtonState();
                }
            }
        });

        // 创意工坊 API
        this.workshopApi = getWorkshopApi();
        this.workshopApi.setTokenGetter(() => this.authModule.getToken());

        // 弹窗管理器
        this.modalManager = getModalManager();
    }

    /**
     * 初始化 UI
     */
    async initUI() {
        // 创建渲染器（需要服务依赖）
        this.renderer = getUIRenderer({
            worldInfoService: this.worldInfoService,
            databaseService: this.databaseService,
            authModule: this.authModule
        });

        // 初始化 UI 组件
        await this.renderer.initUI();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 创建事件绑定器（需要所有服务依赖）
        this.eventBinder = createEventBinder({
            worldInfoService: this.worldInfoService,
            databaseService: this.databaseService,
            workshopApi: this.workshopApi,
            authModule: this.authModule,
            renderer: this.renderer,
            getContext: getContext
        });

        // 绑定所有事件
        this.eventBinder.bindAll();
    }

    /**
     * 绑定 SillyTavern 事件
     */
    bindSillyTavernEvents() {
        // 监听角色卡切换
        const chatChangedEvent = event_types.CHAT_CHANGED;
        if (chatChangedEvent) {
            eventSource.on(chatChangedEvent, () => {
                this.updateCurrentCharacterCard();
            });
        } else {
            console.warn(`[${EXTENSION_NAME}] 事件类型 CHAT_CHANGED 不存在，跳过事件监听`);
        }

        // 初始化时更新角色卡名称
        this.updateCurrentCharacterCard();
    }

    /**
     * 更新当前角色卡名称
     */
    updateCurrentCharacterCard() {
        const context = getContext();
        const charName = context.name2 || '未选择角色卡';
        if (this.renderer) {
            this.renderer.updateCardName(charName);
        }
    }

    /**
     * 保存设置
     */
    saveSettings() {
        saveSettingsDebounced();
    }

    /**
     * 打开面板
     */
    openPanel() {
        if (this.renderer) {
            this.renderer.togglePanel(true);
            if (this.eventBinder) {
                this.eventBinder.onPanelOpen();
            }
        }
    }

    /**
     * 关闭面板
     */
    closePanel() {
        if (this.renderer) {
            this.renderer.togglePanel(false);
        }
    }

    /**
     * 刷新世界书列表
     */
    async refreshWorldInfo() {
        if (this.eventBinder) {
            await this.eventBinder.loadWorldInfoEntries();
        }
    }

    /**
     * 加载创意工坊数据
     */
    async loadWorkshopData() {
        if (this.eventBinder) {
            await this.eventBinder.loadWorkshopData();
        }
    }
}

// ==================== 入口点 ====================

// 创建插件实例
const workshop = new SillyTavernWorkshop();

// jQuery 文档就绪时初始化
jQuery(async () => {
    await workshop.init();
});

// 导出供外部使用
window.SillyTavernWorkshop = {
    togglePanel: () => workshop.openPanel(),
    loadWorkshopData: () => workshop.loadWorkshopData(),
    refreshWorldInfo: () => workshop.refreshWorldInfo()
};

export { workshop };
export default workshop;
