import { HumeService } from '@/lib/hume';
import { Anthropic } from '@anthropic-ai/sdk';
import { adminDb } from '@/lib/firebase-admin';


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

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY is not configured');
    }

    const anthropic = new Anthropic({
      apiKey: apiKey
    });

    console.log('Calling Claude API...');
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

      console.log('Claude API response received:', response);

      if (!response.content[0] || response.content[0].type !== 'text') {
        throw new Error('Invalid response format from Claude');
      }

      let poem = response.content[0].text
        .trim()
        .split('\n')[0]
        .replace(/[\r\n]/g, '');

      console.log('Generated poem:', poem);

      return new Response(JSON.stringify({ 
        poem,
        source: 'claude'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (apiError: any) {
      console.error('Claude API error:', apiError);
      throw new Error(apiError?.message || 'Unknown Claude API error');
    }

  } catch (error: any) {
    console.error('Full error details:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Unknown error occurred',
      source: 'error',
      details: error?.stack
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
