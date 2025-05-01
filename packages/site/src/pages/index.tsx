/* eslint-disable no-alert */
/* eslint-disable @typescript-eslint/no-use-before-define */
import { BrowserProvider, Contract, ethers } from 'ethers';
import { useState } from 'react';
import styled from 'styled-components';

import {
  ConnectButton,
  InstallFlaskButton,
  ReconnectButton,
  TransferButton,
  Card,
  DepositButton,
  WithdrawButton,
  CallContractButton,
} from '../components';
import { defaultSnapOrigin } from '../config';
import {
  useMetaMask,
  useInvokeSnap,
  useMetaMaskContext,
  useRequestSnap,
} from '../hooks';
import { isLocalSnap, shouldDisplayReconnectButton } from '../utils';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  margin-top: 7.6rem;
  margin-bottom: 7.6rem;
  ${({ theme }) => theme.mediaQueries.small} {
    padding-left: 2.4rem;
    padding-right: 2.4rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    width: auto;
  }
`;

const Heading = styled.h1`
  margin-top: 0;
  margin-bottom: 2.4rem;
  text-align: center;
`;

const Span = styled.span`
  color: ${(props) => props.theme.colors.primary?.default};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.large};
  font-weight: 500;
  margin-top: 0;
  margin-bottom: 0;
  ${({ theme }) => theme.mediaQueries.small} {
    font-size: ${({ theme }) => theme.fontSizes.text};
  }
`;

const CardContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: 64.8rem;
  width: 100%;
  height: 100%;
  margin-top: 1.5rem;
`;

const Notice = styled.div`
  background-color: ${({ theme }) => theme.colors.background?.alternative};
  border: 1px solid ${({ theme }) => theme.colors.border?.default};
  color: ${({ theme }) => theme.colors.text?.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;

  & > * {
    margin: 0;
  }
  ${({ theme }) => theme.mediaQueries.small} {
    margin-top: 1.2rem;
    padding: 1.6rem;
  }
`;

const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.error?.muted};
  border: 1px solid ${({ theme }) => theme.colors.error?.default};
  color: ${({ theme }) => theme.colors.error?.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-bottom: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 1.6rem;
    margin-bottom: 1.2rem;
    margin-top: 1.2rem;
    max-width: 100%;
  }
`;

const Index = () => {
  const { error } = useMetaMaskContext();
  const { isFlask, snapsDetected, installedSnap } = useMetaMask();
  const requestSnap = useRequestSnap();
  const invokeSnap = useInvokeSnap();

  const isMetaMaskReady = isLocalSnap(defaultSnapOrigin)
    ? isFlask
    : snapsDetected;

  const handleSendHelloClick = async () => {
    await invokeSnap({ method: 'hello' });
  };

  return (
    <Container>
      <Heading>
        Welcome to <Span>SignScope Service Snap(S4)</Span>
      </Heading>
      <CardContainer>
        {error && (
          <ErrorMessage>
            <b>An error happened:</b> {error.message}
          </ErrorMessage>
        )}
        {!isMetaMaskReady && (
          <Card
            content={{
              title: 'Install',
              description:
                'Snaps is pre-release software only available in MetaMask Flask, a canary distribution for developers with access to upcoming features.',
              button: <InstallFlaskButton />,
            }}
            fullWidth
          />
        )}
        {!installedSnap && (
          <Card
            content={{
              title: 'Connect',
              description:
                'Get started by connecting to and installing the example snap.',
              button: (
                <ConnectButton
                  onClick={requestSnap}
                  disabled={!isMetaMaskReady}
                />
              ),
            }}
            disabled={!isMetaMaskReady}
          />
        )}
        {shouldDisplayReconnectButton(installedSnap) && (
          <Card
            content={{
              title: 'Reconnect',
              description:
                'While connected to a local running snap this button will always be displayed in order to update the snap if a change is made.',
              button: (
                <ReconnectButton
                  onClick={requestSnap}
                  disabled={!installedSnap}
                />
              ),
            }}
            disabled={!installedSnap}
          />
        )}

        <TransferTokenComponent />
        <OverflowContractComponent />
        <ReentryComponent />
      </CardContainer>
    </Container>
  );
};

const TransferTokenContainer = styled.div`
  margin-top: 2rem;
  padding: 2rem;
  border: 1px solid ${({ theme }) => theme.colors.border?.default};
  border-radius: ${({ theme }) => theme.radii.default};
  max-width: 60rem;
  width: 100%;
`;

const Input = styled.input`
  width: 100%;
  padding: 1rem;
  margin-bottom: 1rem;
  font-size: 1rem;
`;

type ERC20 = {
  decimals(): Promise<number>;
  transfer(to: string, amount: bigint): Promise<any>;
};

type Overflow = {
  add(value: bigint): Promise<any>;
};

type Reentry = {
  deposit(overrides?: { value: bigint }): Promise<any>;
  withdraw(): Promise<any>;
};

const TransferTokenComponent = () => {
  const [contractAddress, setContractAddress] = useState(
    '0x0b16eaa7d12085f1288fcf1544dbc6c55e74de58',
  );
  const [toAddress, setToAddress] = useState(
    '0xb9c5b17296cd623facd33293e345c45d5c5f2489',
  );
  const [amount, setAmount] = useState('1');

  const handleTransfer = async () => {
    if (!(window as any).ethereum) {
      alert('MetaMask is not available');
      return;
    }

    try {
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      const erc20Abi = [
        'function transfer(address to, uint256 amount) public returns (bool)',
        'function decimals() public view returns (uint8)',
      ];
      const contract = new Contract(
        contractAddress,
        erc20Abi,
        signer,
      ) as unknown as ERC20;

      // const decimals: number = await contract.decimals();
      // const parsedAmount = parseUnits(amount, decimals);

      const tx = await contract.transfer(toAddress, BigInt(amount));
      await tx.wait();

      alert(`Transaction sent! Hash: ${tx.hash}`);
    } catch (error: any) {
      console.error(error);
    }
  };

  return (
    <TransferTokenContainer>
      <h3>Transfer ERC-20 Token</h3>
      <Input
        placeholder="ERC-20 Contract Address"
        value={contractAddress}
        onChange={(element) => setContractAddress(element.target.value)}
      />
      <Input
        placeholder="Recipient Address"
        value={toAddress}
        onChange={(element) => setToAddress(element.target.value)}
      />
      <Input
        placeholder="Amount"
        value={amount}
        onChange={(element) => setAmount(element.target.value)}
      />
      <TransferButton onClick={handleTransfer}>Transfer Token</TransferButton>
    </TransferTokenContainer>
  );
};

const OverflowContractComponent = () => {
  const [contractAddress, setContractAddress] = useState(
    '0x159f70f37aec3ea5b60e34436ed4e5fd9a123539',
  );
  const [add, setAdd] = useState('5');

  const handleTransfer = async () => {
    if (!(window as any).ethereum) {
      alert('MetaMask is not available');
      return;
    }

    try {
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      const overflowAbi = ['function add(uint256 value) returns (bool)'];
      const contract = new Contract(
        contractAddress,
        overflowAbi,
        signer,
      ) as unknown as Overflow;

      const tx = await contract.add(BigInt(add));
      await tx.wait();

      alert(`Transaction sent! Hash: ${tx.hash}`);
    } catch (error: any) {
      console.error(error);
    }
  };

  return (
    <TransferTokenContainer>
      <h3>Overflow Contract</h3>
      <Input
        placeholder="Overflow Contract Address"
        value={contractAddress}
        onChange={(element) => setContractAddress(element.target.value)}
      />
      <Input
        placeholder="Add"
        value={add}
        onChange={(element) => setAdd(element.target.value)}
      />

      <CallContractButton onClick={handleTransfer}>
        Call Contract
      </CallContractButton>
    </TransferTokenContainer>
  );
};

const ReentryComponent = () => {
  const [contractAddress, setContractAddress] = useState(
    '0xa3ee3ee9407452009fe465b45dc25f5f0d9337dd',
  );
  const [amount, setAmount] = useState('1');

  const handleDeposit = async () => {
    if (!(window as any).ethereum) {
      alert('MetaMask is not available');
      return;
    }

    try {
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      const reentryAbi = [
        'function deposit() payable',
        'function withdraw() payable',
      ];
      const contract = new Contract(
        contractAddress,
        reentryAbi,
        signer,
      ) as unknown as Reentry;

      const tx = await contract.deposit({
        value: ethers.parseEther(amount),
      });
      await tx.wait();

      alert(`Transaction sent! Hash: ${tx.hash}`);
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleWithdraw = async () => {
    if (!(window as any).ethereum) {
      alert('MetaMask is not available');
      return;
    }

    try {
      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      const reentryAbi = [
        'function deposit() payable',
        'function withdraw() payable',
      ];
      const contract = new Contract(
        contractAddress,
        reentryAbi,
        signer,
      ) as unknown as Reentry;

      const tx = await contract.withdraw();
      await tx.wait();

      alert(`Transaction sent! Hash: ${tx.hash}`);
    } catch (error: any) {
      console.error(error);
    }
  };

  return (
    <TransferTokenContainer>
      <h3>Reentry Contract</h3>
      <Input
        placeholder="Reentry Contract Address"
        value={contractAddress}
        onChange={(element) => setContractAddress(element.target.value)}
      />
      <Input
        placeholder="amount"
        value={amount}
        onChange={(element) => setAmount(element.target.value)}
      />

      <DepositButton onClick={handleDeposit}>Deposit</DepositButton>
      <br />
      <WithdrawButton onClick={handleWithdraw}>Withdraw</WithdrawButton>
    </TransferTokenContainer>
  );
};

export default Index;
