"use client";
import { cn } from "@/utils";
import { useVoice } from "@humeai/voice-react";
import Expressions from "./Expressions";
import { AnimatePresence, motion } from "framer-motion";
import { ComponentRef, forwardRef, useEffect, useState, useRef } from "react";

const getRandomPosition = (existingPositions: {[key: string]: {x: number, y: number}}, scrollY: number) => {
  const padding = 20;
  const maxAttempts = 50;
  
  const containerWidth = Math.min(window.innerWidth - 40, 800);
  const containerHeight = Math.max(window.innerHeight * 2, window.innerHeight + scrollY + 500); // 增加滚动空间
  const messageWidth = window.innerWidth < 640 ? 260 : 300;
  
  for (let i = 0; i < maxAttempts; i++) {
    const newPosition = {
      x: Math.max(20, Math.min(
        Math.random() * (containerWidth - messageWidth),
        containerWidth - messageWidth - 20
      )),
      y: Math.max(scrollY + 20, Math.min(
        scrollY + Math.random() * (window.innerHeight - 150),
        containerHeight - 150
      ))
    };

    let hasOverlap = false;
    for (const key in existingPositions) {
      const existing = existingPositions[key];
      const distance = Math.sqrt(
        Math.pow(existing.x - newPosition.x, 2) + 
        Math.pow(existing.y - newPosition.y, 2)
      );
      
      if (distance < (window.innerWidth < 640 ? 280 : 320) + padding) {
        hasOverlap = true;
        break;
      }
    }

    if (!hasOverlap) {
      return newPosition;
    }
  }

  // 垂直堆叠时考虑滚动位置
  const existingCount = Object.keys(existingPositions).length;
  return {
    x: Math.max(20, Math.min(
      Math.random() * (containerWidth - messageWidth),
      containerWidth - messageWidth - 20
    )),
    y: scrollY + Math.min(
      existingCount * (170 + padding),
      containerHeight - 150
    )
  };
};

const Messages = forwardRef<
  ComponentRef<typeof motion.div>,
  Record<never, never>
>(function Messages(_, ref) {
  const { messages } = useVoice();
  const [visibleMessages, setVisibleMessages] = useState<{[key: string]: boolean}>({});
  const messagePositions = useRef<{[key: string]: {x: number, y: number}}>({});
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    messages.forEach((msg, index) => {
      const messageKey = msg.type + index;
      
      if (!messagePositions.current[messageKey] && 
          (msg.type === "user_message" || msg.type === "assistant_message")) {
        messagePositions.current[messageKey] = getRandomPosition(messagePositions.current, scrollY);
        
        setVisibleMessages(prev => ({
          ...prev,
          [messageKey]: true
        }));

        if ('message' in msg) {
          const content = msg.message.content || "";
          const duration = Math.max(3, content.length * 0.1);

          setTimeout(() => {
            setVisibleMessages(prev => ({
              ...prev,
              [messageKey]: false
            }));
          }, duration * 1000);
        }
      }
    });
  }, [messages, scrollY]);

  return (
    <motion.div
      layoutScroll
      className={cn(
        "grow rounded-md p-4",
        "md:overflow-hidden",
        "overflow-auto",
        "relative"
      )}
      ref={ref}
    >
      <motion.div
        className={cn(
          "max-w-2xl mx-auto w-full flex flex-col gap-4 pb-24",
          "h-auto",
          "md:h-fit",
          "overflow-y-auto",
          "md:overflow-visible"
        )}
      >
        <AnimatePresence mode="popLayout">
          {messages.map((msg, index) => {
            if (msg.type === "user_message" || msg.type === "assistant_message") {
              const messageKey = msg.type + index;
              const position = messagePositions.current[messageKey];

              if (!visibleMessages[messageKey] || !position || !('message' in msg)) return null;

              return (
                <motion.div
                  key={msg.type + index}
                  className={cn(
                    "w-[260px] sm:w-[300px]",
                    "bg-card",
                    "border border-border rounded-lg",
                    "pointer-events-auto"
                  )}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'absolute',
                    left: position.x,
                    top: position.y,
                    zIndex: 1000,
                    maxWidth: '80%',
                  }}
                >
                  <div className={cn(
                    "text-xs capitalize font-medium leading-none opacity-50 pt-4 px-3"
                  )}>
                    {msg.message.role}
                  </div>
                  
                  <div className={"pb-3 px-3"}>
                    {msg.message.content}
                  </div>
                  
                  <Expressions values={{ ...msg.models.prosody?.scores }} />
                </motion.div>
              );
            }
            return null;
          })}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
});

export default Messages;