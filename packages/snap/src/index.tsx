import type { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { Box, Text, Bold } from '@metamask/snaps-sdk/jsx';
import type { OnTransactionHandler } from '@metamask/snaps-sdk';
import { SeverityLevel, panel, text, row, address } from '@metamask/snaps-sdk';
import { hasProperty } from '@metamask/utils';
import { ethers } from 'ethers';

import { decodeData } from './utils';

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

function isHTS(inputString: string) {
  return inputString.startsWith('0x00000000000');
}

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
 * @returns The transaction insights.
 */
export const onTransaction: OnTransactionHandler = async ({ transaction }) => {
  if (
    hasProperty(transaction, 'data') &&
    typeof transaction.data === 'string'
  ) {
    const type = decodeData(transaction.data);
    console.log(transaction);
    const iface = new ethers.Interface(erc20Abi);
    const decodedData = iface.parseTransaction({ data: transaction.data });
    const isHTSToken = isHTS(transaction.to).toString();
    let functionName = 'null';
    if (decodedData) {
      console.log('Decoded function call:');
      console.log('Function name:', decodedData.name);
      console.log('Arguments:', decodedData.args);
      console.log(
        'Value (ETH sent with the call):',
        decodedData.value.toString(),
      );
      functionName = decodedData.name;
    } else {
      console.log('Could not decode the transaction data as a function call.');
    }

    return {
      content: panel([
        row('From', address(transaction.from as `0x${string}`)),
        row(
          'To',
          transaction.to
            ? address(transaction.to as `0x${string}`)
            : text('None'),
        ),
        row('Function name', text(functionName)),
        row('Hedera native token', text(isHTSToken)),
      ]),
      severity: SeverityLevel.Critical,
    };
  }

  return { content: panel([row('Transaction type', text('Unknown'))]) };
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
