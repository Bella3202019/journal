import { HumeClient } from "hume";
import type { ReturnChat, ReturnChatEvent } from "hume/api/resources/empathicVoice";
import fs from "fs";
import { getUserChatIds } from './db';

export class HumeService {
  private static client: HumeClient;

  private static getClient() {
    if (!this.client) {
      const apiKey = process.env.NEXT_PUBLIC_HUME_API_KEY;
      if (!apiKey) {
        throw new Error('NEXT_PUBLIC_HUME_API_KEY is not set');
      }
      this.client = new HumeClient({
        apiKey,
      });
    }
    return this.client;
  }

  static async listChats() {
    const client = this.getClient();
    try {
      return await client.empathicVoice.chats.listChats({
        pageNumber: 0,
        pageSize: 50,
        ascendingOrder: false
      });
    } catch (error) {
      console.error('Error listing chats:', error);
      throw error;
    }
  }

  static async listUserChats(userId: string, page: number = 0, pageSize: number = 20) {
    try {
      const userChatIds = await getUserChatIds(userId);
      const client = this.getClient();
      const response = await client.empathicVoice.chats.listChats({
        pageNumber: page,
        pageSize: pageSize,
        ascendingOrder: false
      });

      const userChats = response.data.filter(chat => 
        userChatIds.includes(chat.id)
      );

      return { 
        data: userChats,
        hasMore: response.data.length === pageSize
      };
    } catch (error) {
      console.error('Error fetching user chats:', error);
      throw error;
    }
  }

  static async getChatEvents(chatId: string): Promise<ReturnChatEvent[]> {
    const client = this.getClient();
    try {
      const response = await client.empathicVoice.chats.listChatEvents(chatId);
      return response.data;
    } catch (error) {
      console.error('Error getting chat events:', error);
      throw error;
    }
  }

  static async generateTranscript(chatId: string, outputPath?: string): Promise<string> {
    try {
      const chatEvents = await this.getChatEvents(chatId);
      const relevantChatEvents = chatEvents.filter(
        (chatEvent) => chatEvent.type === "USER_MESSAGE" || chatEvent.type === "AGENT_MESSAGE"
      );

      const transcriptLines = relevantChatEvents.map((chatEvent) => {
        const role = chatEvent.role === "USER" ? "User" : "Assistant";
        const timestamp = new Date(chatEvent.timestamp).toLocaleString();
        return `[${timestamp}] ${role}: ${chatEvent.messageText}`;
      });

      const transcript = transcriptLines.join("\n");

      if (outputPath) {
        try {
          fs.writeFileSync(outputPath, transcript, "utf8");
          console.log(`Transcript saved to ${outputPath}`);
        } catch (fileError) {
          console.error(`Error writing to file ${outputPath}:`, fileError);
          throw fileError;
        }
      }

      return transcript;
    } catch (error) {
      console.error('Error generating transcript:', error);
      throw error;
    }
  }
} 