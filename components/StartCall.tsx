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
          className="flex items-center justify-center bg-white dark:bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            onClick={handleStartCall}
            disabled={status.value === "connecting"}
            className="w-24 h-24 rounded-full flex items-center justify-center bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-200 hover:scale-105 hover:shadow-sm"
          >
            <div className="flex items-center gap-[6px] scale-150">
              {/* Left dot */}
              <div className="w-[4px] h-[4px] bg-gray-400 dark:bg-gray-600 rounded-full" />
              
              {/* Center bars */}
              <div className="w-[3px] h-4 bg-gray-400 dark:bg-gray-600 rounded-full" />
              <div className="w-[3px] h-6 bg-gray-400 dark:bg-gray-600 rounded-full" />
              <div className="w-[3px] h-4 bg-gray-400 dark:bg-gray-600 rounded-full" />
              
              {/* Right dot */}
              <div className="w-[4px] h-[4px] bg-gray-400 dark:bg-gray-600 rounded-full" />
            </div>
          </Button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
