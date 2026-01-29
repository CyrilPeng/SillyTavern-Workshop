/**
 * @fileoverview 弹窗逻辑模块
 * 管理详情弹窗和确认对话框
 */

import { escapeHtml } from '../utils.js';
import { createDetailModalContent } from './components.js';

/**
 * 弹窗管理器类
 */
export class ModalManager {
    constructor() {
        /** @type {Object|null} 当前显示的条目数据 */
        this.currentItem = null;

        /** @type {number|null} 当前条目索引 */
        this.currentIndex = null;
    }

    /**
     * 显示详情弹窗
     * @param {Object} item - 条目数据
     * @param {number} index - 条目索引
     */
    showDetail(item, index) {
        if (!item) return;

        this.currentItem = item;
        this.currentIndex = index;

        $('#modal-title').text(item.name || '未命名');

        const { body, footer } = createDetailModalContent(item, index);
        $('#modal-body').html(body);
        $('#modal-footer').html(footer);

        $('#workshop-detail-modal').show();
    }

    /**
     * 关闭详情弹窗
     */
    closeDetail() {
        $('#workshop-detail-modal').hide();
        this.currentItem = null;
        this.currentIndex = null;
    }

    /**
     * 获取当前显示的条目数据
     * @returns {Object|null}
     */
    getCurrentItem() {
        return this.currentItem;
    }

    /**
     * 获取当前条目索引
     * @returns {number|null}
     */
    getCurrentIndex() {
        return this.currentIndex;
    }

    /**
     * 显示确认对话框
     * @param {Object} options - 配置选项
     * @param {string} options.title - 标题
     * @param {string} options.message - 消息内容
     * @param {string} [options.confirmText] - 确认按钮文本
     * @param {string} [options.cancelText] - 取消按钮文本
     * @returns {Promise<boolean>} 用户是否确认
     */
    confirm(options) {
        return new Promise((resolve) => {
            const {
                title = '确认',
                message = '确定要执行此操作吗？',
                confirmText = '确认',
                cancelText = '取消'
            } = options;

            // 创建确认对话框
            const modalHtml = `
                <div id="workshop-confirm-modal" class="workshop-modal" style="z-index: 10000000;">
                    <div class="workshop-modal-content" style="max-width: 400px;">
                        <div class="modal-header">
                            <h3>${escapeHtml(title)}</h3>
                            <button id="confirm-modal-close-btn" class="modal-close-btn">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div class="modal-body" style="text-align: center; padding: 24px;">
                            <p style="margin: 0; font-size: 14px;">${escapeHtml(message)}</p>
                        </div>
                        <div class="modal-footer">
                            <button id="confirm-modal-cancel" class="workshop-btn secondary">
                                ${escapeHtml(cancelText)}
                            </button>
                            <button id="confirm-modal-confirm" class="workshop-btn primary">
                                ${escapeHtml(confirmText)}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            $('body').append(modalHtml);

            const cleanup = () => {
                $('#workshop-confirm-modal').remove();
            };

            // 绑定事件
            $('#confirm-modal-confirm').on('click', () => {
                cleanup();
                resolve(true);
            });

            $('#confirm-modal-cancel, #confirm-modal-close-btn').on('click', () => {
                cleanup();
                resolve(false);
            });

            // 点击背景关闭
            $('#workshop-confirm-modal').on('click', (e) => {
                if (e.target.id === 'workshop-confirm-modal') {
                    cleanup();
                    resolve(false);
                }
            });
        });
    }

    /**
     * 显示提示对话框
     * @param {Object} options - 配置选项
     * @param {string} options.title - 标题
     * @param {string} options.message - 消息内容
     * @param {string} [options.buttonText] - 按钮文本
     * @returns {Promise<void>}
     */
    alert(options) {
        return new Promise((resolve) => {
            const {
                title = '提示',
                message = '',
                buttonText = '确定'
            } = options;

            const modalHtml = `
                <div id="workshop-alert-modal" class="workshop-modal" style="z-index: 10000000;">
                    <div class="workshop-modal-content" style="max-width: 400px;">
                        <div class="modal-header">
                            <h3>${escapeHtml(title)}</h3>
                            <button id="alert-modal-close-btn" class="modal-close-btn">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div class="modal-body" style="text-align: center; padding: 24px;">
                            <p style="margin: 0; font-size: 14px;">${escapeHtml(message)}</p>
                        </div>
                        <div class="modal-footer" style="justify-content: center;">
                            <button id="alert-modal-ok" class="workshop-btn primary" style="min-width: 100px;">
                                ${escapeHtml(buttonText)}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            $('body').append(modalHtml);

            const cleanup = () => {
                $('#workshop-alert-modal').remove();
            };

            $('#alert-modal-ok, #alert-modal-close-btn').on('click', () => {
                cleanup();
                resolve();
            });

            $('#workshop-alert-modal').on('click', (e) => {
                if (e.target.id === 'workshop-alert-modal') {
                    cleanup();
                    resolve();
                }
            });
        });
    }

    /**
     * 显示世界书选择对话框
     * @param {string[]} worldInfoNames - 可选的世界书名称列表
     * @returns {Promise<string|null>} 选中的世界书名称或 null
     */
    selectWorldInfo(worldInfoNames) {
        return new Promise((resolve) => {
            if (!worldInfoNames || worldInfoNames.length === 0) {
                resolve(null);
                return;
            }

            const optionsHtml = worldInfoNames.map(name =>
                `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`
            ).join('');

            const modalHtml = `
                <div id="workshop-select-wi-modal" class="workshop-modal" style="z-index: 10000000;">
                    <div class="workshop-modal-content" style="max-width: 450px;">
                        <div class="modal-header">
                            <h3>选择目标世界书</h3>
                            <button id="select-wi-close-btn" class="modal-close-btn">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div class="modal-body" style="padding: 24px;">
                            <label style="display: block; margin-bottom: 8px; color: var(--workshop-text);">
                                选择要注入词条的世界书:
                            </label>
                            <select id="select-wi-dropdown" style="
                                width: 100%; padding: 12px;
                                background: var(--workshop-surface);
                                border: 2px solid var(--workshop-border);
                                border-radius: 8px; color: var(--workshop-text);
                            ">
                                ${optionsHtml}
                            </select>
                        </div>
                        <div class="modal-footer">
                            <button id="select-wi-cancel" class="workshop-btn secondary">
                                取消
                            </button>
                            <button id="select-wi-confirm" class="workshop-btn primary">
                                确认选择
                            </button>
                        </div>
                    </div>
                </div>
            `;

            $('body').append(modalHtml);

            const cleanup = () => {
                $('#workshop-select-wi-modal').remove();
            };

            $('#select-wi-confirm').on('click', () => {
                const selected = $('#select-wi-dropdown').val();
                cleanup();
                resolve(selected || null);
            });

            $('#select-wi-cancel, #select-wi-close-btn').on('click', () => {
                cleanup();
                resolve(null);
            });

            $('#workshop-select-wi-modal').on('click', (e) => {
                if (e.target.id === 'workshop-select-wi-modal') {
                    cleanup();
                    resolve(null);
                }
            });
        });
    }
}

// 导出单例
let modalManagerInstance = null;

/**
 * 获取 ModalManager 单例
 * @returns {ModalManager}
 */
export function getModalManager() {
    if (!modalManagerInstance) {
        modalManagerInstance = new ModalManager();
    }
    return modalManagerInstance;
}
