"use client";
import { cn } from "@/utils";
import { useVoice } from "@humeai/voice-react";
import Expressions from "./Expressions";
import { AnimatePresence, motion } from "framer-motion";
import { ComponentRef, forwardRef, useEffect, useState, useRef, useCallback } from "react";
import StartCall from "./StartCall";
import { Lora } from 'next/font/google';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// 确保正确初始化 Lora
const lora = Lora({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'], // 添加需要的字重
  display: 'swap',
});

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

// 在文件顶部添加类型定义
type ProsodyScores = {
  [emotion: string]: number;
};

type MessageModels = {
  prosody?: {
    scores: ProsodyScores;
  };
};

interface BaseMessage {
  type: string;
  message?: {
    role: string;
    content: string;
  };
  models?: MessageModels;
}

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
  const [agentEmotionColors, setAgentEmotionColors] = useState<string[]>(["#43aa8b", "#0077b6", "#90be6d"]);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  
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
    const latestMessage = messages[messages.length - 1] as BaseMessage;
    
    if (!latestMessage || !latestMessage.models?.prosody?.scores) {
      return;
    }

    const emotionScores = latestMessage.models.prosody.scores;
    
    const topThreeColors = Object.entries(emotionScores)
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .slice(0, 3)
      .map(([emotion]) => {
        const color = emotionColorMap[emotion];
        return color || (latestMessage.type === "user_message" ? "#4169E1" : "#43aa8b");
      });

    if (latestMessage.type === "user_message") {
      setUserEmotionColors(topThreeColors);
    } else if (latestMessage.type === "assistant_message") {
      setAgentEmotionColors(topThreeColors);
    }

  }, [messages]);

  // 获取 Agent 状态
  const getAgentStatus = () => {
    if (isPlaying) return 'Speaking';
    if (isPaused) return 'Listening';
    return 'Thinking';
  };

  // 添加响应式布局的辅助函数
  const getSize = (desktopSize: number, mobileRatio = 0.6) => 
    isMobile ? desktopSize * mobileRatio : desktopSize;

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
        "overflow-x-hidden",
        lora.className
      )}
      ref={ref}
      style={{
        zIndex: 1  // 确保背景在最底层
      }}
    >
      {/* History Button */}
      <div 
        className="absolute left-4 top-4 w-10 h-10 cursor-pointer z-50"
        onClick={() => router.push('/history')}
      >
        <Image
          src="/history.png"
          alt="History"
          width={40}
          height={40}
          className="rounded-full hover:opacity-80 transition-opacity"
        />
      </div>

      {/* Agent的圆 - 一直显示 */}
      <motion.div
        className="fixed pointer-events-none"
        style={{
          left: '50%',
          top: isMobile ? '20%' : '30%',  // 只调整移动端位置
          transform: 'translateX(-50%) translateY(-50%) rotate(90deg)',
          width: isMobile ? '280px' : '15vw',  // 移动端使用固定大小
          height: isMobile ? '280px' : '15vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
      >
        {/* 内部实心渐变圆 - 使用 SVG */}
        <motion.div
          style={{
            position: 'absolute',
            width: '110%',
            height: '110%',
            zIndex: 1000,
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 174 174" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#agentClip)">
              <g filter="url(#agentBlur)">
                <circle 
                  cx="87" 
                  cy="87" 
                  r="70" 
                  fill={`url(#agentGradient)`}
                />
              </g>
              {/* 添加一个额外的发光效果，移除了外框 */}
              <g filter="url(#agentGlow)">
                <circle 
                  cx="87" 
                  cy="87" 
                  r="78" 
                  style={{
                    fill: `conic-gradient(
                      from -90deg,      // 从顶部开始
                      ${agentEmotionColors[0]} 0deg,      // 青绿色 #43aa8b
                      ${agentEmotionColors[0]} 120deg,    // 第一个颜色结束
                      ${agentEmotionColors[1]} 120deg,    // 深蓝色 #0077b6 开始
                      ${agentEmotionColors[1]} 240deg,    // 深蓝色结束
                      ${agentEmotionColors[2]} 240deg,    // 片绿色 #90be6d 开始
                      ${agentEmotionColors[2]} 360deg     // 片绿色结束，回到起点
                    )`,
                    filter: 'blur(0px)',
                    opacity: isPlaying ? 0.8 : 0.4,
                    transition: 'opacity 0.3s ease',
                    mixBlendMode: 'soft-light'
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
              initial={{ scale: 0.4, opacity: 0.8 }}  // 起始比例设为 0.4
              animate={{ 
                scale: [0.75, 1],    // 从 40% 开始扩散到 100%
                opacity: [0.8, 0],
              }}
              transition={{
                duration: isMobile ? 8 : 12,
                repeat: Infinity,
                delay: index * (isMobile ? 3 : 4),
                ease: "easeOut"
              }}
              style={{
                position: 'absolute',
                width: '100%',    // 改为100%以填充父容器
                height: '100%',   // 改为100%以填充父容器
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
            >
              <path
                d={`
                  M 100, 100
                  m -75, 0
                  ${Array.from({ length: 40 }, (_, i) => {  // 增加点数以获得更细腻的波浪
                    const angle = (i * Math.PI * 2) / 40;
                    // 创建多层次的波浪效果
                    const baseRadius = 75;
                    const wave1 = Math.sin(angle * 8 + Date.now() / 1000) * 9;
                    const wave2 = Math.sin(angle * 12 + Date.now() / 800) * 6;
                    const wave3 = Math.sin(angle * 6 + Date.now() / 1200) * 4;
                    const variance = wave1 + wave2 + wave3;
                    
                    const x = Math.cos(angle) * (baseRadius + variance);
                    const y = Math.sin(angle) * (baseRadius + variance);
                    return `${i === 0 ? 'M' : 'L'} ${100 + x},${100 + y}`;
                  }).join(' ')}
                  Z
                `}
                fill={`conic-gradient(
                  from 0deg at 50% 50%, 
                  transparent 0deg,
                  ${agentEmotionColors[0]} 90deg,
                  ${agentEmotionColors[1]} 135deg,
                  ${agentEmotionColors[2]} 160deg,
                  transparent 180deg,
                  transparent 360deg
                )`}
                style={{
                  filter: 'blur(0px)',
                  opacity: isPlaying ? 0.9 : 0.5,
                }}
              >
                <animate
                  attributeName="d"
                  dur="2s"
                  repeatCount="indefinite"
                  values={`
                    M 100, 100
                    m -75, 0
                    ${Array.from({ length: 40 }, (_, i) => {
                      const angle = (i * Math.PI * 2) / 40;
                      // 创建动画的第二帧波浪效果
                      const baseRadius = 75;
                      const wave1 = Math.cos(angle * 8) * 6;
                      const wave2 = Math.cos(angle * 12) * 4;
                      const wave3 = Math.cos(angle * 6) * 3;
                      const variance = wave1 + wave2 + wave3;
                      
                      const x = Math.cos(angle) * (baseRadius + variance);
                      const y = Math.sin(angle) * (baseRadius + variance);
                      return `${i === 0 ? 'M' : 'L'} ${100 + x},${100 + y}`;
                    }).join(' ')}
                    Z
                  `}
                />
              </path>
            </motion.div>
          ))}
        </>
      </motion.div>

      {/* Agent状态显示 - 只在通话连接后显示 */}
      {status.value === "connected" && (
        <div
          className={cn(
            "fixed text-center pointer-events-none",
            "text-black/70 dark:text-white/70",
            lora.className
          )}
          style={{
            left: '50%',
            top: '29%',
            transform: 'translateX(-50%)',
            fontSize: '1rem',
            fontWeight: 500,
            zIndex: 1100,
            color: 'rgba(255, 255, 255, 0.8)',
            textShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
          }}
        >
          {getAgentStatus()}
        </div>
      )}

      {/* 问候语 - 只在页面初始加载时显示 */}
      {status.value === "disconnected" && (
        <div
          className={cn(
            "fixed text-center pointer-events-none",
            "text-black/70 dark:text-white/70",
            lora.className
          )}
          style={{
            left: '50%',
            top: isMobile ? '44%' : '48%',  // 只调整移动端位置
            transform: 'translateX(-50%)',
            fontSize: isMobile ? '1.1rem' : '1.7rem',  // 移动端字体稍小
            fontWeight: 500,
            zIndex: 999,
          }}
        >
          Hey,<br />how's your day been?
        </div>
      )}

      {/* StartCall Button */}
      <div
        className={cn(
          "fixed",
          lora.className
        )}
        style={{
          left: '50%',
          top: isMobile ? '55%' : '60%',  // 只调整移动端位置
          transform: isMobile ? 'translate(-50%, 0) scale(0.6)' : 'translate(-50%, 0)',
          zIndex: 998,
        }}
      >
        <StartCall />
      </div>

      {/* User的圆形 */}
      <motion.div
        className="fixed pointer-events-none"
        style={{
          left: '50%',
          bottom: '-160%',  // 改为 -120%，让更多部分显示在视窗中
          transform: 'translateX(-50%)',
          width: '2000px',
          height: '2000px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 900,
        }}
      >
        {/* 波浪圆形 */}
        <svg width="100%" height="100%" viewBox="0 0 2000 2000">
          <defs>
            <linearGradient id="userGradient" gradientTransform="rotate(45, 0.5, 0.5)">
              <stop offset="0%" stopColor={userEmotionColors[0] || "#ff8b8b"} stopOpacity="0.7" />
              <stop offset="50%" stopColor={userEmotionColors[1] || "#ffb4b4"} stopOpacity="0.7" />
              <stop offset="100%" stopColor={userEmotionColors[2] || "#ffd6e0"} stopOpacity="0.7" />
            </linearGradient>
          </defs>
          
          <path
            d={`
              M 1000,1000
              m -800,0
              ${Array.from({ length: 540 }, (_, i) => {
                const angle = (i * Math.PI * 2) / 540;
                const baseRadius = 800;
                const rawVolume = micFft ? micFft.reduce((a, b) => a + b, 0) / 100 : 0;
                const volume = Math.min(1, rawVolume * 0.7 + (rawVolume > 0 ? 0.3 : 0));
                const time = Date.now();
                
                // 基础海浪 - 大的波浪运动
                const oceanWaves = [
                  Math.sin(angle * 2 + time / 5000) * 3 * (volume * 0.7 + 1),  // 缓慢的主要波浪
                  Math.sin(angle * 1.5 + time / 4500) * 2.5 * (volume * 0.7 + 1),  // 次要波浪
                ];
                
                // 表面波纹 - 较小的快速波动
                const ripples = [
                  Math.sin(angle * 8 + time / 2000) * 0.8 * (volume * 0.7 + 1),
                  Math.sin(angle * 6 + time / 2200) * 0.6 * (volume * 0.7 + 1),
                  Math.sin(angle * 10 + time / 1800) * 0.5 * (volume * 0.7 + 1),
                  Math.sin(angle * 7 + time / 2400) * 0.7 * (volume * 0.7 + 1),
                  Math.sin(angle * 9 + time / 2100) * 0.4 * (volume * 0.7 + 1),
                ];
                
                const volumeFactor = Math.pow(volume, 1.5);
                // 音量驱动的波浪 - 模拟涌浪
                const volumeWaves = volume > 0.2 ? [
                  Math.sin(angle * 4 + time / 3000 + Math.sin(time / 8000) * 2) * 2 * volumeFactor * 2.5,
                  Math.sin(angle * 3 + time / 3500 + Math.sin(time / 7000) * 2) * 1.8 * volumeFactor * 2.5,
                  Math.sin(angle * 5 + time / 3200 + Math.sin(time / 9000) * 2) * 1.6 * volumeFactor * 2.5,
                ] : [];
                
                // 高音量波浪 - 模拟浪花
                const highVolumeWaves = volume > 0.5 ? [
                  Math.sin(angle * 12 + time / 1500) * 1.2 * volumeFactor * 3,
                  Math.sin(angle * 15 + time / 1200) * 1 * volumeFactor * 3,
                  Math.sin(angle * 14 + time / 1300) * 0.8 * volumeFactor * 3,
                  // 添加随机性模拟浪花飞溅
                  Math.sin(angle * 20 + time / 1000) * Math.random() * volumeFactor * 2,
                ] : [];
                
                // 组合所有波浪并添加缓慢的整体起伏
                const allWaves = [
                  ...oceanWaves, 
                  ...ripples, 
                  ...volumeWaves, 
                  ...highVolumeWaves
                ];
                const variance = allWaves.reduce((sum, wave) => sum + wave, 0) 
                  + Math.sin(angle * 0.5 + time / 10000) * 5; // 缓慢的整体起伏
                
                const x = Math.cos(angle) * (baseRadius + variance);
                const y = Math.sin(angle) * (baseRadius + variance);
                return `${i === 0 ? 'M' : 'L'} ${1000 + x},${1000 + y}`;
              }).join(' ')}
              Z
            `}
            fill="url(#userGradient)"
            style={{
              filter: 'blur(2px)',
              mixBlendMode: 'soft-light',
              background: `conic-gradient(
                from 275deg,
                ${userEmotionColors[0] || "#ff8b8b"} 0deg,
                ${userEmotionColors[1] || "#ffb4b4"} 85deg,
                ${userEmotionColors[2] || "#ffd6e0"} 130deg
              )`,
            }}
          >
            <animate
              attributeName="d"
              dur="8s"  // 增加动画时长使海浪更自然
              repeatCount="indefinite"
              values={`
                M 1000,1000
                m -800,0
                ${Array.from({ length: 540 }, (_, i) => {
                  const angle = (i * Math.PI * 2) / 540;
                  const baseRadius = 800;
                  const rawVolume = micFft ? micFft.reduce((a, b) => a + b, 0) / 100 : 0;
                  const volume = Math.min(1, rawVolume * 0.7 + (rawVolume > 0 ? 0.3 : 0));
                  const time = Date.now();
                  
                  const oceanWaves = [
                    Math.cos(angle * 2 + time / 5000) * 3 * (volume * 0.7 + 1),
                    Math.cos(angle * 1.5 + time / 4500) * 2.5 * (volume * 0.7 + 1),
                  ];
                  
                  const ripples = [
                    Math.cos(angle * 8 + time / 2000) * 0.8 * (volume * 0.7 + 1),
                    Math.cos(angle * 6 + time / 2200) * 0.6 * (volume * 0.7 + 1),
                    Math.cos(angle * 10 + time / 1800) * 0.5 * (volume * 0.7 + 1),
                    Math.cos(angle * 7 + time / 2400) * 0.7 * (volume * 0.7 + 1),
                    Math.cos(angle * 9 + time / 2100) * 0.4 * (volume * 0.7 + 1),
                  ];
                  
                  const volumeFactor = Math.pow(volume, 1.5);
                  const volumeWaves = volume > 0.2 ? [
                    Math.cos(angle * 4 + time / 3000 + Math.cos(time / 8000) * 2) * 2 * volumeFactor * 2.5,
                    Math.cos(angle * 3 + time / 3500 + Math.cos(time / 7000) * 2) * 1.8 * volumeFactor * 2.5,
                    Math.cos(angle * 5 + time / 3200 + Math.cos(time / 9000) * 2) * 1.6 * volumeFactor * 2.5,
                  ] : [];
                  
                  const highVolumeWaves = volume > 0.5 ? [
                    Math.cos(angle * 12 + time / 1500) * 1.2 * volumeFactor * 3,
                    Math.cos(angle * 15 + time / 1200) * 1 * volumeFactor * 3,
                    Math.cos(angle * 14 + time / 1300) * 0.8 * volumeFactor * 3,
                    Math.cos(angle * 20 + time / 1000) * Math.random() * volumeFactor * 2,
                  ] : [];
                  
                  const allWaves = [
                    ...oceanWaves, 
                    ...ripples, 
                    ...volumeWaves, 
                    ...highVolumeWaves
                  ];
                  const variance = allWaves.reduce((sum, wave) => sum + wave, 0)
                    + Math.cos(angle * 0.5 + time / 10000) * 5;
                  
                  const x = Math.cos(angle) * (baseRadius + variance);
                  const y = Math.sin(angle) * (baseRadius + variance);
                  return `${i === 0 ? 'M' : 'L'} ${1000 + x},${1000 + y}`;
                }).join(' ')}
                Z
              `}
            />
          </path>
        </svg>
      </motion.div>

      {/* 可滚动的消息列表容器 */}
      <motion.div
        ref={scrollContainerRef}
        className={cn(
          "w-full",
          "relative z-10",
          "overflow-x-hidden",
          "h-screen",
          "pb-24",
          "px-[300px] md:px-[400px]",
          "bg-white dark:bg-black",
          lora.className
        )}
        style={{
          height: '100vh',
          maxHeight: '100vh',
          overflowY: 'hidden',  // 改为 hidden
        }}
      >
        <div 
          className="relative w-full" 
          style={{
            minHeight: '100vh',  // 改为视窗高度
            height: '100vh',     // 固定高度
            paddingTop: '20vh',  // 使用视窗高度的百分比
            paddingBottom: '20vh'
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

      {/* 移除音量指示器，保留其他内容 */}
      {status.value === "connected" && (
        <>
          {/* 其他需要在通话状态显示的内容可以放在这里 */}
        </>
      )}

    </motion.div>
  );
});

export default Messages;