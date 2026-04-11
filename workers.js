// ==========================================
// ⚙️ 核心硬编码配置区
// ==========================================

// 1. Telegram Bot Token (通过 @BotFather 获取)
const TG_TOKEN = 'YOUR_TG_TOKEN'; 

// 2. OpenRouter API Key (主节点)
const OPENROUTER_KEY = 'YOUR_OPENROUTER_KEY_1'; 

// 3. OpenRouter API Key (备用节点，可留空)
const OPENROUTER_KEY_2 = 'YOUR_OPENROUTER_KEY_2'; 

// 🌟 Cloudflare Workers AI 配置
const CF_ACCOUNT_ID = 'YOUR_CF_ACCOUNT_ID';
const CF_API_TOKEN = 'YOUR_CF_API_TOKEN';

// 4. 你的机器人用户名 (不带 @，用于解封链接跳转)
const BOT_USERNAME = 'your_bot_username'; 

// 5. 主群组兜底 ID (例如: -100123456789)
const DEFAULT_GROUP_ID = '-100xxxxxxxxxx'; 

// 6. 各节点使用的 AI 模型 (五擎开关控制)
// 💡 使用说明：如果您想停用某个模型，只需在名称最前面加一个 '#' 即可。
// 例如：'#@cf/moonshotai/kimi-k2.5' 代表停用该节点。去掉 '#' 即可重新启用。
const AI_MODEL = 'openrouter/free'; // 主节点模型
const AI_MODEL_2 = 'openrouter/free'; // 备节点模型
const CF_AI_MODEL_1 = '#@cf/moonshotai/kimi-k2.5'; // CF 边缘节点 1 (Kimi - 默认演示停用)
const CF_AI_MODEL_2 = '@cf/google/gemma-4-26b-a4b-it'; // 🌟 CF 边缘节点 2 (Gemma)
const CF_AI_MODEL_3 = '@cf/zai-org/glm-4.7-flash'; // 🌟 CF 边缘节点 3 (GLM)

// 7. 🌟 骨灰级强化的 AI 判别提示词
const SYSTEM_PROMPT = `你是一个极其严格的社群内容过滤助手，宁可错杀不可放过。
请判断用户发送的文本是否包含以下任意一种情况：
1. 社区/平台宣传：只要文本中包含“直播间”、“交流社区”、“交流群”、“顶级社区”等名词，哪怕是一句极短的感叹或口号，必须视为引流广告！
2. 软广引流：包含“求赞”、“求关注”、“按爆”、“助力频道”、“加群”、“私聊”等行为。
3. 广告、推销、返佣、邀请注册。
4. 灰黑产与机场推广：包含“节点”、“免费节点”、“科学上网”、“搭建教程”并附带推广意图。
5. 文本中包含任何形式的网址、外部链接或频道号。
6. 政治违规：包括带节奏、政治擦边球、参与讨论政治话题。
7. 低俗违规：包括发送色情、恋童、血腥的内容。
只要命中以上任意一条，请严格只回复 "true"！
如果是完全没有上述特征的纯净日常聊天，请严格只回复 "false"。
不要输出任何其他多余的字符、标点或解释。`;

// ==========================================
// 🚀 核心逻辑区
// ==========================================

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Bot is running!', { status: 200 });
    }

    try {
      const update = await request.json();
      
      console.log(`📩 [底层网络接收] 事件类型: ${Object.keys(update).join(', ')}`);
      
      const targetMessage = update.message || update.edited_message || update.channel_post || update.edited_channel_post;
      
      if (targetMessage) {
         ctx.waitUntil(processMessage(targetMessage, request, update));
      }
    } catch (error) {
      console.error('❌ 解析请求失败:', error);
    }

    return new Response('OK', { status: 200 });
  }
};

async function processMessage(message, request, update) {
  const chatId = message.chat.id;
  const userId = message.from?.id || message.sender_chat?.id;
  const tgApiUrl = `https://api.telegram.org/bot${TG_TOKEN}`;
  
  const rawText = (message.text || message.caption || '').trim();
  let fullContent = rawText;
  
  if (message.web_page) {
      fullContent += " " + (message.web_page.title || "") + " " + (message.web_page.description || "");
      if (message.web_page.url) fullContent += " " + message.web_page.url; 
  }
  if (message.forward_from_chat) {
      fullContent += " " + (message.forward_from_chat.title || "") + " " + (message.forward_from_chat.username || "");
  }
  if (message.quote) {
      fullContent += " " + (message.quote.text || "");
  }

  const entities = message.entities || message.caption_entities || [];
  let hasHiddenLink = false;
  
  for (const e of entities) {
      if (e.type === 'url' || e.type === 'text_link') {
          hasHiddenLink = true;
          if (e.url) fullContent += " " + e.url; 
      }
  }
  fullContent = fullContent.trim();

  const isEdit = !!update.edited_message || !!update.edited_channel_post;
  
  if (!fullContent && !hasHiddenLink && !rawText.startsWith('/')) return; 

  if (message.from) {
      const senderInfo = [message.from.first_name, message.from.last_name, message.from.username].filter(Boolean).join(" ");
      if (senderInfo) {
          fullContent += ` [发送者昵称信息: ${senderInfo}]`;
      }
  }

  const messageId = message.message_id;
  const firstName = message.from?.first_name || '用户'; 
  const chatType = message.chat.type; 

  try {
    // ==========================================
    // 逻辑 A：私聊模式 (含隐藏修复指令)
    // ==========================================
    if (chatType === 'private') {
      
      if (rawText === '/resetwebhook') {
        const currentUrl = new URL(request.url).origin + new URL(request.url).pathname;
        const resetRes = await fetch(`${tgApiUrl}/setWebhook`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: currentUrl,
            allowed_updates: ["message", "edited_message", "channel_post", "edited_channel_post"]
          })
        });
        const resetData = await resetRes.json();
        await fetch(`${tgApiUrl}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: `✅ Webhook 权限已强制重置！\n目前已强制开启“接收修改消息”功能。\n官方返回详情：${JSON.stringify(resetData)}` })
        });
        return;
      }

      if (rawText.startsWith('/start unmute_') || rawText.startsWith('/start unban_')) {
        const targetGroupId = rawText.replace('/start unmute_', '').replace('/start unban_', '');
        await handleUnban(tgApiUrl, targetGroupId, userId, chatId, true);
        return;
      }

      if (rawText.startsWith('/unban -100') || rawText.startsWith('/unmute -100')) {
        const parts = rawText.split(' '); 
        if (parts.length === 2) {
          const targetGroupId = parts[1];
          await handleUnban(tgApiUrl, targetGroupId, userId, chatId, true);
        }
        return;
      }

      if (rawText === '/unban' || rawText === '/unmute') {
        const isMainGroupSuccess = await handleUnban(tgApiUrl, DEFAULT_GROUP_ID, userId, chatId, false);
        
        const replyText = isMainGroupSuccess 
          ? "✅ 主群禁言已解除！\n\n*(如果您还被其他群组禁言，请使用指令：/unban 加上您的群组ID，例如：/unban -10012345678)*"
          : "❌ 主群解除失败 (您可能未被禁言，或不在主群中)。\n\n⚠️ **如果您来自其他自助添加的群组：**\n由于您错过了群组内的解封按钮，请在此处直接发送带有群组 ID 的解封指令：\n\n👉 格式：`/unban 您的群组ID`\n*(例如：/unban -10012345678)*";

        await fetch(`${tgApiUrl}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: replyText, parse_mode: 'Markdown' })
        });
        return;
      }

      if (rawText.startsWith('-100')) {
        await fetch(`${tgApiUrl}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: `✅ 群组 ID [${rawText}] 登记成功！\n\n请将本机器人设置为该群管理员，并赋予【删除】和【封禁/限制】权限即可生效。` })
        });
        return;
      }

      if (rawText === '/start') {
        await fetch(`${tgApiUrl}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: `👋 欢迎！\n\n🔹 **群友**：可发送 \`/unban\` (主群) 或 \`/unban 群组ID\` 恢复权限。\n🔹 **群主**：发送群 ID 登记。\n🔹 **管理员急救**：若发现改消息漏杀，发送 \`/resetwebhook\``, parse_mode: 'Markdown' })
        });
        return;
      }
      return; 
    }

    // ==========================================
    // 逻辑 B：群组模式 
    // ==========================================
    if (chatType === 'group' || chatType === 'supergroup') {
      
      console.log(`${isEdit ? '📝 [被编辑修改]' : '📥 [新发送]'} 内容: [${fullContent}]`);

      if (userId === 1087968824 || (message.sender_chat && message.sender_chat.id === chatId)) {
         console.log(`🛡️ 自动放行：发信人为匿名管理员或群组本身。`);
         return;
      }

      const memberRes = await fetch(`${tgApiUrl}/getChatMember?chat_id=${chatId}&user_id=${userId}`);
      const memberData = await memberRes.json();

      if (memberData.ok) {
        const status = memberData.result.status;
        
        if (status === 'creator' || status === 'administrator') {
           console.log(`🛡️ 白名单生效：用户 ${userId} 在该群身份为 ${status}，已放行。`); 
           return; 
        }

        let isAd = false;
        
        const hasRegexLink = /(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/i.test(fullContent);
        const isChannelForward = !!message.forward_from_chat || (message.forward_origin && message.forward_origin.type === 'channel');
        
        const hasLink = hasRegexLink || hasHiddenLink || isChannelForward;
        
        if (hasLink) {
          console.log(`🔗 拦截成功：触发 [正则链接/隐藏链接/频道转发] 必杀，直接判定为违规！`);
          isAd = true;
        } else {
          // 🌟 调用多引擎调度中心
          isAd = await checkAdMultiEngine(fullContent);
        }
        
        if (isAd) {
          const delRes = await fetch(`${tgApiUrl}/deleteMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: messageId })
          });
          const delData = await delRes.json();
          if (!delData.ok) console.log(`⚠️ 删除消息失败:`, delData.description);

          const restrictRes = await fetch(`${tgApiUrl}/restrictChatMember`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              chat_id: chatId, user_id: userId,
              permissions: { can_send_messages: false }
            })
          });
          const restrictResult = await restrictRes.json();
          if (!restrictResult.ok) console.log(`⚠️ 禁言用户失败:`, restrictResult.description);
          
          const dynamicUnmuteUrl = `https://t.me/${BOT_USERNAME}?start=unban_${chatId}`;
          const warningRes = await fetch(`${tgApiUrl}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `⚠️ 检测到用户 [${firstName}](tg://user?id=${userId}) 发布违规内容，已被清理。\n\n💡 若属误判，请点击下方按钮，或私聊机器人发送 /unban 自助解除：`,
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: [[{ text: "🔓 点击此处自助 /unban 解除限制", url: dynamicUnmuteUrl }]] }
            })
          });

          const warningData = await warningRes.json();

          if (warningData.ok) {
            const warningMessageId = warningData.result.message_id; 
            await new Promise(resolve => setTimeout(resolve, 10000));
            await fetch(`${tgApiUrl}/deleteMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, message_id: warningMessageId })
            });
          }
        }
      } else {
        console.error(`❌ 获取成员身份失败: ${memberData.description}`);
      }
    }
  } catch (err) {
    console.error('❌ 执行出错:', err);
  }
}

// 提取出的公共解封函数
async function handleUnban(tgApiUrl, targetGroupId, userId, privateChatId, sendReply = true) {
  const unrestrictRes = await fetch(`${tgApiUrl}/restrictChatMember`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: targetGroupId, user_id: userId,
      permissions: { can_send_messages: true, can_send_audios: true, can_send_documents: true, can_send_photos: true, can_send_videos: true, can_send_video_notes: true, can_send_voice_notes: true, can_send_polls: true, can_send_other_messages: true, can_add_web_page_previews: true }
    })
  });

  const unrestrictData = await unrestrictRes.json();
  
  if (sendReply) {
    let replyText = unrestrictData.ok 
      ? `✅ 您的发言权限已恢复！现在可以回群 [${targetGroupId}] 聊天了。` 
      : `❌ 解除失败。您可能并没有被禁言，或者机器人不在该群组/没有管理权限。`;

    await fetch(`${tgApiUrl}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: privateChatId, text: replyText })
    });
  }
  return unrestrictData.ok; 
}

// ==========================================
// 🤖 AI 引擎核心组
// ==========================================

// 引擎 1/2：OpenRouter 请求封装
async function singleAIFetch(text, key, model, aiName) {
  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 8000));

    const fetchPromise = fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: text }], temperature: 0.1 })
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    const data = await response.json();
    let resultText = "";
    
    if (data.choices && data.choices.length > 0) {
        resultText = data.choices[0].message?.content || "";
    } else if (data.error) {
        console.log(`⚠️ [${aiName}] 触发风控或限流:`, JSON.stringify(data.error));
    }
    
    console.log(`🤖 [${aiName}] 分析结果:`, resultText === "" ? "空" : resultText);
    return resultText.trim().toLowerCase().includes('true');
  } catch (e) {
    if (e.message === 'TIMEOUT') {
        console.error(`🚨 [${aiName}] API 响应超过 8 秒，强行拔网线熔断！`);
    } else {
        console.error(`❌ [${aiName}] 请求异常:`, e.message);
    }
    return false; 
  }
}

// 🌟 引擎 3/4/5：Cloudflare Workers AI 请求封装 (完美兼容多种返回结构)
async function cfAIFetch(text, accountId, token, model, aiName) {
  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 8000));
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
    
    const fetchPromise = fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages: [
          { role: 'system', content: SYSTEM_PROMPT }, 
          { role: 'user', content: text }
        ] 
      })
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    const data = await response.json();
    
    // 如果嫌日志太长，可以在前面加 // 注释掉下面这行
    // console.log(`🔍 [CF 底层透视 - ${aiName}] 请求 ${model} 返回:`, JSON.stringify(data));

    let resultText = "";
    if (data.success && data.result) {
        // 🌟 核心修复：兼容 CF 的两种返回数据结构
        if (data.result.response) {
            // 老模型格式
            resultText = data.result.response;
        } else if (data.result.choices && data.result.choices.length > 0) {
            // 新模型 (如 Gemma, GLM) 格式
            resultText = data.result.choices[0].message?.content || "";
        }
    } else {
        console.log(`⚠️ [${aiName}] API 明确返回失败:`, JSON.stringify(data.errors || data));
    }
    
    console.log(`🤖 [${aiName}] 分析结果:`, resultText === "" ? "空" : resultText);
    return resultText.trim().toLowerCase().includes('true');
  } catch (e) {
    if (e.message === 'TIMEOUT') {
        console.error(`🚨 [${aiName}] API 响应超过 8 秒，强行拔网线熔断！`);
    } else {
        console.error(`❌ [${aiName}] 请求异常:`, e.message);
    }
    return false; 
  }
}

// 🌟 带有开关功能的五擎并发调度中心
async function checkAdMultiEngine(text) {
  console.log(`⚡ 启动多擎 AI 识别分析...`);

  // 检查模型是否被启用 (不为空且不以 '#' 开头)
  const isEnabled = (modelString) => modelString && !modelString.startsWith('#');
  
  // 并发拉起 AI 模型检测，跳过被标记为停用的节点
  const [result1, result2, result3, result4, result5] = await Promise.all([
      // 1. OpenRouter 主节点
      isEnabled(AI_MODEL) 
        ? singleAIFetch(text, OPENROUTER_KEY, AI_MODEL, "主节点(OR 1)")
        : Promise.resolve(false),
      
      // 2. OpenRouter 备节点
      (isEnabled(AI_MODEL_2) && OPENROUTER_KEY_2 && OPENROUTER_KEY_2 !== 'YOUR_OPENROUTER_KEY_2')
        ? singleAIFetch(text, OPENROUTER_KEY_2, AI_MODEL_2, "备节点(OR 2)")
        : Promise.resolve(false),
        
      // 3. CF 边缘节点 1 (Kimi)
      isEnabled(CF_AI_MODEL_1)
        ? cfAIFetch(text, CF_ACCOUNT_ID, CF_API_TOKEN, CF_AI_MODEL_1, "CF边缘节点(Kimi)")
        : Promise.resolve(false),
      
      // 4. CF 边缘节点 2 (Gemma)
      isEnabled(CF_AI_MODEL_2)
        ? cfAIFetch(text, CF_ACCOUNT_ID, CF_API_TOKEN, CF_AI_MODEL_2, "CF边缘节点(Gemma)")
        : Promise.resolve(false),
      
      // 5. CF 边缘节点 3 (GLM)
      isEnabled(CF_AI_MODEL_3)
        ? cfAIFetch(text, CF_ACCOUNT_ID, CF_API_TOKEN, CF_AI_MODEL_3, "CF边缘节点(GLM)")
        : Promise.resolve(false)
  ]);

  if (result1 || result2 || result3 || result4 || result5) {
      console.log(`🚨 联合裁决：命中规则，准备执行清理！`);
      return true;
  }
  return false;
}
