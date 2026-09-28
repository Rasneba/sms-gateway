'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Tag,
  CreditCard,
  User,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { ParsedTelebirrSMS } from '@/lib/telebirr-parser';

interface TransactionTableProps {
  transactions: ParsedTelebirrSMS[];
  sheetUrl?: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function TransactionTable({
  transactions,
  sheetUrl,
  onRefresh,
  isRefreshing,
}: TransactionTableProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          t.transactionId.toLowerCase().includes(q) ||
          (t.senderName && t.senderName.toLowerCase().includes(q)) ||
          (t.senderPhone && t.senderPhone.toLowerCase().includes(q)) ||
          String(t.amount).includes(q) ||
          t.rawText.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortField === 'amount') {
          return sortAsc ? a.amount - b.amount : b.amount - a.amount;
        }
        // sort by date string / timestamp
        return sortAsc
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date);
      });
  }, [transactions, search, typeFilter, sortField, sortAsc]);

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['Date', 'Transaction ID', 'Amount (ETB)', 'Type', 'Sender', 'Phone', 'Balance (ETB)', 'Raw SMS'];
    const rows = transactions.map((t) => [
      `"${t.date}"`,
      `"${t.transactionId}"`,
      t.amount,
      `"${t.type}"`,
      `"${t.senderName || ''}"`,
      `"${t.senderPhone || ''}"`,
      t.balance !== undefined ? t.balance : '',
      `"${t.rawText.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `telebirr_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'Deposit':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Received Transfer':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'Bank Transfer':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Merchant Payment':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
      {/* Control bar */}
      <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Txn ID, amount, sender..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter transactions by type"
              className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="Deposit">Deposit</option>
              <option value="Received Transfer">Received Transfer</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Merchant Payment">Merchant Payment</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              Open Sheet
            </a>
          )}

          <button
            onClick={handleExportCSV}
            disabled={transactions.length === 0}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">
                <button
                  onClick={() => {
                    setSortField('date');
                    setSortAsc(!sortAsc);
                  }}
                  className="flex items-center gap-1 hover:text-white"
                >
                  Date & Time
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-4">Transaction ID</th>
              <th className="py-3 px-4">
                <button
                  onClick={() => {
                    setSortField('amount');
                    setSortAsc(!sortAsc);
                  }}
                  className="flex items-center gap-1 hover:text-white"
                >
                  Amount (ETB)
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Sender / Counterparty</th>
              <th className="py-3 px-4">Post Balance</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CreditCard className="w-8 h-8 text-zinc-600 stroke-[1.5]" />
                    <p className="text-sm font-medium text-zinc-400">No transactions found</p>
                    <p className="text-xs text-zinc-500">
                      Paste a Telebirr SMS or test with a sample to record your first transaction.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTransactions.map((txn) => (
                <tr key={txn.id || txn.transactionId} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-zinc-400 whitespace-nowrap">
                    {txn.date}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {txn.transactionId}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="font-semibold text-white font-mono text-sm">
                      {txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>{' '}
                    <span className="text-[10px] text-zinc-400">ETB</span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getTypeBadgeColor(
                        txn.type
                      )}`}
                    >
                      {txn.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-zinc-200">
                        {txn.senderName || 'Self / Agent Deposit'}
                      </span>
                      {txn.senderPhone && (
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {txn.senderPhone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-400 whitespace-nowrap">
                    {txn.balance !== undefined ? (
                      <>
                        {txn.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] text-zinc-500">ETB</span>
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {txn.syncedToSheets ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Synced to Sheet
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-medium">
                        <Clock className="w-3 h-3 text-amber-400" />
                        Pending Sync
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer stats */}
      <div className="p-3 bg-zinc-950/60 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
        <span>
          Showing {filteredTransactions.length} of {transactions.length} recorded transactions
        </span>
        <span className="font-mono text-zinc-300">
          Subtotal: {filteredTransactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString()} ETB
        </span>
      </div>
    </div>
  );
}
