import { useVoice } from "@humeai/voice-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui/button";
import { Phone } from "lucide-react";

export default function StartCall() {
  const { status, connect } = useVoice();

  const handleStartCall = () => {
    connect()
      .then(() => {
        // Connection successful - voice stream starts
      })
      .catch((error) => {
        // Handle connection errors (e.g. microphone access denied)
        console.error("Failed to connect:", error);
      });
  };

  return (
    <AnimatePresence mode="wait">
      {status.value !== "connected" ? (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/90 z-[200]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              className="flex items-center gap-3 text-xl px-8 py-6 hover:bg-primary/90"
              onClick={handleStartCall}
              disabled={status.value === "connecting"}
            >
              <Phone className="size-6 opacity-50" strokeWidth={2} />
              <span>
                {status.value === "connecting" 
                  ? "Connecting..." 
                  : "How's your day been?"}
              </span>
            </Button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
