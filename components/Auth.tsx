"use client";

import { useState } from 'react';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc,
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { app } from '@/lib/firebase';
import { Loader2 } from "lucide-react";

interface AuthProps {
  onSuccess?: () => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // 检查用户是否存在
  const checkUserExists = async (uid: string) => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists();
  };

  // 创建用户文档
  const createUserDocument = async (uid: string, userData: any) => {
    try {
      const userExists = await checkUserExists(uid);
      
      if (!userExists) {
        await setDoc(doc(db, 'users', uid), {
          ...userData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log('User document created successfully');
      } else {
        console.log('User document already exists');
      }
    } catch (error) {
      console.error('Error handling user document:', error);
    }
  };

  // Google 登录
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const { user } = await signInWithPopup(auth, provider);
      
      await createUserDocument(user.uid, {
        email: user.email,
        username: user.displayName,
        photoURL: user.photoURL,
        authProvider: 'google',
      });

      console.log('Google sign in successful');
      if (onSuccess) {
        console.log('Calling onSuccess callback from Google sign in');
        onSuccess();
      }
    } catch (error: any) {
      console.error('Detailed Google sign in error:', error);
      
      let errorMessage = 'Failed to sign in with Google. ';
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Sign in cancelled. Please try again.';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Pop-up was blocked. Please allow pop-ups for this site.';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Multiple pop-up requests. Please try again.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage += error.message;
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 邮箱登录/注册
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignUp) {
        // 注册新用户
        if (!username.trim()) {
          alert('Please enter a username');
          return;
        }
        // 创建认证账户
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        // 设置用户名
        await updateProfile(user, {
          displayName: username
        });

        // 创建用户文档
        await createUserDocument(user.uid, {
          email: email,
          username: username,
          authProvider: 'email',
        });

        console.log('Sign up successful');
      } else {
        // 登录现有用户
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Sign in successful');
        
        // 验证用户文档是否存在
        const userExists = await checkUserExists(auth.currentUser?.uid || '');
        if (!userExists) {
          // 如果用户文档不存在（罕见情况），创建一个
          await createUserDocument(auth.currentUser?.uid || '', {
            email: auth.currentUser?.email || '',
            username: auth.currentUser?.displayName || '',
            authProvider: 'email',
          });
        }
      }
      console.log('Email auth successful');
      if (onSuccess) {
        console.log('Calling onSuccess callback from Email auth');
        onSuccess();
      }
    } catch (error: any) {
      console.error('Email auth error:', error);
      let message = 'Authentication failed. ';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'This email is already registered. Please sign in instead.';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address.';
          break;
        case 'auth/weak-password':
          message = 'Password should be at least 6 characters.';
          break;
        case 'auth/user-not-found':
          message = 'No account found with this email. Please sign up first.';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password.';
          break;
        default:
          message += error.message;
      }
      
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <Button 
        onClick={handleGoogleSignIn}
        className="bg-white text-black border border-gray-300 hover:bg-gray-100"
      >
        <img 
          src="https://www.google.com/favicon.ico" 
          alt="Google" 
          className="w-4 h-4 mr-2"
        />
        Continue with Google
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with email</span>
        </div>
      </div>

      {isSignUp && (
        <Input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="border-2"
        />
      )}
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="border-2"
      />
      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="border-2"
      />
      <Button 
        onClick={handleEmailAuth}
        className="bg-primary"
      >
        {isSignUp ? 'Sign Up' : 'Sign In'}
      </Button>

      <button 
        onClick={() => {
          setIsSignUp(!isSignUp);
          setUsername(''); // 切换时清空用户名
        }} 
        className="text-sm text-gray-600 hover:underline"
      >
        {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
      </button>
    </div>
  );
} 