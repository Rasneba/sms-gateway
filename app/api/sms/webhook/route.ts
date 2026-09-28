import { NextRequest, NextResponse } from 'next/server';
import { addWebhookSMS, getWebhookLogs, markLogSynced } from '@/lib/webhook-store';
import { appendTransactionsToSheet } from '@/lib/sheets-api';

function getCorsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-spreadsheet-id, x-sheet-name, x-api-key, x-gateway-source',
    'Access-Control-Max-Age': '86400',
  };
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const corsHeaders = getCorsHeaders(origin);

  try {
    let sender = 'telebirr';
    let text = '';
    let secret = '';
    let customSource = req.headers.get('x-gateway-source') || '';

    // Detect if calling from sms-gateway-chi-six.vercel.app
    if (!customSource) {
      if (origin && origin.includes('sms-gateway-chi-six.vercel.app')) {
        customSource = 'sms-gateway-chi-six.vercel.app';
      } else if (referer && referer.includes('sms-gateway-chi-six.vercel.app')) {
        customSource = 'sms-gateway-chi-six.vercel.app';
      }
    }

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const json = await req.json().catch(() => ({}));
      text = json.text || json.message || json.sms || json.body || json.content || json.msg || '';
      sender = json.sender || json.from || json.senderNumber || json.phone || 'telebirr';
      secret = json.secret || json.apiKey || json.token || '';
      if (json.source && !customSource) customSource = json.source;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        text = String(formData.get('text') || formData.get('message') || formData.get('body') || formData.get('sms') || '');
        sender = String(formData.get('sender') || formData.get('from') || 'telebirr');
        secret = String(formData.get('secret') || formData.get('apiKey') || '');
      }
    } else {
      // Raw string payload
      text = await req.text();
    }

    // Also check URL search params if empty (e.g. gateway sent /api/sms/webhook?message=...)
    if (!text || text.trim().length === 0) {
      const { searchParams } = new URL(req.url);
      text = searchParams.get('text') || searchParams.get('message') || searchParams.get('sms') || searchParams.get('body') || '';
      if (searchParams.get('sender')) sender = searchParams.get('sender')!;
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'No SMS message text received in request body or query.',
          acceptedFormats: {
            json: '{ "sender": "telebirr", "message": "Dear customer, you have deposited..." }',
            params: '?sender=telebirr&message=Dear customer...',
          },
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Process and buffer the SMS
    const sourceLabel = customSource || (origin ? new URL(origin).hostname : 'Vercel / Phone Webhook');
    const logItem = addWebhookSMS(text, sender, sourceLabel);

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
        logItem.directSyncTarget = spreadsheetId;
        syncedDirectly = true;
      } catch (err: any) {
        syncError = err.message || 'Direct sync to sheet failed';
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Telebirr SMS received and processed successfully',
        data: logItem,
        source: sourceLabel,
        syncedDirectly,
        syncError,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error processing webhook' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  const { searchParams } = new URL(req.url);
  // Support GET-based webhook queries (e.g. from some SMS gateway services)
  const incomingMsg = searchParams.get('text') || searchParams.get('message') || searchParams.get('sms');
  if (incomingMsg) {
    const sender = searchParams.get('sender') || searchParams.get('from') || 'telebirr';
    const source = searchParams.get('source') || 'GET Webhook';
    const logItem = addWebhookSMS(incomingMsg, sender, source);
    return NextResponse.json(
      {
        success: true,
        message: 'SMS received via GET webhook',
        data: logItem,
      },
      { status: 200, headers: corsHeaders }
    );
  }

  const pendingOnly = searchParams.get('pending') === 'true';
  const logs = getWebhookLogs();
  const filtered = pendingOnly ? logs.filter((l) => l.status === 'pending') : logs;

  return NextResponse.json(
    {
      success: true,
      count: filtered.length,
      logs: filtered,
    },
    { status: 200, headers: corsHeaders }
  );
}

export async function PATCH(req: NextRequest) {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { id } = await req.json();
    if (id) {
      markLogSynced(id);
    }
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch {
    return NextResponse.json({ error: 'Failed to update log' }, { status: 400, headers: corsHeaders });
  }
}
