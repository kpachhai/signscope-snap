import type {
  OnHomePageHandler,
  OnRpcRequestHandler,
  OnTransactionHandler,
  OnUserInputHandler,
} from '@metamask/snaps-sdk';
import {
  SeverityLevel,
  panel,
  text,
  row,
  UserInputEventType,
} from '@metamask/snaps-sdk';
import {
  Box,
  Text,
  Bold,
  Button,
  Container,
  Footer,
  Heading,
} from '@metamask/snaps-sdk/jsx';
import { assert, hasProperty } from '@metamask/utils';

import { getGeminiDecodedInsight, type GeminiResult } from './llm';
import type { AccountInfo } from './types/account';
import { decodeData } from './utils';
import { HederaUtils } from './utils/HederaUtils';

const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
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
  if (
    chainId !== 'eip155:295' && // Mainnet
    chainId !== 'eip155:296' && // Testnet
    chainId !== 'eip155:297' // Previewnet
  ) {
    return {
      content: panel([
        row(
          'Network Error',
          text('Please connect to Hedera Mainnet|Testnet|Previewnet'),
        ),
      ]),
    };
  }

  if (
    hasProperty(transaction, 'data') &&
    typeof transaction.data === 'string'
  ) {
    const transactionFrom = transaction.from as `0x${string}`;
    const accountInfo: AccountInfo = await HederaUtils.getMirrorAccountInfo(
      transactionFrom,
      'https://testnet.mirrornode.hedera.com',
    );

    if (!accountInfo) {
      return {
        content: panel([
          row(
            'Invalid accountId',
            text('This account has no account Id associated with it'),
          ),
        ]),
      };
    }

    const transactionTo = transaction.to
      ? (transaction.to as `0x${string}`)
      : 'N/A';
    const decodedLabel = decodeData(transaction.data);
    const geminiResult: GeminiResult | null = await getGeminiDecodedInsight(
      ERC20_ABI,
      transaction.data,
    );

    return {
      content: panel(
        [
          row('From', text(accountInfo.accountId)),
          row('Contract', text(transactionTo)),
          row('Transaction Type', text(decodedLabel)),
          geminiResult
            ? row('Function', text(geminiResult.functionName))
            : row('Function', text('Unknown')),
          geminiResult
            ? row('Summary', text(geminiResult.summary))
            : row('Summary', text('No insight available')),
          geminiResult
            ? row('Safety', text(geminiResult.safetyAssessment))
            : row('Safety', text('Not analyzed')),
          geminiResult?.metadata?.recipient &&
            row('Recipient', text(geminiResult.metadata.recipient)),
          geminiResult?.metadata?.amount &&
            row('Amount', text(geminiResult.metadata.amount)),
          geminiResult?.redFlags?.length
            ? row('Red Flags', text(geminiResult.redFlags.join(', ')))
            : row('Red Flags', text('None')),
        ].filter(Boolean) as any[],
      ),
      severity: SeverityLevel.Critical,
    };
  }

  return {
    content: panel([row('Transaction type', text('Unknown'))]),
  };
};

/**
 * Handle incoming home page requests from the MetaMask clients.
 *
 * @returns A static panel rendered with custom UI.
 * @see https://docs.metamask.io/snaps/reference/exports/#onhomepage
 */
export const onHomePage: OnHomePageHandler = async () => {
  return {
    content: (
      <Container>
        <Box>
          <Heading>Hello world!</Heading>
          <Text>Welcome to my Snap home page!</Text>
        </Box>
        <Footer>
          <Button name="footer_button">Footer button</Button>
        </Footer>
      </Container>
    ),
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
  // Since this Snap only has one event, we can assert the event type and name
  // directly.
  assert(event.type === UserInputEventType.ButtonClickEvent);
  assert(event.name === 'footer_button');

  await snap.request({
    method: 'snap_updateInterface',
    params: {
      id,
      ui: (
        <Box>
          <Text>Footer button was pressed</Text>
        </Box>
      ),
    },
  });
};

/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of `snap_dialog`.
 * @throws If the request method is not valid for this snap.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  switch (request.method) {
    case 'hello':
      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: (
            <Box>
              <Text>
                Hello, <Bold>{origin}</Bold>!
              </Text>
              <Text>
                This custom confirmation is just for display purposes.
              </Text>
              <Text>
                But you can edit the snap source code to make it do something,
                if you want to!
              </Text>
            </Box>
          ),
        },
      });
    default:
      throw new Error('Method not found.');
  }
};
