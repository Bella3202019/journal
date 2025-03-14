import { useVoice } from "@humeai/voice-react";
import { AnimatePresence, motion } from "framer-motion";
import { getAuth } from 'firebase/auth';
import { storeChatMapping } from '@/lib/db';
import { useEffect } from "react";
import Image from 'next/image';

export default function StartCall() {
  const { status, connect, chatMetadata } = useVoice();
  
  useEffect(() => {
    const saveChatMapping = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user && chatMetadata?.chatId) {
        try {
          await storeChatMapping(user.uid, chatMetadata.chatId);
        } catch (error) {
          console.error("Failed to save chat mapping:", error);
        }
      }
    };

    saveChatMapping();
  }, [chatMetadata]);

  const handleStartCall = async () => {
    try {
      await connect();
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {status.value !== "connected" ? (
        <motion.div
          className="flex items-center justify-center bg-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            onClick={handleStartCall}
            className="cursor-pointer transition-all duration-300 active:scale-90 hover:scale-110 bg-transparent"
          >
            <Image
              src="/microphone.png"
              alt="Microphone"
              width={60}
              height={60}
              className="w-14 h-14 sm:w-[60px] sm:h-[60px] transition-opacity hover:opacity-80 active:opacity-60 invert dark:invert-0"
              style={{ 
                pointerEvents: status.value === "connecting" ? 'none' : 'auto',
                backgroundColor: 'transparent'
              }}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
