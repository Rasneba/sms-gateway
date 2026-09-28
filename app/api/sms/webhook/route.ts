import { NextRequest, NextResponse } from 'next/server';
import { addWebhookSMS, getWebhookLogs, markLogSynced } from '@/lib/webhook-store';
import { appendTransactionsToSheet } from '@/lib/sheets-api';

export async function POST(req: NextRequest) {
  try {
    let rawBody = '';
    let sender = 'telebirr';
    let text = '';
    let secret = '';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const json = await req.json().catch(() => ({}));
      text = json.text || json.message || json.sms || json.body || json.content || '';
      sender = json.sender || json.from || json.senderNumber || 'telebirr';
      secret = json.secret || json.apiKey || json.token || '';
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        text = String(formData.get('text') || formData.get('message') || formData.get('body') || '');
        sender = String(formData.get('sender') || formData.get('from') || 'telebirr');
        secret = String(formData.get('secret') || '');
      }
    } else {
      text = await req.text();
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'No SMS message text received in request body.' },
        { status: 400 }
      );
    }

    // Process and buffer the SMS
    const logItem = addWebhookSMS(text, sender);

    // Optional direct sync to Google Sheets if client passed Authorization and Spreadsheet-ID headers
    const authHeader = req.headers.get('authorization');
    const spreadsheetId = req.headers.get('x-spreadsheet-id');
    const sheetName = req.headers.get('x-sheet-name') || 'Telebirr Transactions';

    let syncedDirectly = false;
    let syncError: string | undefined = undefined;

    if (authHeader && authHeader.startsWith('Bearer ') && spreadsheetId && logItem.parsed.isValidTelebirr) {
      const token = authHeader.replace('Bearer ', '');
      try {
        await appendTransactionsToSheet(token, spreadsheetId, sheetName, [logItem.parsed]);
        markLogSynced(logItem.id);
        syncedDirectly = true;
      } catch (err: any) {
        syncError = err.message || 'Direct sync failed';
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Telebirr SMS received and processed',
      data: logItem,
      syncedDirectly,
      syncError,
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error processing webhook' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pendingOnly = searchParams.get('pending') === 'true';

  const logs = getWebhookLogs();
  const filtered = pendingOnly ? logs.filter((l) => l.status === 'pending') : logs;

  return NextResponse.json({
    success: true,
    count: filtered.length,
    logs: filtered,
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (id) {
      markLogSynced(id);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update log' }, { status: 400 });
  }
}
