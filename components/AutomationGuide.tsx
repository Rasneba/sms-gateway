'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  Copy,
  Check,
  Send,
  Code,
  Zap,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SAMPLE_TELEBIRR_SMS } from '@/lib/telebirr-parser';

interface AutomationGuideProps {
  appUrl: string;
  onSimulateWebhook: (smsText: string) => Promise<void>;
  isSimulating: boolean;
}

export default function AutomationGuide({
  appUrl,
  onSimulateWebhook,
  isSimulating,
}: AutomationGuideProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'macrodroid' | 'smsforwarder' | 'tasker' | 'curl'>('macrodroid');
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const webhookEndpoint = `${appUrl || (typeof window !== 'undefined' ? window.location.origin : '')}/api/sms/webhook`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const samplePayloadJson = JSON.stringify(
    {
      sender: 'telebirr',
      message: 'Dear customer, you have deposited ETB 1,500.00 to your telebirr account on 28/09/2026 10:14:22. Transaction ID: DE923JK901. Your current balance is ETB 4,320.50.',
    },
    null,
    2
  );

  return (
    <div className="space-y-6">
      {/* Intro banner */}
      <div className="p-5 bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-zinc-900 border border-emerald-500/30 rounded-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Zap className="w-3 h-3 text-emerald-400" />
              Automated Phone-to-Sheet Pipeline
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              How Automatic SMS Forwarding Works
            </h3>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              When Ethio Telecom sends a Telebirr deposit SMS to your phone, an Android background forwarder (MacroDroid, SMS Forwarder, or Tasker) detects it and posts it to your dedicated Webhook URL. The service parses the Transaction ID & Amount and records it directly into your Google Sheet!
            </p>
          </div>

          {/* Test Live Webhook Button */}
          <div className="shrink-0 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-right">
            <span className="text-[11px] text-zinc-400 block mb-1.5">Test right now:</span>
            <button
              onClick={() => onSimulateWebhook(SAMPLE_TELEBIRR_SMS[selectedSampleIndex].sms)}
              disabled={isSimulating}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {isSimulating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending Test SMS...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Simulate Phone Webhook
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Webhook Endpoint Card */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Your Dedicated Webhook URL
          </span>
          <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            Method: POST
          </span>
        </div>

        <div className="flex items-center gap-2 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 font-mono text-xs text-emerald-300">
          <span className="truncate flex-1 select-all">{webhookEndpoint}</span>
          <button
            onClick={() => copyToClipboard(webhookEndpoint, 'endpoint')}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            title="Copy URL"
          >
            {copiedKey === 'endpoint' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Guide Tabs */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex border-b border-zinc-800 bg-zinc-950/60 overflow-x-auto">
          {[
            { id: 'macrodroid', label: 'MacroDroid (Recommended)', icon: Smartphone },
            { id: 'smsforwarder', label: 'SMS Forwarder App', icon: Zap },
            { id: 'tasker', label: 'Tasker', icon: Code },
            { id: 'curl', label: 'cURL / API Request', icon: Code },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 bg-zinc-900'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5 text-xs text-zinc-300 space-y-4">
          {activeTab === 'macrodroid' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-zinc-950/80 rounded-xl border border-zinc-800">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-white">Install MacroDroid from Play Store</h4>
                  <p className="text-zinc-400 mt-0.5">
                    Download MacroDroid (free app on Google Play Store). Open it and tap <strong>Add Macro</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-zinc-950/80 rounded-xl border border-zinc-800">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-white">Add Trigger: SMS Received</h4>
                  <p className="text-zinc-400 mt-0.5">
                    Tap the red <strong>(+) Trigger</strong> button → Select <strong>SMS / MMS</strong> → <strong>SMS Received</strong> → Select <strong>From Any Number</strong> or enter <strong>telebirr</strong> / <strong>127</strong> in the sender match filter.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-zinc-950/80 rounded-xl border border-zinc-800">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  3
                </div>
                <div className="w-full">
                  <h4 className="font-semibold text-white">Add Action: HTTP Request (POST)</h4>
                  <p className="text-zinc-400 mt-0.5 mb-2">
                    Tap the blue <strong>(+) Action</strong> button → <strong>Applications</strong> → <strong>HTTP Request</strong>:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                    <li>Method: <span className="font-mono text-emerald-400">POST</span></li>
                    <li>URL: <span className="font-mono text-zinc-200">{webhookEndpoint}</span></li>
                    <li>Content Body: <span className="font-mono text-emerald-400">application/json</span></li>
                  </ul>
                  <div className="mt-2 relative">
                    <pre className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto">
{`{
  "sender": "[sms_number]",
  "message": "[sms_body]"
}`}
                    </pre>
                    <button
                      onClick={() =>
                        copyToClipboard('{\n  "sender": "[sms_number]",\n  "message": "[sms_body]"\n}', 'macro_body')
                      }
                      className="absolute right-2 top-2 p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded"
                    >
                      {copiedKey === 'macro_body' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-zinc-950/80 rounded-xl border border-zinc-800">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  4
                </div>
                <div>
                  <h4 className="font-semibold text-white">Save Macro & Done!</h4>
                  <p className="text-zinc-400 mt-0.5">
                    Name it &quot;Telebirr to Google Sheets&quot; and save. Whenever a Telebirr deposit SMS hits your phone, it will automatically sync to your connected Google Sheet in under 1 second!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'smsforwarder' && (
            <div className="space-y-3">
              <p className="text-zinc-300">
                If you use the popular &quot;SMS Forwarder&quot; app (open-source on F-Droid / GitHub / Play Store):
              </p>
              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                <p><strong>1. Forwarding Target:</strong> Select &quot;Webhook&quot; or &quot;API&quot;</p>
                <p><strong>2. Webhook URL:</strong> <code className="text-emerald-400">{webhookEndpoint}</code></p>
                <p><strong>3. Rule filter:</strong> &quot;Sender contains telebirr OR 127&quot; or &quot;Message contains ETB&quot;</p>
                <p><strong>4. Request Method:</strong> POST, Body format: JSON</p>
              </div>
            </div>
          )}

          {activeTab === 'tasker' && (
            <div className="space-y-3">
              <p className="text-zinc-300">
                In Tasker:
              </p>
              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                <p><strong>Profile:</strong> Event → Phone → Received Text → Type: SMS, Sender: telebirr</p>
                <p><strong>Task:</strong> Net → HTTP Request</p>
                <p><strong>Method:</strong> POST</p>
                <p><strong>URL:</strong> {webhookEndpoint}</p>
                <p><strong>Body:</strong></p>
                <pre className="p-2 bg-zinc-900 rounded font-mono text-zinc-300">
{`{
  "sender": "%SMSRF",
  "message": "%SMSRB"
}`}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'curl' && (
            <div className="space-y-3">
              <p className="text-zinc-300">
                You can also test or automate from any server, Python script, or terminal using cURL:
              </p>
              <div className="relative">
                <pre className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap">
{`curl -X POST "${webhookEndpoint}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sender": "telebirr",
    "message": "Dear customer, you have deposited ETB 1,500.00 to your telebirr account on 28/09/2026 10:14:22. Transaction ID: DE923JK901. Your current balance is ETB 4,320.50."
  }'`}
                </pre>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `curl -X POST "${webhookEndpoint}" -H "Content-Type: application/json" -d '{"sender":"telebirr","message":"Dear customer, you have deposited ETB 1,500.00 to your telebirr account on 28/09/2026 10:14:22. Transaction ID: DE923JK901. Your current balance is ETB 4,320.50."}'`,
                      'curl_copy'
                    )
                  }
                  className="absolute right-3 top-3 p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded"
                >
                  {copiedKey === 'curl_copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          Frequently Asked Questions
        </h4>

        {[
          {
            q: 'Does this support Amharic Telebirr SMS messages?',
            a: 'Yes! The parser supports standard Amharic Ethio Telecom deposit and transfer notifications (e.g., ውድ ደንበኛችን... ደርሶዎታል። የግብይት መለያ ቁጥር...). It automatically normalizes currency to ETB and maps the fields.',
          },
          {
            q: 'What happens if a duplicate SMS is received twice?',
            a: 'The system checks the Transaction ID against existing rows in your Google Sheet before inserting. If the transaction ID is already recorded, it flags it as a duplicate to protect your financial ledger from double counting.',
          },
          {
            q: 'Can I also manually paste SMS messages if I don\'t want an automation app?',
            a: 'Yes! You can use the "Manual SMS Ingest" or "Batch Ingest" tabs in the dashboard anytime to paste single or hundreds of SMS texts at once and sync them directly.',
          },
        ].map((faq, idx) => {
          const isExp = expandedFaq === idx;
          return (
            <div key={idx} className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/40">
              <button
                onClick={() => setExpandedFaq(isExp ? null : idx)}
                className="w-full p-3 text-left flex items-center justify-between text-xs font-medium text-zinc-200 hover:text-white"
              >
                <span>{faq.q}</span>
                {isExp ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
              </button>
              {isExp && (
                <div className="px-3 pb-3 pt-1 text-xs text-zinc-400 border-t border-zinc-800/60 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
