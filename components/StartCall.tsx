import { useVoice } from "@humeai/voice-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui/button";
import { Phone } from "lucide-react";
import { useEffect } from "react";

export default function StartCall() {
  const { status, connect } = useVoice();

  // 在组件加载时设置深色模式
  useEffect(() => {
    // 设置 HTML 根元素的 class
    document.documentElement.classList.add("dark");
    // 保存主题设置到 localStorage
    localStorage.setItem("theme", "dark");
  }, []);

  return (
    <AnimatePresence mode="wait">
      {status.value !== "connected" ? (
        <motion.div
          className={
            "fixed inset-0 p-4 flex items-center justify-center bg-black z-[200]"
          }
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ pointerEvents: 'auto' }}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{ zIndex: 200 }}
          >
            <Button
              className={"flex items-center gap-3 text-xl px-8 py-6"}
              onClick={() => {
                connect()
                  .then(() => {})
                  .catch(() => {})
                  .finally(() => {});
              }}
              style={{ zIndex: 200 }}
            >
              <span>
                <Phone
                  className={"size-6 opacity-50"}
                  strokeWidth={2}
                  stroke={"currentColor"}
                />
              </span>
              <span>How's your day been? </span>
            </Button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
