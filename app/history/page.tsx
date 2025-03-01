"use client";


import { useEffect, useState } from 'react';
import { HumeService } from '@/lib/hume';
import { cn } from "@/utils";
import dynamic from "next/dynamic";
import { ReturnChatEvent } from "hume/api/resources/empathicVoice";
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { getAuth } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { app } from '@/lib/firebase';
import { getUserChatIds } from '@/lib/db';

const AuthButton = dynamic(() => import("@/components/AuthButton"), {
  ssr: false,
});

interface FormattedChat {
  chatId: string;
  startTime: string;
  duration: string;
  summary: string;
  messages: {
    role: string;
    timestamp: string;
    messageText: string;
  }[];
}

export default function HistoryPage() {
  const router = useRouter();
  const auth = getAuth(app);
  const [user] = useAuthState(auth);
  const [formattedChats, setFormattedChats] = useState<FormattedChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedChatId, setExpandedChatId] = useState<string | null>(null);
  
  // 分页相关状态
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const CHATS_PER_PAGE = 10;
  const [allChats, setAllChats] = useState<any[]>([]);

  const formatChatEvents = async (chat: { chatId: string; events: ReturnChatEvent[] }): Promise<FormattedChat> => {
    const relevantEvents = chat.events.filter(
      (event) => event.type === "USER_MESSAGE" || event.type === "AGENT_MESSAGE"
    );

    const messages = relevantEvents.map(event => ({
      role: event.role === "USER" ? "User" : "Dela",
      timestamp: new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messageText: event.messageText || ''
    }));

    // 构建对话内容
    const conversation = messages.map(msg => `${msg.role}: ${msg.messageText}`).join('\n');
    
    // 使用 Claude 3.5 生成诗句
    const response = await fetch('/api/generate-poem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        conversation,
        chatId: chat.chatId  // 添加 chatId
      })
    });
    
    const { poem } = await response.json();

    const firstEvent = chat.events[0];
    const lastEvent = chat.events[chat.events.length - 1];
    const durationMs = lastEvent.timestamp - firstEvent.timestamp;
    const durationSeconds = Math.floor(durationMs / 1000);
    const duration = `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`;

    const startDate = new Date(firstEvent.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let startTimeStr;
    if (startDate.toDateString() === today.toDateString()) {
      startTimeStr = `Today, ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (startDate.toDateString() === yesterday.toDateString()) {
      startTimeStr = `Yesterday, ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      startTimeStr = startDate.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    return {
      chatId: chat.chatId,
      startTime: startTimeStr,
      duration,
      summary: poem,
      messages
    };
  };

  useEffect(() => {
    async function fetchHistory() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // 1. 获取用户的聊天ID列表
        const userChatIds = await getUserChatIds(user.uid);
        
        // 2. 获取所有聊天
        const chatsResponse = await HumeService.listChats();
        
        // 3. 过滤出用户的聊天并按时间排序
        const userChats = chatsResponse.data
          .filter(chat => userChatIds.includes(chat.id))
          .sort((a, b) => {
            // 添加空值检查，如果没有 endTimestamp 则使用当前时间
            const timeA = a.endTimestamp ? new Date(a.endTimestamp).getTime() : Date.now();
            const timeB = b.endTimestamp ? new Date(b.endTimestamp).getTime() : Date.now();
            return timeB - timeA;
          });

        setAllChats(userChats);
        
        // 4. 只获取第一页的聊天事件
        await loadMoreChats(userChats);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
  }, [user]);

  const loadMoreChats = async (chats = allChats) => {
    const startIndex = (page - 1) * CHATS_PER_PAGE;
    const endIndex = startIndex + CHATS_PER_PAGE;
    const currentPageChats = chats.slice(startIndex, endIndex);

    if (currentPageChats.length === 0) {
      setHasMore(false);
      return;
    }

    // 获取当前页的聊天事件
    const chatsWithEventsPromises = currentPageChats.map(async (chat) => {
      const events = await HumeService.getChatEvents(chat.id);
      return {
        chatId: chat.id,
        events
      };
    });

    const newChatsWithEvents = await Promise.all(chatsWithEventsPromises);
    const newFormattedChats = await Promise.all(newChatsWithEvents.map(formatChatEvents));
    
    setFormattedChats(prev => [...prev, ...newFormattedChats]);
    setHasMore(endIndex < chats.length);
  };

  const toggleChat = (chatId: string) => {
    setExpandedChatId(expandedChatId === chatId ? null : chatId);
  };

  return (
    <main className={cn(
      "flex flex-col",
      "w-full min-h-screen",
      "bg-gray-50 dark:bg-zinc-900",
      "text-zinc-900 dark:text-zinc-100",
    )}>
      <div className={cn(
        "sticky top-0",
        "z-10",
        "px-4 py-3",
        "bg-gray-50/80 dark:bg-zinc-900/80",
        "backdrop-blur-sm",
        "border-b border-gray-200 dark:border-zinc-800",
        "flex justify-between items-center"
      )}>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="hover:bg-gray-200/70 dark:hover:bg-zinc-800/70"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className={cn(
            "text-lg font-medium",
            "text-gray-900 dark:text-gray-100",
          )}>
            Moments Shared with Dela
          </h1>
        </div>
        <AuthButton />
      </div>

      <div className={cn(
        "flex-1",
        "p-4 md:p-6",
        "max-w-[800px]",
        "mx-auto",
        "w-full"
      )}>
        {isLoading ? (
          <div className="text-center py-8">Loading chat history...</div>
        ) : (
          <>
            <div className="space-y-3">
              {formattedChats.map((chat, index) => (
                <div 
                  key={`chat-${chat.chatId}-${index}`}
                  className={cn(
                    "group",
                    "bg-white dark:bg-zinc-800",
                    "rounded-xl",
                    "border dark:border-zinc-700",
                    "shadow-sm",
                    "transition-all duration-200",
                    "hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600",
                    "cursor-pointer",
                    "overflow-hidden",
                    "p-5"
                  )}
                  onClick={() => toggleChat(chat.chatId)}
                >
                  <div className={cn(
                    "flex justify-between items-center",
                    "text-xs",
                    "text-gray-500 dark:text-gray-400"
                  )}>
                    <time>
                      {chat.startTime}
                    </time>
                    <div>
                      {chat.duration}
                    </div>
                  </div>
                  
                  <div className={cn(
                    "mt-3",
                    "text-base italic",
                    "text-gray-600 dark:text-gray-400",
                    "leading-relaxed",
                    "font-normal"
                  )}>
                    {chat.summary}
                  </div>

                  {expandedChatId === chat.chatId && (
                    <div className={cn(
                      "mt-4",
                      "space-y-4",
                      "bg-gray-50 dark:bg-zinc-800/50",
                      "rounded-lg"
                    )}>
                      {chat.messages.map((message, messageIndex) => (
                        <div 
                          key={`message-${chat.chatId}-${messageIndex}`}
                          className={cn(
                            "p-4",
                            "transition-colors duration-200",
                            "rounded-lg",
                            "bg-gray-100 dark:bg-zinc-700/50"
                          )}
                        >
                          <div className={cn(
                            "flex items-center gap-2 mb-2",
                            "text-sm font-medium",
                            message.role === "User" 
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-green-600 dark:text-green-400"
                          )}>
                            <span>{message.role}</span>
                            <span className="text-gray-400 dark:text-gray-500 text-xs">
                              {message.timestamp}
                            </span>
                          </div>
                          <div className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-200">
                            {message.messageText}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {hasMore && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPage(prev => prev + 1);
                    loadMoreChats();
                  }}
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
} 