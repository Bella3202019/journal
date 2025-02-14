"use client";
import { cn } from "@/utils";
import { useVoice } from "@humeai/voice-react";
import Expressions from "./Expressions";
import { AnimatePresence, motion } from "framer-motion";
import { ComponentRef, forwardRef, useEffect, useState, useRef } from "react";

const getRandomPosition = () => {
  return {
    x: Math.random() * (window.innerWidth - 400), // 考虑消息卡片宽度
    y: Math.random() * (window.innerHeight - 200)  // 考虑消息卡片高度
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
        // 为新消息生成随机位置
        messagePositions.current[messageKey] = getRandomPosition();
        
        // 显示消息
        setVisibleMessages(prev => ({
          ...prev,
          [messageKey]: true
        }));

        // 计算显示时间（根据内容长度）
        const content = msg.message.content || "";
        const duration = Math.max(3, content.length * 0.1); // 最少3秒

        // 设置消失时间
        setTimeout(() => {
          setVisibleMessages(prev => ({
            ...prev,
            [messageKey]: false
          }));
        }, duration * 1000);
      }
    });
  }, [messages]);

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1000 }}>
      <AnimatePresence>
        {messages.map((msg, index) => {
          const messageKey = msg.type + index;
          const position = messagePositions.current[messageKey];

          if (!visibleMessages[messageKey] || !position) return null;

          return (
            <motion.div
              key={messageKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                zIndex: 1000
              }}
              className={cn(
                "w-[300px]",
                "bg-card",
                "border border-border rounded-lg",
                "pointer-events-auto"
              )}
            >
              <div className="text-xs capitalize font-medium leading-none opacity-50 pt-4 px-3">
                {msg.message.role}
              </div>
              <div className="pb-3 px-3">
                {msg.message.content}
              </div>
              <Expressions values={{ ...msg.models.prosody?.scores }} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
});

export default Messages;