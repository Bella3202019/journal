"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { app } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { HumeService } from '@/lib/hume';
import { ReturnChatEvent } from "hume/api/resources/empathicVoice";
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// 添加缓存相关的常量
const CHAT_DETAIL_CACHE_PREFIX = 'chat_detail_';
const CHAT_DETAIL_CACHE_EXPIRY = 1000 * 60 * 60; // 1小时缓存过期

interface CachedChatDetail {
  chatId: string;
  events: ReturnChatEvent[];
  timestamp: number;
}

interface ChatMessage {
  role: string;
  messageText: string;
  timestamp: string;
}

// 添加渐变色常量
const userMessageGradient = "bg-gradient-to-r from-emerald-500 to-teal-500";
const assistantMessageGradient = "bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800";

export default function ChatHistoryDetail() {
  const params = useParams();
  const router = useRouter();
  const auth = getAuth(app);
  const [user, loading] = useAuthState(auth);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  // 添加缓存相关函数
  const getCachedChatDetail = useCallback((chatId: string): ReturnChatEvent[] | null => {
    try {
      const cached = localStorage.getItem(`${CHAT_DETAIL_CACHE_PREFIX}${chatId}`);
      if (cached) {
        const parsedCache: CachedChatDetail = JSON.parse(cached);
        if (Date.now() - parsedCache.timestamp < CHAT_DETAIL_CACHE_EXPIRY) {
          return parsedCache.events;
        } else {
          localStorage.removeItem(`${CHAT_DETAIL_CACHE_PREFIX}${chatId}`);
        }
      }
    } catch (error) {
      console.error('Error reading chat detail from cache:', error);
    }
    return null;
  }, []);

  const setCachedChatDetail = useCallback((chatId: string, events: ReturnChatEvent[]) => {
    try {
      const cacheData: CachedChatDetail = {
        chatId,
        events,
        timestamp: Date.now()
      };
      localStorage.setItem(
        `${CHAT_DETAIL_CACHE_PREFIX}${chatId}`, 
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.error('Error writing chat detail to cache:', error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchChatDetail() {
      if (loading) return;
      
      if (!user) {
        router.push('/');
        return;
      }

      try {
        setPageLoading(true);
        setError(null);
        
        // 检查缓存
        const cachedEvents = getCachedChatDetail(params.id as string);
        if (cachedEvents) {
          const formattedMessages: ChatMessage[] = cachedEvents
            .filter((event: ReturnChatEvent) => 
              event.type === "USER_MESSAGE" || event.type === "AGENT_MESSAGE"
            )
            .map((event: ReturnChatEvent) => ({
              role: event.role === "USER" ? 'Me' : 'Echo',
              messageText: event.messageText || '',
              timestamp: new Date(event.timestamp).toLocaleString()
            }));

          if (isMounted) {
            setMessages(formattedMessages);
            setPageLoading(false);
          }
          return;
        }

        // 如果没有缓存，从服务器获取
        const events = await HumeService.getChatEvents(params.id as string);
        
        // 缓存获取到的数据
        setCachedChatDetail(params.id as string, events);
        
        const formattedMessages: ChatMessage[] = events
          .filter((event: ReturnChatEvent) => 
            event.type === "USER_MESSAGE" || event.type === "AGENT_MESSAGE"
          )
          .map((event: ReturnChatEvent) => ({
            role: event.role === "USER" ? 'Me' : 'Echo',
            messageText: event.messageText || '',
            timestamp: new Date(event.timestamp).toLocaleString()
          }));

        if (isMounted) {
          setMessages(formattedMessages);
        }
      } catch (error: any) {
        if (isMounted) {
          setError(error?.message || 'Failed to load chat history');
          setMessages([]);
        }
      } finally {
        if (isMounted) {
          setPageLoading(false);
        }
      }
    }

    fetchChatDetail();

    return () => {
      isMounted = false;
    };
  }, [user, params.id, router, loading, getCachedChatDetail, setCachedChatDetail]);

  if (loading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center py-10">Loading...</div>
    </div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="sticky top-0 z-10 bg-gray-50 dark:bg-zinc-900 pb-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/history')}
            className="mb-4 -ml-2 hover:bg-gray-200/70 dark:hover:bg-zinc-800/70"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="text-sm sm:text-base">Back to History</span>
          </Button>
        </div>

        {pageLoading ? (
          <div className="text-center py-6 sm:py-10">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div 
                  key={i}
                  className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-[80%] mx-auto"
                />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-6 sm:py-10 text-red-500">{error}</div>
        ) : (
          <div className="space-y-4 rounded-lg overflow-hidden">
            <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`flex flex-col ${
                    message.role !== 'Echo' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={cn(
                      "max-w-[88%] sm:max-w-[80%]",
                      "rounded-2xl",
                      "p-4 sm:p-5",
                      "shadow-sm",
                      message.role !== 'Echo'
                        ? [
                            userMessageGradient,
                            "text-white",
                            "shadow-emerald-500/10"
                          ]
                        : [
                            assistantMessageGradient,
                            "dark:text-gray-100",
                            "shadow-gray-200/20 dark:shadow-gray-900/30"
                          ]
                    )}
                  >
                    <div className={cn(
                      "text-xs sm:text-sm font-medium mb-1.5",
                      message.role !== 'Echo'
                        ? "text-emerald-50"
                        : "text-gray-600 dark:text-gray-300"
                    )}>
                      {message.role}
                    </div>
                    <div className={cn(
                      "text-sm sm:text-base break-words",
                      "leading-relaxed",
                      message.role !== 'Echo'
                        ? "text-white/95"
                        : "text-gray-700 dark:text-gray-200"
                    )}>
                      {message.messageText}
                    </div>
                    <div className={cn(
                      "text-[10px] sm:text-xs mt-2",
                      message.role !== 'Echo'
                        ? "text-emerald-50/70"
                        : "text-gray-500 dark:text-gray-400"
                    )}>
                      {message.timestamp}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 