import { ParsedTelebirrSMS } from './telebirr-parser';

export interface SpreadsheetInfo {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface SheetHeader {
  date: string;
  transactionId: string;
  amount: number;
  type: string;
  senderName: string;
  senderPhone: string;
  balance: string | number;
  recordedAt: string;
  rawText: string;
}

const DEFAULT_SHEET_NAME = 'Telebirr Transactions';

export async function listUserSpreadsheets(accessToken: string): Promise<SpreadsheetInfo[]> {
  try {
    const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=15`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to fetch spreadsheets (${res.status})`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (error) {
    console.error('Error listing spreadsheets:', error);
    throw error;
  }
}

export async function createTelebirrSpreadsheet(
  accessToken: string,
  title: string = 'Telebirr Transactions Ledger'
): Promise<{ spreadsheetId: string; webViewLink: string; sheetName: string }> {
  try {
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title,
        },
        sheets: [
          {
            properties: {
              title: DEFAULT_SHEET_NAME,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create spreadsheet (${createRes.status})`);
    }

    const sheetData = await createRes.json();
    const spreadsheetId = sheetData.spreadsheetId;
    const sheetId = sheetData.sheets?.[0]?.properties?.sheetId || 0;

    // Initialize Headers
    const headers = [
      'Transaction Date',
      'Transaction ID',
      'Amount (ETB)',
      'Transaction Type',
      'Sender / Depositor',
      'Phone / Account',
      'New Balance (ETB)',
      'Recorded At',
      'Raw SMS Text',
    ];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(DEFAULT_SHEET_NAME)}!A1:I1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [headers],
        }),
      }
    );

    // Format header row with emerald green background, bold white text, and auto-fit column width
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 9,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.05, green: 0.5, blue: 0.3 }, // emerald green
                  textFormat: {
                    foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                    bold: true,
                    fontSize: 10,
                  },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
        ],
      }),
    });

    return {
      spreadsheetId,
      webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      sheetName: DEFAULT_SHEET_NAME,
    };
  } catch (error) {
    console.error('Error creating Telebirr spreadsheet:', error);
    throw error;
  }
}

export async function fetchSheetRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string = DEFAULT_SHEET_NAME
): Promise<{ rows: any[][]; sheetName: string; existingTxnIds: Set<string> }> {
  try {
    // First get spreadsheet metadata to ensure sheetName exists or pick first sheet
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    let activeSheetName = sheetName;
    if (metaRes.ok) {
      const meta = await metaRes.json();
      const sheetTitles: string[] = meta.sheets?.map((s: any) => s.properties?.title) || [];
      if (sheetTitles.length > 0 && !sheetTitles.includes(sheetName)) {
        activeSheetName = sheetTitles[0];
      }
    }

    const range = `${encodeURIComponent(activeSheetName)}!A:I`;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to read spreadsheet rows (${res.status})`);
    }

    const data = await res.json();
    const rows: any[][] = data.values || [];
    const existingTxnIds = new Set<string>();

    // Skip header row if present
    const dataRows = rows.length > 0 ? rows.slice(1) : [];
    dataRows.forEach((row) => {
      // Column index 1 is Transaction ID
      if (row[1]) {
        existingTxnIds.add(String(row[1]).trim().toUpperCase());
      }
    });

    return { rows, sheetName: activeSheetName, existingTxnIds };
  } catch (error) {
    console.error('Error reading sheet rows:', error);
    throw error;
  }
}

export async function appendTransactionsToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  transactions: ParsedTelebirrSMS[]
): Promise<{ appendedCount: number }> {
  try {
    if (transactions.length === 0) return { appendedCount: 0 };

    const values = transactions.map((t) => [
      t.date || new Date().toLocaleString(),
      t.transactionId,
      t.amount,
      t.type,
      t.senderName || 'Self / Direct Deposit',
      t.senderPhone || '-',
      t.balance !== undefined ? t.balance : '-',
      new Date().toLocaleString(),
      t.rawText,
    ]);

    const range = `${encodeURIComponent(sheetName)}!A:I`;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to append transactions (${res.status})`);
    }

    return { appendedCount: transactions.length };
  } catch (error) {
    console.error('Error appending transactions:', error);
    throw error;
  }
}
