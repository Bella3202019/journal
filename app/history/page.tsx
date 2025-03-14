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
import { motion } from 'framer-motion';
import { lora } from "@/app/fonts";  // 确保导入 Lora 字体

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

// 浅色模式渐变色组合 - 减少白色区域
const lightGradients = [
  'from-sky-400/80 via-white/60 to-cyan-300/80',        // 星空蓝
  'from-emerald-400/80 via-white/60 to-green-300/80',   // 橄榄绿
  'from-amber-500/80 via-white/60 to-yellow-400/80',    // 麦田金
  'from-cyan-400/80 via-white/60 to-blue-300/80',       // 地中海蓝
  'from-teal-400/80 via-white/60 to-emerald-300/80',    // 柏树绿
  'from-blue-400/80 via-white/60 to-sky-300/80',        // 夜空蓝
  'from-emerald-500/80 via-white/60 to-teal-300/80',    // 深绿
];

// 深色模式渐变色组合 - 梵高夜景色系
const darkGradients = [
  'dark:from-sky-600/70 dark:via-zinc-900/80 dark:to-cyan-500/70',        // 深夜蓝
  'dark:from-emerald-600/70 dark:via-zinc-900/80 dark:to-green-500/70',   // 深沉绿
  'dark:from-amber-600/60 dark:via-zinc-900/90 dark:to-yellow-500/60',    // 柔和暗金
  'dark:from-cyan-600/70 dark:via-zinc-900/80 dark:to-blue-500/70',       // 深海蓝
  'dark:from-teal-600/70 dark:via-zinc-900/80 dark:to-emerald-500/70',    // 夜绿
  'dark:from-blue-600/70 dark:via-zinc-900/80 dark:to-sky-500/70',        // 星夜蓝
  'dark:from-emerald-700/70 dark:via-zinc-900/80 dark:to-teal-500/70',    // 暗绿
];

// 调整渐变位置，减少中间白色区域的范围
const gradientPositions = [
  'bg-[length:350%_350%] bg-[position:10%_90%]',
  'bg-[length:330%_330%] bg-[position:85%_15%]',
  'bg-[length:370%_370%] bg-[position:25%_75%]',
  'bg-[length:340%_340%] bg-[position:90%_10%]',
  'bg-[length:360%_360%] bg-[position:75%_25%]',
  'bg-[length:345%_345%] bg-[position:20%_80%]',
  'bg-[length:355%_355%] bg-[position:80%_20%]',
];

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

    const firstEvent = chat.events[0];
    const lastEvent = chat.events[chat.events.length - 1];
    const durationMs = lastEvent.timestamp - firstEvent.timestamp;
    const durationSeconds = Math.floor(durationMs / 1000);
    
    // 修改时长显示逻辑
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const duration = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    // 如果对话时长不超过15秒，使用固定文字
    const summary = durationSeconds <= 15 
      ? "Test is for a better future"
      : await generateSummary(messages);

    // 修改日期显示格式
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
      // 使用 "Sun, 26 Feb" 格式
      startTimeStr = startDate.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
    }

    return {
      chatId: chat.chatId,
      startTime: startTimeStr,
      duration,
      summary,
      messages
    };
  };

  // 辅助函数：生成摘要（仅在对话时长超过15秒时调用）
  const generateSummary = async (messages: any[]) => {
    const conversation = messages.map(msg => `${msg.role}: ${msg.messageText}`).join('\n');
    const response = await fetch('/api/generate-poem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation })
    });
    const { poem } = await response.json();
    return poem;
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
      lora.className  // 添加 Lora 字体到整个页面
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
            Echo moments
          </h1>
        </div>
        <AuthButton />
      </div>

      <div className={cn(
        "flex-1",
        "p-4 md:p-6",
        "w-full",
        "max-w-[1400px]",
        "mx-auto",
        "md:overflow-hidden overflow-auto",
        "h-[calc(100vh-60px)]"
      )}>
        {isLoading ? (
          <div className="text-center py-8">Loading chat history...</div>
        ) : (
          <>
            <div className={cn(
              "grid gap-6",
              "grid-cols-1 md:grid-cols-3",
              "auto-rows-max",
              "mb-6"
            )}>
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
                    "w-full",
                    "flex flex-col",
                    "min-h-[280px]"  // 减小最小高度
                  )}
                  onClick={() => toggleChat(chat.chatId)}
                >
                  {/* 艺术化的渐变背景 */}
                  <motion.div 
                    className={cn(
                      "w-full h-48",
                      "rounded-3xl",
                      "bg-gradient-to-r",
                      lightGradients[index % lightGradients.length],
                      darkGradients[index % darkGradients.length],
                      gradientPositions[index % gradientPositions.length],
                      "bg-white dark:bg-zinc-900",
                      "relative overflow-hidden",
                      "backdrop-filter backdrop-blur-[1px]"  // 添加轻微模糊
                    )}
                    whileHover={{ 
                      scale: 1.02,
                      boxShadow: "0px 3px 8px rgba(0,0,0,0.1)"
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* 磨砂玻璃效果层 */}
                    <div className={cn(
                      "absolute inset-0",
                      "bg-gradient-to-br from-white/10 via-transparent to-black/5",
                      "dark:from-white/5 dark:to-black/10",
                      "mix-blend-overlay",
                      "backdrop-filter backdrop-blur-[0.5px]"
                    )} />
                    
                    {/* 纹理效果层 */}
                    <div className={cn(
                      "absolute inset-0",
                      "bg-noise",  // 需要在 globals.css 中定义
                      "opacity-[0.15]",
                      "mix-blend-overlay"
                    )} />
                  </motion.div>

                  <div className={cn(
                    "p-4",
                    lora.className  // 确保卡片内容也使用 Lora 字体
                  )}>
                    <div className={cn(
                      "flex justify-between items-center",
                      "text-sm",
                      "text-gray-500 dark:text-gray-400"
                    )}>
                      <time>{chat.startTime}</time>
                      <div>{chat.duration}</div>
                    </div>
                    
                    <div className={cn(
                      "mt-2",
                      "text-base",
                      "text-gray-600 dark:text-gray-400",
                      "leading-relaxed",
                      "font-normal",
                      "line-clamp-2"
                    )}>
                      {chat.summary}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {hasMore && (
              <div className="text-center pb-4 md:sticky md:bottom-0 md:bg-gray-50/80 md:dark:bg-zinc-900/80 md:backdrop-blur-sm">
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