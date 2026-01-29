/**
 * @fileoverview 全局状态管理模块
 * 单例模式管理插件的所有状态
 */

import { DEFAULT_SETTINGS } from './constants.js';

/**
 * 插件状态类
 * @class
 */
class PluginState {
    constructor() {
        /** @type {Set<number>} 选中的世界书词条索引 */
        this.selectedWorldInfoEntries = new Set();

        /** @type {Set<string>} 选中的 LocalStorage 键名 */
        this.selectedLocalStorageKeys = new Set();

        /** @type {Set<string>} 选中的 IndexedDB 条目ID */
        this.selectedIndexedDBItems = new Set();

        /** @type {Object|null} 当前选中的 IndexedDB 数据表信息 */
        this.currentIDBStore = null;

        /** @type {Array} 当前 IndexedDB 数据表的所有键 */
        this.currentIDBKeys = [];

        /** @type {Object} IndexedDB 数据缓存 */
        this.idbDataCache = {};

        /** @type {Array} 所有 IndexedDB 数据表列表 */
        this.allIDBStores = [];

        /** @type {string|null} 当前使用的世界书名称 */
        this.currentWorldInfoName = null;

        /** @type {Array|null} 创意工坊数据 */
        this.workshopData = null;

        /** @type {number} 当前分页页码 */
        this.workshopCurrentPage = 1;

        /** @type {string} 当前激活的标签页 */
        this.currentTab = 'upload';

        /** @type {string[]} 标签列表 */
        this.tags = [];

        /** @type {number|null} 选中要注入的条目索引 */
        this.selectedInjectIndex = null;
    }

    /**
     * 重置世界书相关选择状态
     */
    resetWorldInfoSelection() {
        this.selectedWorldInfoEntries.clear();
    }

    /**
     * 重置 LocalStorage 相关选择状态
     */
    resetLocalStorageSelection() {
        this.selectedLocalStorageKeys.clear();
    }

    /**
     * 重置 IndexedDB 相关选择状态
     */
    resetIndexedDBSelection() {
        this.selectedIndexedDBItems.clear();
        this.idbDataCache = {};
        this.currentIDBStore = null;
        this.currentIDBKeys = [];
    }

    /**
     * 重置所有选择状态
     */
    resetAllSelections() {
        this.resetWorldInfoSelection();
        this.resetLocalStorageSelection();
        this.resetIndexedDBSelection();
    }

    /**
     * 重置上传表单相关状态
     */
    resetUploadForm() {
        this.resetAllSelections();
        this.tags = [];
    }

    /**
     * 重置分页状态
     */
    resetPagination() {
        this.workshopCurrentPage = 1;
    }

    /**
     * 设置当前世界书名称
     * @param {string|null} name - 世界书名称
     */
    setCurrentWorldInfoName(name) {
        this.currentWorldInfoName = name;
    }

    /**
     * 获取当前世界书名称
     * @returns {string|null}
     */
    getCurrentWorldInfoName() {
        return this.currentWorldInfoName;
    }

    /**
     * 添加标签
     * @param {string} tag - 标签文本
     * @returns {boolean} 是否添加成功
     */
    addTag(tag) {
        const trimmed = tag?.trim();
        if (!trimmed) return false;
        if (this.tags.includes(trimmed)) return false;
        if (this.tags.length >= 5) return false;
        this.tags.push(trimmed);
        return true;
    }

    /**
     * 移除标签
     * @param {number} index - 标签索引
     */
    removeTag(index) {
        if (index >= 0 && index < this.tags.length) {
            this.tags.splice(index, 1);
        }
    }

    /**
     * 获取所有标签
     * @returns {string[]}
     */
    getTags() {
        return [...this.tags];
    }

    /**
     * 清空标签
     */
    clearTags() {
        this.tags = [];
    }
}

/**
 * 插件设置管理类
 * @class
 */
class PluginSettings {
    /**
     * @param {Object} extensionSettings - SillyTavern 扩展设置对象引用
     * @param {string} extensionName - 插件名称
     */
    constructor(extensionSettings, extensionName) {
        this.extensionSettings = extensionSettings;
        this.extensionName = extensionName;
    }

    /**
     * 初始化设置
     */
    init() {
        if (!this.extensionSettings[this.extensionName]) {
            this.extensionSettings[this.extensionName] = {};
        }
        Object.assign(
            this.extensionSettings[this.extensionName],
            DEFAULT_SETTINGS,
            this.extensionSettings[this.extensionName]
        );
    }

    /**
     * 获取设置项
     * @param {string} key - 设置键名
     * @returns {any}
     */
    get(key) {
        return this.extensionSettings[this.extensionName]?.[key];
    }

    /**
     * 设置设置项
     * @param {string} key - 设置键名
     * @param {any} value - 设置值
     */
    set(key, value) {
        if (this.extensionSettings[this.extensionName]) {
            this.extensionSettings[this.extensionName][key] = value;
        }
    }

    /**
     * 添加上传历史记录
     * @param {string} name - 上传名称
     */
    addUploadHistory(name) {
        const history = this.get('uploadHistory') || [];
        history.push({
            name,
            time: new Date().toISOString()
        });
        this.set('uploadHistory', history);
    }

    /**
     * 添加下载历史记录
     * @param {string} name - 下载名称
     */
    addDownloadHistory(name) {
        const history = this.get('downloadHistory') || [];
        history.push({
            name,
            time: new Date().toISOString()
        });
        this.set('downloadHistory', history);
    }
}

// 导出单例状态实例
export const state = new PluginState();

// 导出设置类（需要在初始化时实例化）
export { PluginSettings };

// 导出类用于测试
export { PluginState };
