import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { parseTelebirrSMS } from '@/lib/telebirr-parser';

function getCorsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { text, useAI } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400, headers: corsHeaders });
    }

    // First run local high-speed regex parser
    const localResult = parseTelebirrSMS(text);

    // If local result has high confidence or useAI is false, return immediately
    if (!useAI && localResult.confidence === 'high') {
      return NextResponse.json(
        { success: true, result: localResult, method: 'regex' },
        { headers: corsHeaders }
      );
    }

    // If AI is enabled and Gemini API key is configured
    if (process.env.GEMINI_API_KEY && (useAI || localResult.confidence !== 'high')) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are a specialized financial SMS parser for Ethio Telecom's Telebirr service in Ethiopia.
Parse the following SMS text (which may be in English, Amharic, or mixed) and extract the financial transaction details.

SMS:
"${text}"

Return ONLY valid JSON matching this schema:
{
  "transactionId": string (The Telebirr Transaction ID or Transaction Number, e.g. "RC10982348", "DE923JK901"),
  "amount": number (The amount deposited or transferred in ETB, positive number only),
  "currency": "ETB",
  "type": "Deposit" | "Received Transfer" | "Bank Transfer" | "Merchant Payment" | "Cash In" | "Other",
  "senderName": string or null (name of the person or bank sending the money),
  "senderPhone": string or null (phone number e.g. 251911223344 or masked),
  "date": string (Date and time formatted as DD/MM/YYYY HH:MM:SS),
  "balance": number or null (Current or new balance after transaction),
  "isValidTelebirr": boolean
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const rawJson = response.text?.trim() || '{}';
        const aiParsed = JSON.parse(rawJson);

        return NextResponse.json(
          {
            success: true,
            result: {
              id: localResult.id,
              transactionId: aiParsed.transactionId || localResult.transactionId,
              amount: typeof aiParsed.amount === 'number' ? aiParsed.amount : localResult.amount,
              currency: 'ETB',
              type: aiParsed.type || localResult.type,
              senderName: aiParsed.senderName || localResult.senderName,
              senderPhone: aiParsed.senderPhone || localResult.senderPhone,
              date: aiParsed.date || localResult.date,
              balance: aiParsed.balance !== undefined ? aiParsed.balance : localResult.balance,
              rawText: text,
              isValidTelebirr: aiParsed.isValidTelebirr ?? localResult.isValidTelebirr,
              confidence: 'high',
            },
            method: 'gemini-ai',
          },
          { headers: corsHeaders }
        );
      } catch (geminiError) {
        console.warn('Gemini parser fallback to regex:', geminiError);
        return NextResponse.json(
          { success: true, result: localResult, method: 'regex-fallback' },
          { headers: corsHeaders }
        );
      }
    }

    return NextResponse.json(
      { success: true, result: localResult, method: 'regex' },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Parsing failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
