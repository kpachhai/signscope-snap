import type { Transaction } from '@metamask/snaps-sdk';

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
export function validateTransaction(
  transaction: Transaction,
): ValidationResult {
  // Initialize arrays to store any validation issues
  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  // Perform validation checks
  // This is where you would add your specific validation logic
  if (!transaction || typeof transaction !== 'string') {
    //blockingIssues.push('Transaction must be a non-empty string');
  } else {
    // if (transaction.length < 10) {
    //   blockingIssues.push('Transaction is too short (minimum 10 characters)');
    // }
    // if (!/^[a-zA-Z0-9\-_]+$/u.test(transaction)) {
    //   blockingIssues.push('Transaction contains invalid characters');
    // }
    // if (transaction.length > 50) {
    //   warnings.push('Transaction is unusually long');
    // }
    // if (!transaction.includes('-')) {
    //   warnings.push(
    //     'Transaction should typically include separator characters',
    //   );
    // }
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
