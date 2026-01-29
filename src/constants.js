/**
 * @fileoverview 常量定义模块
 * 统一管理插件中所有的常量、配置和URL
 */

/**
 * 插件名称
 * @constant {string}
 */
export const EXTENSION_NAME = 'SillyTavernWorkshop';

/**
 * API 基础地址
 * @constant {string}
 */
export const API_BASE_URL = 'https://st-api.pengcyril.dpdns.org';

/**
 * 创意工坊资源基础地址
 * @constant {string}
 */
export const WORKSHOP_BASE_URL = 'https://st-workshop.pengcyril.dpdns.org';

/**
 * 本地存储鉴权 Token 的键名
 * @constant {string}
 */
export const AUTH_TOKEN_KEY = 'st_workshop_auth_token';

/**
 * 本地存储鉴权用户名的键名
 * @constant {string}
 */
export const AUTH_USER_KEY = 'st_workshop_auth_user';

/**
 * JSON 文件最大大小限制（字节）
 * @constant {number}
 */
export const MAX_JSON_SIZE = 8192;

/**
 * 每页显示的条目数
 * @constant {number}
 */
export const PAGE_SIZE = 10;

/**
 * 最大标签数量
 * @constant {number}
 */
export const MAX_TAGS = 5;

/**
 * 标签最大权重分值（5个汉字 = 10分，10个英文字符 = 10分）
 * @constant {number}
 */
export const MAX_TAG_SCORE = 10;

/**
 * 默认插件设置
 * @constant {Object}
 */
export const DEFAULT_SETTINGS = {
    lastUploadTime: null,
    uploadHistory: [],
    downloadHistory: []
};

/**
 * 数据源类型枚举
 * @constant {Object}
 */
export const DATA_SOURCE = {
    WORLD_INFO: 'worldInfo',
    CHAT_DATA: 'chatdata',
    LOCAL_STORAGE: 'localstorage',
    INDEXED_DB: 'indexeddb'
};

/**
 * 内容类型枚举（用于上传时的类型判定）
 * @constant {Object}
 */
export const CONTENT_TYPE = {
    /** 世界书类型 */
    WORLD_INFO: 'WorldInfo',
    /** 聊天数据类型 */
    CHAT_DATA: 'ChatData'
};

/**
 * Toast 消息类型
 * @constant {Object}
 */
export const TOAST_TYPE = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

/**
 * Toast 图标映射
 * @constant {Object}
 */
export const TOAST_ICONS = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
};

/**
 * 世界书策略类型枚举（TavernHelper格式）
 * @constant {Object}
 */
export const STRATEGY_TYPE = {
    CONSTANT: 'constant',
    SELECTIVE: 'selective',
    VECTORIZED: 'vectorized'
};

/**
 * 次要关键词逻辑映射（数值 -> 字符串）
 * @constant {Object}
 */
export const SELECTIVE_LOGIC_MAP = {
    0: 'and_any',
    1: 'and_all',
    2: 'not_all',
    3: 'not_any'
};

/**
 * 次要关键词逻辑反向映射（字符串 -> 数值）
 * @constant {Object}
 */
export const SELECTIVE_LOGIC_REVERSE_MAP = {
    'and_any': 0,
    'and_all': 1,
    'not_all': 2,
    'not_any': 3
};

/**
 * 位置类型映射（数值 -> 字符串）
 * @constant {Object}
 */
export const POSITION_TYPE_MAP = {
    0: 'before_character_definition',
    1: 'after_character_definition',
    2: 'before_example_messages',
    3: 'after_example_messages',
    4: 'before_author_note',
    5: 'after_author_note',
    6: 'at_depth'
};

/**
 * 位置类型反向映射（字符串 -> 数值）
 * @constant {Object}
 */
export const POSITION_TYPE_REVERSE_MAP = {
    'before_character_definition': 0,
    'after_character_definition': 1,
    'before_example_messages': 2,
    'after_example_messages': 3,
    'before_author_note': 4,
    'after_author_note': 5,
    'at_depth': 6
};

/**
 * 角色类型映射（数值 -> 字符串）
 * @constant {Object}
 */
export const ROLE_TYPE_MAP = {
    0: 'system',
    1: 'user',
    2: 'assistant'
};

/**
 * 角色类型反向映射（字符串 -> 数值）
 * @constant {Object}
 */
export const ROLE_TYPE_REVERSE_MAP = {
    'system': 0,
    'user': 1,
    'assistant': 2
};
