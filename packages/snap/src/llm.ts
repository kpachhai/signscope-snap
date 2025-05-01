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
  You are a smart contract security auditor.
  
  You are provided with:
  - A smart contract ABI
  - The source code of the contract (if available)
  - A transaction payload (hex-encoded calldata that includes the function selector and parameters)
  
  Your task is to deeply analyze the **exact transaction** the user is about to sign.
  
  Perform the following:
  
  1. **Decode** the transaction payload using the ABI to identify:
     - The function being called
     - The actual arguments passed
  
  2. **Inspect the function's implementation** in the source code to understand:
     - Its logic
     - How it uses the passed arguments
     - What it modifies or transfers (e.g. storage, ETH, tokens)
  
  3. Determine if **the transaction could exploit or trigger a vulnerability** like:
     - Reentrancy
     - Integer overflow/underflow
     - Unchecked call results
     - Insecure external calls
     - Unsafe proxy patterns
     - Logic flaws or broken business rules
  
  4. Provide a human-readable **summary** of what the transaction does.
  
  5. Clearly state if this **specific payload** is:
     - ✅ safe
     - ⚠️ suspicious
     - ❌ dangerous
  
  6. If it's **suspicious or dangerous**, explain **exactly why** based on how the arguments affect the code.
  
  7. Extract and summarize key **metadata** such as:
     - Recipient
     - Amount/value
     - Function name
  
  8. Respond ONLY in the following JSON format:
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

    const parsed = JSON.parse(jsonString);

    // Normalize ETH references to Hedera
    const normalizeText = (str: string) =>
      str.replace(/\bETH\b/giu, 'HBAR').replace(/\bEthereum\b/giu, 'Hedera');

    const normalizedResult: GeminiResult = {
      functionName: parsed.functionName,
      summary: normalizeText(parsed.summary),
      safetyAssessment: parsed.safetyAssessment,
      redFlags: parsed.redFlags?.map(normalizeText) ?? [],
      metadata: Object.fromEntries(
        Object.entries(parsed.metadata || {}).map(([key, value]) => [
          key,
          normalizeText(value as string),
        ]),
      ),
    };

    return normalizedResult;
  }

  return null;
}
