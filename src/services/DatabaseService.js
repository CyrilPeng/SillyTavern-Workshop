/**
 * @fileoverview 数据库服务模块
 * 封装 IndexedDB 和 LocalStorage 的读写操作
 */

import { formatSize } from '../utils.js';

/**
 * 数据库服务类
 * 提供统一的数据存储访问接口
 */
export class DatabaseService {
    constructor() {
        /** @type {Map<string, IDBDatabase>} 数据库连接缓存 */
        this.dbCache = new Map();
    }

    // ==================== LocalStorage 操作 ====================

    /**
     * 获取所有 LocalStorage 键名
     * @returns {string[]} 键名数组
     */
    getAllLocalStorageKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                keys.push(key);
            }
        }
        return keys.sort();
    }

    /**
     * 获取 LocalStorage 键值及元信息
     * @returns {Array<{key: string, size: number, sizeFormatted: string}>}
     */
    getLocalStorageKeysWithMeta() {
        const keys = this.getAllLocalStorageKeys();
        return keys.map(key => {
            const value = localStorage.getItem(key);
            const size = value ? new Blob([value]).size : 0;
            return {
                key,
                size,
                sizeFormatted: formatSize(size)
            };
        });
    }

    /**
     * 获取 LocalStorage 值
     * @param {string} key - 键名
     * @returns {any} 解析后的值（如果是 JSON）或原始字符串
     */
    getLocalStorageValue(key) {
        const value = localStorage.getItem(key);
        if (value === null) return null;

        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }

    /**
     * 设置 LocalStorage 值
     * @param {string} key - 键名
     * @param {any} value - 值
     */
    setLocalStorageValue(key, value) {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, stringValue);
    }

    /**
     * 批量获取 LocalStorage 数据
     * @param {string[]} keys - 键名数组
     * @returns {Object} 键值对对象
     */
    getMultipleLocalStorageValues(keys) {
        const result = {};
        for (const key of keys) {
            result[key] = this.getLocalStorageValue(key);
        }
        return result;
    }

    /**
     * 批量设置 LocalStorage 数据
     * @param {Object} data - 键值对对象
     * @returns {{ success: number, failed: number }} 操作结果
     */
    setMultipleLocalStorageValues(data) {
        let success = 0;
        let failed = 0;

        for (const [key, value] of Object.entries(data)) {
            try {
                this.setLocalStorageValue(key, value);
                success++;
            } catch (e) {
                console.warn(`[DatabaseService] 写入 localStorage 失败: ${key}`, e);
                failed++;
            }
        }

        return { success, failed };
    }

    // ==================== IndexedDB 操作 ====================

    /**
     * 检查 IndexedDB.databases() 是否可用
     * @returns {boolean}
     */
    isIndexedDBDatabasesSupported() {
        return typeof indexedDB.databases === 'function';
    }

    /**
     * 获取当前站点下所有的 IndexedDB 数据库名称
     * @returns {Promise<string[]>}
     */
    async getAllDatabaseNames() {
        if (!this.isIndexedDBDatabasesSupported()) {
            console.warn('[DatabaseService] 浏览器不支持 indexedDB.databases()');
            return [];
        }

        try {
            const dbs = await indexedDB.databases();
            return dbs.map(db => db.name).filter(name => name);
        } catch (e) {
            console.error('[DatabaseService] 获取数据库列表失败:', e);
            return [];
        }
    }

    /**
     * 打开 IndexedDB 数据库
     * @param {string} dbName - 数据库名称
     * @returns {Promise<IDBDatabase>}
     */
    openDatabase(dbName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * 获取数据库中的所有对象存储（表）名称
     * @param {string} dbName - 数据库名称
     * @returns {Promise<string[]>}
     */
    async getObjectStoreNames(dbName) {
        try {
            const db = await this.openDatabase(dbName);
            const stores = Array.from(db.objectStoreNames);
            db.close();
            return stores;
        } catch (e) {
            console.error(`[DatabaseService] 获取 ${dbName} 的表列表失败:`, e);
            return [];
        }
    }

    /**
     * 获取所有数据库和表的列表
     * @returns {Promise<Array<{dbName: string, storeName: string, value: string, displayName: string}>>}
     */
    async getAllStores() {
        const allStores = [];
        const dbNames = await this.getAllDatabaseNames();

        for (const dbName of dbNames) {
            try {
                const stores = await this.getObjectStoreNames(dbName);
                for (const storeName of stores) {
                    allStores.push({
                        dbName,
                        storeName,
                        value: `${dbName}|||${storeName}`,
                        displayName: `${dbName} / ${storeName}`
                    });
                }
            } catch (e) {
                console.warn(`[DatabaseService] 读取数据库 ${dbName} 失败:`, e);
            }
        }

        return allStores;
    }

    /**
     * 获取指定表的所有键
     * @param {string} dbName - 数据库名称
     * @param {string} storeName - 表名称
     * @returns {Promise<IDBValidKey[]>}
     */
    async getStoreKeys(dbName, storeName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                const db = request.result;
                try {
                    const transaction = db.transaction(storeName, 'readonly');
                    const store = transaction.objectStore(storeName);
                    const getAllKeysRequest = store.getAllKeys();

                    getAllKeysRequest.onsuccess = () => {
                        resolve(getAllKeysRequest.result);
                    };
                    getAllKeysRequest.onerror = () => reject(getAllKeysRequest.error);

                    transaction.oncomplete = () => db.close();
                } catch (e) {
                    db.close();
                    reject(e);
                }
            };
        });
    }

    /**
     * 获取指定键的值
     * @param {string} dbName - 数据库名称
     * @param {string} storeName - 表名称
     * @param {IDBValidKey} key - 键
     * @returns {Promise<any>}
     */
    async getStoreValue(dbName, storeName, key) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                const db = request.result;
                try {
                    const transaction = db.transaction(storeName, 'readonly');
                    const store = transaction.objectStore(storeName);
                    const getRequest = store.get(key);

                    getRequest.onsuccess = () => {
                        resolve(getRequest.result);
                    };
                    getRequest.onerror = () => reject(getRequest.error);

                    transaction.oncomplete = () => db.close();
                } catch (e) {
                    db.close();
                    reject(e);
                }
            };
        });
    }

    /**
     * 获取指定表的所有数据
     * @param {string} dbName - 数据库名称
     * @param {string} storeName - 表名称
     * @returns {Promise<Array<{key: IDBValidKey, value: any}>>}
     */
    async getStoreData(dbName, storeName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                const db = request.result;
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
                    getAllRequest.onerror = () => reject(getAllRequest.error);

                    transaction.oncomplete = () => db.close();
                } catch (e) {
                    db.close();
                    reject(e);
                }
            };
        });
    }

    /**
     * 写入数据到 IndexedDB
     * @param {string} dbName - 数据库名称
     * @param {string} storeName - 表名称
     * @param {Array<{key?: IDBValidKey, value: any}>} data - 要写入的数据
     * @returns {Promise<void>}
     */
    async writeToStore(dbName, storeName, data) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName);

            request.onerror = () => reject(request.error);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { autoIncrement: true });
                }
            };

            request.onsuccess = async () => {
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

                    upgradeRequest.onsuccess = async () => {
                        const upgradedDb = upgradeRequest.result;
                        try {
                            await this._writeDataToStore(upgradedDb, storeName, data);
                            resolve();
                        } catch (e) {
                            reject(e);
                        }
                    };

                    upgradeRequest.onerror = () => reject(upgradeRequest.error);
                    return;
                }

                try {
                    await this._writeDataToStore(db, storeName, data);
                    resolve();
                } catch (e) {
                    reject(e);
                }
            };
        });
    }

    /**
     * 内部方法：将数据写入指定的 store
     * @private
     * @param {IDBDatabase} db - 数据库连接
     * @param {string} storeName - 表名称
     * @param {Array} data - 数据数组
     * @returns {Promise<void>}
     */
    _writeDataToStore(db, storeName, data) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);

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

    /**
     * 批量写入 IndexedDB 数据
     * @param {Array<{database: string, store: string, data: Array}>} items - 要写入的数据项
     * @returns {Promise<{success: number, failed: number}>}
     */
    async writeMultipleStores(items) {
        let success = 0;
        let failed = 0;

        for (const item of items) {
            const { database, store, data } = item;
            if (database && store && data) {
                try {
                    await this.writeToStore(database, store, data);
                    console.log(`[DatabaseService] IndexedDB 写入成功: ${database}/${store}`);
                    success++;
                } catch (e) {
                    console.warn(`[DatabaseService] 写入 IndexedDB 失败: ${database}/${store}`, e);
                    failed++;
                }
            }
        }

        return { success, failed };
    }
}

// 导出单例
let serviceInstance = null;

/**
 * 获取 DatabaseService 单例
 * @returns {DatabaseService}
 */
export function getDatabaseService() {
    if (!serviceInstance) {
        serviceInstance = new DatabaseService();
    }
    return serviceInstance;
}
