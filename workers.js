// ==========================================
// ⚙️ 核心硬编码配置区
// ==========================================

// 1. Telegram Bot Token
const TG_TOKEN = 'api'; 

// 2. OpenRouter API Key
const OPENROUTER_KEY = 'api'; 

// 3. 你的机器人用户名 (不带 @)
const BOT_USERNAME = 'yourbotname'; 

// 4. 主群组兜底 ID (直接发 /unban 时，默认在此群执行)
const DEFAULT_GROUP_ID = '-yourgroupid'; 

// 5. OpenRouter 使用的模型
const AI_MODEL = 'stepfun/step-3.5-flash:free';

// 6. 🌟 极限强化的 AI 判别提示词 (含政治与低俗规则)
const SYSTEM_PROMPT = `你是一个极其严格的社群内容过滤助手。
请判断用户发送的文本是否包含以下任意一种情况：
1. 广告、推销、返佣、邀请注册。
2. 软广引流：包含“求赞”、“求关注”、“按爆”、“助力频道”、“加群”、“私聊”等行为。
3. 灰黑产与机场推广：包含“节点”、“免费节点”、“科学上网”、“搭建教程”并附带推广意图。
4. 文本中包含任何形式的网址、外部链接或频道号。
5. 政治违规：包括带节奏、政治擦边球、参与讨论政治话题。
6. 低俗违规：包括发送色情、恋童、血腥的内容。
只要命中以上任意一条，无论内容包装得多像技术分享或正常交流，请严格只回复 "true"！
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
      
      const messageContent = update.message?.text || update.message?.caption;
      
      if (update.message && messageContent) {
         // 这里只打印表面文字供参考，实际后台会做深度提取
         console.log("📥 收到推送消息，表面内容:", messageContent);
         ctx.waitUntil(processMessage(update.message));
      }
    } catch (error) {
      console.error('❌ 解析请求失败:', error);
    }

    return new Response('OK', { status: 200 });
  }
};

async function processMessage(message) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const tgApiUrl = `https://api.telegram.org/bot${TG_TOKEN}`;
  
  // 🌟 核心修复点 1：透视眼级别的内容提取 (剥开隐藏的色情预览和引用)
  const rawText = (message.text || message.caption || '').trim();
  let fullContent = rawText;
  
  // 提取链接预览中的文字 (专治截图中的隐藏链接引流)
  if (message.web_page) {
      fullContent += " " + (message.web_page.title || "") + " " + (message.web_page.description || "");
  }
  // 提取频道转发的标题
  if (message.forward_from_chat) {
      fullContent += " " + (message.forward_from_chat.title || "");
  }
  // 提取引用内容 (Quote)
  if (message.quote) {
      fullContent += " " + (message.quote.text || "");
  }
  fullContent = fullContent.trim();

  // 🌟 核心修复点 2：抓取隐藏在文字背后的超链接实体
  const entities = message.entities || message.caption_entities || [];
  const hasHiddenLink = entities.some(e => e.type === 'url' || e.type === 'text_link');

  // 如果提取完后依然没有任何内容且没有隐藏链接，才结束
  if (!fullContent && !hasHiddenLink) return; 

  const messageId = message.message_id;
  const firstName = message.from.first_name || '用户'; 
  const chatType = message.chat.type; 

  try {
    // ==========================================
    // 逻辑 A：私聊模式
    // ==========================================
    if (chatType === 'private') {
      
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
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: replyText, parse_mode: 'Markdown' })
        });
        return;
      }

      if (rawText.startsWith('-100')) {
        await fetch(`${tgApiUrl}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chat_id: chatId, 
            text: `✅ 群组 ID [${rawText}] 登记成功！\n\n请将本机器人设置为该群管理员，并赋予【删除】和【封禁/限制】权限即可生效。` 
          })
        });
        return;
      }

      if (rawText === '/start') {
        await fetch(`${tgApiUrl}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chat_id: chatId, 
            text: `👋 欢迎！\n\n🔹 **群友**：如果您错过了群里的按钮，可发送 \`/unban\` (主群) 或 \`/unban 群组ID\` (其他群) 恢复权限。\n🔹 **群主**：如需接入新群，请直接发送群 ID 登记。`,
            parse_mode: 'Markdown'
          })
        });
        return;
      }
      return; 
    }

    // ==========================================
    // 逻辑 B：群组模式 (包含白名单强化修复)
    // ==========================================
    if (chatType === 'group' || chatType === 'supergroup') {
      
      // 检查是否为匿名管理员或以群组名义发言
      if (userId === 1087968824 || (message.sender_chat && message.sender_chat.id === chatId)) {
         console.log(`🛡️ 自动放行：发信人为匿名管理员或群组本身。`);
         return;
      }

      const memberRes = await fetch(`${tgApiUrl}/getChatMember?chat_id=${chatId}&user_id=${userId}`);
      const memberData = await memberRes.json();

      if (memberData.ok) {
        const status = memberData.result.status;
        
        // 只要查到是管理员或群主，立即中断程序并放行
        if (status === 'creator' || status === 'administrator') {
           console.log(`🛡️ 白名单生效：用户 ${userId} 在该群身份为 ${status}，已放行。`); 
           return; 
        }

        let isAd = false;
        
        // 🌟 核心修复点 3：全方位拦截链接 (包含正则 + 隐藏实体 + 频道转发)
        const hasRegexLink = /(https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/|\b)|t\.me\/)/i.test(fullContent);
        const isChannelForward = !!message.forward_from_chat || (message.forward_origin && message.forward_origin.type === 'channel');
        
        const hasLink = hasRegexLink || hasHiddenLink || isChannelForward;
        
        if (hasLink) {
          console.log(`🔗 拦截成功：普通成员 ${userId} 触发了 [正则链接/隐藏链接/频道转发] 必杀，直接判定为违规！`);
          isAd = true;
        } else {
          // 【第二道防线】：如果确实没有链接，将深度提取出的【包含隐藏预览的文字】全部送给 AI
          isAd = await checkAdWithOpenRouter(fullContent);
        }
        
        if (isAd) {
          // 1. 删消息
          await fetch(`${tgApiUrl}/deleteMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: messageId })
          });

          // 2. 禁言
          const restrictRes = await fetch(`${tgApiUrl}/restrictChatMember`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              chat_id: chatId, user_id: userId,
              permissions: { can_send_messages: false }
            })
          });

          const restrictResult = await restrictRes.json();
          
          if (restrictResult.ok) {
            // 3. 发送警告按钮
            const dynamicUnmuteUrl = `https://t.me/${BOT_USERNAME}?start=unban_${chatId}`;
            
            const warningRes = await fetch(`${tgApiUrl}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `⚠️ 检测到用户 [${firstName}](tg://user?id=${userId}) 发布违规内容，已被禁言。\n\n💡 若属误判，请点击下方按钮，或私聊机器人发送 /unban 解除：`,
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [[{
                    text: "🔓 点击此处自助 /unban 解除禁言",
                    url: dynamicUnmuteUrl
                  }]]
                }
              })
            });

            const warningData = await warningRes.json();

            // 4. ⏱️ 10秒后自动撤回机器人提示
            if (warningData.ok) {
              const warningMessageId = warningData.result.message_id; 
              await new Promise(resolve => setTimeout(resolve, 10000));
              await fetch(`${tgApiUrl}/deleteMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, message_id: warningMessageId })
              });
            }
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
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: targetGroupId, 
      user_id: userId,
      permissions: {
        can_send_messages: true, can_send_audios: true, can_send_documents: true,
        can_send_photos: true, can_send_videos: true, can_send_video_notes: true,
        can_send_voice_notes: true, can_send_polls: true, can_send_other_messages: true,
        can_add_web_page_previews: true
      }
    })
  });

  const unrestrictData = await unrestrictRes.json();
  
  if (sendReply) {
    let replyText = unrestrictData.ok 
      ? `✅ 您的发言权限已恢复！现在可以回群 [${targetGroupId}] 聊天了。` 
      : `❌ 解除失败。您可能并没有被禁言，或者机器人不在该群组/没有管理权限。`;

    await fetch(`${tgApiUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: privateChatId, text: replyText })
    });
  }
  
  return unrestrictData.ok; 
}

// 调用 OpenRouter 的 AI 识别封装
async function checkAdWithOpenRouter(text) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: text }],
        temperature: 0.1
      })
    });
    const data = await response.json();
    
    console.log(`🤖 AI 深度分析文本 [${text}] 的结果是:`, data.choices?.[0]?.message?.content);
    
    return data.choices?.[0]?.message?.content?.trim().toLowerCase().includes('true') || false;
  } catch (e) {
    console.error('❌ AI 请求异常:', e);
    return false; 
  }
}
