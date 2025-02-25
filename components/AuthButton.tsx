"use client";

import { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter } from 'next/navigation';
import { app } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import Auth from "./Auth";
import UserMenu from "./UserMenu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AuthButton() {
  const auth = getAuth(app);
  const [user, loading] = useAuthState(auth);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleAuthSuccess = () => {
    setIsOpen(false);
    // 登录成功后不进行跳转，只关闭对话框
    // 移除了 router.push() 调用
  };

  if (loading) {
    return (
      <Button 
        variant="outline" 
        size="icon"
        className="bg-white/80 dark:bg-zinc-900/80"
        disabled
      >
        <span className="animate-pulse">...</span>
      </Button>
    );
  }

  if (user) {
    return <UserMenu />;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="bg-white/80 dark:bg-zinc-900/80 hover:bg-white/90"
        >
          <LogIn className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sign in</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <Auth onSuccess={handleAuthSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
} 