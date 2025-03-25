import { HumeService } from '@/lib/hume';
import { Anthropic } from '@anthropic-ai/sdk';
import { adminDb } from '@/lib/firebase-admin';

interface PoemData {
  text: string;
  chatId: string;
  createdAt: string;
}

// what need to be reflected in the poem
// 1. thoughts or philosophy
// 2. emotion with stories
export async function POST(request: Request) {
  try {
    const { conversation, chatId } = await request.json();
    
    if (!chatId) {
      throw new Error('Missing chatId');
    }

    if (!conversation) {
      throw new Error('Missing conversation content');
    }

    // 1. 首先检查数据库中是否已存在poem
    try {
      const existingPoemDoc = await adminDb.collection('poems').doc(chatId).get();
      if (existingPoemDoc.exists) {
        console.log(`Found existing poem for chat ${chatId}`);
        const existingData = existingPoemDoc.data() as PoemData;
        if (existingData?.text) {
          return new Response(JSON.stringify({ 
            poem: existingData.text,
            source: 'cache'
          }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    } catch (dbError) {
      console.error('Error checking existing poem:', dbError);
      // 继续执行，尝试生成新的poem
    }

    // 2. 如果不存在，则生成新的poem
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY is not configured');
    }

    const anthropic = new Anthropic({
      apiKey: apiKey
    });

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: 100,
        temperature: 0.7,
        messages: [{
          role: "user",
          content: `Create a poetic and philosophical phrase that captures the deep meaning of this conversation. 
The phrase should be beautiful and thought-provoking, similar to these examples:
- "To be unfree is to be unnatural"
- "Love is a self-education"
- "Life flows like river dreams"

1. The main emotion or feeling expressed
2. A key insight or realization
3. The overall mood or atmosphere

Here's the conversation:
${conversation}

Important: Return only ONE clear poetic phrase (4-8 words). No punctuation, no explanation.`
        }]
      });

      if (!response.content[0] || response.content[0].type !== 'text') {
        throw new Error('Invalid response format from Claude');
      }

      let poem = response.content[0].text
        .trim()
        .split('\n')[0]
        .replace(/[\r\n]/g, '');

      // 3. 保存到数据库
      try {
        await adminDb.collection('poems').doc(chatId).set({
          text: poem,
          chatId,
          createdAt: new Date().toISOString()
        });
      } catch (saveError) {
        console.error('Error saving poem:', saveError);
        // 继续执行，返回生成的poem
      }

      return new Response(JSON.stringify({ 
        poem,
        source: 'claude'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (apiError) {
      console.error('Claude API error:', apiError);
      const fallbackPoem = "Whispers of human connection";
      
      // 保存默认poem
      try {
        await adminDb.collection('poems').doc(chatId).set({
          text: fallbackPoem,
          chatId,
          createdAt: new Date().toISOString()
        });
      } catch (saveError) {
        console.error('Error saving fallback poem:', saveError);
      }
      
      return new Response(JSON.stringify({ 
        poem: fallbackPoem,
        source: 'fallback'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    console.error('Full error details:', error);
    return new Response(JSON.stringify({ 
      poem: "Moments in conversation",
      error: error?.message || 'Unknown error occurred',
      source: 'error'
    }), {
      status: 200, // 改为200，确保客户端总能得到一个poem
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
