/* eslint-disable jsdoc/require-jsdoc */
import { remove0x } from '@metamask/utils';

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

  return functionSignature?.name ?? 'Contract Call';
}

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

export async function getValue(keyName: string) {
  return await snap.request({
    method: 'snap_getState',
    params: {
      key: keyName,
      encrypted: true,
    },
  });
}
