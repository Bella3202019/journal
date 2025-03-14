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
import { Lora } from 'next/font/google';

const AuthButton = dynamic(() => import("@/components/AuthButton"), {
  ssr: false,
});

// 配置 Lora 字体
const lora = Lora({
  subsets: ['latin'],
  display: 'swap',
});

interface FormattedChat {
  chatId: string;
  startTime: string;
  duration: string;
  summary: string;
  imagePath: string;
  messages: {
    role: string;
    timestamp: string;
    messageText: string;
  }[];
}

// 获取随机图片的函数
const getRandomHistoryImage = () => {
  const images = [
    '1_green.PNG',
    '2_blue.PNG',
    '3_yellow.PNG',
    '4_lightblue.PNG',
    // ... 添加所有图片名称
  ];
  return `/history/${images[Math.floor(Math.random() * images.length)]}`;
};

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
  const CHATS_PER_PAGE = 9;
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

    const firstEvent = chat.events[0];
    const lastEvent = chat.events[chat.events.length - 1];
    const durationMs = lastEvent.timestamp - firstEvent.timestamp;
    const durationSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    
    const duration = minutes > 0 
      ? `${minutes}m ${seconds}s`
      : `${seconds}s`;

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

    let poem: string;
    
    try {
      // 使用 generate-poem API（它会处理缓存逻辑）
      const conversation = messages.map(msg => `${msg.role}: ${msg.messageText}`).join('\n');
      
      const response = await fetch('/api/generate-poem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversation,
          chatId: chat.chatId
        })
      });
      
      const { poem: newPoem } = await response.json();
      poem = newPoem || "Time flows like river's song";
      
    } catch (error) {
      console.error('Error generating poem:', error);
      poem = "Time flows like river's song";
    }

    return {
      chatId: chat.chatId,
      startTime: startTimeStr,
      duration,
      summary: poem,
      imagePath: getRandomHistoryImage(),
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
        // 1. 从 API 获取用户的聊天ID列表
        const chatIdsResponse = await fetch(`/api/user-chats?userId=${user.uid}`);
        const { chatIds } = await chatIdsResponse.json();
        
        if (!chatIds) {
          throw new Error('Failed to fetch chat IDs');
        }
        
        // 2. 获取所有聊天
        const chatsResponse = await fetch('/api/hume/chats');
        const chatsData = await chatsResponse.json();
        
        // 3. 过滤出用户的聊天并按时间排序
        const userChats = chatsData.chats_page
          .filter((chat: any) => chatIds.includes(chat.id))
          .sort((a: any, b: any) => b.start_timestamp - a.start_timestamp);

        setAllChats(userChats);
        
        // 4. 只获取前9个聊天事件
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
      const eventsResponse = await fetch(`/api/hume/chat-events?chatId=${chat.id}`);
      const events = await eventsResponse.json();
      return {
        chatId: chat.id,
        events: events.data
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
      lora.className,
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
        "max-w-[80%]",
        "mx-auto",
        "w-full"
      )}>
        {isLoading ? (
          <div className="text-center py-8">Loading chat history...</div>
        ) : (
          <>
            <div className={cn(
              "grid",
              "grid-cols-1 md:grid-cols-3",
              "gap-4 md:gap-6"
            )}>
              {formattedChats.map((chat, index) => (
                <div 
                  key={`chat-${chat.chatId}-${index}`}
                  className={cn(
                    "group",
                    "backdrop-blur-sm",
                    "bg-white/30 dark:bg-zinc-800/30",
                    "rounded-xl",
                    "border border-gray-200/50 dark:border-zinc-700/50",
                    "shadow-sm",
                    "transition-all duration-200",
                    "hover:shadow-md hover:border-gray-300/70 dark:hover:border-zinc-600/70",
                    "cursor-pointer",
                    "overflow-hidden"
                  )}
                  onClick={() => toggleChat(chat.chatId)}
                >
                  {/* 图片部分 */}
                  <div className="relative overflow-hidden bg-transparent">
                    <img
                      src={chat.imagePath}
                      alt="Conversation Memory"
                      className="w-full object-contain block rounded-t-xl"
                      style={{ verticalAlign: 'bottom' }}
                    />
                  </div>

                  {/* 内容部分 */}
                  <div className="p-4 bg-white/30 dark:bg-zinc-800/30 backdrop-blur-sm">
                    <div className={cn(
                      "flex justify-between items-center",
                      "text-xs",
                      "text-gray-600 dark:text-gray-300",
                      "mb-3"
                    )}>
                      <time>{chat.startTime}</time>
                      <div>{chat.duration}</div>
                    </div>
                    
                    <div className={cn(
                      "text-sm",
                      "text-gray-700 dark:text-gray-200",
                      "leading-relaxed",
                      "line-clamp-3",
                      "font-normal"
                    )}>
                      {chat.summary}
                    </div>
                  </div>

                  {/* 展开的对话内容 */}
                  {expandedChatId === chat.chatId && (
                    <div className={cn(
                      "p-4",
                      "border-t border-gray-200/50 dark:border-zinc-700/50",
                      "mt-2",
                      "bg-white/30 dark:bg-zinc-800/30 backdrop-blur-sm"
                    )}>
                      {chat.messages.map((message, messageIndex) => (
                        <div 
                          key={`message-${chat.chatId}-${messageIndex}`}
                          className={cn(
                            "py-3",
                            "border-b last:border-0 dark:border-zinc-700"
                          )}
                        >
                          <div className={cn(
                            "flex items-center gap-2 mb-1",
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
                          <div className="text-sm text-gray-700 dark:text-gray-200">
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