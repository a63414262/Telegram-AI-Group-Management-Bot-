V4.1版本修复新增：

AI 联合审判：AI 会将“聊天内容”和“用户昵称”结合起来看，不仅能看懂“看我名字”这种暗示，还能直接命中昵称里的灰黑产关键词（如“提款机”、“信誉团队”）。

正则双杀：由于这段代码加在正则检测（hasRegexLink）之前，如果以后有骗子直接把昵称改成 t.me/xxxxx 或 xxx.com，即便他发一句“你好”，也会直接触发正则直达必杀，连 AI 额度都不会消耗。


🛡️ Telegram AI 终极防卫机器人 (Dual-Engine AI Guardian)

这是一个专为 Telegram 社群设计的高强度、零漏判、零误杀管理机器人。它不仅具备基础的链接拦截功能，更集成了两路独立的 AI 引擎（如 Nvidia Super 120B & Stepfun）进行并发实时交叉检测，旨在解决传统机器人难以应对的“先发正常消息、后改广告链接”及“复杂混淆链接”等高级黑产对抗手段。
🌟 核心杀手锏
1. 🧠 双擎并发 AI 系统 (High Availability)

    双重验证：同时调用两个 OpenRouter 账号/模型。只要任意一个 AI 判定为违规，立刻执行封禁。

    硬熔断机制：内置 8 秒强制超时保护。即使 AI 服务器卡顿，也会在 8 秒内释放资源，绝不拖慢社群响应速度，防止脚本死机。

    抗限流：通过双账号轮询/并发，完美避开免费模型高频调用的 429 Rate Limit 错误。

2. 🕵️ “透视眼”深度内容解包

    剥离伪装：不仅读取表面文本，还会深度解析 Telegram 消息底层的 Entities（实体）、Web Page Preview（网页预览卡片）及 Quote（引用内容）。

    链接强抽：即使广告主使用乱码伪装文本，机器人也能从底层数据包中强行提取出隐藏的真实 URL。

3. 🛡️ 全方位“编辑消息”捕获

    先发后改必杀：针对黑产“先发正常内容躲避检测，再修改为引流链接”的套路，机器人会对 edited_message 实时二次扫描。

4. 🚀 骨灰级正则引擎

    无视混淆：专门针对 t.me/+ 私密群组链接、带下划线、加号及各种火星文混淆的网址进行暴力匹配。

5. ⚡ 自动化运维

    一键自愈：内置 /resetwebhook 指令，可自动重置 Telegram 底层推送权限，确保“编辑消息”通知永不丢失。

    自助解封：无需算术题，被误伤的用户通过私聊即可秒恢复发言权限。

🛠️ 技术栈

    Runtime: Cloudflare Workers (Edge Computing)

    AI Backend: OpenRouter (Nvidia/Stepfun/Minimax)

    Language: JavaScript (ES6+)

🚀 快速部署
1. 准备配置

修改 index.js 顶部的核心配置区：
JavaScript

const TG_TOKEN = '你的机器人Token';
const OPENROUTER_KEY = '主OpenRouter_Key'; 
const OPENROUTER_KEY_2 = '备OpenRouter_Key'; 
const BOT_USERNAME = '机器人用户名';
const DEFAULT_GROUP_ID = '你的主群组ID';

2. 部署到 Cloudflare

    登录 Cloudflare Dashboard -> Workers & Pages。

    创建新 Worker，粘贴全部代码并部署。

    关键步骤：访问以下网址绑定 Webhook：
   
   https://api.telegram.org/bot<你的TOKEN>/setWebhook?url=https://<你的WORKER域名>

4. 初始化 (重要)
为了让机器人能够读取消息，必须通过 @BotFather 进行以下设置：
    发送 /mybots -> 选择你的机器人 -> Bot Settings。
    Group Privacy: 设置为 Turn OFF。
    Allow Groups: 设置为 ON。
    将机器人拉入群组并设为管理员，确保赋予“删除消息”和“封禁用户”权限。
部署完成后，请务必用你的 Telegram 账号私聊机器人发送以下指令，以开启“编辑消息拦截”权限：

    /resetwebhook

💬 管理指令

    /unban：(用户私聊) 自助解除禁言。

    /resetwebhook：(群主私聊) 强刷底层权限，修复漏判问题。

    自动处理：广告检测命中后，自动 [ 删消息 ] -> [ 禁言用户 ] -> [ 发送10秒阅后即焚警告 ]。

📄 判别规则说明

机器人会严格根据 SYSTEM_PROMPT 进行判定，涵盖以下范围：

    社区引流：包括直播间、交流群、顶级社区口号。

    软广行为：求赞、求关注、按爆、私聊、助力。

    灰黑产：机场推广、科学上网、返佣、邀请码。

    违规内容：政治带节奏、擦边球、低俗色情、血腥。

⚖️ 许可证

MIT License

💡 提示

如果你在使用过程中发现新的绕过手段，只需根据日志调整 SYSTEM_PROMPT 或正则逻辑，机器人即可进化。
