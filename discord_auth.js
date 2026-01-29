// discord_auth.js
// 独立的 Discord 鉴权模块 (包含手动填入功能)

export class DiscordAuthModule {
    constructor(config) {
        this.apiBaseUrl = config.apiBaseUrl;
        this.storageKey = config.storageKey || 'st_workshop_auth_token';
        this.userKey = config.userKey || 'st_workshop_auth_user';
        this.onAuthChange = config.onAuthChange || (() => {});
        
        // 绑定上下文
        this.handleMessage = this.handleMessage.bind(this);
        this.manualLogin = this.manualLogin.bind(this);
        
        // 初始化监听器
        window.addEventListener('message', this.handleMessage);
    }

    /** 获取当前 Token */
    getToken() { return localStorage.getItem(this.storageKey); }
    /** 获取当前用户名 */
    getUser() { return localStorage.getItem(this.userKey); }
    /** 检查是否已登录 */
    isAuthenticated() { return !!this.getToken(); }

    /** 打开登录窗口 */
    login() {
        const width = 500;
        const height = 700;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;
        window.open(`${this.apiBaseUrl}/auth/login`, 'DiscordLogin', `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=yes`);
    }

    /** 登出 */
    logout() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.userKey);
        this.onAuthChange(false, null);
    }

    /** 
     * 手动填入 Token 登录 
     */
    manualLogin() {
        const token = prompt("请粘贴您获取到的 Token (以 eyJ 开头的长字符串):");
        if (!token) return;

        // 简单的格式校验
        if (!token.startsWith("eyJ") || token.split('.').length !== 3) {
            alert("Token 格式不正确，请确保复制了完整的内容。");
            return;
        }

        try {
            // 解析 JWT 获取用户名 (仅用于前端显示)
            const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            const username = payload.username || "User";

            // 保存
            localStorage.setItem(this.storageKey, token);
            localStorage.setItem(this.userKey, username);

            // 更新状态
            this.onAuthChange(true, username);
            if (window.toastr) window.toastr.success(`手动登录成功: ${username}`);

        } catch (e) {
            console.error(e);
            alert("Token 解析失败，可能是无效的 Token。");
        }
    }

    /** 处理自动同步消息 */
    handleMessage(event) {
        const data = event.data;
        if (data && data.type === 'ST_WORKSHOP_AUTH') {
            if (data.token) {
                localStorage.setItem(this.storageKey, data.token);
                localStorage.setItem(this.userKey, data.user || 'Unknown');
                this.onAuthChange(true, data.user);
                if (window.toastr) window.toastr.success(`登录成功: ${data.user}`);
            }
        }
    }

    /** 生成 UI 按钮 HTML */
    renderButton() {
        // === 已登录状态 ===
        if (this.isAuthenticated()) {
            return `
                <div class="auth-status" style="
                    display: flex; align-items: center; gap: 10px;
                    background: rgba(0, 0, 0, 0.3); padding: 6px 12px; border-radius: 6px; margin-right: 10px;
                    border: 1px solid rgba(255,255,255,0.1);
                ">
                    <i class="fa-brands fa-discord" style="color: #5865F2;"></i>
                    <span style="font-weight: bold; color: #fff; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${this.getUser()}
                    </span>
                    <i id="auth-logout-btn" class="fa-solid fa-right-from-bracket" 
                       style="cursor: pointer; color: #ff6b6b; margin-left: 5px; font-size: 14px; transition: 0.2s;" 
                       title="退出登录">
                    </i>
                </div>`;
        }

        // === 未登录状态 (登录按钮 + 手动填入按钮) ===
        return `
            <div style="display:flex; align-items:center; gap:5px; margin-right:10px;">
                <!-- 登录按钮 -->
                <button id="auth-login-btn" class="menu_button" style="
                    background-color: #5865F2 !important; color: white !important; border: none !important;
                    padding: 8px 16px !important; border-radius: 6px !important; font-size: 14px !important;
                    font-weight: 600 !important; cursor: pointer; display: flex; align-items: center; gap: 8px;
                    white-space: nowrap; height: auto !important; line-height: normal !important;
                ">
                    <i class="fa-brands fa-discord"></i> Discord 登录
                </button>
                
                <!-- 手动填入按钮 -->
                <button id="auth-manual-btn" class="menu_button" style="
                    background-color: #2b2d31 !important; color: #aaa !important; border: 1px solid #444 !important;
                    padding: 8px 10px !important; border-radius: 6px !important; cursor: pointer;
                    height: auto !important; line-height: normal !important;
                " title="无法自动同步？点击手动填入 Token">
                    <i class="fa-solid fa-key"></i>
                </button>
            </div>
        `;
    }

    /** 绑定 UI 事件 */
    bindEvents() {
        const loginBtn = document.getElementById('auth-login-btn');
        const manualBtn = document.getElementById('auth-manual-btn');
        const logoutBtn = document.getElementById('auth-logout-btn');

        if (loginBtn) {
            loginBtn.onclick = (e) => { e.stopPropagation(); this.login(); };
        }

        if (manualBtn) {
            manualBtn.onclick = (e) => { e.stopPropagation(); this.manualLogin(); };
        }

        if (logoutBtn) {
            logoutBtn.onclick = (e) => {
                e.stopPropagation();
                if(confirm('确定要退出 Discord 登录吗？')) this.logout();
            };
        }
    }
}
