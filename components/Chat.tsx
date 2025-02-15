"use client";

import { VoiceProvider } from "@humeai/voice-react";
import Messages from "./Messages";
import Controls from "./Controls";
import StartCall from "./StartCall";
import { ComponentRef, useRef } from "react";
import { cn } from "@/utils";

interface ClientComponentProps {
  accessToken: string;
}

export default function ClientComponent({
  accessToken,
}: ClientComponentProps) {
  const timeout = useRef<number | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);

  const configId = process.env['NEXT_PUBLIC_HUME_CONFIG_ID'];

  return (
    <div
      className={cn(
        "relative grow flex flex-col mx-auto w-full overflow-hidden min-h-screen",
        "dark:bg-[#0a1510]"
      )}
    >
      <div 
        className={cn(
          "absolute inset-0",
          "dark:bg-[#0a1510]"
        )}
        style={{ 
          backgroundColor: 'var(--background, #e0f5e9)',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23e0f5e9'/%3E%3Crect x='0' y='0' width='200' height='150' fill='%2398e2c6' rx='10'/%3E%3Crect x='200' y='0' width='200' height='150' fill='%237ddbb3' rx='10'/%3E%3Crect x='400' y='0' width='200' height='150' fill='%2398e2c6' rx='10'/%3E%3Crect x='600' y='0' width='200' height='150' fill='%23b7ebd7' rx='10'/%3E%3Crect x='100' y='150' width='200' height='150' fill='%23b7ebd7' rx='10'/%3E%3Crect x='300' y='150' width='200' height='150' fill='%2398e2c6' rx='10'/%3E%3Crect x='500' y='150' width='200' height='150' fill='%237ddbb3' rx='10'/%3E%3Crect x='0' y='300' width='200' height='150' fill='%237ddbb3' rx='10'/%3E%3Crect x='200' y='300' width='200' height='150' fill='%23b7ebd7' rx='10'/%3E%3Crect x='400' y='300' width='200' height='150' fill='%2398e2c6' rx='10'/%3E%3Crect x='600' y='300' width='200' height='150' fill='%237ddbb3' rx='10'/%3E%3Crect x='100' y='450' width='200' height='150' fill='%2398e2c6' rx='10'/%3E%3Crect x='300' y='450' width='200' height='150' fill='%237ddbb3' rx='10'/%3E%3Crect x='500' y='450' width='200' height='150' fill='%23b7ebd7' rx='10'/%3E%3C/svg%3E")`,
          backgroundPosition: 'bottom',
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'contain'
        }}
      />
      <div 
        className={cn(
          "absolute inset-0 hidden dark:block",
          "dark:bg-[#0a1510]"
        )}
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%230a1510'/%3E%3Crect x='0' y='0' width='200' height='150' fill='%23102920' opacity='0.5' rx='10'/%3E%3Crect x='200' y='0' width='200' height='150' fill='%230d2118' opacity='0.5' rx='10'/%3E%3Crect x='400' y='0' width='200' height='150' fill='%23102920' opacity='0.5' rx='10'/%3E%3Crect x='600' y='0' width='200' height='150' fill='%23133125' opacity='0.5' rx='10'/%3E%3Crect x='100' y='150' width='200' height='150' fill='%23133125' opacity='0.5' rx='10'/%3E%3Crect x='300' y='150' width='200' height='150' fill='%23102920' opacity='0.5' rx='10'/%3E%3Crect x='500' y='150' width='200' height='150' fill='%230d2118' opacity='0.5' rx='10'/%3E%3Crect x='0' y='300' width='200' height='150' fill='%230d2118' opacity='0.5' rx='10'/%3E%3Crect x='200' y='300' width='200' height='150' fill='%23133125' opacity='0.5' rx='10'/%3E%3Crect x='400' y='300' width='200' height='150' fill='%23102920' opacity='0.5' rx='10'/%3E%3Crect x='600' y='300' width='200' height='150' fill='%230d2118' opacity='0.5' rx='10'/%3E%3Crect x='100' y='450' width='200' height='150' fill='%23102920' opacity='0.5' rx='10'/%3E%3Crect x='300' y='450' width='200' height='150' fill='%230d2118' opacity='0.5' rx='10'/%3E%3Crect x='500' y='450' width='200' height='150' fill='%23133125' opacity='0.5' rx='10'/%3E%3C/svg%3E")`,
          backgroundPosition: 'bottom',
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'contain',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
      />
      <div 
        className="absolute inset-0"
        style={{ 
          background: 'var(--background-overlay, rgba(224, 245, 233, 0.3))',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
      />
      <VoiceProvider
        auth={{ type: "accessToken", value: accessToken }}
        configId={configId}
        onMessage={() => {
          if (timeout.current) {
            window.clearTimeout(timeout.current);
          }

          timeout.current = window.setTimeout(() => {
            if (ref.current) {
              const scrollHeight = ref.current.scrollHeight;
              ref.current.scrollTo({
                top: scrollHeight,
                behavior: "smooth",
              });
            }
          }, 200);
        }}
      >
        <Messages ref={ref} />
        <Controls />
        <StartCall />
      </VoiceProvider>
    </div>
  );
}
