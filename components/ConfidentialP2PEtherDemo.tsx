
"use client";

import { useFhevm } from "../fhevm/useFhevm"; // Adjust path
import { useInMemoryStorage } from "../hooks/useInMemoryStorage"; // Adjust path
import { useMetaMaskEthersSigner } from "../hooks/metamask/useMetaMaskEthersSigner"; // Adjust path
import { useConfidentialP2PEther } from "@/hooks/useConfidentialP2PEther"; // Adjust path to the new hook
import { errorNotDeployed } from "./ErrorNotDeployed"; // Assume you have this
import { useState } from "react";
import { ethers } from "ethers";

export const ConfidentialP2PEtherDemo = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const confidentialP2PEther = useConfidentialP2PEther({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [depositAmount, setDepositAmount] = useState<number>(1000000000000000); // Default 0.001 ETH in wei
  const [transferAmount, setTransferAmount] = useState<number>(500000000000000); // Default 0.0005 ETH in wei
  const [recipient, setRecipient] = useState<string>("");

  const buttonClass =
    "inline-flex items-center justify-center rounded-xl bg-black px-4 py-4 font-semibold text-white shadow-sm " +
    "transition-colors duration-200 hover:bg-blue-700 active:bg-blue-800 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:pointer-events-none";

  const titleClass = "font-semibold text-black text-lg mt-4";

  if (!isConnected) {
    return (
      <div className="mx-auto">
        <button className={buttonClass} disabled={isConnected} onClick={connect}>
          <span className="text-4xl p-6">Connect to MetaMask</span>
        </button>
      </div>
    );
  }

  if (confidentialP2PEther.isDeployed === false) {
    return errorNotDeployed(chainId);
  }

  return (
    <div className="grid w-full gap-4">
      <div className="col-span-full mx-20 bg-black text-white">
        <p className="font-semibold text-3xl m-5">
          FHEVM React Minimal Template -{" "}
          <span className="font-mono font-normal text-gray-400">ConfidentialP2PEther.sol</span>
        </p>
      </div>
      <div className="col-span-full mx-20 mt-4 px-5 pb-4 rounded-lg bg-white border-2 border-black">
        <p className={titleClass}>Chain Infos</p>
        {printProperty("ChainId", chainId)}
        {printProperty(
          "Metamask accounts",
          accounts
            ? accounts.length === 0
              ? "No accounts"
              : `{ length: ${accounts.length}, [${accounts[0]}, ...] }`
            : "undefined",
        )}
        {printProperty("Signer", ethersSigner ? ethersSigner.address : "No signer")}
        {printProperty("ConfidentialP2PEther", confidentialP2PEther.contractAddress)}
        {printProperty("isDeployed", confidentialP2PEther.isDeployed)}
      </div>
      <div className="col-span-full mx-20">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-white border-2 border-black pb-4 px-4">
            <p className={titleClass}>FHEVM instance</p>
            {printProperty("Fhevm Instance", fhevmInstance ? "OK" : "undefined")}
            {printProperty("Fhevm Status", fhevmStatus)}
            {printProperty("Fhevm Error", fhevmError ?? "No Error")}
          </div>
          <div className="rounded-lg bg-white border-2 border-black pb-4 px-4">
            <p className={titleClass}>Status</p>
            {printProperty("isRefreshing", confidentialP2PEther.isRefreshing)}
            {printProperty("isDepositing", confidentialP2PEther.isDepositing)}
            {printProperty("isTransferring", confidentialP2PEther.isTransferring)}
            {printProperty("isWithdrawing", confidentialP2PEther.isWithdrawing)}
            {printProperty("canGetState", confidentialP2PEther.canGetState)}
            {printProperty("canDeposit", confidentialP2PEther.canDeposit)}
            {printProperty("canTransfer", confidentialP2PEther.canTransfer)}
            {printProperty("canWithdraw", confidentialP2PEther.canWithdraw)}
          </div>
        </div>
      </div>
      <div className="col-span-full mx-20 px-4 pb-4 rounded-lg bg-white border-2 border-black">
        <p className={titleClass}>State</p>
        {printProperty("Has Balance", confidentialP2PEther.hasBalance)}
        {printProperty("Encrypted Balance", confidentialP2PEther.encryptedBalance || "N/A")}
        {printProperty("Encrypted Total Supply", confidentialP2PEther.encryptedTotalSupply || "N/A")}
        {printProperty("Current Timestamp", confidentialP2PEther.currentTimestamp)}
      </div>
      <div className="grid grid-cols-3 mx-20 gap-4">
        <button
          className={buttonClass}
          disabled={!confidentialP2PEther.canGetState}
          onClick={confidentialP2PEther.refreshState}
        >
          {confidentialP2PEther.canGetState ? "Refresh State" : "ConfidentialP2PEther is not available"}
        </button>
        <div>
          <input
            type="number"
            placeholder="Deposit Amount (wei)"
            value={depositAmount}
            onChange={(e) => setDepositAmount(Number(e.target.value))}
            className="border-2 border-black p-2 rounded mb-2 w-full"
            disabled={!confidentialP2PEther.canDeposit}
            min="1"
          />
          <button
            className={buttonClass}
            disabled={!confidentialP2PEther.canDeposit || depositAmount <= 0}
            onClick={() => confidentialP2PEther.deposit(depositAmount)}
          >
            {confidentialP2PEther.canDeposit ? "Deposit" : confidentialP2PEther.isDepositing ? "Depositing..." : "Cannot deposit"}
          </button>
        </div>
        <button
          className={buttonClass}
          disabled={!confidentialP2PEther.canWithdraw}
          onClick={confidentialP2PEther.withdraw}
        >
          {confidentialP2PEther.canWithdraw ? "Withdraw" : confidentialP2PEther.isWithdrawing ? "Withdrawing..." : "Cannot withdraw"}
        </button>
      </div>
      <div className="grid mx-20 gap-2">
        <div>
          <input
            type="number"
            placeholder="Transfer Amount (wei)"
            value={transferAmount}
            onChange={(e) => setTransferAmount(Number(e.target.value))}
            className="border-2 border-black p-2 rounded mb-2 w-full"
            disabled={!confidentialP2PEther.canTransfer}
            min="1"
          />
          <input
            type="text"
            placeholder="Recipient Address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="border-2 border-black p-2 rounded mb-2 w-full"
            disabled={!confidentialP2PEther.canTransfer}
          />
          <button
            className={buttonClass}
            disabled={!confidentialP2PEther.canTransfer || transferAmount <= 0 || !ethers.isAddress(recipient)}
            onClick={() => confidentialP2PEther.transfer(transferAmount, recipient)}
          >
            {confidentialP2PEther.canTransfer ? "Transfer" : confidentialP2PEther.isTransferring ? "Transferring..." : "Cannot transfer"}
          </button>
        </div>
      </div>
      <div className="col-span-full mx-20 p-4 rounded-lg bg-white border-2 border-black">
        {printProperty("Message", confidentialP2PEther.message)}
      </div>
    </div>
  );
};

// Reuse printProperty and printBooleanProperty from template
function printProperty(name: string, value: unknown) {
  let displayValue: string;

  if (typeof value === "boolean") {
    return printBooleanProperty(name, value);
  } else if (typeof value === "string" || typeof value === "number") {
    displayValue = String(value);
  } else if (typeof value === "bigint") {
    displayValue = String(value);
  } else if (value === null) {
    displayValue = "null";
  } else if (value === undefined) {
    displayValue = "undefined";
  } else if (value instanceof Error) {
    displayValue = value.message;
  } else {
    displayValue = JSON.stringify(value);
  }
  return (
    <p className="text-black">
      {name}: <span className="font-mono font-semibold text-black">{displayValue}</span>
    </p>
  );
}

function printBooleanProperty(name: string, value: boolean) {
  if (value) {
    return (
      <p className="text-black">
        {name}: <span className="font-mono font-semibold text-green-500">true</span>
      </p>
    );
  }

  return (
    <p className="text-black">
      {name}: <span className="font-mono font-semibold text-red-500">false</span>
    </p>
  );
}