// 确保只在服务器端运行
if (typeof window !== 'undefined') {
  throw new Error('This module can only be used on the server side');
}

import { adminDb } from './firebase-admin';

export async function getUserChatIdsAdmin(userId: string): Promise<string[]> {
  try {
    const snapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('chats')
      .get();
    
    return snapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('Error getting user chat IDs:', error);
    return [];
  }
}

export async function getCachedPoem(chatId: string): Promise<string | null> {
  try {
    const poemDoc = await adminDb.collection('poems').doc(chatId).get();
    return poemDoc.exists ? poemDoc.data()?.text : null;
  } catch (error) {
    console.error('Error getting cached poem:', error);
    return null;
  }
}

export async function cachePoem(chatId: string, poem: string): Promise<void> {
  try {
    await adminDb.collection('poems').doc(chatId).set({
      text: poem,
      createdAt: new Date().toISOString(),
      chatId
    });
  } catch (error) {
    console.error('Error caching poem:', error);
  }
} 