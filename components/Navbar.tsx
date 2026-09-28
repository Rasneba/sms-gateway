'use client';

import React from 'react';
import {
  FileSpreadsheet,
  Settings2,
  ExternalLink,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { User } from 'firebase/auth';
import GoogleSignInButton from './GoogleSignInButton';

interface NavbarProps {
  user: User | null;
  isLoadingAuth: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  activeSpreadsheetId: string | null;
  activeSheetTitle: string;
  activeSheetUrl: string | null;
  onOpenSheetSelector: () => void;
}

export default function Navbar({
  user,
  isLoadingAuth,
  onSignIn,
  onSignOut,
  activeSpreadsheetId,
  activeSheetTitle,
  activeSheetUrl,
  onOpenSheetSelector,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white shadow-md shadow-emerald-950/50">
            <span className="font-extrabold text-base tracking-tighter">TB</span>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
              <FileSpreadsheet className="w-2.5 h-2.5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm sm:text-base text-white tracking-tight">
                Telebirr SheetSync
              </h1>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                v1.0 Live
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-zinc-400">
              SMS Ingestion &amp; Google Sheets Ledger for Ethio Telecom Telebirr
            </p>
          </div>
        </div>

        {/* Center / Connected Sheet Pill */}
        {user && activeSpreadsheetId && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-400">Ledger:</span>
            <span className="font-medium text-white max-w-[160px] truncate" title={activeSheetTitle}>
              {activeSheetTitle}
            </span>
            {activeSheetUrl && (
              <a
                href={activeSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-zinc-400 hover:text-white rounded"
                title="Open spreadsheet in Google Sheets"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={onOpenSheetSelector}
              className="ml-1 text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Settings2 className="w-3 h-3" /> Change
            </button>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={onOpenSheetSelector}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-xl text-xs font-medium text-zinc-200 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{activeSpreadsheetId ? 'Sheets Config' : 'Connect Sheet'}</span>
            </button>
          )}

          <GoogleSignInButton
            user={user}
            isLoading={isLoadingAuth}
            onSignIn={onSignIn}
            onSignOut={onSignOut}
            size="sm"
          />
        </div>
      </div>
    </header>
  );
}
