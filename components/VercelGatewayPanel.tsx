'use client';

import React, { useState } from 'react';
import {
  Globe,
  ExternalLink,
  Copy,
  Check,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Code2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Server,
  FileSpreadsheet,
} from 'lucide-react';
import { WebhookLogItem } from '@/lib/webhook-store';

interface VercelGatewayPanelProps {
  appUrl: string;
  activeSpreadsheetId: string | null;
  activeSheetTitle: string;
  activeSheetName: string;
  accessToken: string | null;
  webhookLogs: WebhookLogItem[];
  onRefreshLogs: () => void;
  onRefreshSheet: () => void;
}

export default function VercelGatewayPanel({
  appUrl,
  activeSpreadsheetId,
  activeSheetTitle,
  activeSheetName,
  accessToken,
  webhookLogs,
  onRefreshLogs,
  onRefreshSheet,
}: VercelGatewayPanelProps) {
  const customDomain = 'sms-gateway-chi-six.vercel.app';
  const customDomainUrl = 'https://sms-gateway-chi-six.vercel.app';
  const projectId = 'gen-lang-client-0163851476';
  const clientId = '1015314057316-mqpgq5i6iir1cqr69bc5cpe1bbv81ti3.apps.googleusercontent.com';

  const webhookEndpoint = `${appUrl || (typeof window !== 'undefined' ? window.location.origin : '')}/api/sms/webhook`;

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testSender, setTestSender] = useState('telebirr');
  const [testMessage, setTestMessage] = useState(
    'Dear customer, you have deposited ETB 2,450.00 to your telebirr account on 28/09/2026 12:30:15. Transaction ID: DE984JK210. Your current balance is ETB 8,920.00.'
  );
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<any>(null);
  const [selectedSnippet, setSelectedSnippet] = useState<'nextjs' | 'fetch' | 'curl'>('nextjs');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestPush = async () => {
    setIsPushing(true);
    setPushResult(null);
    const startTime = Date.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-gateway-source': customDomain,
      };

      if (accessToken && activeSpreadsheetId) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        headers['x-spreadsheet-id'] = activeSpreadsheetId;
        headers['x-sheet-name'] = activeSheetName;
      }

      const res = await fetch('/api/sms/webhook', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sender: testSender,
          message: testMessage,
          source: customDomain,
        }),
      });

      const latencyMs = Date.now() - startTime;
      const data = await res.json();

      setPushResult({
        status: res.status,
        ok: res.ok,
        latencyMs,
        data,
      });

      onRefreshLogs();
      if (data.syncedDirectly) {
        onRefreshSheet();
      }
    } catch (err: any) {
      setPushResult({
        status: 500,
        ok: false,
        latencyMs: Date.now() - startTime,
        error: err.message,
      });
    } finally {
      setIsPushing(false);
    }
  };

  const vercelGatewayLogs = webhookLogs.filter(
    (l) => l.source?.includes(customDomain) || l.source?.includes('vercel')
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-emerald-950/70 via-zinc-900 to-zinc-900 border border-emerald-500/30 rounded-3xl shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              Custom Vercel SMS Gateway Connected
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Gateway Integration: {customDomain}
            </h2>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              CORS is fully enabled for your Vercel gateway domain. Messages pushed from your Vercel app will be parsed and logged into your Google Sheets ledger. Follow the 2-step setup below to authorize Google login from this domain.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={customDomainUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              Visit Vercel Gateway
            </a>
          </div>
        </div>
      </div>

      {/* STEP 1 & 2: Firebase Auth & Google OAuth Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Step 1: Firebase Authorized Domains */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="font-semibold text-white text-sm">Firebase Authorized Domains</h3>
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              For Google Login
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            To allow users to sign in with Google directly from your Vercel app, add your domain to Firebase Authentication Authorized Domains:
          </p>

          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 font-medium">Domain to add:</span>
              <div className="flex items-center gap-1 font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                <span>{customDomain}</span>
                <button
                  onClick={() => copyToClipboard(customDomain, 'domain_fb')}
                  className="p-1 hover:text-white"
                >
                  {copiedKey === 'domain_fb' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 font-medium">Firebase Project:</span>
              <span className="font-mono text-zinc-300">{projectId}</span>
            </div>
          </div>

          <a
            href={`https://console.firebase.google.com/project/${projectId}/authentication/settings`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Firebase Console &rarr; Auth Settings
          </a>
        </div>

        {/* Step 2: Google Cloud OAuth Client Origin */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="font-semibold text-white text-sm">Google Cloud OAuth Origins</h3>
            </div>
            <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              Authorized JS Origins
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            In Google Cloud Console, add your Vercel origin under OAuth 2.0 Client ID JavaScript origins:
          </p>

          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 font-medium">Origin to add:</span>
              <div className="flex items-center gap-1 font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                <span>{customDomainUrl}</span>
                <button
                  onClick={() => copyToClipboard(customDomainUrl, 'origin_gcp')}
                  className="p-1 hover:text-white"
                >
                  {copiedKey === 'origin_gcp' ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 font-medium">Client ID:</span>
              <span className="font-mono text-zinc-400 truncate max-w-[200px]" title={clientId}>
                {clientId.substring(0, 20)}...
              </span>
            </div>
          </div>

          <a
            href={`https://console.cloud.google.com/apis/credentials?project=${projectId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Google Cloud Credentials
          </a>
        </div>
      </div>

      {/* LIVE TEST & PUSH TOOL */}
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Live Test: Push SMS from {customDomain}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                CORS Allowed
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Test sending an SMS payload as if it were dispatched directly from your Vercel gateway.
            </p>
          </div>

          {activeSpreadsheetId && (
            <div className="text-xs bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-zinc-400 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Direct Sync: </span>
              <strong className="text-white max-w-[120px] truncate">{activeSheetTitle}</strong>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 space-y-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                Sender / Service ID
              </label>
              <input
                type="text"
                value={testSender}
                onChange={(e) => setTestSender(e.target.value)}
                placeholder="telebirr"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                SMS Content
              </label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={3}
                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
              />
            </div>

            <button
              onClick={handleTestPush}
              disabled={isPushing || !testMessage.trim()}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
            >
              {isPushing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Pushing &amp; Parsing SMS...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Push SMS to Webhook
                </>
              )}
            </button>
          </div>

          {/* Test Push Result Inspector */}
          <div className="md:col-span-4">
            <div className="h-full p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-2">
                  Push Response Inspector
                </span>

                {pushResult ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">HTTP Status:</span>
                      <span
                        className={`font-mono font-bold ${
                          pushResult.ok ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {pushResult.status} {pushResult.ok ? 'OK' : 'FAIL'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Latency:</span>
                      <span className="font-mono text-zinc-300">{pushResult.latencyMs} ms</span>
                    </div>

                    {pushResult.data?.data?.parsed && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Extracted Txn ID:</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {pushResult.data.data.parsed.transactionId}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Amount:</span>
                          <span className="font-mono text-white font-bold">
                            {pushResult.data.data.parsed.amount} ETB
                          </span>
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Synced to Google Sheet:</span>
                      <span
                        className={`font-semibold ${
                          pushResult.data?.syncedDirectly ? 'text-emerald-400' : 'text-zinc-400'
                        }`}
                      >
                        {pushResult.data?.syncedDirectly ? 'Yes (Live)' : 'Buffered in Inbox'}
                      </span>
                    </div>

                    {pushResult.data?.syncError && (
                      <p className="text-[10px] text-amber-400">{pushResult.data.syncError}</p>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    Click &quot;Push SMS to Webhook&quot; to test the gateway response.
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-800 text-[10px] text-zinc-500">
                Webhook URL: <span className="font-mono text-zinc-400">{webhookEndpoint}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Code Snippet for Vercel Gateway */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
              Vercel Gateway Integration Code Snippets
            </h4>
          </div>

          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
            <button
              onClick={() => setSelectedSnippet('nextjs')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                selectedSnippet === 'nextjs'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Next.js / Vercel API Route
            </button>
            <button
              onClick={() => setSelectedSnippet('fetch')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                selectedSnippet === 'fetch'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              JavaScript / fetch
            </button>
            <button
              onClick={() => setSelectedSnippet('curl')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                selectedSnippet === 'curl'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              cURL
            </button>
          </div>
        </div>

        <p className="text-xs text-zinc-400">
          Paste this snippet inside your project at <code className="text-emerald-400">{customDomain}</code> to automatically forward SMS to this Google Sheets tracker:
        </p>

        <div className="relative">
          <pre className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
            {selectedSnippet === 'nextjs' &&
`// app/api/forward-sms/route.ts (in your ${customDomain} repo)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { sender, message } = await req.json();

  // Forward to Telebirr SheetSync
  const response = await fetch('${webhookEndpoint}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gateway-source': '${customDomain}',
      ${accessToken && activeSpreadsheetId ? `'Authorization': 'Bearer YOUR_GOOGLE_ACCESS_TOKEN',\n      'x-spreadsheet-id': '${activeSpreadsheetId}',` : ''}
    },
    body: JSON.stringify({ sender, message }),
  });

  const data = await response.json();
  return NextResponse.json(data);
}`}

            {selectedSnippet === 'fetch' &&
`// Client-side or Server-side fetch from ${customDomain}
const pushSmsToSheetSync = async (smsBody, senderNumber = 'telebirr') => {
  const res = await fetch('${webhookEndpoint}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gateway-source': '${customDomain}',
    },
    body: JSON.stringify({
      sender: senderNumber,
      message: smsBody,
    }),
  });
  return await res.json();
};`}

            {selectedSnippet === 'curl' &&
`curl -X POST "${webhookEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "x-gateway-source: ${customDomain}" \\
  -d '{
    "sender": "telebirr",
    "message": "Dear customer, you have deposited ETB 1,500.00 to your telebirr account on 28/09/2026. Transaction ID: DE923JK901."
  }'`}
          </pre>

          <button
            onClick={() => {
              const textToCopy =
                selectedSnippet === 'nextjs'
                  ? `import { NextRequest, NextResponse } from 'next/server';\nexport async function POST(req: NextRequest) {\n  const { sender, message } = await req.json();\n  const response = await fetch('${webhookEndpoint}', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json', 'x-gateway-source': '${customDomain}' },\n    body: JSON.stringify({ sender, message }),\n  });\n  return NextResponse.json(await response.json());\n}`
                  : selectedSnippet === 'fetch'
                  ? `const res = await fetch('${webhookEndpoint}', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gateway-source': '${customDomain}' }, body: JSON.stringify({ sender: 'telebirr', message: 'Dear customer...' }) });`
                  : `curl -X POST "${webhookEndpoint}" -H "Content-Type: application/json" -H "x-gateway-source: ${customDomain}" -d '{"sender":"telebirr","message":"Dear customer..."}'`;
              copyToClipboard(textToCopy, 'code_snippet');
            }}
            className="absolute right-3 top-3 p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs flex items-center gap-1 transition-colors"
          >
            {copiedKey === 'code_snippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Code</span>
          </button>
        </div>
      </div>

      {/* Recent Webhook Activity for this Gateway */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
              Gateway Inbound Activity ({customDomain})
            </h4>
          </div>
          <button
            onClick={onRefreshLogs}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {vercelGatewayLogs.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-xl border border-zinc-800/60">
            No incoming SMS received from {customDomain} yet. Use the &quot;Push SMS to Webhook&quot; button above to test!
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {vercelGatewayLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs flex items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400">
                      {log.parsed.transactionId}
                    </span>
                    <span className="font-mono font-semibold text-white">
                      {log.parsed.amount} ETB
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(log.receivedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate max-w-md">
                    {log.rawMessage}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      log.status === 'synced'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {log.status === 'synced' ? 'Synced to Sheet' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
