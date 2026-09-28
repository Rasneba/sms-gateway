'use client';

import React from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';
import { User } from 'firebase/auth';

interface GoogleSignInButtonProps {
  user: User | null;
  isLoading?: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function GoogleSignInButton({
  user,
  isLoading = false,
  onSignIn,
  onSignOut,
  size = 'md',
}: GoogleSignInButtonProps) {
  if (user) {
    return (
      <div className="flex items-center gap-3 p-1.5 bg-zinc-800/90 border border-zinc-700/60 rounded-full shadow-sm">
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt={user.displayName || 'Google User'}
            className="w-7 h-7 rounded-full object-cover ring-1 ring-emerald-500/50"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center text-white text-xs font-semibold">
            {user.email ? user.email.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
          </div>
        )}
        <div className="flex flex-col pr-1">
          <span className="text-xs font-medium text-zinc-200 truncate max-w-[130px]">
            {user.displayName || user.email?.split('@')[0]}
          </span>
          <span className="text-[10px] text-emerald-400 font-mono">Sheets Connected</span>
        </div>
        <button
          onClick={onSignOut}
          title="Sign out of Google"
          className="p-1.5 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 rounded-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      type="button"
      onClick={onSignIn}
      disabled={isLoading}
      className={`inline-flex items-center justify-center gap-3 font-medium text-zinc-800 bg-white hover:bg-zinc-50 active:bg-zinc-100 border border-zinc-300 rounded-xl shadow-sm transition-all duration-150 disabled:opacity-60 cursor-pointer ${sizeClasses[size]}`}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-zinc-400 border-t-zinc-800 rounded-full animate-spin" />
      ) : (
        <svg
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 48 48"
          className="w-5 h-5 shrink-0"
        >
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
          <path fill="none" d="M0 0h48v48H0z" />
        </svg>
      )}
      <span>Sign in with Google</span>
    </button>
  );
}
