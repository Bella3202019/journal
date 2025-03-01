"use client";
import { cn } from "@/utils";
import { useVoice } from "@humeai/voice-react";
import Expressions from "./Expressions";
import { AnimatePresence, motion } from "framer-motion";
import { ComponentRef, forwardRef, useEffect, useState, useRef, useCallback } from "react";

// 定义情绪颜色映射的类型
type EmotionColorMap = {
  [key: string]: string;
};

// 情绪对应的颜色映射
const emotionColorMap: EmotionColorMap = {
  // 积极情绪
  Admiration: "#f4a261",      // 珊瑚橙
  Adoration: "#90be6d",       // 柔和绿
  "Aesthetic Appreciation": "#f4e285", // 淡金黄
  Amusement: "#f4a261",       // 珊瑚橙
  Approval: "#f3722c",        // 燃烧橙
  Caring: "#43aa8b",          // 青绿
  Calmness: "#2a9d8f",        // 深青绿
  Contentment: "#43aa8b",     // 青绿
  Determination: "#e63946",    // 鲜红
  Ecstasy: "#f94144",         // 亮红
  Enthusiasm: "#f4a261",      // 珊瑚橙
  Excitement: "#d62828",      // 深红
  Gratitude: "#f4e285",       // 淡金黄
  Interest: "#0077b6",        // 深蓝
  Joy: "#f4a261",            // 珊瑚橙
  Love: "#e76f51",           // 赤陶红
  Optimism: "#f4e285",       // 淡金黄
  Pride: "#e63946",          // 鲜红
  Relief: "#2a9d8f",         // 深青绿
  Romance: "#e76f51",        // 赤陶红
  Satisfaction: "#43aa8b",    // 青绿
  "Surprise (positive)": "#f94144", // 亮红
  Triumph: "#e63946",        // 鲜红

  // 中性情绪
  Concentration: "#264653",   // 深青灰
  Contemplation: "#264653",   // 深青灰
  Craving: "#f3722c",        // 燃烧橙
  Curiosity: "#0077b6",      // 深蓝
  Desire: "#e76f51",         // 赤陶红
  Nostalgia: "#a7c957",      // 橄榄绿
  Realization: "#577590",    // 钢青蓝
  Sympathy: "#a7c957",       // 橄榄绿

  // 消极情绪
  Anger: "#d62828",          // 深红
  Annoyance: "#f3722c",      // 燃烧橙
  Anxiety: "#6a0572",        // 深紫
  Awkwardness: "#6a0572",    // 深紫
  Boredom: "#577590",        // 钢青蓝
  Confusion: "#6a0572",      // 深紫
  Contempt: "#6a0572",       // 深紫
  Disappointment: "#a7c957",  // 橄榄绿
  Disapproval: "#6a0572",    // 深紫
  Disgust: "#6a0572",        // 深紫
  Distress: "#d62828",       // 深红
  Doubt: "#6a0572",          // 深紫
  Embarrassment: "#f94144",   // 亮红
  "Empathic Pain": "#d62828", // 深红
  Envy: "#0077b6",           // 深蓝
  Fear: "#d62828",           // 深红
  Guilt: "#264653",          // 深青灰
  Horror: "#d62828",         // 深红
  Pain: "#e63946",           // 鲜红
  Sadness: "#577590",        // 钢青蓝
  Shame: "#6a0572",          // 深紫
  "Surprise (negative)": "#f94144", // 亮红
  Tiredness: "#577590",      // 钢青蓝
  Yearning: "#f3722c"        // 燃烧橙
};

// 添加响应式布局的辅助函数
const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

const Messages = forwardRef<
  ComponentRef<typeof motion.div>,
  Record<never, never>
>(function Messages(_, ref) {
  const { messages, micFft, fft, isPlaying, isPaused, status } = useVoice();
  const [visibleMessages, setVisibleMessages] = useState<{[key: string]: boolean}>({});
  const messagePositions = useRef<{[key: string]: {x: number, y: number}}>({});
  const [scrollY, setScrollY] = useState(0);
  const [userBackgroundSize, setUserBackgroundSize] = useState(800);
  const [agentBackgroundSize, setAgentBackgroundSize] = useState(800);
  const [userEmotionColors, setUserEmotionColors] = useState<string[]>(["#4169E1", "#87CEEB", "#B0C4DE"]);
  const [agentEmotionColors, setAgentEmotionColors] = useState<string[]>(["#4169E1", "#87CEEB", "#B0C4DE"]);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
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
          const duration = Math.max(10, content.length * 0.1);
        }
      }
    });
  }, [messages, scrollY]);

  // 将 getRandomPosition 也移到组件内部
  const getRandomPosition = (existingPositions: {[key: string]: {x: number, y: number}}, scrollY: number) => {
    const padding = 20;
    const maxAttempts = 50;
    
    const containerWidth = Math.min(window.innerWidth - 40, 800);
    const containerHeight = Math.max(window.innerHeight * 2, window.innerHeight + scrollY + 500);
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
        
        const minDistance = window.innerWidth < 640 ? 280 : 320;
        if (distance < minDistance + padding) {
          hasOverlap = true;
          break;
        }
      }

      if (!hasOverlap) {
        return newPosition;
      }
    }

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

  // 在 Messages 组件内部定义统一的高度
  const standardHeight = 150; // 消息框的标准高度

  // 修改消息位置计算函数
  const getMessagePosition = (index: number, type: string, scrollY: number) => {
    const waveCenter = {
      x: isMobile ? window.innerWidth * 0.5 : window.innerWidth * 0.25,
      y: window.innerHeight * 0.5
    };
    
    const messageWidth = window.innerWidth < 640 ? 260 : 300;
    const verticalSpacing = 1.1;
    
    if (type === "assistant_message") {
      const x = Math.max(20, waveCenter.x - messageWidth + (standardHeight * 0.5));
      const y = (index * standardHeight * verticalSpacing);
      return { x, y };
    } else {
      const x = Math.min(
        window.innerWidth - messageWidth - 20,
        waveCenter.x + (standardHeight * 0.5)
      );
      
      const y = (index * standardHeight * verticalSpacing);
      return { x, y };
    }
  };

  // 统一圆形大小的基础值
  const getCircleSize = () => {
    const viewportHeight = window.innerHeight;
    const baseSize = isMobile ? 174 : 174; // 固定基础大小与 SVG viewBox 一致
    return baseSize;
  };

  // 更新状态定义
  useEffect(() => {
    setUserBackgroundSize(getCircleSize());
    setAgentBackgroundSize(getCircleSize());
  }, []);

  // 计算用户音量并更新圆的大小
  useEffect(() => {
    if (micFft) {
      const volume = micFft.reduce((a, b) => a + b, 0);
      const baseSize = getCircleSize();
      const scale = Math.min(2, 1 + (volume * 2)); // 限制最大缩放为2倍
      setUserBackgroundSize(baseSize * scale);
    } else {
      setUserBackgroundSize(getCircleSize());
    }
  }, [micFft]);

  // 计算 agent 音量
  useEffect(() => {
    if (fft && isPlaying) {
      const volume = fft.reduce((a, b) => a + b, 0) / fft.length;
      setAgentBackgroundSize(getCircleSize() + volume);
    } else {
      setAgentBackgroundSize(getCircleSize());
    }
  }, [fft, isPlaying]);

  // 更新情绪颜色
  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (latestMessage?.type === "user_message") {
      const scores = latestMessage.models?.prosody?.scores;
      if (scores) {
        const sortedEmotions = Object.entries(scores)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([emotion]) => emotionColorMap[emotion as keyof typeof emotionColorMap] || "#4169E1");
        setUserEmotionColors(sortedEmotions);
      }
    } else if (latestMessage?.type === "assistant_message") {
      const scores = latestMessage.models?.prosody?.scores;
      if (scores) {
        const sortedEmotions = Object.entries(scores)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([emotion]) => emotionColorMap[emotion as keyof typeof emotionColorMap] || "#4169E1");
        setAgentEmotionColors(sortedEmotions);
        
        // 当 agent 开始说话时
        if (isPlaying && !isAgentSpeaking) {
          setIsAgentSpeaking(true);
        }
      }
      
      // 当 agent 停止说话时
      if (!isPlaying && isAgentSpeaking) {
        setIsAgentSpeaking(false);
      }
    }
  }, [messages, isPlaying, isAgentSpeaking]);

  // 获取 Agent 状态
  const getAgentStatus = () => {
    if (isPlaying) return 'Speaking';
    if (isPaused) return 'Listening';
    return 'Thinking';
  };

  // 添加响应式布局的辅助函数
  const getSize = (desktopSize: number, mobileRatio = 0.6) => 
    isMobile ? desktopSize * mobileRatio : desktopSize;

  // 在渲染前添加调试日志
  console.log('Agent emotion colors:', agentEmotionColors);

  // 改进的滚动函数
  const scrollToCenter = useCallback((messageIndex: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const containerHeight = container.clientHeight;
      const messageHeight = standardHeight * 1.1; // 考虑间距
      
      // 计算目标滚动位置（使最新消息在中心）
      const targetScroll = (messageIndex * messageHeight) - (containerHeight / 2) + (messageHeight / 2);
      
      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth',
        // @ts-ignore
        duration: 1000 // 1秒的滚动动画
      });
    }
  }, []);

  // 监听新消息
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessageIndex = messages.length - 1;
      setTimeout(() => {
        scrollToCenter(lastMessageIndex);
      }, 100);
    }
  }, [messages.length, scrollToCenter]);

  return (
    <motion.div
      layoutScroll
      className={cn(
        "grow rounded-md p-2 md:p-4",
        "relative",
        "bg-white dark:bg-black",
        "w-full",
        "overflow-x-hidden"
      )}
      ref={ref}
    >
      {/* 水波纹和圆形保持固定位置 */}
      {/* Agent的水波纹扇形 */}
      <motion.div
        className="fixed pointer-events-none"
        style={{
          left: isMobile ? '50%' : '25%',
          transform: `${isMobile ? 'translateX(-100%)' : 'translateX(-50%)'} translateY(-50%)`,
          top: '50%',
          marginTop: '0',
          width: isMobile ? '100%' : '50%',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          background: 'var(--background)',
        }}
      >
        {/* 内部实心渐变圆 - 使用 SVG */}
        <motion.div
          style={{
            position: 'absolute',
            width: `${standardHeight}px`,
            height: `${standardHeight}px`,
            clipPath: 'inset(0 0 0 50%)',
            zIndex: 1000,
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 174 174" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#agentClip)">
              <g filter="url(#agentBlur)">
                <circle 
                  cx="87" 
                  cy="87" 
                  r="87" 
                  fill={`url(#agentGradient)`}
                />
              </g>
              {/* 添加一个额外的发光效果，移除了外框 */}
              <g filter="url(#agentGlow)">
                <circle 
                  cx="87" 
                  cy="87" 
                  r="60" 
                  fill={`url(#agentInnerGradient)`}
                  style={{
                    opacity: isPlaying ? 0.8 : 0.4,
                    transition: 'opacity 0.3s ease'
                  }}
                />
              </g>
            </g>
            <defs>
              <filter
                id="agentBlur"
                x="-36"
                y="-36"
                width="246"
                height="246"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                <feGaussianBlur stdDeviation="18" result="effect1_foregroundBlur" />
              </filter>
              <filter
                id="agentGlow"
                x="-10"
                y="-10"
                width="194"
                height="194"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                <feGaussianBlur stdDeviation="8" result="effect1_foregroundBlur" />
              </filter>
              <radialGradient
                id="agentGradient"
                cx="0"
                cy="0"
                r="1"
                gradientUnits="userSpaceOnUse"
                gradientTransform="translate(87 87) rotate(90) scale(87)"
              >
                <stop offset="0%" stopColor={agentEmotionColors[0]} stopOpacity="0.9" />
                <stop offset="50%" stopColor={agentEmotionColors[1] || agentEmotionColors[0]} stopOpacity="0.6" />
                <stop offset="100%" stopColor={agentEmotionColors[2] || agentEmotionColors[0]} stopOpacity="0" />
              </radialGradient>
              <radialGradient
                id="agentInnerGradient"
                cx="0"
                cy="0"
                r="1"
                gradientUnits="userSpaceOnUse"
                gradientTransform="translate(87 87) rotate(-45) scale(60)"
              >
                <stop offset="0%" stopColor={agentEmotionColors[0]} stopOpacity="0.95" />
                <stop offset="40%" stopColor={agentEmotionColors[1] || agentEmotionColors[0]} stopOpacity="0.8" />
                <stop offset="100%" stopColor={agentEmotionColors[2] || agentEmotionColors[0]} stopOpacity="0" />
              </radialGradient>
              <clipPath id="agentClip">
                <circle cx="87" cy="87" r="87" />
              </clipPath>
            </defs>
          </svg>
        </motion.div>

        {/* 外部水波纹 */}
        <>
          {[1, 2, 3].map((index) => (
            <motion.div
              key={index}
              initial={{ scale: 0.4, opacity: 0.8 }}
              animate={{ 
                scale: [0.4, 1],
                opacity: [0.8, 0],
              }}
              transition={{
                duration: isMobile ? 10 : 15,
                repeat: Infinity,
                delay: index * (isMobile ? 3 : 4),
                ease: "easeOut"
              }}
              style={{
                position: 'absolute',
                width: `${getSize(agentBackgroundSize)}px`,
                height: `${getSize(agentBackgroundSize)}px`,
                clipPath: 'inset(0 0 0 50%)',
                background: `conic-gradient(
                  from 0deg at 50% 50%, 
                  transparent 0deg,
                  ${agentEmotionColors[0]} 90deg,
                  ${agentEmotionColors[1] || agentEmotionColors[0]} 135deg,
                  ${agentEmotionColors[2] || agentEmotionColors[1] || agentEmotionColors[0]} 160deg,
                  transparent 180deg,
                  transparent 360deg
                )`,
                borderRadius: '50%',
                opacity: isPlaying ? 0.9 : 0.5,
                filter: 'blur(2px)',
                zIndex: 999,
                mixBlendMode: 'normal',
                boxShadow: `
                  inset 0 0 50px 20px rgba(255, 255, 255, 0.2),
                  0 0 ${isMobile ? '50px 25px' : '70px 35px'} rgba(255, 255, 255, 0.15)
                `,
              }}
            />
          ))}
        </>
      </motion.div>

      {/* User的背景圆 */}
      <motion.div
        className="fixed pointer-events-none flex items-center justify-center"
        style={{
          right: isMobile ? '50%' : '25%',
          transform: `${isMobile ? 'translateX(100%)' : 'translateX(50%)'} translateY(-50%)`,
          top: '50%',
          marginTop: '0',
          zIndex: 100,
          background: 'var(--background)',
        }}
      >
        {/* 内部实心渐变圆 */}
        <motion.div
          style={{
            position: 'absolute',
            width: `${userBackgroundSize}px`,
            height: `${userBackgroundSize}px`,
            zIndex: 1000,
            transition: 'width 0.2s ease-out, height 0.2s ease-out'
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 174 174" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#userClip)">
              <g filter="url(#userBlur)">
                <circle 
                  cx="87" 
                  cy="87" 
                  r="87" 
                  fill={`url(#userGradient)`}
                />
              </g>
              {/* 添加内部发光效果 */}
              <g filter="url(#userGlow)">
                <circle 
                  cx="87" 
                  cy="87" 
                  r="60" 
                  fill={`url(#userInnerGradient)`}
                  style={{
                    opacity: micFft && micFft.reduce((a, b) => a + b, 0) > 0.05 ? 0.9 : 0.4, // 增加说话时的不透明度
                    transition: 'opacity 0.15s ease' // 加快透明度变化
                  }}
                />
              </g>
            </g>
            <defs>
              <filter
                id="userBlur"
                x="-36"
                y="-36"
                width="246"
                height="246"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                <feGaussianBlur stdDeviation="18" result="effect1_foregroundBlur" />
              </filter>
              <filter
                id="userGlow"
                x="-10"
                y="-10"
                width="194"
                height="194"
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                <feGaussianBlur stdDeviation="8" result="effect1_foregroundBlur" />
              </filter>
              <radialGradient
                id="userGradient"
                cx="0"
                cy="0"
                r="1"
                gradientUnits="userSpaceOnUse"
                gradientTransform="translate(87 87) rotate(90) scale(87)"
              >
                <stop offset="0%" stopColor={userEmotionColors[0]} stopOpacity="0.9" />
                <stop offset="50%" stopColor={userEmotionColors[1] || userEmotionColors[0]} stopOpacity="0.6" />
                <stop offset="100%" stopColor={userEmotionColors[2] || userEmotionColors[0]} stopOpacity="0" />
              </radialGradient>
              <radialGradient
                id="userInnerGradient"
                cx="0"
                cy="0"
                r="1"
                gradientUnits="userSpaceOnUse"
                gradientTransform="translate(87 87) rotate(-45) scale(60)"
              >
                <stop offset="0%" stopColor={userEmotionColors[0]} stopOpacity="0.95" />
                <stop offset="40%" stopColor={userEmotionColors[1] || userEmotionColors[0]} stopOpacity="0.8" />
                <stop offset="100%" stopColor={userEmotionColors[2] || userEmotionColors[0]} stopOpacity="0" />
              </radialGradient>
              <clipPath id="userClip">
                <circle cx="87" cy="87" r="87" />
              </clipPath>
            </defs>
          </svg>
        </motion.div>
      </motion.div>

      {/* 可滚动的消息列表容器 */}
      <motion.div
        ref={scrollContainerRef}
        className={cn(
          "w-full",
          "relative z-10",
          "overflow-y-auto",
          "overflow-x-visible",
          "h-[calc(100vh-4rem)]",
          "scrollbar-thin",
          "scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700",
          "scrollbar-track-transparent hover:scrollbar-thumb-gray-300 dark:hover:scrollbar-thumb-gray-600",
          "pb-24",
          "px-[300px] md:px-[400px]",
          "bg-white dark:bg-black"
        )}
        style={{
          scrollBehavior: 'smooth'
        }}
      >
        <div 
          className="relative w-full" 
          style={{
            minHeight: `${messages.length * standardHeight * 1.1 + window.innerHeight}px`,
            paddingTop: `${window.innerHeight / 2}px`, // 顶部填充
            paddingBottom: `${window.innerHeight / 2}px` // 底部填充
          }}
        >
          <AnimatePresence mode="popLayout">
            {messages.map((msg, index) => {
              if (msg.type === "user_message" || msg.type === "assistant_message") {
                const messageKey = msg.type + index;
                const position = getMessagePosition(index, msg.type, scrollY);

                if (!visibleMessages[messageKey] || !position || !('message' in msg)) return null;

                return (
                  <motion.div
                    key={messageKey}
                    className={cn(
                      "w-[200px] sm:w-[260px] md:w-[300px]",
                      "bg-white dark:bg-black",
                      "border border-border dark:border-gray-800",
                      "rounded-lg",
                      "pointer-events-auto",
                      "shadow-lg dark:shadow-none",
                      msg.type === "assistant_message" ? "mr-auto" : "ml-auto"
                    )}
                    initial={{ 
                      opacity: 0,
                      y: position.y + 50,
                      x: position.x
                    }}
                    animate={{ 
                      opacity: 1,
                      y: position.y,
                      x: position.x
                    }}
                    exit={{ 
                      opacity: 0,
                      y: position.y - 100,
                      transition: { duration: 0.5 }
                    }}
                    transition={{
                      duration: 0.5,
                      ease: "easeOut"
                    }}
                    style={{
                      position: 'absolute',
                      height: `${standardHeight}px`,
                      maxWidth: '80%',
                      zIndex: 1000 - (messages.length - index),
                    }}
                  >
                    <div className={cn(
                      "text-xs capitalize font-medium leading-none opacity-50 pt-3 px-2 md:pt-4 md:px-3"
                    )}>
                      {msg.message.role}
                    </div>
                    
                    <div className="pb-2 px-2 md:pb-3 md:px-3">
                      {msg.message.content}
                    </div>
                    
                    <Expressions values={{ ...msg.models.prosody?.scores }} />
                  </motion.div>
                );
              }
              return null;
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} style={{ height: '1px' }} />
        </div>
      </motion.div>

      {/* 音量指示器保持在底部固定位置 */}
      {status.value === "connected" && (
        <>
          {/* Agent音量显示 */}
          <div 
            className="fixed bottom-2 md:bottom-4 px-2 md:px-4 py-1 md:py-2 rounded-md bg-white dark:bg-black"
            style={{ 
              zIndex: 1000,
              left: isMobile ? '25%' : '25%',
              transform: 'translateX(-50%)',
              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
              fontSize: isMobile ? '12px' : '14px',
              fontWeight: 500,
            }}
          >
            <div>Dela is in {getAgentStatus()}</div>
            <div className="flex items-center gap-1 md:gap-2 mt-1">
              <div className="flex gap-0.5">
                {[...Array(15)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-0.5 md:w-1",
                      "h-3 md:h-4"
                    )}
                    style={{
                      backgroundColor: i < (fft ? Math.min(15, Math.floor((fft.reduce((a, b) => a + b, 0) / fft.length) * 15)) : 0) 
                        ? `rgb(${16 + (i * 4)}, ${185 - (i * 3)}, ${129 - (i * 2)})` 
                        : '#E5E7EB'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* User音量显示 */}
          <div 
            className="fixed bottom-2 md:bottom-4 px-2 md:px-4 py-1 md:py-2 rounded-md bg-white dark:bg-black"
            style={{ 
              zIndex: 1000,
              right: isMobile ? '25%' : '25%',
              transform: 'translateX(50%)',
              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
              fontSize: isMobile ? '12px' : '14px',
              fontWeight: 500,
            }}
          >
            <div>User Volume</div>
            <div className="flex items-center gap-1 md:gap-2 mt-1">
              <div className="flex gap-0.5">
                {[...Array(15)].map((_, i) => {
                  const volume = micFft ? (micFft.reduce((a, b) => a + b, 0) / micFft.length) : 0;
                  const normalizedVolume = volume > 0.05 ? volume : 0;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "w-0.5 md:w-1",
                        "h-3 md:h-4"
                      )}
                      style={{
                        backgroundColor: i < Math.min(15, Math.floor(normalizedVolume * 15))
                          ? `rgb(${59 + (i * 4)}, ${130 - (i * 2)}, ${246 - (i * 4)})`
                          : '#E5E7EB'
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
});

export default Messages;