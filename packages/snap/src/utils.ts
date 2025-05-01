import { remove0x } from '@metamask/utils';

/**
 * The function signatures for the different types of transactions. This is used
 * to determine the type of transaction. This list is not exhaustive, and only
 * contains the most common types of transactions for demonstration purposes.
 */
const FUNCTION_SIGNATURES = [
  {
    name: 'ERC-20 Contract',
    signature: '61014060',
  },
  {
    name: 'ERC-721 Contract',
    signature: '60806040',
  },
  {
    name: 'ERC-1155 Contract',
    signature: '60806040',
  },
];

/**
 * Decode the transaction data. This checks the signature of the function that
 * is being called, and returns the type of transaction.
 *
 * @param data - The transaction data. This is expected to be a hex string,
 * containing the function signature and the parameters.
 * @returns The type of transaction, or "Unknown," if the function signature
 * does not match any known signatures.
 */
export function decodeData(data: string) {
  const normalisedData = remove0x(data);
  console.log('normalised data: ', normalisedData);
  const signature = normalisedData.slice(0, 8);

  const functionSignature = FUNCTION_SIGNATURES.find(
    (value) => value.signature === signature,
  );

  return functionSignature?.name ?? 'Unknown';
}

/**
 * Set a value in the encrypted state
 *
 * @param keyName name of the key
 * @param newValue new value for the key
 * @returns promise
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
 * Get a key value from the encrypted state
 *
 * @param keyName name of the key
 * @returns the value for the key
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
