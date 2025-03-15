import { HumeClient } from "hume";
import { ReturnChatEvent } from "hume/api/resources/empathicVoice";
import { storeChatMapping, getUserChatIds } from './db';
import { getAuth } from 'firebase/auth';

export class HumeService {
  private static client: HumeClient;

  private static getClient() {
    if (!this.client) {
      const apiKey = process.env.NEXT_PUBLIC_HUME_API_KEY;
      if (!apiKey) {
        throw new Error('NEXT_PUBLIC_HUME_API_KEY is not set');
      }
      this.client = new HumeClient({ apiKey });
    }
    return this.client;
  }

  static async listChats() {
    try {
      const client = this.getClient();
      const allChats = [];
      let pageNumber = 0;
      let hasMorePages = true;

      while (hasMorePages) {
        const response = await client.empathicVoice.chats.listChats({
          pageNumber,
          pageSize: 50,
          ascendingOrder: false
        });

        allChats.push(...response.data);
        hasMorePages = response.data.length === 50;
        pageNumber++;
      }

      return { data: allChats };
    } catch (error) {
      console.error('Error fetching chats:', error);
      throw error;
    }
  }

  static async getChatEvents(chatId: string): Promise<ReturnChatEvent[]> {
    try {
      const client = this.getClient();
      const allChatEvents: ReturnChatEvent[] = [];

      const chatEventsIterator = await client.empathicVoice.chats.listChatEvents(chatId, {
        pageNumber: 0
      });

      for await (const chatEvent of chatEventsIterator) {
        allChatEvents.push(chatEvent);
      }

      return allChatEvents;
    } catch (error) {
      console.error('Error fetching chat events:', error);
      throw error;
    }
  }

  // 可以添加更多 Hume 相关的方法
  static async getChatById(chatId: string) {
    try {
      const client = this.getClient();
      // TODO: 实现获取单个聊天记录的方法
      // 需要确认 Hume API 的具体方法
      return null;
    } catch (error) {
      console.error('Error fetching chat:', error);
      throw error;
    }
  }

  // 创建新聊天时保存映射
  static async createChat() {
    try {
      const client = this.getClient();
      // @ts-ignore
      const chat = await client.empathicVoice.chats.createChat();
      
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        await storeChatMapping(user.uid, chat.id);
      }
      
      return chat;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  // 获取用户的聊天记录
  static async listUserChats(userId: string, page: number = 0, pageSize: number = 9) {
    try {
      // 获取用户的聊天ID列表
      const userChatIds = await getUserChatIds(userId);
      
      const client = this.getClient();
      const response = await client.empathicVoice.chats.listChats({
        pageNumber: page,
        pageSize: pageSize,
        ascendingOrder: false
      });

      // 过滤属于当前用户的聊天
      const userChats = response.data.filter(chat => 
        userChatIds.includes(chat.id)
      );

      return { 
        data: userChats,
        hasMore: response.data.length === pageSize
      };
    } catch (error) {
      console.error('Error fetching chats:', error);
      throw error;
    }
  }

} 