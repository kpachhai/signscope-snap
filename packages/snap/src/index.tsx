/* eslint-disable no-nested-ternary */
/* eslint-disable no-negated-condition */
/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import type {
  OnHomePageHandler,
  OnTransactionHandler,
  OnUserInputHandler,
} from '@metamask/snaps-sdk';
import {
  SeverityLevel,
  panel,
  text,
  row,
  UserInputEventType,
  RowVariant,
} from '@metamask/snaps-sdk';
import {
  Box,
  Text,
  Bold,
  Heading,
  Field,
  Input,
  Container,
  Checkbox,
  Button,
  Form,
} from '@metamask/snaps-sdk/jsx';
import { assert } from '@metamask/utils';

import { getGeminiDecodedInsight, type GeminiResult } from './llm';
import type { AccountInfo } from './types/account';
import { decodeData, saveValue, getValue, extractChainId } from './utils';
import type { FetchResponse } from './utils/FetchUtils';
import { FetchUtils } from './utils/FetchUtils';
import { decodeTransaction, HederaUtils, isHTS } from './utils/HederaUtils';
import { validateTransaction } from './validation';

const erc20Abi = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function associate() external returns (uint256)',
  'function dissociate() external returns (uint256)',
  'function isAssociated() external view returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address recipient, uint256 amount) external returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function increaseAllowance(address spender, uint256 addedValue) public returns (bool)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

/**
 * Handle incoming transactions, sent through the `wallet_sendTransaction`
 * method. This handler decodes the transaction data, and displays the type of
 * transaction in the transaction insights panel.
 *
 * The `onTransaction` handler is different from the `onRpcRequest` handler in
 * that it is called by MetaMask when a transaction is initiated, rather than
 * when a dapp sends a JSON-RPC request. The handler is called before the
 * transaction is signed, so it can be used to display information about the
 * transaction to the user before they sign it.
 *
 * The `onTransaction` handler returns a Snaps UI component, which is displayed
 * in the transaction insights panel.
 *
 * @param args - The request parameters.
 * @param args.transaction - The transaction object. This contains the
 * transaction parameters, such as the `from`, `to`, `value`, and `data` fields.
 * @param args.chainId - The CAIP-2 {@link CaipChainId} of the network the transaction is
 * being submitted to.
 * @returns The transaction insights.
 */
export const onTransaction: OnTransactionHandler = async ({
  transaction,
  chainId,
}) => {
  // Check if the transaction is valid based on user preferences
  const chainID = extractChainId(chainId);

  if (
    chainID !== '295' && // Mainnet
    chainID !== '296' && // Testnet
    chainID !== '297' // Previewnet
  ) {
    return {
      content: panel([
        row(
          `Unsupported Network (chainID: ${chainID})`,
          text(
            'Please connect to Hedera Mainnet (295), Testnet (296) or Previewnet (297) to enable the Transaction Insights',
          ),
        ),
      ]),
    };
  }

  let mirrorNodeURL = await getValue('mirrorNodeURL');
  if (!mirrorNodeURL) {
    switch (chainID) {
      case '295':
        mirrorNodeURL = 'https://mainnet.mirrornode.hedera.com/api/v1';
        break;
      case '296':
        mirrorNodeURL = 'https://testnet.mirrornode.hedera.com/api/v1';
        break;
      case '297':
        mirrorNodeURL = 'https://previewnet.mirrornode.hedera.com/api/v1';
        break;
      default:
        mirrorNodeURL = 'https://testnet.mirrornode.hedera.com/api/v1';
        break;
    }
  }

  const transactionFrom = transaction.from as `0x${string}`;
  let senderAccountInfo: AccountInfo = await HederaUtils.getMirrorAccountInfo(
    transactionFrom,
    mirrorNodeURL as string,
  );
  if (!senderAccountInfo.accountId) {
    senderAccountInfo = {} as AccountInfo;
    senderAccountInfo.accountId = 'N/A';
  }

  let transactionTo = 'N/A';
  if (transaction.to) {
    transactionTo = transaction.to as `0x${string}`;
    const recipientAccountInfo: AccountInfo =
      await HederaUtils.getMirrorAccountInfo(
        transactionTo,
        mirrorNodeURL as string,
      );
    if (recipientAccountInfo.accountId) {
      transactionTo = recipientAccountInfo.accountId;
    }
  }

  console.log('Transaction to:', transactionTo);

  let operation = 'N/A';
  let rows: any[] = [];

  if (transaction.data && transaction.data !== '0x') {
    console.log('Transaction data:', transaction.data);

    const isContractCreate =
      transaction.to === null || transaction.to === undefined;
    // do the ABI retrieval
    if (isContractCreate) {
      operation = 'Create Contract';
    } else {
      const isHTSToken = isHTS(transaction.to);
      let abi = [];
      if (isHTSToken) {
        abi = erc20Abi;
        const { signature, args } = decodeTransaction(abi, transaction.data);

        rows = [
          row('Contract', text(transactionTo)),
          row('Signature', text(signature)),
          row('Arguments', text(args)),
          row('Contract Verified', text('True')),
          row('Hedera Native Token', text(`True`)),
        ];
      } else {
        const sourcifyURL =
          (await getValue('sourcifyURL')) ||
          'https://server-verify.hashscan.io';
        const response: FetchResponse = await FetchUtils.fetchDataFromUrl(
          `${sourcifyURL as string}/files/any/${chainID}/${transaction.to}`,
        );

        if (response.success) {
          const metadataFile = response.data.files.find((file: any) =>
            file.name.endsWith('metadata.json'),
          );

          const sourceFile = response.data.files.find((file: any) =>
            file.name.endsWith('.sol'),
          );

          abi = metadataFile
            ? (JSON.parse(metadataFile.content)?.output?.abi ?? [])
            : [];

          const sourceCode = sourceFile?.content ?? '';

          const { signature, args } = decodeTransaction(abi, transaction.data);

          rows = [
            row('Contract', text(transactionTo)),
            row('Signature', text(signature)),
            row('Arguments', text(args)),
            row('Contract Verified', text('True')),
            row('Hedera Native Token', text(`False`)),
          ];

          const geminiAPIKey = (await getValue('geminiAPIKey')) || '';
          if (geminiAPIKey) {
            const geminiResult: GeminiResult | null =
              await getGeminiDecodedInsight(
                geminiAPIKey as string,
                transaction.data,
                abi,
                sourceCode,
              );

            if (geminiResult) {
              const summaryText = geminiResult.summary?.toLowerCase() || '';
              const redFlagsText =
                geminiResult.redFlags?.join(' ')?.toLowerCase() || '';

              const { signature: actualSignature } = decodeTransaction(
                abi,
                transaction.data,
              );

              function normalizeFnName(fn: string): string {
                return fn
                  .toLowerCase()
                  .replace(/\(.*\)/u, '')
                  .trim();
              }

              const normalizedGeminiFn = normalizeFnName(
                geminiResult.functionName || '',
              );
              const normalizedActualFn = normalizeFnName(actualSignature || '');
              const isFunctionMatch = normalizedGeminiFn === normalizedActualFn;

              // Assess severity based on keywords
              let effectiveAssessment = geminiResult.safetyAssessment;
              const containsCriticalFlags =
                redFlagsText.includes('reentrancy') ||
                redFlagsText.includes('overflow') ||
                redFlagsText.includes('vulnerability') ||
                summaryText.includes('vulnerable') ||
                summaryText.includes('can be exploited');

              const hasPayloadSpecificRisk =
                containsCriticalFlags ||
                summaryText.includes('this transaction') ||
                summaryText.includes('provided arguments') ||
                redFlagsText.includes('this transaction');

              if (containsCriticalFlags && isFunctionMatch) {
                effectiveAssessment = 'dangerous';
              }

              const insightRows = [
                row('🔍 AI Security Insight', text('')),

                !isFunctionMatch
                  ? row(
                      '⚠️ AI Analysis Warning',
                      text(
                        `Gemini analyzed "${geminiResult.functionName}", but this transaction is calling "${actualSignature}". Results may refer to a different function.`,
                      ),
                      RowVariant.Warning,
                    )
                  : null,

                row('Function', text(geminiResult.functionName || 'Unknown')),
                row('Summary', text(geminiResult.summary || 'No summary')),

                row(
                  'Safety',
                  text(
                    effectiveAssessment === 'dangerous'
                      ? '❌ Dangerous'
                      : effectiveAssessment === 'suspicious'
                        ? '⚠️ Suspicious'
                        : '✅ Safe',
                  ),
                  effectiveAssessment === 'dangerous'
                    ? RowVariant.Critical
                    : effectiveAssessment === 'suspicious'
                      ? RowVariant.Warning
                      : RowVariant.Default,
                ),

                row(
                  'Current Call Risk',
                  text(
                    hasPayloadSpecificRisk && isFunctionMatch
                      ? effectiveAssessment === 'dangerous'
                        ? '❌ This specific transaction appears dangerous based on how the arguments interact with the function.'
                        : '⚠️ This transaction may be suspicious depending on runtime behavior.'
                      : '✅ No direct vulnerability detected in this transaction.',
                  ),
                  hasPayloadSpecificRisk && isFunctionMatch
                    ? effectiveAssessment === 'dangerous'
                      ? RowVariant.Critical
                      : RowVariant.Warning
                    : RowVariant.Default,
                ),

                geminiResult.metadata?.recipient
                  ? row(
                      'Inferred Recipient',
                      text(geminiResult.metadata.recipient),
                    )
                  : null,

                geminiResult.metadata?.amount
                  ? row('Inferred Amount', text(geminiResult.metadata.amount))
                  : null,

                row(
                  'Red Flags',
                  text(
                    geminiResult.redFlags.length
                      ? geminiResult.redFlags.join('\n\n')
                      : 'None',
                  ),
                  geminiResult.redFlags.length
                    ? RowVariant.Warning
                    : RowVariant.Default,
                ),
              ].filter(Boolean); // remove nulls

              rows.push(...insightRows);
            } else {
              rows.push(row('AI Insight', text('No insight generated.')));
            }
          } else {
            rows.push(row('AI Insight', text('LLM not configured.')));
          }
        } else {
          rows = [
            row('Contract', text(transactionTo)),
            row('Contract Verified', text('False'), RowVariant.Critical),
            row('Hedera Native Token', text(`False`)),
          ];
        }
        operation = decodeData(transaction.data);
      }
    }
  } else {
    // Normal transfer. Check if it's an auto account creation
    if (transactionTo.startsWith('0x')) {
      operation = 'HBAR Transfer + Auto Account Creation';
    } else {
      operation = 'HBAR Transfer';
    }
    rows = [row('Recipient', text(transactionTo))];
  }

  // Check if the transaction is valid based on user preferences
  const validationResult = validateTransaction(transaction);
  if (validationResult.shouldBeBlocked()) {
    // Handle blocking issues
    const blockingIssues = validationResult.getBlockingIssues();
    console.log('Blocking issues:', blockingIssues);
    rows.unshift(row('Blocking issues', text(blockingIssues.join(', '))));
    return { content: panel(rows), severity: SeverityLevel.Critical };
  } else if (validationResult.containsWarnings()) {
    // Handle warnings
    const warningList = validationResult.getWarnings();
    console.log('Warnings:', warningList);
    rows.unshift(row('Warnings', text(warningList.join(', '))));
    return { content: panel(rows) };
  }

  return {
    content: panel([
      row('Operation', text(operation)),
      row('Sender', text(senderAccountInfo.accountId)),
      ...rows,
    ]),
  };
};

/**
 * Handle incoming home page requests from the MetaMask clients.
 *
 * @returns A static panel rendered with custom UI.
 * @see https://docs.metamask.io/snaps/reference/exports/#onhomepage
 */
export const onHomePage: OnHomePageHandler = async () => {
  // Get the saved values
  const whiteList = (await getValue('whiteList')) || '';
  const banList = (await getValue('banList')) || '';
  const warnOver = (await getValue('warnOver')) || '999999999';
  const onlyVerifiedSmartContract =
    (await getValue('onlyVerifiedSmartContract')) || '';
  const sourcifyURL = (await getValue('sourcifyURL')) || '';
  const mirrorNodeURL = (await getValue('mirrorNodeURL')) || '';
  const geminiAPIKey = (await getValue('geminiAPIKey')) || '';

  // Create the form with the saved values
  const form = {
    whiteList,
    banList,
    warnOver,
    onlyVerifiedSmartContract: onlyVerifiedSmartContract === 'true',
    sourcifyURL,
    mirrorNodeURL,
    geminiAPIKey,
  };

  // Create the form
  const formComponent = (
    <Form name="preferences">
      <Field label="White list. Transactions to contracts in this list will be automatically approved.">
        <Input
          name="whiteList"
          placeholder="Insert comma separated addresses."
          value={form.whiteList as string}
        />
      </Field>
      <Field label="Ban list. Transactions to contracts in this list will be automatically denied">
        <Input
          name="banList"
          placeholder="Insert comma separated addresses."
          value={form.banList as string}
        />
      </Field>
      <Field label="Warn if the transaction is transferring more than this amount of HBARs.">
        <Input
          name="warnOver"
          type="number"
          placeholder="Amount in HBAR."
          value={form.warnOver as string}
        />
      </Field>
      <Text> </Text>
      <Checkbox
        name="onlyVerifiedSmartContract"
        label="Interact with verified contracts only."
        checked={form.onlyVerifiedSmartContract}
      />
      <Text> </Text>
      <Heading>External services configuration</Heading>
      <Text> </Text>
      <Field label="Sourcify API URL. If not specified, the public Hashscan sourcify server will be used.">
        <Input
          name="sourcifyURL"
          placeholder="Es: https://server-verify.hashscan.io"
          value={form.sourcifyURL as string}
        />
      </Field>
      <Field label="Custom Mirror Node API URL. If not specified, the public mirror nodes will be used.">
        <Input
          name="mirrorNodeURL"
          placeholder="Es: https://mainnet.mirrornode.hedera.com/api/v1"
          value={form.mirrorNodeURL as string}
        />
      </Field>
      <Field label="Gemini API Key. If not specified, no LLM will be used to analyze transactions.">
        <Input
          name="geminiAPIKey"
          placeholder="XXX"
          value={form.geminiAPIKey as string}
        />
      </Field>
    </Form>
  );
  // Create the container
  const container = (
    <Container>
      <Box>
        <Heading>Welcome to the Hedera Insight Snap configuration.</Heading>
        <Text>
          Here you can configure some options to customize your experience.
        </Text>
        {formComponent}
        <Text> </Text>
        <Button type="submit" form="preferences">
          Save preferences
        </Button>
      </Box>
    </Container>
  );
  // Return the container
  return {
    content: container,
  };
};

/**
 * Handle incoming user events coming from the Snap interface.
 *
 * @param params - The event parameters.
 * @param params.id - The Snap interface ID where the event was fired.
 * @param params.event - The event object containing the event type, name and
 * value.
 * @see https://docs.metamask.io/snaps/reference/exports/#onuserinput
 */
export const onUserInput: OnUserInputHandler = async ({ event, id }) => {
  assert(event.type === UserInputEventType.FormSubmitEvent);

  const formValues = event.value as {
    whiteList: string;
    banList: string;
    warnOver: string;
    onlyVerifiedSmartContract: boolean;
    sourcifyURL: string;
    mirrorNodeURL: string;
    geminiAPIKey: string;
  };

  saveValue('whiteList', formValues.whiteList);
  saveValue('banList', formValues.banList);
  saveValue('warnOver', formValues.warnOver);
  saveValue(
    'onlyVerifiedSmartContract',
    formValues.onlyVerifiedSmartContract.toString(),
  );
  saveValue('sourcifyURL', formValues.sourcifyURL);
  saveValue('mirrorNodeURL', formValues.mirrorNodeURL);
  saveValue('geminiAPIKey', formValues.geminiAPIKey);

  await snap.request({
    method: 'snap_updateInterface',
    params: {
      id,
      ui: (
        <Box alignment="center">
          <Text>
            <Bold>Preferences saved correctly.</Bold>
          </Text>
        </Box>
      ),
    },
  });
};
