import { HumeService } from '@/lib/hume';
import { Anthropic } from '@anthropic-ai/sdk';
import { adminDb } from '@/lib/firebase-admin';


// what need to be reflected in the poem
// 1. thoughts or philosophy
// 2. emotion with stories
export async function POST(request: Request) {
  try {
    const { conversation, chatId } = await request.json();
    
    // 检查是否只有一条消息
    const messageCount = (conversation.match(/\n/g) || []).length;
    if (messageCount <= 1) {
      return new Response(JSON.stringify({ 
        poem: "Silence holds stories untold",  // 4 words
        source: 'default'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 验证输入参数
    console.log('Input validation:', {
      hasConversation: !!conversation,
      hasValidChatId: !!chatId,
      conversationLength: conversation?.length,
      chatId
    });

    if (!chatId || !conversation) {
      return new Response(JSON.stringify({ 
        poem: "Whispers echo in empty space",  // 5 words
        source: 'default'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 检查 API key
    const apiKey = process.env.CLAUDE_API_KEY;
    console.log('API key check:', {
      hasApiKey: !!apiKey,
      keyLength: apiKey?.length
    });

    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY is not configured');
    }

    // 创建数据库引用
    const poemRef = adminDb.collection('poems').doc(chatId);
    
    // 检查数据库连接
    try {
      const poemDoc = await poemRef.get();
      console.log('Database check:', {
        connected: true,
        docExists: poemDoc.exists,
        docData: poemDoc.exists ? poemDoc.data() : null
      });

      if (poemDoc.exists) {
        return new Response(JSON.stringify({ 
          poem: poemDoc.data()?.text,
          source: 'cache'
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (error: unknown) {
      console.error('Database error:', error);
      if (error instanceof Error) {
        throw new Error(`Database connection failed: ${error.message}`);
      } else {
        throw new Error('Database connection failed: Unknown error');
      }
    }

    // Claude API 调用
    try {
      const anthropic = new Anthropic({
        apiKey: apiKey
      });

      console.log('Calling Claude API...');
      const response = await anthropic.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: 100,
        temperature: 0.7,
        messages: [{
          role: "user",
          content: `Create a very short, single line of poetic verse (maximum 20 characters) that captures the essence of this conversation between User and Dela. Focus on:

1. The user's core emotions and feelings
2. Key thoughts or reflections
3. The emotional journey

Here's the conversation:
${conversation}

Important: Return ONLY ONE line of verse, no more than 20 characters, with no line breaks or explanations.`
        }]
      });

      console.log('Claude API response:', response);

      if (!response.content[0] || response.content[0].type !== 'text') {
        throw new Error('Invalid response format from Claude');
      }

      let poem = response.content[0].text
        .trim()
        .split('\n')[0]
        .replace(/[\r\n]/g, '');
      
      // 如果生成的诗超过20个字符，使用默认诗句
      if (poem.length > 20) {
        poem = "Time flows like river's song";  // 5 words
      }

      // 保存到数据库
      await poemRef.set({
        text: poem,
        createdAt: new Date().toISOString(),
        chatId
      });

      return new Response(JSON.stringify({ 
        poem,
        source: 'claude'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error: unknown) {
      console.error('Claude API error:', error);
      if (error instanceof Error) {
        throw new Error(`Claude API call failed: ${error.message}`);
      } else {
        throw new Error('Claude API call failed: Unknown error');
      }
    }
    
  } catch (error: unknown) {
    console.error('Error in generate-poem:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error
    });
    
    return new Response(JSON.stringify({ 
      poem: "Time flows like river's song",  // 5 words
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : typeof error
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
