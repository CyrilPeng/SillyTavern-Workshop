/**
 * @fileoverview 通用工具函数模块
 * 包含纯函数工具，无副作用
 */

import { MAX_TAG_SCORE, TOAST_ICONS } from './constants.js';

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * HTML 转义，防止 XSS 攻击
 * @param {string} text - 要转义的文本
 * @returns {string} 转义后的安全 HTML
 */
export function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小字符串
 */
export function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * 计算字符串的 UTF-8 字节大小
 * @param {string} str - 要计算的字符串
 * @returns {number} 字节大小
 */
export function getByteSize(str) {
    if (!str) return 0;
    // 使用 TextEncoder 计算 UTF-8 编码后的字节大小
    return new TextEncoder().encode(str).length;
}

/**
 * 显示 Toast 消息
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型: 'success' | 'error' | 'warning' | 'info'
 */
export function showToast(message, type = 'info') {
    const toast = $(`
        <div class="workshop-toast ${type}">
            <i class="fa-solid ${TOAST_ICONS[type] || TOAST_ICONS.info}"></i>
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

/**
 * 验证标签长度
 * 规则：汉字算2分，ASCII字符算1分，总分不超过10
 * @param {string} text - 标签文本
 * @returns {{ valid: boolean, score: number }} 验证结果
 */
export function validateTagLength(text) {
    let score = 0;
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        // ASCII char counts as 1, non-ASCII counts as 2
        score += (code >= 0 && code <= 127) ? 1 : 2;
    }
    return { valid: score <= MAX_TAG_SCORE, score };
}

/**
 * 获取北京时间字符串 (ISO 8601 格式)
 * @returns {string} 北京时间 ISO 字符串
 */
export function getBeijingTimeISO() {
    const now = new Date();
    const offset = 8 * 60 * 60 * 1000; // UTC+8
    return new Date(now.getTime() + offset).toISOString().replace('Z', '+08:00');
}

/**
 * 安全解析 JSON，失败返回 null
 * @param {string} jsonString - JSON 字符串
 * @returns {any|null} 解析结果或 null
 */
export function safeJsonParse(jsonString) {
    try {
        return JSON.parse(jsonString);
    } catch {
        return null;
    }
}

/**
 * 深拷贝对象
 * @param {any} obj - 要拷贝的对象
 * @returns {any} 深拷贝后的对象
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch {
        return obj;
    }
}

/**
 * 截断字符串
 * @param {string} str - 原字符串
 * @param {number} maxLength - 最大长度
 * @param {string} suffix - 后缀（默认 '...'）
 * @returns {string} 截断后的字符串
 */
export function truncate(str, maxLength, suffix = '...') {
    if (!str || str.length <= maxLength) return str || '';
    return str.substring(0, maxLength) + suffix;
}

/**
 * 检查 TavernHelper 是否可用
 * @returns {boolean} 是否可用
 */
export function isTavernHelperAvailable() {
    return typeof window.TavernHelper !== 'undefined';
}

/**
 * 获取 TavernHelper 实例（带空值检查）
 * @returns {Object|null} TavernHelper 或 null
 */
export function getTavernHelper() {
    return window.TavernHelper || null;
}

/**
 * 生成唯一ID
 * @param {string} prefix - ID前缀
 * @returns {string} 唯一ID
 */
export function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 将关键词字符串或数组标准化为数组
 * @param {string|string[]} keys - 关键词
 * @returns {string[]} 关键词数组
 */
export function normalizeKeysToArray(keys) {
    if (Array.isArray(keys)) {
        return keys.map(k => String(k).trim()).filter(k => k);
    }
    if (typeof keys === 'string' && keys) {
        return keys.split(',').map(k => k.trim()).filter(k => k);
    }
    return [];
}
