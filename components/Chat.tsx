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
import { getFirestore, collection, addDoc } from 'firebase/firestore';

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

  useEffect(() => {
    if (!user && !isChatPaused) {
      chatStartTime.current = new Date();
      
      timerRef.current = setTimeout(() => {
        setIsChatPaused(true);
        setIsMuted(true);
        setIsLoginModalOpen(true);
        controlsRef.current?.mute();
      }, 5 * 60 * 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [user, isChatPaused]);

  useEffect(() => {
    if (user && isChatPaused) {
      setIsLoginModalOpen(false);
      setIsWelcomeModalOpen(true);
      setIsChatPaused(false);
    }
  }, [user, isChatPaused]);

  const handleAuthSuccess = () => {
    console.log('Auth success handler called');
    setIsLoginModalOpen(false);
  };

  const handleContinueChat = () => {
    setIsWelcomeModalOpen(false);
    setIsMuted(false);
    controlsRef.current?.unmute();
  };

  const saveChatHistory = async () => {
    if (!user) return;

    const db = getFirestore(app);
    const historyRef = collection(db, 'chatHistory');
    
    await addDoc(historyRef, {
      userId: user.uid,
      startTime: chatStartTime.current || new Date(),
      endTime: new Date(),
      messages: Messages
    });
  };

  const handleEndCall = async () => {
    await saveChatHistory();
  };

  return (
    <>
      <div
        className={cn(
          "relative grow flex flex-col mx-auto w-full overflow-hidden min-h-screen",
          isChatPaused && "pointer-events-none opacity-50"
        )}
      >
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

      <Dialog 
        open={isLoginModalOpen} 
        onOpenChange={(open) => {
          setIsLoginModalOpen(open);
          if (!open && !user) {
            setIsChatPaused(false);
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
