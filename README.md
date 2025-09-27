# FHEVM with ConfidentialP2PEther contract


This project demonstrates a confidential peer-to-peer payment system using Fully Homomorphic Encryption (FHE) on top of the fhEVM.

🔐 Key Features

Confidential Transfers – Encrypted token amounts are transferred peer-to-peer while remaining private on-chain.

Secure Balances – Each user’s balance is stored in encrypted form, preventing public visibility.

Deposits & Withdrawals – Users can deposit Ether into the contract and withdraw it back, with amounts handled securely.

Real-time Event Tracking – The UI listens for deposit, transfer, and withdraw events, updating user state instantly.

🖥️ How to Use the Demo UI
1. Connect Wallet

Open the demo interface.

Click "Connect to MetaMask" to link your account.

Once connected, the UI will display your chain ID, account address, and whether the contract is deployed on the selected network.

2. Deposit

Enter an amount (in wei) in the Deposit Amount input.

Click Deposit to send encrypted Ether into the contract.

After confirmation, your Encrypted Balance will update.

3. Transfer

Enter the amount (in wei) and a recipient address.

Click Transfer to privately send encrypted Ether.

The transaction is confirmed on-chain, but the transferred value remains confidential.

4. Withdraw

Click Withdraw to retrieve your balance back into your wallet.

The contract will decrypt only the portion relevant to the withdrawing user.

5. Refresh State

At any time, you can click Refresh State to reload your encrypted balance, total supply, and other metadata.

📊 UI Components

Chain Infos – Displays chain ID, connected account, and deployed contract address.

FHEVM Status – Shows the instance state, connection status, and potential errors.

Balances – Displays encrypted balance and encrypted total supply.

Actions – Deposit, Transfer, Withdraw buttons with live status indicators.

Messages – Real-time feedback for transaction progress (pending, confirmed, failed).


## Install

1. Clone this repository.
2. From the repo root, run:

```sh
npm install
```

## Quickstart

1. Setup your hardhat environment variables:

Follow the detailed instructions in the [FHEVM documentation](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional) to setup `MNEMONIC` + `INFURA_API_KEY` Hardhat environment variables

2. Start a local Hardhat node (new terminal):

```sh
# Default RPC: http://127.0.0.1:8545  | chainId: 31337
npm run hardhat-node
```

3. Launch the frontend in mock mode:

```sh
npm run dev:mock
```

4. Start your browser with the Metamask extension installed and open http://localhost:3000

5. Open the Metamask extension to connect to the local Hardhat node
   i. Select Add network.
   ii. Select Add a network manually.
   iii. Enter your Hardhat Network RPC URL, http://127.0.0.1:8545 (or http://localhost:8545).
   iv. Enter your Hardhat Network chain ID, 31337 (or 0x539 in hexadecimal format).

## Run on Sepolia

1. Deploy your contract on Sepolia Testnet

```sh
npm run deploy:sepolia
```

2. In your browser open `http://localhost:3000`

3. Open the Metamask extension to connect to the Sepolia network

## How to fix Hardhat Node + Metamask Errors ?

When using MetaMask as a wallet provider with a development node like Hardhat, you may encounter two common types of errors:

### 1. ⚠️ Nonce Mismatch ❌💥

MetaMask tracks wallet nonces (the number of transactions sent from a wallet). However, if you restart your Hardhat node, the nonce is reset on the dev node, but MetaMask does not update its internal nonce tracking. This discrepancy causes a nonce mismatch error.

### 2. ⚠️ View Function Call Result Mismatch ❌💥

MetaMask caches the results of view function calls. If you restart your Hardhat node, MetaMask may return outdated cached data corresponding to a previous instance of the node, leading to incorrect results.

### ✅ How to Fix Nonce Mismatch:

To fix the nonce mismatch error, simply clear the MetaMask cache:

1. Open the MetaMask browser extension.
2. Select the Hardhat network.
3. Go to Settings > Advanced.
4. Click the "Clear Activity Tab" red button to reset the nonce tracking.

The correct way to do this is also explained [here](https://docs.metamask.io/wallet/how-to/run-devnet/).

### ✅ How to Fix View Function Return Value Mismatch:

To fix the view function result mismatch:

1. Restart the entire browser. MetaMask stores its cache in the extension's memory, which cannot be cleared by simply clearing the browser cache or using MetaMask's built-in cache cleaning options.

By following these steps, you can ensure that MetaMask syncs correctly with your Hardhat node and avoid potential issues related to nonces and cached view function results.

## Project Structure Overview

### Key Files/Folders

- **`<root>/packages/site/fhevm`**: This folder contains the essential hooks needed to interact with FHEVM-enabled smart contracts. It is meant to be easily copied and integrated into any FHEVM + React project.

- **`<root>/packages/site/hooks/useFHECounter.tsx`**: A simple React custom hook that demonstrates how to use the `useFhevm` hook in a basic use case, serving as an example of integration.

### Secondary Files/Folders

- **`<root>/packages/site/hooks/metamask`**: This folder includes hooks designed to manage the MetaMask Wallet provider. These hooks can be easily adapted or replaced to support other wallet providers, following the EIP-6963 standard,
- Additionally, the project is designed to be flexible, allowing developers to easily replace `ethers.js` with a more React-friendly library of their choice, such as `Wagmi`.

## Documentation

- [Hardhat + MetaMask](https://docs.metamask.io/wallet/how-to/run-devnet/): Set up your local devnet step by step using Hardhat and MetaMask.
- [FHEVM Documentation](https://docs.zama.ai/protocol/solidity-guides/)
- [FHEVM Hardhat](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)
- [@zama-fhe/relayer-sdk Documentation](https://docs.zama.ai/protocol/relayer-sdk-guides/)
- [Setting up MNEMONIC and INFURA_API_KEY](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional)
- [React Documentation](https://reactjs.org/)
- [FHEVM Discord Community](https://discord.com/invite/zama)
- [GitHub Issues](https://github.com/zama-ai/fhevm-react-template/issues)

## License

This project is licensed under the BSD-3-Clause-Clear License - see the LICENSE file for details.
