"use client";

import { useState } from 'react';
import { 
  getAuth, 
  signOut,
  updateProfile 
} from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { app } from '@/lib/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { User, LogOut, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function UserMenu() {
  const auth = getAuth(app);
  const [user] = useAuthState(auth);
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleUpdateUsername = async () => {
    if (!user || !newUsername.trim()) return;
    setIsLoading(true);

    try {
      await updateProfile(user, {
        displayName: newUsername.trim()
      });
      
      setIsEditNameOpen(false);
      setNewUsername('');
      alert('Username updated successfully!');
    } catch (error: any) {
      console.error('Error updating username:', error);
      alert('Failed to update username. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="icon"
            className="bg-white/80 dark:bg-zinc-900/80 hover:bg-white/90"
          >
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName || 'User'} 
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <User className="h-5 w-5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5 text-sm font-medium flex items-center justify-between">
            <span>Hey, {user.displayName || user.email?.split('@')[0] || 'User'}!</span>
            <button 
              onClick={() => setIsEditNameOpen(true)}
              className="hover:text-gray-700 dark:hover:text-gray-300"
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>
          <div className="h-px bg-gray-200 dark:bg-gray-800 my-1" />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditNameOpen} onOpenChange={setIsEditNameOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Username</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="New Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="border-2"
            />
            <Button 
              onClick={handleUpdateUsername}
              disabled={isLoading || !newUsername.trim()}
              className="bg-primary"
            >
              {isLoading ? 'Updating...' : 'Update Username'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 