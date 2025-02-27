"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { app } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { HumeClient } from "hume";
import { ReturnChatEvent } from "hume/api/resources/empathicVoice";

interface ChatMessage {
  role: string;
  messageText: string;
  timestamp: string;
}

export default function ChatHistoryDetail() {
  const params = useParams();
  const router = useRouter();
  const auth = getAuth(app);
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchChatDetail() {
      if (!user || !params.id) {
        router.push('/');
        return;
      }

      try {
        setLoading(true);
        
        // 1. 从 Firebase 获取聊天记录
        const db = getFirestore(app);
        const chatDoc = await getDoc(doc(db, 'chatHistory', params.id as string));
        
        if (!chatDoc.exists()) {
          setError('Chat not found');
          return;
        }

        const chatData = chatDoc.data();
        
        // 2. 如果有 Hume ID，获取 Hume 的详细记录
        if (chatData.humeId) {
          const humeClient = new HumeClient({
            apiKey: process.env.NEXT_PUBLIC_HUME_API_KEY || ''
          });

          const chatEventsPage = await humeClient.empathicVoice.chats.listChatEvents(chatData.humeId);
          
          // 过滤并格式化消息
          const relevantChatEvents = (chatEventsPage as any).data.filter(
            (chatEvent: ReturnChatEvent) => 
              chatEvent.type === "USER_MESSAGE" || chatEvent.type === "AGENT_MESSAGE"
          );

          const formattedMessages = relevantChatEvents.map((chatEvent: ReturnChatEvent) => ({
            role: chatEvent.role === "USER" ? "User" : "Assistant",
            messageText: chatEvent.messageText,
            timestamp: new Date(chatEvent.timestamp).toLocaleString()
          }));

          setMessages(formattedMessages);
        } else {
          // 如果没有 Hume ID，使用 Firebase 存储的消息
          const formattedMessages = chatData.messages.map((msg: any) => ({
            role: msg.role === 'user' ? 'User' : 'Assistant',
            messageText: msg.content,
            timestamp: new Date(msg.timestamp.seconds * 1000).toLocaleString()
          }));

          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Error fetching chat detail:', error);
        setError('Failed to load chat history');
      } finally {
        setLoading(false);
      }
    }

    fetchChatDetail();
  }, [user, params.id, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/history')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to History
          </Button>
          <h1 className="text-2xl font-bold">Chat Detail</h1>
        </div>

        {loading ? (
          <div className="text-center py-10">Loading...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : (
          <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  message.role === 'User' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'User'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  <div className="text-sm font-medium mb-1">
                    {message.role}
                  </div>
                  <div className="break-words">
                    {message.messageText}
                  </div>
                  <div className="text-xs opacity-70 mt-2">
                    {message.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => {
              // 导出聊天记录
              const transcript = messages
                .map(msg => `[${msg.timestamp}] ${msg.role}: ${msg.messageText}`)
                .join('\n');
              
              const blob = new Blob([transcript], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `chat_transcript_${params.id}.txt`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            Export Transcript
          </Button>
        </div>
      </div>
    </div>
  );
} 