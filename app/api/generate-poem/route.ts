import { HumeService } from '@/lib/hume';
import { adminDb } from '@/lib/firebase-admin';
import fs from 'fs';
import path from 'path';
import OpenAI from "openai";

interface PoemData {
  text: string;
  chatId: string;
  createdAt: string;
}

// Function to read API key from .env.local file directly
const loadEnvFromFile = () => {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars: Record<string, string> = {};
      
      // Parse env file line by line
      envContent.split('\n').forEach(line => {
        // Skip comments and empty lines
        if (!line || line.startsWith('#')) return;
        
        // Extract key and value
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          
          // Remove quotes if present
          if (value.length > 0 && (value.startsWith('"') && value.endsWith('"') || 
                                 value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
          }
          
          envVars[key] = value;
        }
      });
      
      return envVars;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
};

// 使用DeepSeek的API生成诗句
async function generatePoemWithDeepSeek(prompt: string) {
  // First try to get API key from standard environment variables
  let apiKey = process.env.DEEPSEEK_API_KEY;
  
  // If not found, try to load from .env.local file directly
  if (!apiKey) {
    // 尝试使用绝对路径读取.env.local文件
    try {
      const absolutePath = '/Users/vela/Developer/journal/hume-evi-next-js-starter/.env.local';
      
      if (fs.existsSync(absolutePath)) {
        const envContent = fs.readFileSync(absolutePath, 'utf8');
        
        // 直接搜索DEEPSEEK_API_KEY
        const deepseekKeyMatch = envContent.match(/DEEPSEEK_API_KEY=([^\r\n]+)/);
        if (deepseekKeyMatch && deepseekKeyMatch[1]) {
          apiKey = deepseekKeyMatch[1].trim();
        }
      }
    } catch (error) {
      // 静默处理错误
    }
    
    // 仍然尝试使用原来的方法作为后备
    if (!apiKey) {
      const envVars = loadEnvFromFile();
      if (envVars && envVars.DEEPSEEK_API_KEY) {
        apiKey = envVars.DEEPSEEK_API_KEY;
      }
    }
  }
  
  // 如果仍然没有找到API key，使用硬编码的key作为最后的尝试
  if (!apiKey) {
    apiKey = "sk-61d34630a798444baebb65131a72af75";
  }
  
  // 创建OpenAI客户端配置为DeepSeek API
  const deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: apiKey
  });
  
  try {
    // 使用chat completions API
    const completion = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { 
          role: "system", 
          content: "You are a poetic and philosophical assistant that creates beautiful, concise phrases that capture the essence of conversations as a journal entry. Always respond with only the requested poetic phrase, nothing more." 
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      temperature: 0.7,
      max_tokens: 50
    });
    
    const poem = completion.choices[0].message.content?.trim() || '';
    return poem;
  } catch (error) {
    throw error;
  }
}

// what need to be reflected in the poem
// 1. thoughts or philosophy
// 2. emotion with stories
export async function POST(request: Request) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  try {
    const requestBody = await request.json();
    const { conversation, chatId, forceRegenerate } = requestBody;
    
    if (!chatId) {
      throw new Error('Missing chatId');
    }

    if (!conversation) {
      throw new Error('Missing conversation content');
    }

    // 1. 检查数据库中是否已存在poem，且不是强制重新生成
    if (!forceRegenerate) {
      try {
        const existingPoemDoc = await adminDb.collection('poems').doc(chatId).get();
        
        if (existingPoemDoc.exists) {
          const existingData = existingPoemDoc.data() as PoemData;
          
          // 检查是否是默认诗句
          const isDefaultPoem = existingData?.text === "Whispers of human connection" || 
                               existingData?.text === "Moments in conversation";
          
          // 只有当不是默认诗句时才返回缓存
          if (existingData?.text && !isDefaultPoem) {
            return new Response(JSON.stringify({ 
              poem: existingData.text,
              source: 'cache',
              requestId
            }), {
              headers: { 'Content-Type': 'application/json' },
            });
          }
        }
      } catch (dbError) {
        // 继续执行，尝试生成新的poem
      }
    }

    // 2. 使用DeepSeek生成新的poem
    try {
      const promptContent = `Create a poetic and philosophical phrase (4-8 words) starting with one word. Capture these points based on the conversation:
- thoughts or philosophy
- emotion with details of stories
- special moments of the day

The phrase should be philosophical and beautiful, like these examples:
- "Madness, Foucault, another form of civilization"
- "Gym, daily bookshop, building routine."

Here's the conversation to analyze:
${conversation}

Respond with ONLY the poetic phrase, nothing else.`;
      
      const startTime = Date.now();
      const poem = await generatePoemWithDeepSeek(promptContent);
      const endTime = Date.now();

      // 处理生成的文本，确保是简短的诗句
      let finalPoem = poem;
      
      // 使用正则表达式尝试匹配引号中的内容
      const quotedMatch = finalPoem.match(/"([^"]+)"/);
      if (quotedMatch && quotedMatch[1]) {
        finalPoem = quotedMatch[1].trim();
      }
      
      // 如果太长，只保留第一行或提取合适长度的短语
      if (finalPoem.split(/\s+/).length > 8) {
        const lines = finalPoem.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
          finalPoem = lines[0].trim();
        }
        
        // 如果仍然太长，截取4-8个词
        const words = finalPoem.split(/\s+/);
        if (words.length > 8) {
          finalPoem = words.slice(0, 8).join(' ');
        }
      }
      
      // 如果生成的诗句是空的或者太短，使用后备方案
      if (!finalPoem || finalPoem.length < 10) {
        finalPoem = "Meaningful moments in dialogue";
      }

      // 3. 保存到数据库
      try {
        await adminDb.collection('poems').doc(chatId).set({
          text: finalPoem,
          chatId,
          createdAt: new Date().toISOString(),
          requestId
        });
      } catch (saveError) {
        // 继续执行，返回生成的poem
      }

      return new Response(JSON.stringify({ 
        poem: finalPoem,
        source: 'deepseek',
        regenerated: forceRegenerate ? true : false,
        requestId,
        timing: {
          apiCallDuration: endTime - startTime
        }
      }), {
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (apiError) {
      // 简单的后备诗句，不再进行主题分析
      const fallbackPoems = [
        "Thoughts dance through shared moments",
        "Words weave our connected stories",
        "Conversations create shared understanding",
        "Dialogue bridges separate realities",
        "Voices echo in emotional landscapes",
        "Hearts speaking across time zones",
        "Meaningful connections through words",
        "Stories unfold between our worlds"
      ];
      
      const fallbackPoem = fallbackPoems[Math.floor(Math.random() * fallbackPoems.length)];
      
      // 如果是强制重新生成时发生错误，不保存到数据库
      if (!forceRegenerate) {
        try {
          await adminDb.collection('poems').doc(chatId).set({
            text: fallbackPoem,
            chatId,
            createdAt: new Date().toISOString(),
            requestId,
            isFailover: true
          });
        } catch (saveError) {
          // 静默处理错误
        }
      }
      
      return new Response(JSON.stringify({ 
        poem: fallbackPoem,
        source: 'fallback',
        regenerated: forceRegenerate ? true : false,
        requestId,
        error: apiError instanceof Error ? apiError.message : 'Unknown API error'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      poem: "Moments of shared understanding",
      error: error?.message || 'Unknown error occurred',
      source: 'error',
      requestId
    }), {
      status: 200, // 改为200，确保客户端总能得到一个poem
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
