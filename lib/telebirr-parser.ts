export interface ParsedTelebirrSMS {
  id: string;
  transactionId: string;
  amount: number;
  currency: string;
  type: 'Deposit' | 'Received Transfer' | 'Bank Transfer' | 'Merchant Payment' | 'Cash In' | 'Other';
  senderName?: string;
  senderPhone?: string;
  date: string;
  balance?: number;
  rawText: string;
  isValidTelebirr: boolean;
  confidence: 'high' | 'medium' | 'low';
  syncedToSheets?: boolean;
  syncedAt?: string;
}

export function parseTelebirrSMS(rawText: string): ParsedTelebirrSMS {
  const text = rawText.trim();
  const id = `tb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Normalize spaces
  const normalized = text.replace(/\s+/g, ' ');

  // 1. Transaction ID extraction
  // Matches "transaction number is X", "Transaction ID: X", "Txn ID: X", "የግብይት መለያ ቁጥርዎ X", "የግብይት ቁጥር X"
  let transactionId = '';
  const txnPatterns = [
    /(?:transaction\s*(?:number|id|no\.?|code)\s*(?:is|:)?\s*|txn\s*(?:id|no\.?)?:?\s*)([A-Z0-9]{7,16})/i,
    /(?:የግብይት\s*(?:መለያ\s*)?ቁጥር(?:ዎ)?\s*(?:ነው|:)?\s*)([A-Z0-9]{7,16})/u,
    /(?:Trans\.?\s*ID:?\s*)([A-Z0-9]{7,16})/i,
    /\b([A-Z]{2,4}[0-9A-Z]{6,12})\b/, // Standalone typical telebirr code e.g. CI874HG8K2, DE923JK901, RC10982348
  ];

  for (const pattern of txnPatterns) {
    const match = normalized.match(pattern);
    if (match && match[1]) {
      transactionId = match[1].trim().toUpperCase();
      break;
    }
  }

  // 2. Amount extraction
  // Patterns like "ETB 1,500.00", "1,500.00 ETB", "1500.00 ብር", "ETB1500.00", "deposited ETB 500.00"
  let amount = 0;
  const amountPatterns = [
    /(?:ETB|birr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:ETB|birr|ብር)/i,
    /(?:deposited|received|ደላላ|አስቀምጠዋል|ደርሶዎታል።?)\s*(?:ETB\s*)?([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:ብር\s*)([0-9,]+(?:\.[0-9]{1,2})?)/u,
  ];

  for (const pattern of amountPatterns) {
    const match = normalized.match(pattern);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/,/g, '');
      const parsed = parseFloat(cleanNum);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
        break;
      }
    }
  }

  // 3. Current / Post Balance extraction
  let balance: number | undefined = undefined;
  const balancePatterns = [
    /(?:current\s*balance\s*(?:is|:)?\s*(?:ETB\s*)?|balance\s*is\s*(?:ETB\s*)?)([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:አጠቃላይ\s*ሂሳብዎ\s*(?:ነው|:)?\s*)([0-9,]+(?:\.[0-9]{1,2})?)/u,
    /(?:balance:\s*)([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ];

  for (const pattern of balancePatterns) {
    const match = normalized.match(pattern);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/,/g, '');
      const parsed = parseFloat(cleanNum);
      if (!isNaN(parsed)) {
        balance = parsed;
        break;
      }
    }
  }

  // 4. Date and Time extraction
  // Format: 28/09/2026 14:22:10 or 2026-09-28 14:22:10 or on 28/09/2026
  let date = '';
  const datePatterns = [
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?)\b/,
    /\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?)\b/,
    /(?:on|በ|date:?)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = normalized.match(pattern);
    if (match && match[1]) {
      date = match[1].trim();
      break;
    }
  }

  if (!date) {
    // Default to current timestamp formatted
    const now = new Date();
    date = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  }

  // 5. Sender Name and Phone extraction
  let senderName: string | undefined = undefined;
  let senderPhone: string | undefined = undefined;

  // "from JOHN DOE (251911******)" or "ከ ዮሐንስ አበበ (251911******)"
  const senderMatch = normalized.match(/(?:from|ከ)\s+([A-Za-z\s\u1200-\u137F]+?)(?:\s*\(([0-9*+]+)\)|\s+on\s+|\s+በ\s+|\s+account|\s+[0-9])/i);
  if (senderMatch) {
    if (senderMatch[1]) {
      const candidate = senderMatch[1].trim();
      // Ensure it's not a generic word like "telebirr" or "account"
      if (!/^(account|your|cbe|bank)$/i.test(candidate) && candidate.length > 1) {
        senderName = candidate;
      }
    }
    if (senderMatch[2]) {
      senderPhone = senderMatch[2].trim();
    }
  }

  // Phone standalone match if not found: (2519... or 09... or +251...)
  if (!senderPhone) {
    const phoneMatch = normalized.match(/\b(\+?2519\d{8}|09\d{8}|2519\*{4,6}\d{2})\b/);
    if (phoneMatch) {
      senderPhone = phoneMatch[1];
    }
  }

  // 6. Detect Transaction Type
  let type: ParsedTelebirrSMS['type'] = 'Deposit';
  const lower = normalized.toLowerCase();
  if (lower.includes('bank') || lower.includes('cbe') || lower.includes('awash') || lower.includes('dashen') || lower.includes('abyssinia') || lower.includes('boa')) {
    type = 'Bank Transfer';
  } else if (lower.includes('merchant') || lower.includes('payment received') || lower.includes('buyer') || lower.includes('payment from')) {
    type = 'Merchant Payment';
  } else if (lower.includes('received') || lower.includes('ደርሶዎታ') || lower.includes('transfer from')) {
    type = 'Received Transfer';
  } else if (lower.includes('cash in') || lower.includes('agent')) {
    type = 'Cash In';
  } else if (lower.includes('deposit') || lower.includes('አስቀምጠዋል')) {
    type = 'Deposit';
  }

  // 7. Confidence & Telebirr check
  const isTelebirrMentioned = /telebirr|ቴሌብር|ethio telecom|ኢትዮ ቴሌኮም|127/i.test(normalized) ||
    /transaction (?:number|id)|የግብይት (?:መለያ )?ቁጥር/i.test(normalized);

  const isValidTelebirr = (transactionId.length >= 6 && amount > 0) || isTelebirrMentioned;

  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (transactionId && amount > 0 && isTelebirrMentioned) {
    confidence = 'high';
  } else if (transactionId && amount > 0) {
    confidence = 'medium';
  }

  return {
    id,
    transactionId: transactionId || 'UNKNOWN_TXN',
    amount,
    currency: 'ETB',
    type,
    senderName,
    senderPhone,
    date,
    balance,
    rawText: text,
    isValidTelebirr,
    confidence,
  };
}

export function parseBatchTelebirrSMS(batchText: string): ParsedTelebirrSMS[] {
  if (!batchText.trim()) return [];

  // Split by double newline or delimiter lines like "---" or "===="
  const blocks = batchText
    .split(/\n\s*\n+|(?:\r?\n)(?:-{3,}|={3,})(?:\r?\n)+/)
    .map((b) => b.trim())
    .filter((b) => b.length > 15);

  if (blocks.length <= 1) {
    // If not split by double newline, check if each line starts with "Dear" or "ውድ" or "Telebirr"
    const lines = batchText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const candidateMessages: string[] = [];
    let current = '';

    for (const line of lines) {
      if (/^(dear|ውድ|telebirr|you have|የግብይት)/i.test(line) && current.length > 20) {
        candidateMessages.push(current);
        current = line;
      } else {
        current = current ? `${current} ${line}` : line;
      }
    }
    if (current) candidateMessages.push(current);

    if (candidateMessages.length > 1) {
      return candidateMessages.map((msg) => parseTelebirrSMS(msg));
    }
  }

  return blocks.map((block) => parseTelebirrSMS(block));
}

export const SAMPLE_TELEBIRR_SMS = [
  {
    label: 'Standard Deposit (Cash-in)',
    sms: 'Dear customer, you have deposited ETB 1,500.00 to your telebirr account on 28/09/2026 10:14:22. Transaction ID: DE923JK901. Your current balance is ETB 4,320.50.',
  },
  {
    label: 'Received P2P Transfer (English)',
    sms: 'Dear customer, you have received ETB 3,250.00 from ABEBE BIKILA (251911223344) on 28/09/2026 14:45:10. Your transaction number is RC884HG9K1. Your current balance is ETB 7,570.50.',
  },
  {
    label: 'Bank Transfer to Telebirr (CBE)',
    sms: 'Dear customer, you have received ETB 5,000.00 from Commercial Bank of Ethiopia (CBE) account ***4821 on 28/09/2026 16:30:00. Your transaction number is TR71928410. Your current balance is ETB 12,570.50.',
  },
  {
    label: 'Amharic Received Transfer (ቴሌብር በብር)',
    sms: 'ውድ ደንበኛችን ከ ዮሐንስ አበበ (251911556677) በ 28/09/2026 11:20:05 2,000.00 ብር ደርሶዎታል። የግብይት መለያ ቁጥርዎ CI874HG8K2 ነው። አጠቃላይ ሂሳብዎ 14,570.50 ብር ነው።',
  },
  {
    label: 'Merchant Payment Received',
    sms: 'Dear merchant, you have received ETB 850.00 payment from KEBEDE KASSA (251922334455) on 28/09/2026 15:10:00. Transaction number: MP99238411. Your current balance is ETB 15,420.50.',
  },
];
