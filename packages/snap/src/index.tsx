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
  address,
  UserInputEventType,
} from '@metamask/snaps-sdk';
import {
  Box,
  Text,
  Bold,
  Heading,
  Container,
  Footer,
  Button,
} from '@metamask/snaps-sdk/jsx';
import { assert, hasProperty, Transaction } from '@metamask/utils';
import { ethers } from 'ethers';

import type { AccountInfo } from './types/account';
import { decodeData } from './utils';
import { decodeTransaction, HederaUtils, isHTS } from './utils/HederaUtils';
import { validateTransaction } from './validation';
import { FetchResponse, FetchUtils } from './utils/FetchUtils';

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
  // Check if it's a valid hedera network
  if (
    chainId !== 'eip155:295' && // Mainnet
    chainId !== 'eip155:296' && // Testnet
    chainId !== 'eip155:297' // Previewnet
  ) {
    return {
      content: panel([
        row(
          'Unsupported Network',
          text(
            'Please connect to Hedera Mainnet, Testnet or Previewnet to enable the Transaction Insights',
          ),
        ),
      ]),
    };
  }

  const transactionFrom = transaction.from as `0x${string}`;
  const transactionTo = transaction.to
    ? (transaction.to as `0x${string}`)
    : 'N/A';

  // Check if it's a valid hedera accountId
  let accountInfo: AccountInfo = await HederaUtils.getMirrorAccountInfo(
    transactionFrom,
    'https://testnet.mirrornode.hedera.com',
  );
  if (!accountInfo.accountId) {
    accountInfo = {} as AccountInfo;
    accountInfo.accountId = 'N/A';
  }

  console.log('Account info:', accountInfo);

  let type = 'N/A';
  let rows: any[] = [];

  if (transaction?.data !== '0x') {
    const isContractCreate =
      transaction.to === null || transaction.to === undefined;
    // do the ABI retrieval
    if (!isContractCreate) {
      const isHTSToken = isHTS(transaction.to);
      let abi = [];
      if (isHTSToken) {
        abi = erc20Abi;
        const { signature, args } = decodeTransaction(abi, transaction.data);

        rows = [
          row('To', text(transactionTo)),
          row('Signature', text(signature)),
          row('Arguments', text(args)),
          row('Verified', text('True')),
          row('Hedera native token', text(`${isHTSToken}`)),
        ];
      } else {
        const response: FetchResponse = await FetchUtils.fetchDataFromUrl(
          `https://server-verify.hashscan.io/files/any/296/${transaction.to}`,
        );

        if (response.success) {
          abi = JSON.parse(response?.data?.files[0]?.content)?.output.abi;

          const { signature, args } = decodeTransaction(abi, transaction.data);

          rows = [
            row('To', text(transactionTo)),
            row('Signature', text(signature)),
            row('Arguments', text(args)),
            row('Verified', text('True')),
            row('Hedera native token', text(`${isHTSToken}`)),
          ];
        } else {
          // we just say we can't decode
          rows = [
            row('To', text(transactionTo)),
            row('Verified', text('False')),
            row('Hedera native token', text(`${isHTSToken}`)),
          ];
        }
        type = decodeData(transaction.data);
      }
    } else {
      type = 'Contract Create';
    }
  } else {
    // Normal transfer
    type = 'HBAR Transfer';
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
      row('Transaction type', text(type)),
      row('From (Account Id)', text(accountInfo.accountId)),
      row('To (Account Id)', text(transactionTo)),
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
  return {
    content: (
      <Container>
        <Box>
          <Heading>Hello world!</Heading>
          <Text>Welcome to my Snap home page!</Text>
        </Box>
        <Footer>
          <Button name="footer_button">Configure preferences</Button>
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
    method: "snap_dialog",
    params: {
      type: "alert",
      content: (
        <Box>
          <Heading>Alert heading</Heading>
          <Text>Something happened in the system.</Text>
        </Box>
      ),
    },
  });

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
