import { getFirestore, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { app } from './firebase';

const db = getFirestore(app);

// 存储聊天记录映射
export async function storeChatMapping(userId: string, chatId: string) {
  try {
    await addDoc(collection(db, 'chats_mapping'), {
      userId,
      chatId,
      createdAt: new Date()
    });
  } catch (error) {
    console.error("Error storing chat mapping:", error);
  }
}

// 获取用户的聊天ID列表
export async function getUserChatIds(userId: string): Promise<string[]> {
  try {
    const q = query(
      collection(db, 'chats_mapping'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    const chatIds = querySnapshot.docs.map(doc => doc.data().chatId);
    
    return chatIds;
  } catch (error) {
    console.error("Error getting chat IDs:", error);
    return [];
  }
}

// 添加测试函数
export async function testChatMapping(userId: string) {
  try {
    const chatIds = await getUserChatIds(userId);
    console.log("Found chat mappings for user:", {
      userId,
      chatIds,
      count: chatIds.length
    });
    return chatIds;
  } catch (error) {
    console.error("Error testing chat mapping:", error);
    return [];
  }
} 