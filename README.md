# 🛡️ TG-AI-Guard: Serverless Telegram 防风控机器人 (双擎版)

基于 **Cloudflare Workers** 与 **OpenRouter AI** 打造的纯无状态、免服务器的 Telegram 社群防卫机器人。专为打击黑灰产、机场推广、频道引流及各类软广设计。

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Platform](https://img.shields.io/badge/Platform-Cloudflare%20Workers-F6821F.svg)
![AI](https://img.shields.io/badge/AI-OpenRouter-brightgreen.svg)

## ✨ 核心特性

- 🚀 **Serverless 零成本部署**：完全依托 Cloudflare Workers 边缘计算，无服务器运维负担，自动全球 CDN 加速响应。
- 🧠 **双擎并发 AI 过滤机制**：
  - 支持配置双 OpenRouter API 密钥与模型。
  - 主备节点同时发起异步推理，任一节点判定为广告即可执行查杀，极大降低单点故障与超时风险。
- ⚡ **分层漏斗式防御**：
  - **L0 正则秒杀**：强正则匹配，瞬间秒杀带 URL、隐藏链接、频道转发的初级推广。
  - **L1 深度语义审查**：提取发信人昵称、用户名及正文内容，交由 AI 进行上下文联系与隐蔽黑话（如“高防”、“科学上网”）审查。
- ⚖️ **防误伤与自动化解封**：
  - 自动识别并放行群主及管理员的发言。
  - 删除违规消息并禁言用户后，推送“阅后即焚”的警告面板，支持用户通过内联按钮私聊自助申请解封 (`/unban`)，降低群主售后成本。
- 🛠️ **断流自愈指令**：
  - 内置私聊隐藏指令 `/resetwebhook`，可一键修复 TG 消息断流与 Webhook 掉线异常。

## 📦 快速部署

### 1. 准备工作
- 前往 [@BotFather](https://t.me/BotFather) 申请一个 Telegram Bot Token。
- 注册 [OpenRouter](https://openrouter.ai/) 获取至少一个 API Key（推荐准备两个以开启双擎模式）。
- 准备一个 [Cloudflare](https://dash.cloudflare.com/) 账号。

### 2. 部署到 Cloudflare
1. 登录 Cloudflare 控制台，进入 **Workers & Pages** -> **Create Worker**。
2. 为 Worker 命名并点击 **Deploy**，随后点击 **Edit Code**。
3. 复制本项目 `worker.js` 中的完整代码覆盖编辑器内的默认代码。
4. 修改代码顶部的**核心硬编码配置区**：
   ```javascript
   const TG_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN'; 
   const OPENROUTER_KEY = 'YOUR_OPENROUTER_API_KEY_1'; 
   // 可选：填入备用 API Key
   const OPENROUTER_KEY_2 = 'YOUR_OPENROUTER_API_KEY_2';

5.点击右上角的 Deploy 保存上线。

###3. 激活挂载 (至关重要)

    在 Telegram 中搜索您的机器人，进入私聊界面。

    发送指令：/resetwebhook

    若机器人回复 ✅ Webhook 权限已强制重置，说明部署彻底成功。

    最后一步：将机器人拉入目标群组，并将其设置为管理员，必须勾选 删除消息 (Delete Messages) 和 封禁用户 (Ban Users) 权限！

⚠️ 保护机制说明：8秒硬熔断

在 Serverless 环境下，若第三方 API 响应过慢，极易导致 Worker 运行超时（Timeout）从而引发 Telegram 持续重发消息。
本项目在代码内部实现了统一的 8 秒硬熔断机制。一旦 OpenRouter 节点在 8 秒内未返回结果，代码将自动捕获超时异常，掐断连接并放行消息，从根本上杜绝系统死锁。
📄 协议

MIT License
