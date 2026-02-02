/**
 * @fileoverview 创意工坊 API 通信模块
 * 封装与后端服务器的所有 HTTP 通信
 */

import { API_BASE_URL, WORKSHOP_BASE_URL } from '../constants.js';

/**
 * 创意工坊 API 服务类
 */
export class WorkshopApi {
    /**
     * @param {Object} [options] - 配置选项
     * @param {string} [options.apiBaseUrl] - API 基础地址
     * @param {string} [options.workshopBaseUrl] - 创意工坊资源地址
     * @param {Function} [options.getToken] - 获取鉴权 Token 的函数
     */
    constructor(options = {}) {
        this.apiBaseUrl = options.apiBaseUrl || API_BASE_URL;
        this.workshopBaseUrl = options.workshopBaseUrl || WORKSHOP_BASE_URL;
        this.getToken = options.getToken || (() => null);
    }

    /**
     * 设置 Token 获取函数
     * @param {Function} getTokenFn - 获取 Token 的函数
     */
    setTokenGetter(getTokenFn) {
        this.getToken = getTokenFn;
    }

    /**
     * 获取创意工坊目录数据
     * @returns {Promise<Array>} 创意工坊条目列表
     */
    async getWorkshopIndex() {
        const response = await fetch(`${this.apiBaseUrl}/index.json`);
        if (!response.ok) {
            throw new Error('获取创意工坊目录失败');
        }
        return await response.json();
    }

    /**
     * 下载创意工坊条目文件
     * @param {string} fileName - 文件名
     * @returns {Promise<Object>} 文件内容（JSON 对象）
     */
    async downloadWorkshopItem(fileName) {
        const response = await fetch(`${this.workshopBaseUrl}/${fileName}`);
        if (!response.ok) {
            throw new Error('下载文件失败');
        }
        return await response.json();
    }

    /**
     * 从完整 URL 下载创意工坊条目文件
     * @param {string} url - 完整下载链接
     * @returns {Promise<Object>} 文件内容（JSON 对象）
     */
    async downloadWorkshopItemFromUrl(url) {
        // 尝试处理中文路径，避免重复编码
        const safeUrl = decodeURI(url) === url ? encodeURI(url) : url;
        const response = await fetch(safeUrl);
        if (!response.ok) {
            throw new Error(`下载文件失败: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    }

    /**
     * 下载创意工坊条目为 Blob（用于保存文件）
     * @param {string} fileName - 文件名
     * @returns {Promise<Blob>} 文件 Blob
     */
    async downloadWorkshopItemAsBlob(fileName) {
        const response = await fetch(`${this.workshopBaseUrl}/${fileName}`);
        if (!response.ok) {
            throw new Error(`下载文件失败: ${response.status} ${response.statusText}`);
        }
        return await response.blob();
    }

    /**
     * 从完整 URL 下载创意工坊条目为 Blob
     * @param {string} url - 完整下载链接
     * @returns {Promise<Blob>} 文件 Blob
     */
    async downloadWorkshopItemAsBlobFromUrl(url) {
        // 尝试处理中文路径
        const safeUrl = decodeURI(url) === url ? encodeURI(url) : url;
        const response = await fetch(safeUrl);
        if (!response.ok) {
            throw new Error(`下载文件失败: ${response.status} ${response.statusText}`);
        }
        return await response.blob();
    }

    /**
     * 上传内容到创意工坊
     * @param {Object} data - 上传数据
     * @param {string} data.cardname - 角色卡名称
     * @param {string} data.name - 内容名称
     * @param {string} data.author - 作者
     * @param {string} data.version - 版本
     * @param {string} data.type - 类型
     * @param {string} [data.tags] - 标签（逗号分隔）
     * @param {string} [data.description] - 描述
     * @param {string} data.fileContent - 文件内容（JSON 字符串）
     * @returns {Promise<Object>} 上传结果
     */
    async uploadToWorkshop(data) {
        const token = this.getToken();
        if (!token) {
            throw new Error('请先登录 Discord 才能上传');
        }

        const formData = new FormData();

        // 创建 JSON 文件
        const blob = new Blob([data.fileContent], { type: 'application/json' });
        const fileName = `${data.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
        const file = new File([blob], fileName, { type: 'application/json' });

        // 添加到 FormData
        formData.append('file', file);
        formData.append('cardname', data.cardname);
        formData.append('name', data.name);
        formData.append('author', data.author);
        formData.append('version', data.version);
        formData.append('type', data.type);
        if (data.tags) formData.append('tags', data.tags);
        if (data.description) formData.append('description', data.description);

        const response = await fetch(`${this.apiBaseUrl}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('登录已过期，请重新登录');
            }
            const errorText = await response.text();
            throw new Error(errorText || '上传失败');
        }

        return await response.json();
    }

    /**
     * 删除创意工坊条目
     * @param {number|string} id - 条目 ID
     * @returns {Promise<Object>} 删除结果
     */
    async deleteWorkshopItem(id) {
        const token = this.getToken();
        if (!token) {
            throw new Error('请先登录 Discord');
        }

        const response = await fetch(`${this.apiBaseUrl}/delete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id })
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('登录已过期，请重新登录');
            }
            if (response.status === 403) {
                throw new Error('您没有权限删除此条目');
            }
            const errorText = await response.text();
            throw new Error(errorText || '删除失败');
        }

        return await response.json();
    }

    /**
     * 触发文件下载
     * @param {Blob} blob - 文件 Blob
     * @param {string} fileName - 文件名
     */
    triggerDownload(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// 导出单例
let apiInstance = null;

/**
 * 获取 WorkshopApi 单例
 * @param {Object} [options] - 配置选项
 * @returns {WorkshopApi}
 */
export function getWorkshopApi(options) {
    if (!apiInstance) {
        apiInstance = new WorkshopApi(options);
    }
    return apiInstance;
}
