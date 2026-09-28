'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Plus,
  ExternalLink,
  Check,
  RefreshCw,
  Search,
  X,
  Sparkles,
} from 'lucide-react';
import {
  listUserSpreadsheets,
  createTelebirrSpreadsheet,
  SpreadsheetInfo,
} from '@/lib/sheets-api';

interface SheetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  activeSpreadsheetId: string | null;
  activeSheetName: string;
  onSelectSpreadsheet: (id: string, name: string, url: string) => void;
}

export default function SheetSelectorModal({
  isOpen,
  onClose,
  accessToken,
  activeSpreadsheetId,
  activeSheetName,
  onSelectSpreadsheet,
}: SheetSelectorModalProps) {
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newSheetTitle, setNewSheetTitle] = useState('Telebirr Transactions Ledger');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadSheets = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const list = await listUserSpreadsheets(accessToken);
      setSpreadsheets(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load spreadsheets from Google Drive');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!isOpen || !accessToken) return;
    let isCancelled = false;

    const run = async () => {
      try {
        const list = await listUserSpreadsheets(accessToken);
        if (!isCancelled) {
          setSpreadsheets(list);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || 'Failed to load spreadsheets from Google Drive');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    run();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, accessToken]);

  if (!isOpen) return null;

  const handleCreateNew = async () => {
    if (!accessToken) return;
    setIsCreating(true);
    setError(null);
    try {
      const res = await createTelebirrSpreadsheet(accessToken, newSheetTitle);
      onSelectSpreadsheet(res.spreadsheetId, newSheetTitle, res.webViewLink);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create new spreadsheet');
    } finally {
      setIsCreating(false);
    }
  };

  const handleManualConnect = () => {
    if (!manualInput.trim()) return;
    // Extract ID if URL is provided
    // https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
    let id = manualInput.trim();
    const match = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      id = match[1];
    }
    const url = `https://docs.google.com/spreadsheets/d/${id}/edit`;
    onSelectSpreadsheet(id, 'Connected Sheet', url);
    onClose();
  };

  const filtered = spreadsheets.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Google Sheets Configuration</h3>
              <p className="text-xs text-zinc-400">
                Choose or create the Google Sheet where your Telebirr transactions will be logged.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Quick Create New Section */}
          <div className="p-4 bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/30 rounded-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 mb-2">
                  <Sparkles className="w-3 h-3" /> Recommended
                </span>
                <h4 className="font-medium text-white text-sm">Create New Dedicated Telebirr Ledger</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Generates a pre-formatted spreadsheet with styled headers (Date, Txn ID, Amount, Type, Sender, Balance, Raw SMS) and frozen header row.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={newSheetTitle}
                onChange={(e) => setNewSheetTitle(e.target.value)}
                placeholder="Sheet Title"
                className="w-full sm:flex-1 px-3 py-2 bg-zinc-950 border border-zinc-700/80 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleCreateNew}
                disabled={isCreating || !accessToken}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 shrink-0 transition-colors disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Create Ledger
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Select Existing Spreadsheets */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Your Existing Google Spreadsheets
              </h4>
              <button
                onClick={loadSheets}
                disabled={isLoading}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search spreadsheets in your Drive..."
                className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-emerald-400" />
                  Loading spreadsheets from Google Drive...
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-xl border border-zinc-800/60">
                  No spreadsheets found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                filtered.map((sheet) => {
                  const isCurrent = activeSpreadsheetId === sheet.id;
                  return (
                    <div
                      key={sheet.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                          : 'bg-zinc-950/50 hover:bg-zinc-800/60 border-zinc-800 text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileSpreadsheet
                          className={`w-4 h-4 shrink-0 ${
                            isCurrent ? 'text-emerald-400' : 'text-zinc-400'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{sheet.name}</p>
                          <p className="text-[10px] text-zinc-500">
                            ID: {sheet.id.substring(0, 16)}...
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {sheet.webViewLink && (
                          <a
                            href={sheet.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-zinc-400 hover:text-white rounded"
                            title="Open in Google Sheets"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {isCurrent ? (
                          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              onSelectSpreadsheet(
                                sheet.id,
                                sheet.name,
                                sheet.webViewLink ||
                                  `https://docs.google.com/spreadsheets/d/${sheet.id}/edit`
                              );
                              onClose();
                            }}
                            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg transition-colors"
                          >
                            Select
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Connect by URL or ID */}
          <div className="pt-2 border-t border-zinc-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Or Connect by Spreadsheet URL / ID
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/... or ID"
                className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleManualConnect}
                disabled={!manualInput.trim()}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium disabled:opacity-50"
              >
                Connect
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
