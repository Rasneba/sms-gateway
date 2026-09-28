import { ParsedTelebirrSMS, parseTelebirrSMS } from './telebirr-parser';

export interface WebhookLogItem {
  id: string;
  receivedAt: string;
  sender: string;
  rawMessage: string;
  parsed: ParsedTelebirrSMS;
  status: 'pending' | 'synced' | 'ignored';
  error?: string;
}

// In-memory ring buffer for recently received webhook SMS messages
const globalWebhookLogs: WebhookLogItem[] = [];
const MAX_LOGS = 100;

export function addWebhookSMS(rawMessage: string, sender: string = 'telebirr'): WebhookLogItem {
  const parsed = parseTelebirrSMS(rawMessage);
  const logItem: WebhookLogItem = {
    id: `hook_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    receivedAt: new Date().toISOString(),
    sender,
    rawMessage,
    parsed,
    status: parsed.isValidTelebirr ? 'pending' : 'ignored',
  };

  globalWebhookLogs.unshift(logItem);
  if (globalWebhookLogs.length > MAX_LOGS) {
    globalWebhookLogs.pop();
  }

  return logItem;
}

export function getWebhookLogs(): WebhookLogItem[] {
  return [...globalWebhookLogs];
}

export function markLogSynced(id: string): boolean {
  const item = globalWebhookLogs.find((l) => l.id === id);
  if (item) {
    item.status = 'synced';
    return true;
  }
  return false;
}

export function clearWebhookLogs() {
  globalWebhookLogs.length = 0;
}
