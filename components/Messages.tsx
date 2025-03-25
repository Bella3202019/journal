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
  const [isExpanded, setIsExpanded] = useState(false);
  
  
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
    
    const messageWidth = isMobile ? 220 : 300; // 移动端减小消息宽度
    const verticalSpacing = isMobile ? 1.05 : 1.1; // 移动端减小垂直间距
    
    if (type === "assistant_message") {
      const x = Math.max(10, waveCenter.x - messageWidth + (standardHeight * 0.5));
      const y = (index * standardHeight * verticalSpacing);
      return { x, y };
    } else {
      const x = Math.min(
        window.innerWidth - messageWidth - 10,
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
        className="absolute left-4 top-4 cursor-pointer z-50"
        onClick={() => {
          setIsExpanded(true);  // 添加展开状态
          setTimeout(() => {
            router.push('/history');
          }, 300);
        }}
      >
        <motion.div
          animate={{ 
            opacity: isExpanded ? 0 : 1,
            scale: isExpanded ? 0.8 : 1
          }}
          transition={{ duration: 0.3 }}
        >
          <Image
            src="/history.png"
            alt="History"
            width={40}
            height={40}
            className="rounded-full hover:opacity-80 transition-opacity"
          />
        </motion.div>
      </div>

      {/* Agent的圆 - 一直显示 */}
      <motion.div
        className="fixed pointer-events-none"
        style={{
          left: '50%',
          top: isMobile ? '20%' : '30%',
          transform: 'translateX(-50%) translateY(-50%) rotate(90deg)',
          width: isMobile ? '200px' : '15vw',
          height: isMobile ? '200px' : '15vw',
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
                  className="dark:opacity-100 opacity-80"
                  fill="url(#agentGradient)"
                />
              </g>
              <g filter="url(#agentGlow)">
                <circle 
                  cx="87" 
                  cy="87" 
                  r="78" 
                  style={{
                    opacity: isPlaying ? 0.9 : 0.5,
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
                <feGaussianBlur stdDeviation="12" result="effect1_foregroundBlur" />
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
                <feGaussianBlur stdDeviation="6" result="effect1_foregroundBlur" />
              </filter>
              <radialGradient
                id="agentGradient"
                cx="0"
                cy="0"
                r="1"
                gradientUnits="userSpaceOnUse"
                gradientTransform="translate(87 87) rotate(90) scale(87)"
              >
                <stop offset="0%" stopColor={agentEmotionColors[0]} stopOpacity="1" />
                <stop offset="40%" stopColor={agentEmotionColors[1] || agentEmotionColors[0]} stopOpacity="0.8" />
                <stop offset="100%" stopColor={agentEmotionColors[2] || agentEmotionColors[0]} stopOpacity="0" />
              </radialGradient>
              <clipPath id="agentClip">
                <circle cx="87" cy="87" r="87" />
              </clipPath>
            </defs>
          </svg>
        </motion.div>

        {/* 移除外部水波纹的锥形渐变，改为环形渐变 */}
        <>
          {[1, 2, 3].map((index) => (
            <motion.div
              key={index}
              initial={{ 
                scale: 0.85,  // 起始比例调大一些
                opacity: 0    // 从完全透明开始
              }}
              animate={{ 
                scale: [0.85, 1],    // 保持起始比例一致
                opacity: [0, 0.8, 0] // 添加中间态，使过渡更柔和
              }}
              transition={{
                duration: isMobile ? 8 : 12,
                repeat: Infinity,
                delay: index * (isMobile ? 3 : 4),
                ease: "easeInOut",   // 改用 easeInOut 使过渡更平滑
                times: [0, 0.5, 1]   // 对应 opacity 的三个状态的时间点
              }}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                background: `radial-gradient(circle at 50% 50%,
                  ${agentEmotionColors[0]} 0%,
                  ${agentEmotionColors[1] || agentEmotionColors[0]} 50%,
                  ${agentEmotionColors[2] || agentEmotionColors[0]} 75%,
                  transparent 100%
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

      {/* Agent状态显示 - 只在通话连接后显示 */}
      {status.value === "connected" && (
        <div
          className={cn(
            "absolute text-center pointer-events-none",
            "text-black/70 dark:text-white/70",
            lora.className
          )}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '90vh',  // 从 88vh 改为 90vh，使其更靠上
            transform: 'translateX(-50%)',
            fontSize: isMobile ? '0.9rem' : '1rem',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.8)',
            textShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
            letterSpacing: '0.05em',
            width: '100%',
            textAlign: 'center',
            zIndex: 1100,
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
            "text-black/80 dark:text-white/90",
            lora.className
          )}
          style={{
            left: '50%',
            top: isMobile ? '42%' : '48%',  // 只调整移动端位置
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
          top: isMobile ? '35%' : '60%',  // 只调整移动端位置
          transform: isMobile ? 'translate(-50%, 0) scale(0.6)' : 'translate(-50%, 0)',
          zIndex: 998,
        }}
      >
        <StartCall />
      </div>

      {/* User的圆形 */}
      <motion.div
        className="fixed pointer-events-none overflow-hidden"
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          width: isMobile ? '1200px' : '2000px',
          height: '100vh',
          bottom: '-55vh',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          zIndex: 900,
        }}
      >
        <svg 
          width="100%" 
          height="100vh"  // 限制 SVG 高度为视口高度
          viewBox={`0 0 2000 1000`}  // 调整 viewBox 高度
          preserveAspectRatio="xMidYMin slice"
        >
          <defs>
            <linearGradient id="userGradient" gradientTransform="rotate(45, 0.5, 0.5)">
              <stop offset="0%" stopColor={userEmotionColors[0] || "#ff8b8b"} stopOpacity="0.7" className="dark:opacity-70 opacity-40" />
              <stop offset="50%" stopColor={userEmotionColors[1] || "#ffb4b4"} stopOpacity="0.7" className="dark:opacity-70 opacity-40" />
              <stop offset="100%" stopColor={userEmotionColors[2] || "#ffd6e0"} stopOpacity="0.7" className="dark:opacity-70 opacity-40" />
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
                // 调整音量响应曲线，使其更平滑
                const volume = Math.min(1, rawVolume * 0.8 + (rawVolume > 0 ? 0.2 : 0));
                const time = Date.now();
                
                // 主要波浪 - 更宽更优雅的波动
                const mainWave = 
                  Math.sin(angle * 0.8 + time / 5000) * 12 * (volume * 1.2 + 0.5) + // 基础波形，降低频率，增加振幅
                  Math.sin(angle * 0.4 + time / 7000) * 8 * (volume * 1.0 + 0.3);  // 次要波形，更慢的波动
                
                // 添加平滑的起伏
                const smoothWave = 
                  Math.sin(angle * 0.2 + time / 8000) * 5 * (volume * 0.8 + 0.2);  // 非常缓慢的波动
                
                // 音量驱动的上扬效果 - 更平滑的过渡
                const volumeEffect = volume > 0.1 ? 
                  Math.pow(Math.max(0, Math.sin(angle - Math.PI/2)), 2) * // 使用平方使过渡更平滑
                  20 * Math.pow(volume, 1.8) : 0; // 增加音量影响
                
                // 组合所有效果
                const variance = 
                  mainWave + 
                  smoothWave +
                  volumeEffect +
                  Math.sin(angle * 0.3 + time / 10000) * 4; // 更缓慢的整体起伏
                
                const x = Math.cos(angle) * (baseRadius + variance);
                const y = Math.sin(angle) * (baseRadius + variance);
                return `${i === 0 ? 'M' : 'L'} ${1000 + x},${1000 + y}`;
              }).join(' ')}
              Z
            `}
            fill="url(#userGradient)"
            className="dark:opacity-70 opacity-40"
            style={{
              filter: 'blur(2px)',
              mixBlendMode: 'soft-light',
              opacity: 0.7
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
                  const volume = Math.min(1, rawVolume * 0.8 + (rawVolume > 0 ? 0.2 : 0));
                  const time = Date.now();
                  
                  const mainWave = 
                    Math.sin(angle * 1 + time / 5000) * 16 * (volume * 1.2 + 0.5) + // 基础波形，降低频率，增加振幅
                    Math.sin(angle * 0.6 + time / 7000) * 10 * (volume * 1.0 + 0.3);  // 次要波形，更慢的波动
                  
                  const smoothWave = 
                    Math.sin(angle * 0.3 + time / 8000) * 8 * (volume * 0.8 + 0.2);  // 非常缓慢的波动
                  
                  const volumeEffect = volume > 0.1 ? 
                    Math.pow(Math.max(0, Math.sin(angle - Math.PI/2)), 2) * // 使用平方使过渡更平滑
                    22 * Math.pow(volume, 1.8) : 0; // 增加音量影响
                  
                  const variance = 
                    mainWave + 
                    smoothWave +
                    volumeEffect +
                    Math.sin(angle * 0.3 + time / 10000) * 4; // 更缓慢的整体起伏
                  
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

      {/* 消息容器 */}
      <motion.div
        ref={scrollContainerRef}
        className={cn(
          "w-full",
          "relative z-10",
          "overflow-y-auto",
          "h-[calc(100vh-180px)]", // 移动端留更多空间
          "pb-24",
          "px-4 md:px-[300px]", // 移动端减小左右padding
          "bg-white dark:bg-black",
          lora.className
        )}
        style={{
          position: 'relative',
          marginTop: isMobile ? '35vh' : '20vh', // 移动端增加顶部边距
        }}
      >
        <div 
          className="relative w-full" 
          style={{
            minHeight: '100vh',
            overflow: 'visible', // 改为 visible
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