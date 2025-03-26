"use client";


import { useEffect, useState, useCallback } from 'react';
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

// 添加缓存相关的常量和类型
const CACHE_KEY_PREFIX = 'chat_history_';
const CACHE_EXPIRY_TIME = 1000 * 60 * 30; // 30分钟缓存过期

interface CachedChat extends FormattedChat {
  timestamp: number;
}

// 添加一个全局缓存来存储已加载的页面数据
const PAGE_CACHE_KEY = 'chat_history_page_cache';
const PAGE_CACHE_EXPIRY = 1000 * 60 * 5; // 5分钟过期

interface PageCache {
  timestamp: number;
  allChats: any[];
  readyChats: FormattedChat[];
  page: number;
  loadingStates: Record<string, boolean>;
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
  const CHATS_PER_PAGE = 9;
  const [allChats, setAllChats] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [readyChats, setReadyChats] = useState<FormattedChat[]>([]);

  // 添加并行加载状态
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  // 添加缓存相关函数
  const getCachedChat = useCallback((chatId: string): FormattedChat | null => {
    try {
      const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${chatId}`);
      if (cached) {
        const parsedCache: CachedChat = JSON.parse(cached);
        // 检查缓存是否过期
        if (Date.now() - parsedCache.timestamp < CACHE_EXPIRY_TIME) {
          const { timestamp, ...chatData } = parsedCache;
          return chatData;
        } else {
          // 清除过期缓存
          localStorage.removeItem(`${CACHE_KEY_PREFIX}${chatId}`);
        }
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }
    return null;
  }, []);

  const setCachedChat = useCallback((chatId: string, chat: FormattedChat) => {
    try {
      const cacheData: CachedChat = {
        ...chat,
        timestamp: Date.now()
      };
      localStorage.setItem(
        `${CACHE_KEY_PREFIX}${chatId}`, 
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.error('Error writing to cache:', error);
    }
  }, []);

  // 添加页面缓存检查
  const checkPageCache = useCallback((): PageCache | null => {
    try {
      const cached = localStorage.getItem(PAGE_CACHE_KEY);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (Date.now() - parsedCache.timestamp < PAGE_CACHE_EXPIRY) {
          return parsedCache;
        }
        localStorage.removeItem(PAGE_CACHE_KEY);
      }
    } catch (error) {
      console.error('Error reading page cache:', error);
    }
    return null;
  }, []);

  // 更新页面缓存
  const updatePageCache = useCallback(() => {
    try {
      const cacheData = {
        allChats,
        readyChats,
        page,
        loadingStates,
        timestamp: Date.now()
      };
      localStorage.setItem(PAGE_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error updating page cache:', error);
    }
  }, [allChats, readyChats, page, loadingStates]);

  const formatChatEvents = async (chat: { 
    chatId: string; 
    events: ReturnChatEvent[]; 
    existingPoem?: string 
  }): Promise<FormattedChat> => {
    // 设置加载状态
    setLoadingStates(prev => ({ ...prev, [chat.chatId]: true }));

    try {
      const relevantEvents = chat.events.filter(
        (event) => event.type === "USER_MESSAGE" || event.type === "AGENT_MESSAGE"
      );

      // 并行处理消息和时间计算
      const [messages, timeInfo] = await Promise.all([
        // 处理消息
        Promise.all(relevantEvents.map(event => ({
          role: event.role === "USER" ? "User" : "Dela",
          timestamp: new Date(event.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          messageText: event.messageText || ''
        }))),
        // 处理时间信息
        (async () => {
          const firstEvent = chat.events[0];
          const lastEvent = chat.events[chat.events.length - 1];
          const durationMs = lastEvent.timestamp - firstEvent.timestamp;
          const durationSeconds = Math.floor(durationMs / 1000);
          const minutes = Math.floor(durationSeconds / 60);
          const seconds = durationSeconds % 60;
          
          return {
            durationSeconds,
            duration: minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`,
            startDate: new Date(firstEvent.timestamp)
          };
        })()
      ]);

      // 如果有现成的poem或对话太短，直接使用
      let summary;
      if (timeInfo.durationSeconds <= 15) {
        summary = "Test is for a better future";
      } else if (chat.existingPoem) {
        summary = chat.existingPoem;
      } else {
        const conversation = messages
          .filter(msg => msg.messageText?.trim())
          .map(msg => `${msg.role}: ${msg.messageText}`)
          .join('\n');

        if (conversation) {
          try {
            const response = await fetch('/api/generate-poem', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chatId: chat.chatId, conversation })
            });
            const data = await response.json();
            summary = data.poem || "Conversation insights";
          } catch (error) {
            console.error('Error generating summary:', error);
            summary = "Conversation insights";
          }
        } else {
          summary = "Brief exchange of words";
        }
      }

      // 格式化开始时间
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let startTimeStr;
      if (timeInfo.startDate.toDateString() === today.toDateString()) {
        startTimeStr = `Today, ${timeInfo.startDate.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`;
      } else if (timeInfo.startDate.toDateString() === yesterday.toDateString()) {
        startTimeStr = `Yesterday, ${timeInfo.startDate.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`;
      } else {
        startTimeStr = timeInfo.startDate.toLocaleDateString('en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        });
      }

      return {
        chatId: chat.chatId,
        startTime: startTimeStr,
        duration: timeInfo.duration,
        summary,
        messages
      };
    } finally {
      setLoadingStates(prev => ({ ...prev, [chat.chatId]: false }));
    }
  };

  const [initialLoading, setInitialLoading] = useState(true);

  // 修改 useEffect 以使用页面缓存
  useEffect(() => {
    async function fetchHistory() {
      if (!user) {
        setInitialLoading(false);
        return;
      }

      try {
        setInitialLoading(true);
        
        // 检查页面缓存
        const pageCache = checkPageCache();
        if (pageCache) {
          setAllChats(pageCache.allChats);
          setReadyChats(pageCache.readyChats);
          setPage(pageCache.page);
          // 恢复加载状态
          setLoadingStates(pageCache.loadingStates || {});
          setInitialLoading(false);
          setHasMore(pageCache.allChats.length > pageCache.readyChats.length);
          return;
        }

        // 如果没有缓存，执行正常加载流程
        const userChatIds = await getUserChatIds(user.uid);
        const chatsResponse = await HumeService.listChats();
        
        const userChats = chatsResponse.data
          .filter(chat => userChatIds.includes(chat.id))
          .sort((a, b) => {
            const timeA = a.endTimestamp ? new Date(a.endTimestamp).getTime() : Date.now();
            const timeB = b.endTimestamp ? new Date(b.endTimestamp).getTime() : Date.now();
            return timeB - timeA;
          });

        setAllChats(userChats);
        await loadMoreChats(userChats, 1);
        
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setInitialLoading(false);
      }
    }

    fetchHistory();
  }, [user, checkPageCache]);

  // 修改 loadMoreChats 函数，不在这里更新缓存
  // 因为我们已经通过 useEffect 实现了自动缓存更新
  const loadMoreChats = async (chats = allChats, currentPage = page) => {
    if (isLoadingMore) return;
    
    try {
      setIsLoadingMore(true);
      const startIndex = (currentPage - 1) * CHATS_PER_PAGE;
      const endIndex = startIndex + CHATS_PER_PAGE;
      const currentPageChats = chats.slice(startIndex, endIndex);
      
      if (currentPageChats.length === 0) {
        setHasMore(false);
        return;
      }

      // 1. 先检查缓存并显示缓存的数据
      currentPageChats.forEach((chat, idx) => {
        const cachedChat = getCachedChat(chat.id);
        if (cachedChat) {
          setReadyChats(prev => {
            const newChats = [...prev];
            const index = startIndex + idx;
            newChats[index] = cachedChat;
            return newChats;
          });
        }
      });

      // 2. 过滤出需要加载的聊天
      const chatsToLoad = currentPageChats.filter(
        chat => !getCachedChat(chat.id)
      );

      if (chatsToLoad.length === 0) {
        setHasMore(endIndex < chats.length);
        setIsLoadingMore(false);
        return;
      }

      const currentChatIds = chatsToLoad.map(chat => chat.id);

      // 3. 并行请求poems和events
      const [poemsResponse, eventsResponses] = await Promise.all([
        fetch('/api/get-poems', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatIds: currentChatIds })
        }),
        Promise.all(chatsToLoad.map(chat => 
          HumeService.getChatEvents(chat.id)
        ))
      ]);
      
      let poemsMap = new Map();
      if (poemsResponse.ok) {
        const { poems } = await poemsResponse.json();
        poemsMap = new Map(poems.map((poem: any) => [poem.chatId, poem.text]));
      }

      // 4. 并行处理未缓存的chats
      const formattingPromises = chatsToLoad.map(async (chat, idx) => {
        const formattedChat = await formatChatEvents({
          chatId: chat.id,
          events: eventsResponses[idx],
          existingPoem: poemsMap.get(chat.id)
        });

        // 5. 缓存格式化后的数据
        setCachedChat(chat.id, formattedChat);

        // 6. 更新UI
        setReadyChats(prev => {
          const newChats = [...prev];
          const index = startIndex + currentPageChats.indexOf(chat);
          newChats[index] = formattedChat;
          return newChats;
        });

        return formattedChat;
      });

      await Promise.all(formattingPromises);
      setHasMore(endIndex < chats.length);

    } catch (error) {
      console.error('Error loading more chats:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // 添加缓存清理函数
  const clearExpiredCache = useCallback(() => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsedCache: CachedChat = JSON.parse(cached);
            if (Date.now() - parsedCache.timestamp >= CACHE_EXPIRY_TIME) {
              localStorage.removeItem(key);
            }
          }
        }
      });
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }, []);

  // 在组件加载时清理过期缓存
  useEffect(() => {
    clearExpiredCache();
  }, [clearExpiredCache]);

  // 在组件卸载时清理过期缓存
  useEffect(() => {
    return () => {
      clearExpiredCache();
    };
  }, [clearExpiredCache]);

  // 添加一个 useEffect 来在状态更新时触发缓存更新
  useEffect(() => {
    // 只有当有数据且不在初始加载状态时才更新缓存
    if (allChats.length > 0 && !initialLoading) {
      updatePageCache();
    }
  }, [allChats, readyChats, page, loadingStates, initialLoading, updatePageCache]);

  const toggleChat = (chatId: string) => {
    router.push(`/history/${chatId}`);
  };

  return (
    <main className={cn(
      "flex flex-col",
      "w-full min-h-screen",
      "bg-gray-50 dark:bg-zinc-900",
      "text-zinc-900 dark:text-zinc-100",
      lora.className
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
        {initialLoading ? (
          <div className={cn(
            "grid gap-8",
            "grid-cols-1 md:grid-cols-3",
            "auto-rows-max"
          )}>
            {Array.from({ length: CHATS_PER_PAGE }).map((_, index) => (
              <div 
                key={`skeleton-${index}`}
                className="w-full px-1"
              >
                <motion.div
                  className="w-full h-48 rounded-3xl bg-gray-100 dark:bg-gray-800 animate-pulse"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                />
                <div className="mt-3 h-6 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                <div className="mt-2 h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className={cn(
              "grid gap-8",
              "grid-cols-1 md:grid-cols-3",
              "auto-rows-max"
            )}>
              {Array.from({ length: Math.min(page * CHATS_PER_PAGE, allChats.length) }).map((_, index) => {
                const chat = readyChats[index];
                const isLoading = loadingStates[allChats[index]?.id];
                
                return (
                  <div 
                    key={chat?.chatId || `placeholder-${index}`}
                    className="w-full px-1"
                  >
                    {chat ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div 
                          onClick={() => toggleChat(chat.chatId)}
                          className="cursor-pointer"
                        >
                          <motion.div 
                            className={cn(
                              "w-full h-48",
                              "rounded-3xl",
                              "bg-gradient-to-r",
                              lightGradients[index % lightGradients.length],
                              darkGradients[index % darkGradients.length],
                              gradientPositions[index % gradientPositions.length],
                              "relative overflow-hidden",
                              "mb-3"
                            )}
                            whileHover={{ 
                              scale: 1.02,
                              boxShadow: "0px 3px 8px rgba(0,0,0,0.1)"
                            }}
                            transition={{ duration: 0.2 }}
                          >
                            {/* 磨砂效果层保持不变 */}
                            <div className={cn(
                              "absolute inset-0",
                              "bg-gradient-to-br from-white/10 via-transparent to-black/5",
                              "dark:from-white/5 dark:to-black/10",
                              "mix-blend-overlay",
                              "backdrop-filter backdrop-blur-[0.5px]"
                            )} />
                            
                            <div className={cn(
                              "absolute inset-0",
                              "bg-noise",
                              "opacity-[0.15]",
                              "mix-blend-overlay"
                            )} />
                          </motion.div>
                          
                          <div className={cn(
                            "flex justify-between items-center",
                            "px-1"
                          )}>
                            <time className="text-lg font-medium">{chat.startTime}</time>
                            <span className="text-gray-500">{chat.duration}</span>
                          </div>
                          
                          <p className={cn(
                            "mt-1 px-1",
                            "line-clamp-2",
                            "text-left"
                          )}>
                            {chat.summary}
                          </p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        className={cn(
                          "w-full h-48 rounded-3xl",
                          "relative overflow-hidden",
                          "bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100",
                          "dark:from-gray-800 dark:via-gray-700 dark:to-gray-800",
                          "bg-[length:200%_100%]",
                          "animate-[shimmer_2.5s_ease-in-out_infinite]"
                        )}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {isLoading && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-sm text-gray-400">
                              Loading...
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {hasMore && !isLoadingMore && (
              <div className="text-center pb-4 md:sticky md:bottom-0 md:bg-gray-50/80 md:dark:bg-zinc-900/80 md:backdrop-blur-sm">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPage(prev => prev + 1);
                    loadMoreChats(allChats, page + 1);
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