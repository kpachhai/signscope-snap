import { NftId, TokenId } from '@hashgraph/sdk';
import type { StakingInfoJson } from '@hashgraph/sdk/lib/StakingInfo';

import { FetchUtils, type FetchResponse } from './FetchUtils';
import type {
  AccountBalance,
  AccountInfo,
  MirrorAccountInfo,
  MirrorNftInfo,
  MirrorTokenInfo,
  Token,
  TokenBalance,
} from '../types/account';
import { ethers } from 'ethers';

export class HederaUtils {
  public static timestampToString(
    data: string | number | Date | null | undefined,
  ): string {
    if (!data) {
      return '';
    }

    let timestamp: number;
    if (data instanceof Date) {
      timestamp = data.getTime() / 1000;
    } else if (typeof data === 'string' || typeof data === 'number') {
      timestamp = parseFloat(data.toString());
    } else {
      return '';
    }

    return new Date(timestamp * 1000).toUTCString();
  }

  public static async getTokenById(
    tokenId: string,
    mirrorNodeUrl: string,
  ): Promise<MirrorTokenInfo> {
    let result = {} as MirrorTokenInfo;
    const url = `${mirrorNodeUrl}/api/v1/tokens/${encodeURIComponent(tokenId)}`;
    const response: FetchResponse = await FetchUtils.fetchDataFromUrl(url);
    if (response.success) {
      result = response.data;
    }
    return result;
  }

  public static async getNftSerialNumber(
    tokenId: string,
    accountId: string,
    mirrorNodeUrl: string,
  ): Promise<MirrorNftInfo[]> {
    let result = [] as MirrorNftInfo[];
    const url = `${mirrorNodeUrl}/api/v1/tokens/${encodeURIComponent(tokenId)}/nfts?account.id=${encodeURIComponent(accountId)}`;
    const response: FetchResponse = await FetchUtils.fetchDataFromUrl(url);
    if (response.success) {
      result = response.data.nfts;
    }
    return result;
  }

  public static async getMirrorAccountInfo(
    idOrAliasOrEvmAddress: string,
    mirrorNodeUrl: string,
  ): Promise<AccountInfo> {
    const result = {} as AccountInfo;
    const url = `${mirrorNodeUrl}/api/v1/accounts/${encodeURIComponent(idOrAliasOrEvmAddress)}`;
    const response: FetchResponse = await FetchUtils.fetchDataFromUrl(url);
    if (!response.success) {
      return result;
    }

    const mirrorNodeData = response.data as MirrorAccountInfo;

    try {
      result.accountId = mirrorNodeData.account;
      result.alias = mirrorNodeData.alias;
      result.createdTime = HederaUtils.timestampToString(
        mirrorNodeData.created_timestamp,
      );
      result.expirationTime = HederaUtils.timestampToString(
        mirrorNodeData.expiry_timestamp,
      );
      result.memo = mirrorNodeData.memo;
      result.evmAddress = mirrorNodeData.evm_address;
      result.key = {
        type: mirrorNodeData?.key?._type ?? '',
        key: mirrorNodeData?.key?.key ?? '',
      };
      result.autoRenewPeriod = String(mirrorNodeData.auto_renew_period);
      result.ethereumNonce = String(mirrorNodeData.ethereum_nonce);
      result.isDeleted = mirrorNodeData.deleted;
      result.stakingInfo = {
        declineStakingReward: mirrorNodeData.decline_reward,
        stakePeriodStart: HederaUtils.timestampToString(
          mirrorNodeData.stake_period_start,
        ),
        pendingReward: String(mirrorNodeData.pending_reward),
        stakedToMe: '0', // TODO
        stakedAccountId: mirrorNodeData.staked_account_id ?? '',
        stakedNodeId: mirrorNodeData.staked_node_id ?? '',
      } as StakingInfoJson;

      const hbars = mirrorNodeData.balance.balance / 1e8;
      const tokens: Record<string, TokenBalance> = {};
      // Use map to create an array of promises
      const tokenPromises = mirrorNodeData.balance.tokens.map(
        async (token: Token) => {
          const tokenId = token.token_id;
          const tokenInfo: MirrorTokenInfo = await HederaUtils.getTokenById(
            tokenId,
            mirrorNodeUrl,
          );
          if (tokenInfo.type === 'NON_FUNGIBLE_UNIQUE') {
            const nfts: MirrorNftInfo[] = await HederaUtils.getNftSerialNumber(
              tokenId,
              result.accountId,
              mirrorNodeUrl,
            );
            nfts.forEach((nftInfo) => {
              const nftId = new NftId(
                TokenId.fromString(tokenId),
                Number(nftInfo.serial_number),
              );
              tokens[nftId.toString()] = {
                balance: 1,
                decimals: 0,
                tokenId,
                nftSerialNumber: nftInfo.serial_number,
                name: tokenInfo.name,
                symbol: tokenInfo.symbol,
                tokenType: tokenInfo.type,
                supplyType: tokenInfo.supply_type,
                totalSupply: (
                  Number(tokenInfo.total_supply) /
                  Math.pow(10, Number(tokenInfo.decimals))
                ).toString(),
                maxSupply: (
                  Number(tokenInfo.max_supply) /
                  Math.pow(10, Number(tokenInfo.decimals))
                ).toString(),
              } as TokenBalance;
            });
          } else {
            tokens[tokenId] = {
              balance: token.balance / Math.pow(10, Number(tokenInfo.decimals)),
              decimals: Number(tokenInfo.decimals),
              tokenId,
              name: tokenInfo.name,
              symbol: tokenInfo.symbol,
              tokenType: tokenInfo.type,
              supplyType: tokenInfo.supply_type,
              totalSupply: (
                Number(tokenInfo.total_supply) /
                Math.pow(10, Number(tokenInfo.decimals))
              ).toString(),
              maxSupply: (
                Number(tokenInfo.max_supply) /
                Math.pow(10, Number(tokenInfo.decimals))
              ).toString(),
            } as TokenBalance;
          }
        },
      );

      // Wait for all promises to resolve
      await Promise.all(tokenPromises);

      result.balance = {
        hbars,
        timestamp: HederaUtils.timestampToString(
          mirrorNodeData.balance.timestamp,
        ),
        tokens,
      } as AccountBalance;
    } catch (error: any) {
      console.error('Error in getMirrorAccountInfo:', String(error));
    }

    return result;
  }
}

export function isHTS(inputString: string) {
  return inputString?.startsWith('0x00000000000');
}

export function decodeTransaction(
  abi: string[],
  transactionData: string,
): { signature: any; args: any } {
  // everything happens in here - assumes the abi is ok....
  const iface = new ethers.Interface(abi);
  const decodedData = iface.parseTransaction({
    data: transactionData,
  });

  let args = 'null';
  let signature = 'null';
  if (decodedData) {
    args = decodedData.args.toString();
    signature = decodedData.signature;
  } else {
    console.log('Could not decode the transaction data as a function call.');
  }
  return { signature, args };
}
