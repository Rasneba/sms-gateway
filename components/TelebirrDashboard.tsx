'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileSpreadsheet,
  Smartphone,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Users,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Clipboard,
  Layers,
  Send,
  Zap,
  Globe,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setCachedAccessToken,
} from '@/lib/firebase';
import {
  ParsedTelebirrSMS,
  parseTelebirrSMS,
  parseBatchTelebirrSMS,
  SAMPLE_TELEBIRR_SMS,
} from '@/lib/telebirr-parser';
import {
  fetchSheetRows,
  appendTransactionsToSheet,
  createTelebirrSpreadsheet,
} from '@/lib/sheets-api';
import Navbar from './Navbar';
import TransactionTable from './TransactionTable';
import AutomationGuide from './AutomationGuide';
import SheetSelectorModal from './SheetSelectorModal';
import WorkspaceConfirmModal from './WorkspaceConfirmModal';
import GoogleSignInButton from './GoogleSignInButton';
import VercelGatewayPanel from './VercelGatewayPanel';

export default function TelebirrDashboard() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Active sheet state
  const [activeSpreadsheetId, setActiveSpreadsheetId] = useState<string | null>(null);
  const [activeSheetTitle, setActiveSheetTitle] = useState('Telebirr Transactions Ledger');
  const [activeSheetName, setActiveSheetName] = useState('Telebirr Transactions');
  const [activeSheetUrl, setActiveSheetUrl] = useState<string | null>(null);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'gateway' | 'single' | 'batch' | 'automation'>('dashboard');

  // Transaction data
  const [transactions, setTransactions] = useState<ParsedTelebirrSMS[]>([]);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);

  // Single SMS test / parse state
  const [singleSmsInput, setSingleSmsInput] = useState(SAMPLE_TELEBIRR_SMS[0].sms);
  const [parsedSingle, setParsedSingle] = useState<ParsedTelebirrSMS | null>(() =>
    parseTelebirrSMS(SAMPLE_TELEBIRR_SMS[0].sms)
  );

  // Batch SMS state
  const [batchSmsInput, setBatchSmsInput] = useState('');
  const [parsedBatch, setParsedBatch] = useState<ParsedTelebirrSMS[]>([]);

  // Confirmation Modal state
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    itemsCount: number;
    details: { label: string; value: string | number }[];
    transactionsToSync: ParsedTelebirrSMS[];
  }>({
    isOpen: false,
    title: '',
    description: '',
    itemsCount: 0,
    details: [],
    transactionsToSync: [],
  });
  const [isConfirmProcessing, setIsConfirmProcessing] = useState(false);

  // Webhook polling & inbox state
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Notification auto-dismiss
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        // Load saved sheet preferences if any
        const savedSheetId = localStorage.getItem('tb_sheet_id');
        const savedSheetTitle = localStorage.getItem('tb_sheet_title');
        if (savedSheetId) {
          setActiveSpreadsheetId(savedSheetId);
          if (savedSheetTitle) setActiveSheetTitle(savedSheetTitle);
          setActiveSheetUrl(`https://docs.google.com/spreadsheets/d/${savedSheetId}/edit`);
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setIsLoadingAuth(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        setNotification({
          text: `Signed in as ${res.user.displayName || res.user.email}. Google Sheets connected!`,
          type: 'success',
        });
      }
    } catch (err: any) {
      console.error('Sign in failed', err);
      setNotification({
        text: err.message || 'Failed to sign in with Google.',
        type: 'error',
      });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setNotification({ text: 'Signed out of Google account.', type: 'info' });
  };

  // Select or set active spreadsheet
  const handleSelectSpreadsheet = (id: string, name: string, url: string) => {
    setActiveSpreadsheetId(id);
    setActiveSheetTitle(name);
    setActiveSheetUrl(url);
    localStorage.setItem('tb_sheet_id', id);
    localStorage.setItem('tb_sheet_title', name);
    setNotification({
      text: `Connected to Google Sheet: "${name}"`,
      type: 'success',
    });
  };

  // Pull existing rows from active Google Sheet
  const loadSheetRows = useCallback(async () => {
    if (!accessToken || !activeSpreadsheetId) return;
    setIsSyncingSheet(true);
    setSyncStatusMessage('Fetching transactions from Google Sheet...');
    try {
      const { rows, sheetName, existingTxnIds } = await fetchSheetRows(
        accessToken,
        activeSpreadsheetId,
        activeSheetName
      );
      setActiveSheetName(sheetName);

      // Convert rows (skip header row 0) to ParsedTelebirrSMS
      const dataRows = rows.slice(1);
      const loaded: ParsedTelebirrSMS[] = dataRows.map((r, i) => ({
        id: `sheet_${i}_${r[1] || i}`,
        date: r[0] || '',
        transactionId: r[1] || `TXN_${i}`,
        amount: parseFloat(String(r[2]).replace(/[^0-9.]/g, '')) || 0,
        type: (r[3] as any) || 'Deposit',
        senderName: r[4] !== '-' ? r[4] : undefined,
        senderPhone: r[5] !== '-' ? r[5] : undefined,
        balance: r[6] && r[6] !== '-' ? parseFloat(String(r[6]).replace(/[^0-9.]/g, '')) : undefined,
        rawText: r[8] || '',
        currency: 'ETB',
        isValidTelebirr: true,
        confidence: 'high',
        syncedToSheets: true,
        syncedAt: r[7] || '',
      }));

      // Combine with any local-only transactions that haven't been synced
      setTransactions((prev) => {
        const localUnsynced = prev.filter((t) => !t.syncedToSheets && !existingTxnIds.has(t.transactionId));
        return [...localUnsynced, ...loaded];
      });

      setSyncStatusMessage(null);
    } catch (err: any) {
      console.error('Failed to load sheet rows:', err);
      setSyncStatusMessage(null);
      setNotification({
        text: `Error loading from Sheet: ${err.message}`,
        type: 'error',
      });
    } finally {
      setIsSyncingSheet(false);
    }
  }, [accessToken, activeSpreadsheetId, activeSheetName]);

  // Load sheet rows when accessToken or activeSpreadsheetId is ready
  useEffect(() => {
    if (!accessToken || !activeSpreadsheetId) return;
    let isCancelled = false;

    const run = async () => {
      try {
        const { rows, sheetName, existingTxnIds } = await fetchSheetRows(
          accessToken,
          activeSpreadsheetId,
          activeSheetName
        );
        if (isCancelled) return;
        setActiveSheetName(sheetName);

        const dataRows = rows.slice(1);
        const loaded: ParsedTelebirrSMS[] = dataRows.map((r, i) => ({
          id: `sheet_${i}_${r[1] || i}`,
          date: r[0] || '',
          transactionId: r[1] || `TXN_${i}`,
          amount: parseFloat(String(r[2]).replace(/[^0-9.]/g, '')) || 0,
          type: (r[3] as any) || 'Deposit',
          senderName: r[4] !== '-' ? r[4] : undefined,
          senderPhone: r[5] !== '-' ? r[5] : undefined,
          balance: r[6] && r[6] !== '-' ? parseFloat(String(r[6]).replace(/[^0-9.]/g, '')) : undefined,
          rawText: r[8] || '',
          currency: 'ETB',
          isValidTelebirr: true,
          confidence: 'high',
          syncedToSheets: true,
          syncedAt: r[7] || '',
        }));

        setTransactions((prev) => {
          const localUnsynced = prev.filter(
            (t) => !t.syncedToSheets && !existingTxnIds.has(t.transactionId)
          );
          return [...localUnsynced, ...loaded];
        });
      } catch (err: any) {
        console.error('Failed to load sheet rows:', err);
      }
    };

    run();

    return () => {
      isCancelled = true;
    };
  }, [accessToken, activeSpreadsheetId, activeSheetName]);

  // Webhook polling
  const fetchWebhookLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/sms/webhook');
      if (res.ok) {
        const data = await res.json();
        setWebhookLogs(data.logs || []);
      }
    } catch {
      // Ignore background poll errors
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchWebhookLogs();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchWebhookLogs]);

  // Simulate incoming webhook from phone
  const handleSimulateWebhook = async (smsText: string) => {
    setIsSimulatingWebhook(true);
    try {
      const res = await fetch('/api/sms/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && activeSpreadsheetId
            ? {
                Authorization: `Bearer ${accessToken}`,
                'x-spreadsheet-id': activeSpreadsheetId,
                'x-sheet-name': activeSheetName,
              }
            : {}),
        },
        body: JSON.stringify({
          sender: 'telebirr',
          message: smsText,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNotification({
          text: data.syncedDirectly
            ? `Phone webhook received and automatically synced to Google Sheet: ${data.data?.parsed?.transactionId}`
            : `Phone webhook received! Parsed: ${data.data?.parsed?.transactionId} (ETB ${data.data?.parsed?.amount})`,
          type: 'success',
        });
        await fetchWebhookLogs();
        if (accessToken && activeSpreadsheetId) {
          loadSheetRows();
        }
      }
    } catch (err: any) {
      setNotification({
        text: `Simulation error: ${err.message}`,
        type: 'error',
      });
    } finally {
      setIsSimulatingWebhook(false);
    }
  };

  // Re-parse single SMS on input change
  const handleSingleSmsChange = (val: string) => {
    setSingleSmsInput(val);
    setParsedSingle(parseTelebirrSMS(val));
  };

  // Paste from clipboard helper
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSingleSmsInput(text);
        setParsedSingle(parseTelebirrSMS(text));
        setNotification({ text: 'SMS pasted from clipboard!', type: 'info' });
      }
    } catch (e) {
      setNotification({ text: 'Could not access clipboard. Please paste manually.', type: 'info' });
    }
  };

  // Batch parse
  const handleBatchSmsChange = (val: string) => {
    setBatchSmsInput(val);
    setParsedBatch(parseBatchTelebirrSMS(val));
  };

  // Check if a transaction ID is already in our list or active sheet
  const existingTxnSet = useMemo(() => {
    return new Set(transactions.map((t) => t.transactionId.toUpperCase()));
  }, [transactions]);

  // Request Confirmation for writing to Google Sheet
  const requestSyncConfirmation = (txnsToSync: ParsedTelebirrSMS[]) => {
    if (!user || !accessToken) {
      setNotification({
        text: 'Please sign in with Google to sync transactions to Google Sheets.',
        type: 'error',
      });
      return;
    }

    if (!activeSpreadsheetId) {
      setIsSheetModalOpen(true);
      setNotification({
        text: 'Please select or create a Google Sheet first.',
        type: 'info',
      });
      return;
    }

    const validTxns = txnsToSync.filter((t) => t.isValidTelebirr && t.amount > 0);
    if (validTxns.length === 0) {
      setNotification({
        text: 'No valid Telebirr transactions found to sync.',
        type: 'error',
      });
      return;
    }

    const totalAmount = validTxns.reduce((sum, t) => sum + t.amount, 0);

    const details = [
      { label: 'Transactions Count', value: validTxns.length },
      { label: 'Total Amount', value: `${totalAmount.toLocaleString()} ETB` },
      {
        label: 'Transaction ID(s)',
        value: validTxns.map((t) => t.transactionId).slice(0, 3).join(', ') + (validTxns.length > 3 ? '...' : ''),
      },
      { label: 'Spreadsheet Title', value: activeSheetTitle },
    ];

    setConfirmModalData({
      isOpen: true,
      title: validTxns.length === 1 ? 'Record Telebirr Transaction' : `Record ${validTxns.length} Telebirr Transactions`,
      description: `You are about to append ${validTxns.length} verified Telebirr deposit transaction(s) directly to your connected Google Sheet ledger.`,
      itemsCount: validTxns.length,
      details,
      transactionsToSync: validTxns,
    });
  };

  // Execute confirmed write to Google Sheet
  const handleConfirmSync = async () => {
    if (!accessToken || !activeSpreadsheetId) return;
    setIsConfirmProcessing(true);
    try {
      const txns = confirmModalData.transactionsToSync;
      await appendTransactionsToSheet(
        accessToken,
        activeSpreadsheetId,
        activeSheetName,
        txns
      );

      // Mark local items as synced
      const now = new Date().toISOString();
      setTransactions((prev) => {
        const syncedMap = new Map(txns.map((t) => [t.transactionId, true]));
        const updatedPrev = prev.map((item) =>
          syncedMap.has(item.transactionId)
            ? { ...item, syncedToSheets: true, syncedAt: now }
            : item
        );

        // Add newly synced if they weren't in prev
        const existingIds = new Set(prev.map((p) => p.transactionId));
        const newOnes = txns
          .filter((t) => !existingIds.has(t.transactionId))
          .map((t) => ({ ...t, syncedToSheets: true, syncedAt: now }));

        return [...newOnes, ...updatedPrev];
      });

      if (parsedSingle && txns.some((t) => t.transactionId === parsedSingle.transactionId)) {
        setParsedSingle((p) => (p ? { ...p, syncedToSheets: true, syncedAt: now } : null));
      }

      setNotification({
        text: `Successfully appended ${txns.length} transaction(s) to "${activeSheetTitle}"!`,
        type: 'success',
      });

      // Reload fresh rows from sheet to keep in exact sync
      loadSheetRows();
    } catch (err: any) {
      console.error('Failed to append to Google Sheet:', err);
      setNotification({
        text: `Error updating Google Sheet: ${err.message}`,
        type: 'error',
      });
    } finally {
      setIsConfirmProcessing(false);
      setConfirmModalData((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Quick 1-click Create Sheet if user has none
  const handleQuickCreateSheet = async () => {
    if (!accessToken) {
      handleSignIn();
      return;
    }
    setIsSyncingSheet(true);
    try {
      const res = await createTelebirrSpreadsheet(accessToken, 'Telebirr Transactions Ledger');
      handleSelectSpreadsheet(res.spreadsheetId, 'Telebirr Transactions Ledger', res.webViewLink);
    } catch (err: any) {
      setNotification({
        text: `Failed to create sheet: ${err.message}`,
        type: 'error',
      });
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalAmount = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
    const count = transactions.length;
    const avgAmount = count > 0 ? totalAmount / count : 0;
    const uniqueSenders = new Set(
      transactions.map((t) => t.senderName || t.senderPhone).filter(Boolean)
    ).size;
    const depositsCount = transactions.filter((t) => t.type === 'Deposit').length;

    return { totalAmount, count, avgAmount, uniqueSenders, depositsCount };
  }, [transactions]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Navbar */}
      <Navbar
        user={user}
        isLoadingAuth={isLoadingAuth}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        activeSpreadsheetId={activeSpreadsheetId}
        activeSheetTitle={activeSheetTitle}
        activeSheetUrl={activeSheetUrl}
        onOpenSheetSelector={() => setIsSheetModalOpen(true)}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs flex items-center gap-3 backdrop-blur-md ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : notification.type === 'error'
                ? 'bg-red-950/90 border-red-500/40 text-red-200'
                : 'bg-zinc-900/90 border-zinc-700 text-zinc-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <span className="font-medium">{notification.text}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Banner if Google Sheets not yet connected */}
        {!user ? (
          <div className="p-6 bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-zinc-900 border border-emerald-500/30 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                Google Sheets Integration Ready
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Connect your Google Account to automatically store Telebirr deposits
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
                Log in to link your Google Sheets. Incoming SMS notifications from your phone or manual paste will be parsed and written directly into your custom spreadsheet ledger.
              </p>
            </div>
            <div className="shrink-0">
              <GoogleSignInButton
                user={user}
                isLoading={isLoadingAuth}
                onSignIn={handleSignIn}
                onSignOut={handleSignOut}
                size="lg"
              />
            </div>
          </div>
        ) : !activeSpreadsheetId ? (
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white">No Google Sheet connected yet</h3>
              <p className="text-xs text-zinc-400">
                Create a pre-formatted Telebirr Transactions Ledger in 1 click or choose an existing spreadsheet from your Google Drive.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleQuickCreateSheet}
                disabled={isSyncingSheet}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isSyncingSheet ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create Telebirr Ledger (1-Click)
              </button>
              <button
                onClick={() => setIsSheetModalOpen(true)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-colors"
              >
                Browse Drive Files
              </button>
            </div>
          </div>
        ) : null}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Total Deposited
              </span>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-white">
                {metrics.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-medium text-emerald-400">ETB</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">Total accumulated inflow</p>
          </div>

          <div className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Recorded Transactions
              </span>
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-white">
                {metrics.count}
              </span>
              <span className="text-xs font-medium text-zinc-400">records</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">In Google Sheet ledger</p>
          </div>

          <div className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Average Deposit
              </span>
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-white">
                {metrics.avgAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </span>
              <span className="text-xs font-medium text-amber-400">ETB</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">Per transaction mean</p>
          </div>

          <div className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Unique Payers
              </span>
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-white">
                {metrics.uniqueSenders}
              </span>
              <span className="text-xs font-medium text-purple-400">counterparties</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">Distinct contacts / banks</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Ledger & Analytics', icon: FileSpreadsheet },
            { id: 'gateway', label: 'Vercel Gateway (sms-gateway-chi-six.vercel.app)', icon: Globe, badge: 'New' },
            { id: 'single', label: 'Single SMS Parser', icon: Sparkles },
            { id: 'batch', label: 'Batch SMS Import', icon: Layers },
            { id: 'automation', label: 'Phone Automation Setup', icon: Smartphone },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                    : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-400 text-zinc-950">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: Ledger & Analytics */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Transaction Ledger
                </h3>
                <p className="text-xs text-zinc-400">
                  Real-time synchronization with your Google Sheet.
                </p>
              </div>

              {activeSpreadsheetId && (
                <button
                  onClick={loadSheetRows}
                  disabled={isSyncingSheet}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 rounded-xl text-xs font-medium text-zinc-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                  {isSyncingSheet ? 'Syncing...' : 'Refresh from Sheet'}
                </button>
              )}
            </div>

            <TransactionTable
              transactions={transactions}
              sheetUrl={activeSheetUrl}
              onRefresh={loadSheetRows}
              isRefreshing={isSyncingSheet}
            />
          </div>
        )}

        {/* TAB 2: Single SMS Parser & Sync */}
        {activeTab === 'single' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Box */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="sms-input-textarea" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Paste Telebirr SMS Text
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePasteClipboard}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs flex items-center gap-1 transition-colors"
                      title="Paste from clipboard"
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                      Paste
                    </button>
                    <button
                      onClick={() => handleSingleSmsChange('')}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <textarea
                  id="sms-input-textarea"
                  value={singleSmsInput}
                  onChange={(e) => handleSingleSmsChange(e.target.value)}
                  placeholder="Paste Telebirr SMS text here (English or Amharic)..."
                  rows={5}
                  className="w-full p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 font-sans focus:outline-none focus:border-emerald-500 leading-relaxed resize-none"
                />

                {/* Sample Presets */}
                <div>
                  <span className="text-[11px] font-medium text-zinc-400 block mb-2">
                    Or select a sample Telebirr SMS template:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {SAMPLE_TELEBIRR_SMS.map((sample, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSingleSmsChange(sample.sms)}
                        className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-lg text-[11px] transition-colors"
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Parsed Result Box */}
            <div className="lg:col-span-5 space-y-4">
              {parsedSingle && (
                <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">Extracted Details</span>
                      {parsedSingle.isValidTelebirr ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Valid Telebirr
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Unrecognized Format
                        </span>
                      )}
                    </div>
                    {existingTxnSet.has(parsedSingle.transactionId.toUpperCase()) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Already in Sheet
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-zinc-950/70 rounded-xl border border-zinc-800/80">
                      <span className="text-zinc-400">Transaction ID</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        {parsedSingle.transactionId}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-zinc-950/70 rounded-xl border border-zinc-800/80">
                      <span className="text-zinc-400">Amount Deposited</span>
                      <div className="flex items-baseline gap-1 font-mono font-bold text-white text-base">
                        <span>{parsedSingle.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <span className="text-xs text-emerald-400">ETB</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-zinc-950/70 rounded-xl border border-zinc-800/80">
                      <span className="text-zinc-400">Transaction Type</span>
                      <span className="font-medium text-cyan-400">{parsedSingle.type}</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-zinc-950/70 rounded-xl border border-zinc-800/80">
                      <span className="text-zinc-400">Sender / Account</span>
                      <span className="font-medium text-zinc-200">
                        {parsedSingle.senderName || 'Direct Deposit / Cash-in'}
                        {parsedSingle.senderPhone && ` (${parsedSingle.senderPhone})`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-zinc-950/70 rounded-xl border border-zinc-800/80">
                      <span className="text-zinc-400">Timestamp</span>
                      <span className="font-mono text-zinc-300">{parsedSingle.date}</span>
                    </div>

                    {parsedSingle.balance !== undefined && (
                      <div className="flex items-center justify-between p-2.5 bg-zinc-950/70 rounded-xl border border-zinc-800/80">
                        <span className="text-zinc-400">Post Balance</span>
                        <span className="font-mono text-zinc-300">
                          {parsedSingle.balance.toLocaleString()} ETB
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Sync Action Button */}
                  <div className="pt-2">
                    <button
                      onClick={() => requestSyncConfirmation([parsedSingle])}
                      disabled={!parsedSingle.isValidTelebirr || parsedSingle.amount <= 0}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.99] disabled:opacity-50"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Append to Google Sheet Ledger
                    </button>
                    <p className="text-[11px] text-zinc-500 text-center mt-2">
                      Will request your permission to record this row in {activeSheetTitle}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Batch SMS Import */}
        {activeTab === 'batch' && (
          <div className="space-y-5">
            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Batch Telebirr SMS Import</h3>
                  <p className="text-xs text-zinc-400">
                    Paste multiple Telebirr messages (separated by blank lines or multiple SMS texts) to review and sync in bulk.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const sampleBatch = SAMPLE_TELEBIRR_SMS.map((s) => s.sms).join('\n\n');
                    handleBatchSmsChange(sampleBatch);
                  }}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium"
                >
                  Load All 5 Samples
                </button>
              </div>

              <textarea
                value={batchSmsInput}
                onChange={(e) => handleBatchSmsChange(e.target.value)}
                placeholder="Paste multiple SMS notifications here..."
                rows={6}
                className="w-full p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 font-sans focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
              />
            </div>

            {parsedBatch.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">
                    Parsed {parsedBatch.length} message(s) — Total:{' '}
                    <strong className="text-white font-mono">
                      {parsedBatch.reduce((sum, b) => sum + b.amount, 0).toLocaleString()} ETB
                    </strong>
                  </span>
                  <button
                    onClick={() => requestSyncConfirmation(parsedBatch)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Sync All {parsedBatch.length} to Google Sheet
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {parsedBatch.map((item, idx) => {
                    const isDup = existingTxnSet.has(item.transactionId.toUpperCase());
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                          isDup
                            ? 'bg-amber-950/20 border-amber-500/30'
                            : 'bg-zinc-900 border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-emerald-400">
                            {item.transactionId}
                          </span>
                          <span className="font-mono font-semibold text-white">
                            {item.amount.toLocaleString()} ETB
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                          <span>{item.type}</span>
                          <span>{item.date}</span>
                        </div>
                        {item.senderName && (
                          <p className="text-[11px] text-zinc-300 truncate">From: {item.senderName}</p>
                        )}
                        {isDup && (
                          <div className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Already present in sheet
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: Vercel Gateway & Test */}
        {activeTab === 'gateway' && (
          <VercelGatewayPanel
            appUrl={typeof window !== 'undefined' ? window.location.origin : ''}
            activeSpreadsheetId={activeSpreadsheetId}
            activeSheetTitle={activeSheetTitle}
            activeSheetName={activeSheetName}
            accessToken={accessToken}
            webhookLogs={webhookLogs}
            onRefreshLogs={fetchWebhookLogs}
            onRefreshSheet={loadSheetRows}
          />
        )}

        {/* TAB 4: Phone Automation Setup */}
        {activeTab === 'automation' && (
          <AutomationGuide
            appUrl={typeof window !== 'undefined' ? window.location.origin : ''}
            onSimulateWebhook={handleSimulateWebhook}
            isSimulating={isSimulatingWebhook}
          />
        )}
      </main>

      {/* Confirmation Modal for Google Workspace Writes */}
      <WorkspaceConfirmModal
        isOpen={confirmModalData.isOpen}
        title={confirmModalData.title}
        description={confirmModalData.description}
        itemsCount={confirmModalData.itemsCount}
        details={confirmModalData.details}
        targetSheetName={activeSheetTitle}
        confirmLabel="Confirm & Append to Sheet"
        isProcessing={isConfirmProcessing}
        onConfirm={handleConfirmSync}
        onCancel={() => setConfirmModalData((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Sheet Selector Modal */}
      <SheetSelectorModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        accessToken={accessToken}
        activeSpreadsheetId={activeSpreadsheetId}
        activeSheetName={activeSheetName}
        onSelectSpreadsheet={handleSelectSpreadsheet}
      />
    </div>
  );
}
