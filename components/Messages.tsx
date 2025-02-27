"use client";
import { cn } from "@/utils";
import { useVoice } from "@humeai/voice-react";
import Expressions from "./Expressions";
import { AnimatePresence, motion } from "framer-motion";
import { ComponentRef, forwardRef, useEffect, useState, useRef } from "react";

// 定义情绪颜色映射的类型
type EmotionColorMap = {
  [key: string]: string;
};

// 情绪对应的颜色映射
const emotionColorMap: EmotionColorMap = {
  // 积极情绪 - 绿色系和暖色系
  Admiration: "#32CD32",       // 酸橙绿
  Adoration: "#98FB98",        // 淡绿
  "Aesthetic Appreciation": "#90EE90", // 淡绿
  Amusement: "#7FFF00",        // 查特兰绿
  Approval: "#00FF7F",         // 春绿
  Caring: "#FFB6C1",          // 浅粉红
  Calmness: "#98FB98",         // 淡绿
  Contentment: "#3CB371",      // 中海绿
  Determination: "#2E8B57",    // 海绿
  Ecstasy: "#00FA9A",         // 中春绿
  Enthusiasm: "#66CDAA",       // 中绿宝石
  Excitement: "#43CD80",       // 海绿
  Gratitude: "#9ACD32",        // 黄绿
  Interest: "#6B8E23",        // 橄榄绿
  Joy: "#228B22",             // 森林绿
  Love: "#FFB6C1",            // 浅粉红
  Optimism: "#98FB98",        // 淡绿
  Pride: "#20B2AA",           // 亮海绿
  Relief: "#90EE90",          // 淡绿
  Romance: "#FF69B4",         // 热粉红
  Satisfaction: "#32CD32",     // 酸橙绿
  "Surprise (positive)": "#7CCD7C", // 中绿
  Triumph: "#00FF00",         // 酸橙色

  // 中性情绪 - 蓝色系
  Concentration: "#4682B4",    // 钢蓝
  Contemplation: "#87CEEB",    // 天蓝
  Craving: "#B0C4DE",         // 淡钢蓝
  Curiosity: "#1E90FF",       // 道奇蓝
  Desire: "#ADD8E6",          // 亮蓝
  Nostalgia: "#87CEFA",       // 亮天蓝
  Realization: "#00BFFF",      // 深天蓝
  Sympathy: "#4169E1",        // 皇家蓝

  // 消极情绪 - 红色、灰色和深色系
  Anger: "#DC143C",           // 猩红
  Annoyance: "#CD5C5C",       // 印度红
  Anxiety: "#8B0000",         // 暗红
  Awkwardness: "#A0522D",     // 赭色
  Boredom: "#808080",         // 灰色
  Confusion: "#DEB887",       // 实木色
  Contempt: "#8B4513",        // 马鞍棕
  Disappointment: "#CD853F",   // 秘鲁色
  Disapproval: "#B22222",      // 火砖红
  Disgust: "#8B4513",         // 马鞍棕
  Distress: "#DC143C",        // 猩红
  Doubt: "#696969",           // 暗灰
  Embarrassment: "#DEB887",    // 实木色
  "Empathic Pain": "#800000",  // 栗色
  Envy: "#556B2F",            // 暗橄榄绿
  Fear: "#800000",            // 栗色
  Guilt: "#2F4F4F",           // 暗岩灰
  Horror: "#8B0000",          // 暗红
  Pain: "#A52A2A",            // 褐色
  Sadness: "#4682B4",         // 钢蓝
  Shame: "#8B4513",           // 马鞍棕
  "Surprise (negative)": "#DC143C", // 猩红
  Tiredness: "#778899",       // 亮灰
  Yearning: "#DEB887",        // 实木色
};

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
      
      // 移动端增加间距
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
  const { messages, micFft, fft, isPlaying, isPaused, status } = useVoice();
  const [visibleMessages, setVisibleMessages] = useState<{[key: string]: boolean}>({});
  const messagePositions = useRef<{[key: string]: {x: number, y: number}}>({});
  const [scrollY, setScrollY] = useState(0);
  const [userBackgroundSize, setUserBackgroundSize] = useState(800);
  const [agentBackgroundSize, setAgentBackgroundSize] = useState(800);
  const [userEmotionColors, setUserEmotionColors] = useState<string[]>(["#4169E1", "#87CEEB", "#B0C4DE"]);
  const [agentEmotionColors, setAgentEmotionColors] = useState<string[]>(["#4169E1", "#87CEEB", "#B0C4DE"]);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);

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

  // 计算圆球大小
  const getCircleSize = () => {
    const viewportHeight = window.innerHeight;
    const baseSize = viewportHeight * 0.5; // 50% 的视口高度
    return window.innerWidth < 768 ? baseSize * 0.8 : baseSize; // 移动端稍微缩小
  };

  // 更新状态定义
  useEffect(() => {
    setUserBackgroundSize(getCircleSize());
    setAgentBackgroundSize(getCircleSize());
  }, []);

  // 计算用户音量
  useEffect(() => {
    if (micFft) {
      const volume = micFft.reduce((a, b) => a + b, 0) / micFft.length;
      const normalizedVolume = Math.min(100, Math.max(0, volume * 100));
      setUserBackgroundSize(getCircleSize() + normalizedVolume * 2);
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
      }
    }
  }, [messages, micFft]);

  // 获取 Agent 状态
  const getAgentStatus = () => {
    if (isPlaying) return 'Speaking';
    if (isPaused) return 'Listening';
    return 'Thinking';
  };

  // 添加响应式布局的辅助函数
  const isMobile = window.innerWidth < 768;
  const getSize = (desktopSize: number, mobileRatio = 0.6) => 
    isMobile ? desktopSize * mobileRatio : desktopSize;

  return (
    <motion.div
      layoutScroll
      className={cn(
        "grow rounded-md p-2 md:p-4", // 调整内边距
        "overflow-auto",
        "relative"
      )}
      ref={ref}
    >
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
          zIndex: 100,
        }}
      >
        <>
          {[1, 2, 3].map((index) => (
            <motion.div
              key={index}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ 
                scale: [0, 1],
                opacity: [0.8, 0],
              }}
              transition={{
                duration: isMobile ? 1.5 : 2, // 移动端加快动画
                repeat: Infinity,
                delay: index * (isMobile ? 0.3 : 0.4),
                ease: "easeOut"
              }}
              style={{
                position: 'absolute',
                width: `${getSize(agentBackgroundSize)}px`,
                height: `${getSize(agentBackgroundSize)}px`,
                background: `conic-gradient(from 0deg at 100% 50%, ${agentEmotionColors[0]} 0deg, transparent 180deg)`,
                borderRadius: '50%',
                opacity: 1,
                filter: 'blur(2px)',
                zIndex: 100,
                mixBlendMode: 'normal',
              }}
            />
          ))}
        </>
      </motion.div>

      {/* User的背景圆球 */}
      <motion.div
        className="fixed pointer-events-none flex items-center justify-center"
        style={{
          right: isMobile ? '50%' : '25%',
          transform: `${isMobile ? 'translateX(100%)' : 'translateX(50%)'} translateY(-50%)`,
          top: '50%',
          marginTop: '0',
          zIndex: 100,
        }}
      >
        <motion.div
          animate={{
            width: userBackgroundSize,
            height: userBackgroundSize,
            background: `
              radial-gradient(
                circle at center,
                ${userEmotionColors[0]} 0%,
                transparent 70%
              ),
              conic-gradient(
                from 0deg at center,
                ${userEmotionColors[1] || userEmotionColors[0]} 0deg,
                ${userEmotionColors[2] || userEmotionColors[1] || userEmotionColors[0]} 120deg,
                ${userEmotionColors[0]} 240deg,
                ${userEmotionColors[1] || userEmotionColors[0]} 360deg
              )
            `,
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: isMobile ? 4 : 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="rounded-full"
          style={{
            opacity: 0.8,
            filter: 'blur(3px)',
            boxShadow: `
              inset 0 0 50px 20px rgba(255, 255, 255, 0.2),
              0 0 ${isMobile ? '50px 25px' : '70px 35px'} rgba(255, 255, 255, 0.15)
            `,
            mixBlendMode: 'normal',
            backdropFilter: 'blur(5px)',
          }}
        />
      </motion.div>

      {/* 消息列表容器 */}
      <motion.div
        className={cn(
          "max-w-2xl mx-auto w-full flex flex-col gap-2 md:gap-4 pb-24", // 调整间距
          "h-auto",
          "overflow-y-auto",
          "relative z-10"
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
                    "w-[200px] sm:w-[260px] md:w-[300px]", // 调整消息宽度
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
                    "text-xs capitalize font-medium leading-none opacity-50 pt-3 px-2 md:pt-4 md:px-3" // 调整内边距
                  )}>
                    {msg.message.role}
                  </div>
                  
                  <div className={"pb-2 px-2 md:pb-3 md:px-3"}> {/* 调整内边距 */}
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

      {/* 音量指示器 */}
      {status.value === "connected" && (
        <>
          {/* Agent音量显示 */}
          <div 
            className="fixed bottom-2 md:bottom-4 px-2 md:px-4 py-1 md:py-2 rounded-md"
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
            className="fixed bottom-2 md:bottom-4 px-2 md:px-4 py-1 md:py-2 rounded-md"
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