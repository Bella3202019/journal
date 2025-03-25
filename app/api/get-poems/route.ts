import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

// 定义Poem接口
interface Poem {
  chatId: string;
  text: string;
  createdAt?: string;
}

export async function POST(request: Request) {
  try {
    const { chatIds } = await request.json();
    
    if (!chatIds || !Array.isArray(chatIds)) {
      return NextResponse.json({ error: 'Invalid chatIds' }, { status: 400 });
    }
    
    // 明确声明poems数组的类型
    const poems: Poem[] = [];
    
    // 批处理查询，每次最多30个ID
    for (let i = 0; i < chatIds.length; i += 30) {
      const batch = chatIds.slice(i, i + 30);
      const batchSnapshot = await adminDb.collection('poems')
        .where('chatId', 'in', batch)
        .get();
      
      batchSnapshot.docs.forEach(doc => {
        const data = doc.data();
        poems.push({
          chatId: data.chatId,
          text: data.text,
          createdAt: data.createdAt
        });
      });
    }
    
    return NextResponse.json({ poems });
  } catch (error: any) {
    console.error('Error fetching poems:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 