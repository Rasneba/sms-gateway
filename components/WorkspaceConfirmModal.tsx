'use client';

import React from 'react';
import { AlertCircle, FileSpreadsheet, Check, X } from 'lucide-react';

interface WorkspaceConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  itemsCount?: number;
  details?: { label: string; value: string | number }[];
  targetSheetName?: string;
  confirmLabel?: string;
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function WorkspaceConfirmModal({
  isOpen,
  title,
  description,
  itemsCount,
  details,
  targetSheetName,
  confirmLabel = 'Confirm & Append to Sheet',
  isProcessing = false,
  onConfirm,
  onCancel,
}: WorkspaceConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden text-zinc-100">
        {/* Header accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>
              <p className="mt-1 text-sm text-zinc-400 leading-relaxed">{description}</p>
            </div>
          </div>

          {targetSheetName && (
            <div className="mt-4 px-3.5 py-2.5 bg-zinc-800/80 border border-zinc-700/60 rounded-xl text-xs flex items-center justify-between">
              <span className="text-zinc-400">Target Google Sheet:</span>
              <span className="font-medium text-emerald-400 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {targetSheetName}
              </span>
            </div>
          )}

          {details && details.length > 0 && (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-2 text-xs">
              {details.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-zinc-300">
                  <span className="text-zinc-400">{item.label}</span>
                  <span className="font-mono font-medium text-white">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-300/90">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <span>
              This operation will modify data in your Google Sheets account with your explicit permission. You can review or undo changes in your spreadsheet history at any time.
            </span>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700/80 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing}
              className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] rounded-xl shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Writing to Sheets...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {confirmLabel} {itemsCount ? `(${itemsCount})` : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
