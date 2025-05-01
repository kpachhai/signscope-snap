import type { Transaction } from '@metamask/snaps-sdk';
import { getValue } from './utils';

/**
 * Interface defining the validation result object
 */
type ValidationResult = {
  /**
   * Checks if the transaction should be blocked
   *
   * @returns True if transaction should be blocked
   */
  shouldBeBlocked(): boolean;

  /**
   * Checks if the transaction has warnings
   *
   * @returns True if transaction has warnings
   */
  containsWarnings(): boolean;

  /**
   * Gets the list of blocking issues
   *
   * @returns Array of blocking issues
   */
  getBlockingIssues(): string[];

  /**
   * Gets the list of warnings
   *
   * @returns Array of warnings
   */
  getWarnings(): string[];

  /**
   * Checks if the transaction is valid (no blocking issues)
   *
   * @returns True if transaction is valid
   */
  isValid(): boolean;
};

/**
 * Validates a transaction string and returns a validation result object
 *
 * @param transaction - The transaction string to validate
 * @returns Validation result object with methods to check status and get issues
 */
export async function validateTransaction(
transaction: Transaction, transactionTo: string,
): Promise<ValidationResult> {
  // Initialize arrays to store any validation issues
  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  let banList = (await getValue('banList'))?.toString();
  let whiteList = (await getValue('whiteList'))?.toString();
  const warnOverValue = await getValue('warnOver');
  let warnOver = warnOverValue ? parseInt(warnOverValue.toString()) : 999999999;

  // Check only if the transaction is not in the whitelist
  if (whiteList && whiteList.length > 0 && (whiteList.includes(transactionTo) || whiteList.includes(transaction.to))) {
    // no need to check the transaction
    console.log('Transaction in whitelist');
  } else {
    if(banList && banList.length > 0 && (banList.includes(transactionTo) || banList.includes(transaction.to))) {
      blockingIssues.push(`Recipient or contract in the ban list!`);
    }

    if(transaction.value) {
      let decimalValue = parseInt(transaction.value, 16);
      let hbarValue = decimalValue / 1e18;
      if(hbarValue > warnOver) {
        warnings.push(`Transaction value (${hbarValue} HBAR) exceeds the warning threshold (${warnOver} HBAR).`);
      }
    }
  }

  // Return object with methods to check status and get issues
  return {
    shouldBeBlocked(): boolean {
      return blockingIssues.length > 0;
    },

    containsWarnings(): boolean {
      return warnings.length > 0;
    },

    getBlockingIssues(): string[] {
      return [...blockingIssues];
    },

    getWarnings(): string[] {
      return [...warnings];
    },

    isValid(): boolean {
      return blockingIssues.length === 0;
    },
  };
}

export async function isInWhitelist(
  transactionTo: string
): Promise<boolean> {
  let whiteList = (await getValue('whiteList'))?.toString();
  return whiteList ? whiteList.includes(transactionTo) : false;
}
