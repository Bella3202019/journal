"use client";
import { cn } from "@/utils";
import { useVoice } from "@humeai/voice-react";
import Expressions from "./Expressions";
import { AnimatePresence, motion } from "framer-motion";
import { ComponentRef, forwardRef, useEffect, useState, useRef } from "react";

const getRandomPosition = () => {
  return {
    x: Math.random() * (window.innerWidth - 400),
    y: Math.random() * (window.innerHeight - 200)
  };
};

const Messages = forwardRef<
  ComponentRef<typeof motion.div>,
  Record<never, never>
>(function Messages(_, ref) {
  const { messages } = useVoice();
  const [visibleMessages, setVisibleMessages] = useState<{[key: string]: boolean}>({});
  const messagePositions = useRef<{[key: string]: {x: number, y: number}}>({});

  useEffect(() => {
    messages.forEach((msg, index) => {
      const messageKey = msg.type + index;
      
      if (!messagePositions.current[messageKey] && 
          (msg.type === "user_message" || msg.type === "assistant_message")) {
        messagePositions.current[messageKey] = getRandomPosition();
        
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
  }, [messages]);

  return (
    <motion.div
      layoutScroll
      className={"grow rounded-md overflow-auto p-4"}
      ref={ref}
    >
      <motion.div
        className={"max-w-2xl mx-auto w-full flex flex-col gap-4 pb-24"}
      >
        <AnimatePresence mode={"popLayout"}>
          {messages.map((msg, index) => {
            if (
              msg.type === "user_message" ||
              msg.type === "assistant_message"
            ) {
              const messageKey = msg.type + index;
              const position = messagePositions.current[messageKey];

              if (!visibleMessages[messageKey] || !position || !('message' in msg)) return null;

              return (
                <motion.div
                  key={msg.type + index}
                  className={cn(
                    "w-[300px]",
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
                    width: '300px'
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