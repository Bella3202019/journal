import { getHumeAccessToken } from "@/utils/getHumeAccessToken";
import dynamic from "next/dynamic";
import { cn } from "@/utils";

const Chat = dynamic(() => import("@/components/Chat"), {
  ssr: false,
});

const AuthButton = dynamic(() => import("@/components/AuthButton"), {
  ssr: false,
});

export default async function Page() {
  const accessToken = await getHumeAccessToken();

  if (!accessToken) {
    throw new Error('Failed to get Hume access token');
  }

  return (
    <main className={cn(
      // Layout
      "w-screen h-screen",
      "fixed inset-0",
      "overflow-hidden",
      
      // Colors
      "bg-white dark:bg-zinc-900",
      "text-zinc-900 dark:text-zinc-100",
    )}>
      {/* AuthButton */}
      <div className="fixed top-4 right-4 z-50">
        <AuthButton />
      </div>

      {/* 内容层 */}
      <div className="relative w-full h-full">
        <Chat accessToken={accessToken} />
      </div>

      {/* Viewport Control */}
      <meta 
        name="viewport" 
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" 
      />
    </main>
  );
}
