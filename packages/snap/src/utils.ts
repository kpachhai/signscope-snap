import { remove0x } from '@metamask/utils';

export type GeminiResult = {
  functionName: string;
  summary: string;
  safetyAssessment: 'safe' | 'suspicious' | 'dangerous';
  redFlags: string[];
  metadata: Record<string, string>;
};

const FUNCTION_SIGNATURES = [
  {
    name: 'ERC-20 Contract Creation',
    signature: '61014060',
  },
  {
    name: 'ERC-20 Transfer',
    signature: 'a9059cbb',
  },
  {
    name: 'ERC-721 Contract Creation',
    signature: '60806040',
  },
  {
    name: 'ERC-1155 Contract Creation',
    signature: '60806040',
  },
];

/**
 * Simple signature matching decoder.
 *
 * @param data - Hex calldata string.
 * @returns Label like "ERC-20 Transfer" or "Unknown"
 */
export function decodeData(data: string): string {
  const normalisedData = remove0x(data);
  const signature = normalisedData.slice(0, 8);

  const functionSignature = FUNCTION_SIGNATURES.find(
    (value) => value.signature === signature,
  );

  return functionSignature?.name ?? 'Unknown';
}

/**
 * Optional Gemini integration to decode transaction intent from ABI and calldata.
 */
const GEMINI_API_KEY = 'YOUR_API_KEY_HERE'; // Replace this
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 *
 * @param abi
 * @param data
 */
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

  try {
    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1] : rawText;

    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Gemini decode error:', error);
    return null;
  }
}

/**
 * Save encrypted state
 *
 * @param keyName
 * @param newValue
 */
export async function saveValue(keyName: string, newValue: string) {
  return await snap.request({
    method: 'snap_setState',
    params: {
      key: keyName,
      value: newValue,
      encrypted: true,
    },
  });
}

/**
 * Retrieve encrypted state
 *
 * @param keyName
 */
export async function getValue(keyName: string) {
  return await snap.request({
    method: 'snap_getState',
    params: {
      key: keyName,
      encrypted: true,
    },
  });
}
