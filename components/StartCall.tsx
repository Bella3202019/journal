import { useVoice } from "@humeai/voice-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui/button";
import { getAuth } from 'firebase/auth';
import { storeChatMapping } from '@/lib/db';
import { useEffect } from "react";

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
          className="flex items-center justify-center bg-transparent hover:scale-110 transition-all duration-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            onClick={handleStartCall}
            disabled={status.value === "connecting"}
            className="w-24 h-24 rounded-full flex items-center justify-center bg-transparent hover:bg-transparent dark:hover:bg-transparent"
          >
            <div className="flex items-center gap-[6px] scale-150">
              {/* Left dot */}
              <div className="w-[4px] h-[4px] bg-black dark:bg-white rounded-full" />
              
              {/* Center bars */}
              <div className="w-[3px] h-4 bg-black dark:bg-white rounded-full" />
              <div className="w-[3px] h-6 bg-black dark:bg-white rounded-full" />
              <div className="w-[3px] h-4 bg-black dark:bg-white rounded-full" />
              
              {/* Right dot */}
              <div className="w-[4px] h-[4px] bg-black dark:bg-white rounded-full" />
            </div>
          </Button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
