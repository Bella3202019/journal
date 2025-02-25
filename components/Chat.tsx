"use client";

import { VoiceProvider } from "@humeai/voice-react";
import Messages from "./Messages";
import Controls, { ControlsRef } from "./Controls";
import StartCall from "./StartCall";
import { ComponentRef, useRef, useState, useEffect } from "react";
import { cn } from "@/utils";
import { getAuth } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { app } from '@/lib/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Auth from "./Auth";
import { Button } from "@/components/ui/button";

interface ClientComponentProps {
  accessToken: string;
}

export default function ClientComponent({
  accessToken,
}: ClientComponentProps) {
  const auth = getAuth(app);
  const [user] = useAuthState(auth);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isChatPaused, setIsChatPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const chatStartTime = useRef<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeout = useRef<number | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);
  const controlsRef = useRef<ControlsRef>(null);

  const configId = process.env['NEXT_PUBLIC_HUME_CONFIG_ID'];

  // 检查未登录用户的通话时间
  useEffect(() => {
    if (!user && !isChatPaused) {
      chatStartTime.current = new Date();
      
      // 设置5分钟计时器
      timerRef.current = setTimeout(() => {
        setIsChatPaused(true);
        setIsMuted(true); // 标记为静音状态
        setIsLoginModalOpen(true);
        
        // 调用Controls组件的静音方法
        controlsRef.current?.mute();
      }, 5 * 60 * 1000); // 5分钟 = 5 * 60 * 1000 毫秒
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [user, isChatPaused]);

  // 监听用户状态变化
  useEffect(() => {
    if (user && isChatPaused) {
      // 如果用户已登录且聊天被暂停，显示欢迎回来对话框
      setIsLoginModalOpen(false);
      setIsWelcomeModalOpen(true);
      setIsChatPaused(false);
      // 保持静音状态，直到用户点击"继续通话"
    }
  }, [user, isChatPaused]);

  // 处理登录成功
  const handleAuthSuccess = () => {
    console.log('Auth success handler called');
    // 登录成功后，关闭登录对话框
    // 欢迎对话框会在用户状态变化时自动显示
    setIsLoginModalOpen(false);
  };

  // 处理继续通话
  const handleContinueChat = () => {
    setIsWelcomeModalOpen(false);
    setIsMuted(false); // 更新静音状态
    
    // 调用Controls组件的取消静音方法
    controlsRef.current?.unmute();
  };

  return (
    <>
      <div
        className={cn(
          "relative grow flex flex-col mx-auto w-full overflow-hidden min-h-screen",
          "dark:bg-[#0a1510]",
          isChatPaused && "pointer-events-none opacity-50"
        )}
      >
        <div 
          className={cn(
            "absolute inset-0",
            "dark:bg-[#0a1510]"
          )}
          style={{ 
            backgroundColor: 'var(--background, #e0f5e9)',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23e0f5e9'/%3E%3Crect x='0' y='0' width='200' height='150' fill='%2398e2c6' rx='10'/%3E%3Crect x='200' y='0' width='200' height='150' fill='%237ddbb3' rx='10'/%3E%3Crect x='400' y='0' width='200' height='150' fill='%2398e2c6' rx='10'/%3E%3Crect x='600' y='0' width='200' height='150' fill='%23b7ebd7' rx='10'/%3E%3Crect x='100' y='150' width='200' height='150' fill='%23b7ebd7' rx='10'/%3E%3Crect x='300' y='150' width='200' height='150' fill='%2398e2c6' rx='10'/%3E%3Crect x='500' y='150' height='150' fill='%237ddbb3' rx='10'/%3E%3Crect x='0' y='300' width='200' height='150' fill='%237ddbb3' rx='10'/%3E%3Crect x='200' y='300' width='200' height='150' fill='%23b7ebd7' rx='10'/%3E%3Crect x='400' y='300' width='200' height='150' fill='%2398e2c6' rx='10'/%3E%3Crect x='600' y='300' width='200' height='150' fill='%237ddbb3' rx='10'/%3E%3Crect x='100' y='450' width='200' height='150' fill='%2398e2c6' rx='10'/%3E%3Crect x='300' y='450' width='200' height='150' fill='%237ddbb3' rx='10'/%3E%3Crect x='500' y='450' width='200' height='150' fill='%23b7ebd7' rx='10'/%3E%3C/svg%3E")`,
            backgroundPosition: 'bottom',
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'contain'
          }}
        />
        <div 
          className={cn(
            "absolute inset-0 hidden dark:block",
            "dark:bg-[#0a1510]"
          )}
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%230a1510'/%3E%3Crect x='0' y='0' width='200' height='150' fill='%23102920' opacity='0.5' rx='10'/%3E%3Crect x='200' y='0' width='200' height='150' fill='%230d2118' opacity='0.5' rx='10'/%3E%3Crect x='400' y='0' width='200' height='150' fill='%23102920' opacity='0.5' rx='10'/%3E%3Crect x='600' y='0' width='200' height='150' fill='%23133125' opacity='0.5' rx='10'/%3E%3Crect x='100' y='150' width='200' height='150' fill='%23133125' opacity='0.5' rx='10'/%3E%3Crect x='300' y='150' width='200' height='150' fill='%23102920' opacity='0.5' rx='10'/%3E%3Crect x='500' y='150' width='200' height='150' fill='%230d2118' opacity='0.5' rx='10'/%3E%3Crect x='0' y='300' width='200' height='150' fill='%230d2118' opacity='0.5' rx='10'/%3E%3Crect x='200' y='300' width='200' height='150' fill='%23133125' opacity='0.5' rx='10'/%3E%3Crect x='400' y='300' width='200' height='150' fill='%23102920' opacity='0.5' rx='10'/%3E%3Crect x='600' y='300' width='200' height='150' fill='%230d2118' opacity='0.5' rx='10'/%3E%3Crect x='100' y='450' width='200' height='150' fill='%23102920' opacity='0.5' rx='10'/%3E%3Crect x='300' y='450' width='200' height='150' fill='%230d2118' opacity='0.5' rx='10'/%3E%3Crect x='500' y='450' width='200' height='150' fill='%23133125' opacity='0.5' rx='10'/%3E%3C/svg%3E")`,
            backgroundPosition: 'bottom',
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'contain',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)'
          }}
        />
        <div 
          className="absolute inset-0"
          style={{ 
            background: 'var(--background-overlay, rgba(224, 245, 233, 0.3))',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)'
          }}
        />
        <VoiceProvider
          auth={{ type: "accessToken", value: accessToken }}
          configId={configId}
          onMessage={() => {
            if (timeout.current) {
              window.clearTimeout(timeout.current);
            }

            timeout.current = window.setTimeout(() => {
              if (ref.current) {
                const scrollHeight = ref.current.scrollHeight;
                ref.current.scrollTo({
                  top: scrollHeight,
                  behavior: "smooth",
                });
              }
            }, 200);
          }}
        >
          <Messages ref={ref} />
          <Controls ref={controlsRef} />
          <StartCall />
        </VoiceProvider>
      </div>

      {/* 登录提示对话框 */}
      <Dialog 
        open={isLoginModalOpen} 
        onOpenChange={(open) => {
          setIsLoginModalOpen(open);
          // 如果用户关闭登录对话框但未登录，恢复聊天但保持静音
          if (!open && !user) {
            setIsChatPaused(false);
            // 保持静音状态
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Chat Paused
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Your chat has been paused after 5 minutes. 
              Sign in to continue this conversation where you left off.
            </p>
            <Auth onSuccess={handleAuthSuccess} />
          </div>
        </DialogContent>
      </Dialog>

      {/* 欢迎回来对话框 */}
      <Dialog 
        open={isWelcomeModalOpen} 
        onOpenChange={setIsWelcomeModalOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Welcome Back!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Hey {user?.displayName || user?.email?.split('@')[0] || 'there'}! 
              Your chat session has been resumed. Click the button below to continue your conversation.
            </p>
            <Button 
              onClick={handleContinueChat}
              className="w-full mt-4"
            >
              Continue Chat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
