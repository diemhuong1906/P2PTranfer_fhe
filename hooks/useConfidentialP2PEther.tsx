
"use client";

import { ethers } from "ethers";
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes"; // Adjust path based on your project
import { GenericStringStorage } from "@/fhevm/GenericStringStorage"; // Adjust path

import { ConfidentialP2PEtherAddresses } from "@/abi/ConfidentialP2PEtherAddresses"; // Assume you create this similar to DeInsuredAddresses
import { ConfidentialP2PEtherABI } from "@/abi/ConfidentialP2PEtherABI"; // Extract ABI from ConfidentialP2PEther.json and create this file

type ConfidentialP2PEtherInfoType = {
  abi: typeof ConfidentialP2PEtherABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getConfidentialP2PEtherByChainId(chainId: number | undefined): ConfidentialP2PEtherInfoType {
  if (!chainId) {
    return { abi: ConfidentialP2PEtherABI.abi };
  }

  const chainIdStr = chainId.toString() as keyof typeof ConfidentialP2PEtherAddresses;
  const entry = ConfidentialP2PEtherAddresses[chainIdStr];

  if (!entry || !("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: ConfidentialP2PEtherABI.abi, chainId };
  }

  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: ConfidentialP2PEtherABI.abi,
  };
}

export const useConfidentialP2PEther = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<(ethersSigner: ethers.JsonRpcSigner | undefined) => boolean>;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  // States and Refs
  const [hasBalance, setHasBalance] = useState<boolean>(false);
  const [encryptedBalance, setEncryptedBalance] = useState<string | undefined>(undefined);
  const [encryptedTotalSupply, setEncryptedTotalSupply] = useState<string | undefined>(undefined);
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDepositing, setIsDepositing] = useState<boolean>(false);
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const confidentialP2PEtherRef = useRef<ConfidentialP2PEtherInfoType | undefined>(undefined);
  const isRefreshingRef = useRef<boolean>(isRefreshing);
  const isDepositingRef = useRef<boolean>(isDepositing);
  const isTransferringRef = useRef<boolean>(isTransferring);
  const isWithdrawingRef = useRef<boolean>(isWithdrawing);

  // ConfidentialP2PEther Contract
  const confidentialP2PEther = useMemo(() => {
    const c = getConfidentialP2PEtherByChainId(chainId);

    confidentialP2PEtherRef.current = c;

    if (!c.address) {
      setMessage(`ConfidentialP2PEther deployment not found for chainId=${chainId}.`);
    }

    return c;
  }, [chainId]);

  // isDeployed
  const isDeployed = useMemo(() => {
    if (!confidentialP2PEther) {
      return undefined;
    }
    return Boolean(confidentialP2PEther.address) && confidentialP2PEther.address !== ethers.ZeroAddress;
  }, [confidentialP2PEther]);

  // canGetState
  const canGetState = useMemo(() => {
    return confidentialP2PEther.address && ethersReadonlyProvider && eip1193Provider && !isRefreshing;
  }, [confidentialP2PEther.address, ethersReadonlyProvider, eip1193Provider, isRefreshing]);

  // Refresh State
  const refreshState = useCallback(async () => {
    console.log("[useConfidentialP2PEther] Starting refreshState");
    if (isRefreshingRef.current) {
      console.log("[useConfidentialP2PEther] Already refreshing, skipping");
      return;
    }

    if (
      !confidentialP2PEtherRef.current ||
      !confidentialP2PEtherRef.current?.chainId ||
      !confidentialP2PEtherRef.current?.address ||
      !ethersReadonlyProvider ||
      !ethersSigner ||
      !eip1193Provider
    ) {
      console.log("[useConfidentialP2PEther] Missing required parameters for refresh");
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);

    const thisChainId = confidentialP2PEtherRef.current.chainId;
    const thisConfidentialP2PEtherAddress = confidentialP2PEtherRef.current.address;

    const thisConfidentialP2PEtherContract = new ethers.Contract(
      thisConfidentialP2PEtherAddress,
      confidentialP2PEtherRef.current.abi,
      ethersReadonlyProvider,
    );

    try {
      const provider = new ethers.BrowserProvider(eip1193Provider);
      const latestBlock = await provider.getBlock("latest");
      const currentTs = latestBlock ? latestBlock.timestamp : 0;
      console.log("[useConfidentialP2PEther] Current Timestamp:", currentTs);
      setCurrentTimestamp(currentTs);

      const userAddress = await ethersSigner.getAddress();
      console.log("[useConfidentialP2PEther] User Address:", userAddress);

      // Get encrypted balance
      const balanceHandle = await thisConfidentialP2PEtherContract.balanceOf(userAddress);
      console.log("[useConfidentialP2PEther] Encrypted Balance Handle:", balanceHandle);
      setEncryptedBalance(balanceHandle);
      setHasBalance(balanceHandle !== "0x0000000000000000000000000000000000000000000000000000000000000000"); // Check if non-zero handle

      // Get encrypted total supply
      const totalSupplyHandle = await thisConfidentialP2PEtherContract.totalSupply();
      console.log("[useConfidentialP2PEther] Encrypted Total Supply Handle:", totalSupplyHandle);
      setEncryptedTotalSupply(totalSupplyHandle);

      if (sameChain.current(thisChainId) && thisConfidentialP2PEtherAddress === confidentialP2PEtherRef.current?.address) {
        console.log("[useConfidentialP2PEther] States updated successfully");
      }
    } catch (e) {
      console.error("[useConfidentialP2PEther] State refresh failed:", (e as Error).message);
      setMessage("ConfidentialP2PEther state refresh failed! error=" + (e as Error).message);
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
      console.log("[useConfidentialP2PEther] Refresh completed");
    }
  }, [ethersReadonlyProvider, eip1193Provider, ethersSigner, sameChain]);

  // Auto refresh
  useEffect(() => {
    console.log("[useConfidentialP2PEther] Triggering auto-refresh");
    refreshState();
  }, [refreshState]);

  // Listen for Events
  useEffect(() => {
    if (!confidentialP2PEther.address || !ethersReadonlyProvider) return;

    const contract = new ethers.Contract(
      confidentialP2PEther.address,
      confidentialP2PEther.abi,
      ethersReadonlyProvider,
    );

    const userAddress = ethersSigner ? ethersSigner.address.toLowerCase() : undefined;

    // Listen for user's events
    if (userAddress) {
      const depositFilter = contract.filters.Deposit(userAddress);
      contract.on(depositFilter, () => {
        console.log("[useConfidentialP2PEther] Deposit event received");
        setMessage("Deposit successful");
        refreshState();
      });

      const transferFilter = contract.filters.Transfer(userAddress);
      contract.on(transferFilter, () => {
        console.log("[useConfidentialP2PEther] Transfer event received");
        setMessage("Transfer initiated");
        refreshState();
      });

      const transferredFilter = contract.filters.Transferred(userAddress);
      contract.on(transferredFilter, () => {
        console.log("[useConfidentialP2PEther] Transferred event received");
        setMessage("Transfer completed");
        refreshState();
      });

      const withdrawFilter = contract.filters.Withdraw(userAddress);
      contract.on(withdrawFilter, () => {
        console.log("[useConfidentialP2PEther] Withdraw event received");
        setMessage("Withdraw initiated");
        refreshState();
      });

      const withdrawnFilter = contract.filters.Withdrawn(userAddress);
      contract.on(withdrawnFilter, () => {
        console.log("[useConfidentialP2PEther] Withdrawn event received");
        setMessage("Withdraw completed");
        refreshState();
      });
    }

    return () => {
      contract.removeAllListeners("Deposit");
      contract.removeAllListeners("Transfer");
      contract.removeAllListeners("Transferred");
      contract.removeAllListeners("Withdraw");
      contract.removeAllListeners("Withdrawn");
    };
  }, [confidentialP2PEther.address, ethersReadonlyProvider, ethersSigner, refreshState]);

  // canDeposit
  const canDeposit = useMemo(() => {
    return (
      confidentialP2PEther.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDepositing
    );
  }, [
    confidentialP2PEther.address,
    instance,
    ethersSigner,
    isRefreshing,
    isDepositing,
  ]);

  // canTransfer
  const canTransfer = useMemo(() => {
    return (
      confidentialP2PEther.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isTransferring &&
      hasBalance
    );
  }, [
    confidentialP2PEther.address,
    instance,
    ethersSigner,
    isRefreshing,
    isTransferring,
    hasBalance,
  ]);

  // canWithdraw
  const canWithdraw = useMemo(() => {
    return (
      confidentialP2PEther.address &&
      ethersSigner &&
      !isRefreshing &&
      !isWithdrawing &&
      hasBalance
    );
  }, [
    confidentialP2PEther.address,
    ethersSigner,
    isRefreshing,
    isWithdrawing,
    hasBalance,
  ]);

  // Deposit
  const deposit = useCallback(
    async (clearAmount: number) => { // Amount in wei
      if (isRefreshingRef.current || isDepositingRef.current) {
        console.log("[useConfidentialP2PEther] Already refreshing or depositing, skipping");
        return;
      }

      if (!confidentialP2PEther.address || !instance || !ethersSigner || clearAmount <= 0) {
        setMessage("Invalid amount (>0) or missing parameters");
        return;
      }

      if (clearAmount > Number.MAX_SAFE_INTEGER || clearAmount > 2**128 - 1) {
        setMessage("Amount exceeds uint128 limit");
        return;
      }

      const value = BigInt(clearAmount);

      const thisChainId = chainId;
      const thisConfidentialP2PEtherAddress = confidentialP2PEther.address;
      const thisEthersSigner = ethersSigner;
      const thisConfidentialP2PEtherContract = new ethers.Contract(
        thisConfidentialP2PEtherAddress,
        confidentialP2PEther.abi,
        thisEthersSigner,
      );

      isDepositingRef.current = true;
      setIsDepositing(true);
      setMessage(`Starting deposit with amount ${clearAmount} wei...`);

      const run = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const isStale = () =>
          thisConfidentialP2PEtherAddress !== confidentialP2PEtherRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          const signerAddr = await thisEthersSigner.getAddress();
          const input = instance.createEncryptedInput(thisConfidentialP2PEtherAddress, signerAddr);
          input.add128(clearAmount); // Assuming euint128 for amount
          const enc = await input.encrypt();

          if (isStale()) {
            setMessage(`Ignore deposit`);
            return;
          }

          setMessage(`Calling deposit...`);

          const tx: ethers.TransactionResponse = await thisConfidentialP2PEtherContract.deposit(
            enc.handles[0],
            enc.inputProof,
            { value }
          );

          setMessage(`Waiting for tx: ${tx.hash}...`);

          const receipt = await tx.wait();
          if (receipt?.status !== 1) {
            throw new Error("Transaction failed");
          }

          setMessage(`Deposit completed, status=${receipt?.status}.`);

          if (isStale()) {
            setMessage(`Ignore deposit`);
            return;
          }

          await refreshState();
        } catch (e) {
          console.error("[useConfidentialP2PEther] Deposit failed:", (e as Error).message);
          setMessage(`Deposit Failed! error=${(e as Error).message}`);
          await refreshState();
        } finally {
          isDepositingRef.current = false;
          setIsDepositing(false);
        }
      };

      run();
    },
    [
      ethersSigner,
      confidentialP2PEther.address,
      confidentialP2PEther.abi,
      instance,
      chainId,
      refreshState,
      sameChain,
      sameSigner,
    ],
  );

  // Transfer
  const transfer = useCallback(
    async (clearAmount: number, recipient: string) => {
      if (isRefreshingRef.current || isTransferringRef.current) {
        console.log("[useConfidentialP2PEther] Already refreshing or transferring, skipping");
        return;
      }

      if (!confidentialP2PEther.address || !instance || !ethersSigner || clearAmount <= 0 || !ethers.isAddress(recipient)) {
        setMessage("Invalid amount (>0), recipient, or missing parameters");
        return;
      }

      const thisChainId = chainId;
      const thisConfidentialP2PEtherAddress = confidentialP2PEther.address;
      const thisEthersSigner = ethersSigner;
      const thisConfidentialP2PEtherContract = new ethers.Contract(
        thisConfidentialP2PEtherAddress,
        confidentialP2PEther.abi,
        thisEthersSigner,
      );

      isTransferringRef.current = true;
      setIsTransferring(true);
      setMessage(`Starting transfer of ${clearAmount} wei to ${recipient}...`);

      const run = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const isStale = () =>
          thisConfidentialP2PEtherAddress !== confidentialP2PEtherRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          const signerAddr = await thisEthersSigner.getAddress();
          const input = instance.createEncryptedInput(thisConfidentialP2PEtherAddress, signerAddr);
          input.add128(clearAmount); // Assuming euint128 for amount
          const enc = await input.encrypt();

          if (isStale()) {
            setMessage(`Ignore transfer`);
            return;
          }

          setMessage(`Calling transfer...`);

          const tx: ethers.TransactionResponse = await thisConfidentialP2PEtherContract.transfer(
            enc.handles[0],
            enc.inputProof,
            recipient
          );

          setMessage(`Waiting for tx: ${tx.hash}...`);

          const receipt = await tx.wait();
          if (receipt?.status !== 1) {
            throw new Error("Transaction failed");
          }

          setMessage(`Transfer transaction confirmed, awaiting callback...`);

          if (isStale()) {
            setMessage(`Ignore transfer`);
            return;
          }
        } catch (e) {
          console.error("[useConfidentialP2PEther] Transfer failed:", (e as Error).message);
          setMessage(`Transfer Failed! error=${(e as Error).message}`);
          await refreshState();
        } finally {
          isTransferringRef.current = false;
          setIsTransferring(false);
        }
      };

      run();
    },
    [
      ethersSigner,
      confidentialP2PEther.address,
      confidentialP2PEther.abi,
      instance,
      chainId,
      refreshState,
      sameChain,
      sameSigner,
    ],
  );

  // Withdraw
  const withdraw = useCallback(
    async () => {
      if (isRefreshingRef.current || isWithdrawingRef.current) {
        console.log("[useConfidentialP2PEther] Already refreshing or withdrawing, skipping");
        return;
      }

      if (!confidentialP2PEther.address || !ethersSigner) {
        setMessage("Missing parameters");
        return;
      }

      const thisChainId = chainId;
      const thisConfidentialP2PEtherAddress = confidentialP2PEther.address;
      const thisEthersSigner = ethersSigner;
      const thisConfidentialP2PEtherContract = new ethers.Contract(
        thisConfidentialP2PEtherAddress,
        confidentialP2PEther.abi,
        thisEthersSigner,
      );

      isWithdrawingRef.current = true;
      setIsWithdrawing(true);
      setMessage(`Starting withdraw...`);

      const run = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const isStale = () =>
          thisConfidentialP2PEtherAddress !== confidentialP2PEtherRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          if (isStale()) {
            setMessage(`Ignore withdraw`);
            return;
          }

          setMessage(`Calling withdraw...`);

          const tx: ethers.TransactionResponse = await thisConfidentialP2PEtherContract.withdraw();

          setMessage(`Waiting for tx: ${tx.hash}...`);

          const receipt = await tx.wait();
          if (receipt?.status !== 1) {
            throw new Error("Transaction failed");
          }

          setMessage(`Withdraw transaction confirmed, awaiting callback...`);

          if (isStale()) {
            setMessage(`Ignore withdraw`);
            return;
          }
        } catch (e) {
          console.error("[useConfidentialP2PEther] Withdraw failed:", (e as Error).message);
          setMessage(`Withdraw Failed! error=${(e as Error).message}`);
          await refreshState();
        } finally {
          isWithdrawingRef.current = false;
          setIsWithdrawing(false);
        }
      };

      run();
    },
    [
      ethersSigner,
      confidentialP2PEther.address,
      confidentialP2PEther.abi,
      chainId,
      refreshState,
      sameChain,
      sameSigner,
    ],
  );

  return {
    contractAddress: confidentialP2PEther.address,
    canGetState,
    canDeposit,
    canTransfer,
    canWithdraw,
    deposit,
    transfer,
    withdraw,
    refreshState,
    message,
    hasBalance,
    encryptedBalance,
    encryptedTotalSupply,
    currentTimestamp,
    isRefreshing,
    isDepositing,
    isTransferring,
    isWithdrawing,
    isDeployed,
  };
};