/* eslint-disable jsdoc/require-jsdoc */
import { remove0x } from '@metamask/utils';

import type { FetchResponse } from './utils/FetchUtils';
import { FetchUtils } from './utils/FetchUtils';

export type GeminiResult = {
  functionName: string;
  summary: string;
  safetyAssessment: 'safe' | 'suspicious' | 'dangerous';
  redFlags: string[];
  metadata: Record<string, string>;
};

const GEMINI_API_KEY = 'YOUR_API_KEY'; // Replace securely
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function getGeminiDecodedInsight(
  abi: object[],
  data: string,
): Promise<GeminiResult | null> {
  const prompt = `
You are a blockchain security expert. Given a smart contract ABI and a transaction payload (function selector and calldata), perform the following:

1. Decode the transaction data using the ABI.
2. Identify the function being called and its arguments.
3. Explain what this function does in plain English.
4. Assess the safety of this transaction: is it safe, suspicious, or dangerous?
5. List any red flags (e.g., unknown calls, high approvals, proxy delegation, contract ownership changes).
6. Extract key metadata such as recipient address, amount, and function name.

Respond ONLY in the following JSON format:
{
  "functionName": "...",
  "summary": "...",
  "safetyAssessment": "safe | suspicious | dangerous",
  "redFlags": ["..."],
  "metadata": { "recipient": "...", "amount": "..." }
}

---

Contract ABI:
${JSON.stringify(abi, null, 2)}

Transaction Payload (hex):
${remove0x(data)}
`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  const response: FetchResponse = await FetchUtils.postDataToUrl(
    GEMINI_ENDPOINT,
    body,
  );
  if (response.success) {
    const rawText = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/u);
    const jsonString = jsonMatch ? jsonMatch[1] : rawText;

    return JSON.parse(jsonString);
  }

  return null;
}
