import { getHumeAccessToken } from "@/utils/getHumeAccessToken";
import dynamic from "next/dynamic";
import { cn } from "@/utils";

const Chat = dynamic(() => import("@/components/Chat"), {
  ssr: false,
});

export default async function Page() {
  const accessToken = await getHumeAccessToken();

  if (!accessToken) {
    throw new Error('Failed to get Hume access token. Please check your configuration.');
  }

  return (
    <div className={cn(
      "grow flex flex-col",
      "w-full max-w-screen min-h-screen",
      "md:max-w-none md:px-4",
      "overflow-y-auto",
      "relative"
    )}>
      <div className="absolute inset-0 z-0">
        <meta 
          name="viewport" 
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" 
        />
      </div>
      <Chat accessToken={accessToken} />
    </div>
  );
}
