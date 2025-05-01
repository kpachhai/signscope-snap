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

export async function getGeminiDecodedInsight(
  geminiApiKey: string,
  data: string,
  abi: object[],
  sourceCode?: string, // optional contract code
): Promise<GeminiResult | null> {
  const prompt = `
You are a blockchain security expert. Given a smart contract ABI, source code (if available), and a transaction payload (function selector and calldata), perform the following tasks:

1. Decode the transaction data using the ABI.
2. Identify the function being called and the arguments passed.
3. Review the **smart contract source code** for how the function is implemented.
4. Explain in plain English what the transaction does.
5. Assess whether this transaction appears **safe**, **suspicious**, or **dangerous** based on the function logic and data passed.
6. Detect any red flags such as unsafe math, unrestricted external calls, reentrancy risks, large approvals, proxy delegation, etc.
7. Extract and summarize key metadata such as recipient, amount, and function name.

Respond ONLY in the following JSON format:
{
  "functionName": "...",
  "summary": "...",
  "safetyAssessment": "safe | suspicious | dangerous",
  "redFlags": ["..."],
  "metadata": {
    "recipient": "...",
    "amount": "..."
  }
}

---

Contract ABI:
${JSON.stringify(abi, null, 2)}

${sourceCode ? `\nSmart Contract Source Code:\n${sourceCode}` : ''}

Transaction Payload (hex):
${remove0x(data)}
`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

  const response: FetchResponse = await FetchUtils.postDataToUrl(
    geminiEndpoint,
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
