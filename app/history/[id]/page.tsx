"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { app } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { HumeService } from '@/lib/hume';
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
  const [user, loading] = useAuthState(auth);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    async function fetchChatDetail() {
      if (loading) return;
      
      if (!user) {
        router.push('/');
        return;
      }

      try {
        setPageLoading(true);
        setError(null);
        
        const events = await HumeService.getChatEvents(params.id as string);
        
        const formattedMessages: ChatMessage[] = events
          .filter((event: ReturnChatEvent) => 
            event.type === "USER_MESSAGE" || event.type === "AGENT_MESSAGE"
          )
          .map((event: ReturnChatEvent) => ({
            role: event.role === "USER" ? 'Me' : 'Echo',
            messageText: event.messageText || '',
            timestamp: new Date(event.timestamp).toLocaleString()
          }));

        setMessages(formattedMessages);
      } catch (error: any) {
        console.error('Error fetching chat detail:', error);
        setError(error?.message || 'Failed to load chat history');
        setMessages([]);
      } finally {
        setPageLoading(false);
      }
    }

    fetchChatDetail();
  }, [user, params.id, router, loading]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center py-10">Loading...</div>
    </div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 pb-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/history')}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="text-sm sm:text-base">Back to History</span>
          </Button>
        </div>

        {pageLoading ? (
          <div className="text-center py-6 sm:py-10">Loading...</div>
        ) : error ? (
          <div className="text-center py-6 sm:py-10 text-red-500">{error}</div>
        ) : (
          <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow overflow-y-auto">
            <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${
                    message.role !== 'Echo' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[88%] sm:max-w-[80%] rounded-lg p-3 sm:p-4 ${
                      message.role !== 'Echo'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-medium mb-1">
                      {message.role}
                    </div>
                    <div className="text-sm sm:text-base break-words">
                      {message.messageText}
                    </div>
                    <div className="text-[10px] sm:text-xs opacity-70 mt-1 sm:mt-2">
                      {message.timestamp}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 