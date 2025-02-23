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
      "flex flex-col grow",
      "w-full min-h-screen",
      "relative",
      
      // Spacing
      "md:px-4",
      "overflow-hidden",
      
      // Colors - Light Mode (Enforced white)
      "!bg-white",  // Added ! to ensure white background
      "text-zinc-900",
      
      // Colors - Dark Mode
      "dark:bg-zinc-900",
      "dark:text-zinc-100",
    )}>
      {/* Auth Button - Top Right */}
      <div className={cn(
        "absolute top-4 right-4",
        "z-10",
        // Ensure button visibility
        "bg-white/80 dark:bg-zinc-900/80",
        "backdrop-blur-sm",
        "rounded-lg",
        "p-1"
      )}>
        <AuthButton />
      </div>

      {/* Main Content */}
      <div className={cn(
        "flex-1",
        "relative",
        "z-0",
        // Enforce white background
        "bg-white dark:bg-zinc-900"
      )}>
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
