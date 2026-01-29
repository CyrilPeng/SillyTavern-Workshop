<div align="center">

# 🏰 酒馆创意工坊

### SillyTavern Workshop

<p align="center">
  <strong>🎭 为 SillyTavern 打造的社区资源共享平台</strong>
</p>

<p align="center">
  <a href="#-功能特性">功能特性</a> •
  <a href="#-安装方法">安装方法</a> •
  <a href="#-使用指南">使用指南</a> •
  <a href="#-项目结构">项目结构</a> •
  <a href="#-贡献指南">贡献指南</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/SillyTavern-Extension-blueviolet?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgN2wxMCA1IDEwLTV6TTIgMTdsMTAgNSAxMC01TTIgMTJsMTAgNSAxMC01Ii8+PC9zdmc+" alt="SillyTavern Extension">
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="License">
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/CyrilPeng/SillyTavern-Workshop?style=social" alt="GitHub Stars">
  <img src="https://img.shields.io/github/forks/CyrilPeng/SillyTavern-Workshop?style=social" alt="GitHub Forks">
</p>

---

<p align="center">
  <b>⭐ 如果这个项目对你有帮助，请给我们一个 Star！</b><br>
  <i>高星项目可以申请到更好的服务器来服务大家 ✨</i>
</p>

</div>

---

## 📖 简介

**酒馆创意工坊** 是一个为 [SillyTavern](https://github.com/SillyTavern/SillyTavern) 设计的社区资源共享插件。它允许用户轻松地上传、分享和下载世界书（World Info）、聊天数据等资源，让角色扮演体验更加丰富多彩。

<div align="center">

```
┌─────────────────────────────────────────────────────────────┐
│                    🏰 酒馆创意工坊                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   📤 上传      一键分享你的创作到社区                          │
│   📥 下载      浏览并获取其他用户的精彩内容                     │
│   💉 注入      将资源直接导入到你的酒馆                        │
│   🔍 搜索      多维度筛选，快速找到所需                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

</div>

---

## ✨ 功能特性

<table>
<tr>
<td width="50%">

### 📤 上传功能
- 🎭 上传世界书词条到创意工坊
- 💬 分享 LocalStorage 聊天数据
- 🗄️ 导出 IndexedDB 数据库内容
- 🏷️ 支持标签分类（最多5个）
- 📝 添加描述信息便于搜索

</td>
<td width="50%">

### 📥 下载功能
- 🔍 多字段搜索（名称/作者/标签等）
- 🎯 类型筛选（世界书/聊天数据）
- 📄 分页浏览，快速定位
- 👁️ 详情预览，下载前了解内容
- ⚡ 一键下载到本地

</td>
</tr>
<tr>
<td width="50%">

### 💉 智能注入
- 🤖 自动检测数据类型
- 📚 世界书词条直接注入绑定的世界书
- 💾 LocalStorage 数据自动写入
- 🗃️ IndexedDB 数据智能导入
- ✅ 详细的注入结果反馈

</td>
<td width="50%">

### 🎨 现代化界面
- 🌙 精美深色主题设计
- 📱 响应式布局适配
- ⚡ 流畅的交互动画
- 🔔 友好的 Toast 消息提示
- 🎯 直观的操作流程

</td>
</tr>
</table>

---

## 🔐 安全认证

<div align="center">

```
🔒 Discord OAuth2 认证
      │
      ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Discord    │───▶│  验证身份   │───▶│  安全上传   │
│  登录授权   │    │  获取Token  │    │  防止滥用   │
└─────────────┘    └─────────────┘    └─────────────┘
```

</div>

- 使用 Discord OAuth2 进行身份验证
- 上传功能需要登录授权
- 下载和浏览功能无需登录

---

## 📦 安装方法

### 方式一：直接下载

1. 下载本仓库的 ZIP 文件
2. 解压到 SillyTavern 的插件目录：

```bash
SillyTavern/
└── public/
    └── scripts/
        └── extensions/
            └── third-party/
                └── SillyTavern-Workshop/   # 放在这里
                    ├── index.js
                    ├── style.css
                    ├── manifest.json
                    └── src/
```

3. 重启 SillyTavern
4. 在扩展菜单中找到「创意工坊」

### 方式二：直接在酒馆扩展中安装

```bash
https://github.com/CyrilPeng/SillyTavern-Workshop.git
```

---

## 📖 使用指南

### 🚀 快速开始

<details>
<summary><b>📤 如何上传资源</b></summary>

1. 点击侧边栏的「创意工坊」按钮打开面板
2. 使用 Discord 账号登录
3. 在「上传」标签页中：
   - 选择要上传的世界书词条或聊天数据
   - 填写名称、作者、版本等信息
   - 添加标签便于搜索
   - 预览 JSON 内容（需小于 8KB）
   - 点击「上传到创意工坊」

</details>

<details>
<summary><b>📥 如何下载资源</b></summary>

1. 切换到「下载」标签页
2. 使用搜索框和筛选器找到想要的资源
3. 点击卡片查看详情
4. 选择「下载」保存到本地，或「注入」直接导入

</details>

<details>
<summary><b>💉 如何注入数据</b></summary>

1. 在下载页面找到想要的资源
2. 点击「注入」按钮
3. 确认注入操作
4. 插件会自动检测数据类型并注入到对应位置：
   - 世界书词条 → 当前角色卡绑定的世界书
   - LocalStorage → 浏览器本地存储
   - IndexedDB → 浏览器数据库

</details>

---

## 🏗️ 项目结构

```
SillyTavern-Workshop/
├── 📄 index.js              # 主入口文件
├── 🎨 style.css             # 样式文件
├── 📋 manifest.json         # 插件配置
├── 📖 README.md             # 项目说明
├── 📜 LICENSE               # MIT 许可证
│
└── 📁 src/                  # 源代码目录
    ├── 📄 constants.js      # 常量定义
    ├── 📄 utils.js          # 工具函数
    ├── 📄 state.js          # 状态管理
    │
    ├── 📁 api/              # API 通信层
    │   ├── 📄 workshopApi.js    # 创意工坊 API
    │   └── 📄 discordAuth.js    # Discord 认证
    │
    ├── 📁 services/         # 服务层
    │   ├── 📄 WorldInfoService.js   # 世界书服务（防腐层）
    │   └── 📄 DatabaseService.js    # 数据库服务
    │
    └── 📁 ui/               # UI 层
        ├── 📄 components.js     # HTML 组件模板
        ├── 📄 renderers.js      # DOM 渲染器
        ├── 📄 eventBinder.js    # 事件绑定
        └── 📄 modal.js          # 弹窗组件
```

### 🎯 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Components  │  │  Renderers  │  │EventBinder  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│                      Service Layer                          │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │  WorldInfoService    │  │  DatabaseService     │         │
│  │  (Anti-Corruption)   │  │  (LocalStorage/IDB)  │         │
│  └──────────────────────┘  └──────────────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                        API Layer                            │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │    WorkshopApi       │  │    DiscordAuth       │         │
│  └──────────────────────┘  └──────────────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                    External Services                        │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │   TavernHelper API   │  │   Workshop Server    │         │
│  └──────────────────────┘  └──────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ 技术栈

<div align="center">

| 技术 | 用途 |
|:---:|:---:|
| ![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black) | 核心开发语言 |
| ![jQuery](https://img.shields.io/badge/jQuery-3.x-0769AD?style=flat-square&logo=jquery&logoColor=white) | DOM 操作 |
| ![CSS3](https://img.shields.io/badge/CSS3-Styling-1572B6?style=flat-square&logo=css3&logoColor=white) | 界面样式 |
| ![Discord](https://img.shields.io/badge/Discord-OAuth2-5865F2?style=flat-square&logo=discord&logoColor=white) | 用户认证 |

</div>

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献

1. **Fork** 本仓库
2. 创建你的功能分支：`git checkout -b feature/AmazingFeature`
3. 提交你的更改：`git commit -m 'Add some AmazingFeature'`
4. 推送到分支：`git push origin feature/AmazingFeature`
5. 打开一个 **Pull Request**

### 问题反馈

如果你发现了 Bug 或有新功能建议，请 [创建 Issue](https://github.com/CyrilPeng/SillyTavern-Workshop/issues/new)。

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源许可证。

---

## 🙏 致谢

- [SillyTavern](https://github.com/SillyTavern/SillyTavern) - 优秀的 AI 角色扮演前端
- [TavernHelper](https://github.com/n0vi028/JS-Slash-Runner) - 提供世界书操作 API
- 所有贡献者和用户的支持 ❤️

---

<div align="center">

<p>
  <b>Made with ❤️ by the Workshop Team</b>
</p>

<p>
  <a href="https://github.com/CyrilPeng/SillyTavern-Workshop">
    <img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github" alt="GitHub">
  </a>
</p>

<p>
  <sub>⭐ Star us on GitHub — it motivates us a lot!</sub>
</p>

</div>
