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
        poem: "Silence holds stories untold",
        source: 'default'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!chatId || !conversation) {
      return new Response(JSON.stringify({ 
        poem: "Whispers echo in empty space",
        source: 'default'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY is not configured');
    }

    const poemRef = adminDb.collection('poems').doc(chatId);
    
    try {
      const poemDoc = await poemRef.get();
      if (poemDoc.exists) {
        return new Response(JSON.stringify({ 
          poem: poemDoc.data()?.text,
          source: 'cache'
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (error) {
      throw new Error('Database connection failed');
    }

    try {
      const anthropic = new Anthropic({
        apiKey: apiKey
      });

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

      if (!response.content[0] || response.content[0].type !== 'text') {
        throw new Error('Invalid response format from Claude');
      }

      let poem = response.content[0].text
        .trim()
        .split('\n')[0]
        .replace(/[\r\n]/g, '');
      
      if (poem.length > 20) {
        poem = "Time flows like river's song";
      }

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

    } catch (error) {
      throw new Error('Claude API call failed');
    }
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      poem: "Time flows like river's song",
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
