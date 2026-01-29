/**
 * @fileoverview 世界书服务模块（防腐层/适配器）
 *
 * 本模块是插件与 SillyTavern 原生 API 以及 TavernHelper 插件之间的中间件。
 * 负责将外部混乱的命名（lorebook, worldbook, world_info）统一转换为内部标准的 worldInfo 结构。
 *
 * 【重要】第三方 API 函数（如 TavernHelper.getCharWorldbookNames）必须保持原样调用，不得更改！
 * 本服务层仅在内部使用统一的 worldInfo 命名。
 */

import {
    STRATEGY_TYPE,
    SELECTIVE_LOGIC_MAP,
    SELECTIVE_LOGIC_REVERSE_MAP,
    POSITION_TYPE_MAP,
    POSITION_TYPE_REVERSE_MAP,
    ROLE_TYPE_MAP,
    ROLE_TYPE_REVERSE_MAP
} from '../constants.js';
import { isTavernHelperAvailable, getTavernHelper, normalizeKeysToArray } from '../utils.js';

/**
 * 世界书条目的标准内部格式
 * @typedef {Object} WorldInfoEntry
 * @property {number|string} uid - 唯一标识符
 * @property {string} name - 条目名称/注释
 * @property {string} content - 条目内容
 * @property {boolean} enabled - 是否启用
 * @property {string[]} keys - 主关键词数组
 * @property {string[]} keysSecondary - 次要关键词数组
 * @property {string} secondaryLogic - 次要关键词逻辑
 * @property {string} strategyType - 策略类型: constant, selective, vectorized
 * @property {string} positionType - 位置类型
 * @property {string} role - 角色类型
 * @property {number} depth - 深度
 * @property {number} order - 排序
 * @property {number} probability - 触发概率
 * @property {number|null} scanDepth - 扫描深度
 * @property {Object} recursion - 递归设置
 * @property {Object} effect - 效果设置
 * @property {string} _source - 来源世界书名称
 * @property {string} _uid - 唯一标识符（包含来源）
 */

/**
 * 世界书服务类
 * 作为防腐层，屏蔽外部 API 的差异，提供统一的世界书操作接口
 */
export class WorldInfoService {
    /**
     * @param {Function} getContext - SillyTavern 的 getContext 函数
     */
    constructor(getContext) {
        this.getContext = getContext;
    }

    /**
     * 检查 TavernHelper 是否可用
     * @returns {boolean}
     */
    isTavernHelperAvailable() {
        return isTavernHelperAvailable();
    }

    /**
     * 获取当前角色卡绑定的世界书名称
     * 【注意】这里调用的是 TavernHelper 的原始 API，保持函数名不变
     * @returns {{ primary: string|null, additional: string[] }|null}
     */
    getCharacterBoundWorldInfoNames() {
        const helper = getTavernHelper();
        if (!helper || !helper.getCharWorldbookNames) {
            return null;
        }
        // 调用 TavernHelper 原始 API（保持函数名不变）
        return helper.getCharWorldbookNames('current');
    }

    /**
     * 获取所有可用的世界书名称列表
     * @returns {Promise<string[]>}
     */
    async getAvailableWorldInfoNames() {
        // 优先使用 TavernHelper
        const helper = getTavernHelper();
        if (helper && helper.getWorldbookNames) {
            const names = helper.getWorldbookNames();
            console.log('[WorldInfoService] TavernHelper 世界书列表:', names);
            return names || [];
        }

        // 回退到原生 API
        try {
            const context = this.getContext();
            const response = await fetch('/api/worldinfo/getall', {
                method: 'POST',
                headers: context.getRequestHeaders(),
                body: JSON.stringify({})
            });
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.warn('[WorldInfoService] 获取世界书列表失败:', e);
        }
        return [];
    }

    /**
     * 获取指定世界书的所有条���
     * @param {string} worldInfoName - 世界书名称
     * @returns {Promise<WorldInfoEntry[]>} 标准化后的条目数组
     */
    async getWorldInfoEntries(worldInfoName) {
        const helper = getTavernHelper();
        let rawEntries = [];

        // 优先使用 TavernHelper.getWorldbook（保持函数名不变）
        if (helper && helper.getWorldbook) {
            try {
                const result = helper.getWorldbook(worldInfoName);
                // 检查是否是 Promise
                if (result && typeof result.then === 'function') {
                    rawEntries = await result;
                } else {
                    rawEntries = result;
                }
                console.log(`[WorldInfoService] TavernHelper.getWorldbook(${worldInfoName}) 返回:`, rawEntries);
            } catch (e) {
                console.warn(`[WorldInfoService] TavernHelper.getWorldbook 失败:`, e);
            }
        }

        // 如果 TavernHelper 失败，回退到原生 API
        if (!rawEntries || rawEntries.length === 0) {
            try {
                const context = this.getContext();
                const response = await fetch('/api/worldinfo/get', {
                    method: 'POST',
                    headers: context.getRequestHeaders(),
                    body: JSON.stringify({ name: worldInfoName })
                });
                if (response.ok) {
                    const worldData = await response.json();
                    if (worldData && worldData.entries) {
                        rawEntries = Object.values(worldData.entries);
                    }
                }
            } catch (e) {
                console.warn(`[WorldInfoService] API 获取世界书失败:`, e);
            }
        }

        // 将原始条目转换为标准格式
        return (rawEntries || []).map((entry, index) =>
            this.normalizeEntry(entry, worldInfoName, index)
        );
    }

    /**
     * 获取当前角色卡绑定的所有世界书的条目
     * @returns {Promise<WorldInfoEntry[]>}
     */
    async getCharacterBoundWorldInfoEntries() {
        const allEntries = [];
        const boundWorldInfos = this.getCharacterBoundWorldInfoNames();

        if (!boundWorldInfos) {
            console.log('[WorldInfoService] 当前角色卡未绑定世界书');
            return allEntries;
        }

        // 收集所有绑定的世界书名称
        const worldInfoNames = [];
        if (boundWorldInfos.primary) {
            worldInfoNames.push(boundWorldInfos.primary);
        }
        if (boundWorldInfos.additional && Array.isArray(boundWorldInfos.additional)) {
            worldInfoNames.push(...boundWorldInfos.additional);
        }

        if (worldInfoNames.length === 0) {
            console.log('[WorldInfoService] 当前角色卡未绑定任何世界书');
            return allEntries;
        }

        // 遍历所有绑定的世界书
        for (const worldInfoName of worldInfoNames) {
            console.log(`[WorldInfoService] 正在加载世界书: ${worldInfoName}`);
            const entries = await this.getWorldInfoEntries(worldInfoName);
            allEntries.push(...entries);
        }

        console.log(`[WorldInfoService] 共获取 ${allEntries.length} 个世界书词条`);
        return allEntries;
    }

    /**
     * 将外部格式的条目标准化为内部格式
     * 这是防腐层的核心方法：无论输入是 TavernHelper 格式还是原生格式，
     * 都转换为统一的 WorldInfoEntry 格式
     *
     * @param {Object} externalEntry - 外部格式的条目
     * @param {string} sourceName - 来源世界书名称
     * @param {number} index - 条目索引
     * @returns {WorldInfoEntry}
     */
    normalizeEntry(externalEntry, sourceName, index) {
        // 检测是否为 TavernHelper 嵌套格式（有 strategy 字段）
        const isTavernHelperFormat = externalEntry.strategy !== undefined;

        /** @type {WorldInfoEntry} */
        const normalized = {
            uid: externalEntry.uid !== undefined ? externalEntry.uid : index,
            name: '',
            content: externalEntry.content || '',
            enabled: true,
            keys: [],
            keysSecondary: [],
            secondaryLogic: 'and_any',
            strategyType: STRATEGY_TYPE.SELECTIVE,
            positionType: 'before_character_definition',
            role: 'system',
            depth: 4,
            order: 100,
            probability: 100,
            scanDepth: null,
            recursion: {
                preventIncoming: false,
                preventOutgoing: false,
                delayUntil: null
            },
            effect: {
                sticky: null,
                cooldown: null,
                delay: null
            },
            _source: sourceName,
            _uid: `${sourceName}_${externalEntry.uid !== undefined ? externalEntry.uid : index}`
        };

        if (isTavernHelperFormat) {
            // TavernHelper 格式：从嵌套结构提取
            normalized.name = externalEntry.name || '';
            normalized.enabled = externalEntry.enabled !== false;

            // 从 strategy 提取
            if (externalEntry.strategy) {
                normalized.strategyType = externalEntry.strategy.type || STRATEGY_TYPE.SELECTIVE;
                normalized.keys = normalizeKeysToArray(externalEntry.strategy.keys);
                if (externalEntry.strategy.keys_secondary) {
                    normalized.keysSecondary = normalizeKeysToArray(externalEntry.strategy.keys_secondary.keys);
                    normalized.secondaryLogic = externalEntry.strategy.keys_secondary.logic || 'and_any';
                }
                normalized.scanDepth = externalEntry.strategy.scan_depth === 'same_as_global'
                    ? null
                    : externalEntry.strategy.scan_depth;
            }

            // 从 position 提取
            if (externalEntry.position) {
                normalized.positionType = externalEntry.position.type || 'before_character_definition';
                normalized.role = externalEntry.position.role || 'system';
                normalized.depth = externalEntry.position.depth || 4;
                normalized.order = externalEntry.position.order || 100;
            }

            normalized.probability = externalEntry.probability || 100;

            // 从 recursion 提取
            if (externalEntry.recursion) {
                normalized.recursion.preventIncoming = externalEntry.recursion.prevent_incoming || false;
                normalized.recursion.preventOutgoing = externalEntry.recursion.prevent_outgoing || false;
                normalized.recursion.delayUntil = externalEntry.recursion.delay_until;
            }

            // 从 effect 提取
            if (externalEntry.effect) {
                normalized.effect.sticky = externalEntry.effect.sticky;
                normalized.effect.cooldown = externalEntry.effect.cooldown;
                normalized.effect.delay = externalEntry.effect.delay;
            }
        } else {
            // SillyTavern 原生格式
            normalized.name = externalEntry.comment || externalEntry.name || '';
            normalized.enabled = externalEntry.disable !== true && externalEntry.enabled !== false;
            normalized.keys = normalizeKeysToArray(externalEntry.key || externalEntry.keys);
            normalized.keysSecondary = normalizeKeysToArray(externalEntry.keysecondary || externalEntry.secondary_keys);
            normalized.secondaryLogic = SELECTIVE_LOGIC_MAP[externalEntry.selectiveLogic] || 'and_any';

            // 确定策略类型
            if (externalEntry.constant === true) {
                normalized.strategyType = STRATEGY_TYPE.CONSTANT;
            } else if (externalEntry.vectorized === true) {
                normalized.strategyType = STRATEGY_TYPE.VECTORIZED;
            } else {
                normalized.strategyType = STRATEGY_TYPE.SELECTIVE;
            }

            normalized.positionType = POSITION_TYPE_MAP[externalEntry.position] || 'before_character_definition';
            normalized.role = ROLE_TYPE_MAP[externalEntry.role] || 'system';
            normalized.depth = externalEntry.depth || 4;
            normalized.order = externalEntry.order || externalEntry.insertion_order || 100;
            normalized.probability = externalEntry.probability || 100;
            normalized.scanDepth = externalEntry.scanDepth;

            normalized.recursion.preventIncoming = externalEntry.excludeRecursion || false;
            normalized.recursion.preventOutgoing = externalEntry.preventRecursion || false;
            normalized.recursion.delayUntil = externalEntry.delayUntilRecursion ? 1 : null;

            normalized.effect.sticky = externalEntry.sticky || null;
            normalized.effect.cooldown = externalEntry.cooldown || null;
            normalized.effect.delay = externalEntry.delay || null;
        }

        // 保留额外字段
        if (externalEntry.extra) {
            normalized.extra = externalEntry.extra;
        }

        return normalized;
    }

    /**
     * 将内部标准格式转换为 TavernHelper 格式（用于注入）
     * @param {WorldInfoEntry} internalEntry - 内部格式条目
     * @returns {Object} TavernHelper 格式条目
     */
    convertToTavernHelperFormat(internalEntry) {
        const tavernEntry = {
            name: internalEntry.name || '',
            content: internalEntry.content || '',
            enabled: internalEntry.enabled !== false,

            strategy: {
                type: internalEntry.strategyType || STRATEGY_TYPE.SELECTIVE,
                keys: internalEntry.keys || [],
                keys_secondary: {
                    logic: internalEntry.secondaryLogic || 'and_any',
                    keys: internalEntry.keysSecondary || []
                },
                scan_depth: internalEntry.scanDepth === null ? 'same_as_global' : internalEntry.scanDepth
            },

            position: {
                type: internalEntry.positionType || 'before_character_definition',
                role: internalEntry.role || 'system',
                depth: internalEntry.depth || 4,
                order: internalEntry.order || 100
            },

            probability: internalEntry.probability || 100,

            recursion: {
                prevent_incoming: internalEntry.recursion?.preventIncoming || false,
                prevent_outgoing: internalEntry.recursion?.preventOutgoing || false,
                delay_until: internalEntry.recursion?.delayUntil !== undefined
                    ? internalEntry.recursion.delayUntil
                    : null
            },

            effect: {
                sticky: internalEntry.effect?.sticky !== undefined ? internalEntry.effect.sticky : null,
                cooldown: internalEntry.effect?.cooldown !== undefined ? internalEntry.effect.cooldown : null,
                delay: internalEntry.effect?.delay !== undefined ? internalEntry.effect.delay : null
            }
        };

        // 保留额外字段
        if (internalEntry.extra) {
            tavernEntry.extra = internalEntry.extra;
        }

        return tavernEntry;
    }

    /**
     * 将内部标准格式转换为导出格式（兼容原有 JSON 结构）
     * @param {WorldInfoEntry} internalEntry - 内部格式条目
     * @returns {Object} 导出格式条目
     */
    convertToExportFormat(internalEntry) {
        return {
            uid: internalEntry.uid,
            comment: internalEntry.name,
            content: internalEntry.content,
            enabled: internalEntry.enabled,
            key: internalEntry.keys,
            keysecondary: internalEntry.keysSecondary,
            selectiveLogic: SELECTIVE_LOGIC_REVERSE_MAP[internalEntry.secondaryLogic] || 0,
            constant: internalEntry.strategyType === STRATEGY_TYPE.CONSTANT,
            selective: internalEntry.strategyType === STRATEGY_TYPE.SELECTIVE,
            vectorized: internalEntry.strategyType === STRATEGY_TYPE.VECTORIZED,
            position: POSITION_TYPE_REVERSE_MAP[internalEntry.positionType] || 0,
            role: ROLE_TYPE_REVERSE_MAP[internalEntry.role] || 0,
            depth: internalEntry.depth,
            order: internalEntry.order,
            probability: internalEntry.probability,
            scanDepth: internalEntry.scanDepth,
            excludeRecursion: internalEntry.recursion?.preventIncoming || false,
            preventRecursion: internalEntry.recursion?.preventOutgoing || false,
            delayUntilRecursion: internalEntry.recursion?.delayUntil !== null,
            sticky: internalEntry.effect?.sticky || 0,
            cooldown: internalEntry.effect?.cooldown || 0,
            delay: internalEntry.effect?.delay || 0,
            _source: internalEntry._source,
            _uid: internalEntry._uid,
            extra: internalEntry.extra
        };
    }

    /**
     * 创建世界书条目（注入）
     * @param {string} worldInfoName - 目标世界书名称
     * @param {WorldInfoEntry[]} entries - 要注入的条目（内部格式）
     * @returns {Promise<Object>} 创建结果
     */
    async createWorldInfoEntries(worldInfoName, entries) {
        const helper = getTavernHelper();

        if (!helper || !helper.createWorldbookEntries) {
            throw new Error('TavernHelper 不可用，请确保已安装 TavernHelper 插件');
        }

        // 将内部格式转换为 TavernHelper 格式
        const tavernEntries = entries.map(entry => this.convertToTavernHelperFormat(entry));

        console.log('[WorldInfoService] 准备注入词条:', tavernEntries);

        // 调用 TavernHelper 原始 API（保持函数名不变）
        try {
            const result = await helper.createWorldbookEntries(worldInfoName, tavernEntries, { render: 'debounced' });
            console.log('[WorldInfoService] 注入成功:', result);
            return result;
        } catch (e) {
            console.error('[WorldInfoService] 注入世界书失败:', e);
            throw new Error(`注入世界书失败: ${e.message}`);
        }
    }

    /**
     * 从导出数据中恢复内部格式
     * @param {Object} exportedEntry - 导出格式的条目
     * @returns {WorldInfoEntry} 内部格式条目
     */
    normalizeFromExportFormat(exportedEntry) {
        return this.normalizeEntry(exportedEntry, exportedEntry._source || 'imported', 0);
    }
}

// 导出单例工厂函数
let serviceInstance = null;

/**
 * 获取 WorldInfoService 单例
 * @param {Function} getContext - SillyTavern 的 getContext 函数
 * @returns {WorldInfoService}
 */
export function getWorldInfoService(getContext) {
    if (!serviceInstance) {
        serviceInstance = new WorldInfoService(getContext);
    }
    return serviceInstance;
}
