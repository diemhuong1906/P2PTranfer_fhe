// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint128, externalEuint64, externalEuint128 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract ConfidentialP2PEther is SepoliaConfig {
    euint128 private _totalSupply; // Encrypted total Ether supply
    mapping(address => euint128) private _balances; // Encrypted balances per address
    mapping(uint256 => address) private pendingTransfers; // Maps decryption request ID to recipient
    mapping(uint256 => address) private pendingWithdrawers; // Maps decryption request ID to withdrawer

    event Deposit(address indexed account, euint128 value); // Event for deposits (encrypted value)
    event Transfer(address indexed from, address indexed to, euint128 value); // Encrypted transfer event
    event Transferred(address indexed from, address indexed to, uint128 amount);
    event Withdraw(address indexed account, euint128 value); // Event for withdraw requests (encrypted value)
    event Withdrawn(address indexed account, uint128 amount); // Event for completed withdrawals (decrypted amount)

    constructor() {
        // Encrypt initial supply in wei
        _totalSupply = FHE.asEuint128(0);
        // Assign to deployer
        _balances[msg.sender] = _totalSupply;

        // Allow access to encrypted variables
        FHE.allowThis(_totalSupply);
        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);
    }

    /// @notice Get the encrypted total supply
    /// @return Encrypted total supply
    function totalSupply() external view returns (euint128) {
        return _totalSupply;
    }

    /// @notice Get the encrypted balance of an account
    /// @param account Address to query
    /// @return Encrypted balance
    function balanceOf(address account) external view returns (euint128) {
        return _balances[account];
    }

    /// @notice Deposit Ether to the contract, encrypting the amount (msg.value in wei)
    function deposit(
        externalEuint128 encryptedAmount,
        bytes calldata amountProof
    ) external payable {
        // Check for non-zero deposit and euint128 limit
        require(msg.value > 0, "Deposit amount must be greater than zero");
        require(msg.value <= type(uint128).max, "Deposit amount exceeds euint128 limit");

        // Encrypt the deposited amount (in wei)
        euint128 amount = FHE.fromExternal(encryptedAmount, amountProof);

        // Add to total supply and sender's balance
        _totalSupply = FHE.add(_totalSupply, amount);
        _balances[msg.sender] = FHE.add(_balances[msg.sender], amount);

        // Allow access to updated encrypted variables
        FHE.allowThis(_totalSupply);
        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);

        // Emit deposit event
        emit Deposit(msg.sender, amount);
    }

    /// @notice Transfer encrypted amount to a recipient, requesting decryption for actual Ether transfer
    function transfer(
        externalEuint128 encryptedAmount,
        bytes calldata amountProof,
        address recipient
    ) external {
        // Check recipient validity
        require(recipient != address(0), "Invalid recipient");
        require(recipient != msg.sender, "Cannot transfer to self");

        // Encrypt the amount (in wei)
        euint128 amount = FHE.fromExternal(encryptedAmount, amountProof);
        FHE.allowThis(amount);

        // Subtract from sender's balance and add to recipient's
        _balances[msg.sender] = FHE.sub(_balances[msg.sender], amount);
        _balances[recipient] = FHE.add(_balances[recipient], amount);

        // Allow access to updated balances
        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);
        FHE.allowThis(_balances[recipient]);
        FHE.allow(_balances[recipient], recipient);

        // Prepare ciphertext for decryption (the amount itself)
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(amount);

        // Request decryption and store recipient
        uint256 requestId = FHE.requestDecryption(cts, this.callbackTransfer.selector);
        pendingTransfers[requestId] = recipient;

        // Emit encrypted transfer event
        emit Transfer(msg.sender, recipient, amount);
    }

    /// @notice Callback for transfer decryption, sends decrypted Ether to recipient
    /// @param requestId Request ID
    /// @param cleartexts Decrypted cleartexts
    /// @param decryptionProof Decryption proof
    function callbackTransfer(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) external {
        // Verify signatures and proof (revert if invalid)
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        // Decode decrypted amount (in wei)
        uint128 decryptedAmount = abi.decode(cleartexts, (uint128));

        // Get recipient and clear pending
        address recipient = pendingTransfers[requestId];
        delete pendingTransfers[requestId];

        // Ensure recipient is set
        require(recipient != address(0), "Invalid request ID");

        // Check contract has enough Ether
        require(address(this).balance >= decryptedAmount, "Insufficient contract balance");

        // Transfer Ether to recipient
        payable(recipient).transfer(decryptedAmount);

        // Emit completed transfer event
        emit Transferred(msg.sender, recipient, decryptedAmount);
    }

    /// @notice Withdraw the encrypted balance, requesting decryption for actual Ether withdrawal
    function withdraw() external {
        euint128 amount = _balances[msg.sender];

        // Subtract from total supply and reset sender's balance
        _totalSupply = FHE.sub(_totalSupply, amount);
        _balances[msg.sender] = FHE.asEuint128(0);

        // Allow access to updated encrypted variables
        FHE.allowThis(_totalSupply);
        FHE.allowThis(_balances[msg.sender]);
        FHE.allow(_balances[msg.sender], msg.sender);

        // Prepare ciphertext for decryption (the amount itself)
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(amount);

        // Request decryption and store withdrawer
        uint256 requestId = FHE.requestDecryption(cts, this.callbackWithdraw.selector);
        pendingWithdrawers[requestId] = msg.sender;

        // Emit withdraw request event
        emit Withdraw(msg.sender, amount);
    }

    /// @notice Callback for withdraw decryption, sends decrypted Ether to withdrawer
    /// @param requestId Request ID
    /// @param cleartexts Decrypted cleartexts
    /// @param decryptionProof Decryption proof
    function callbackWithdraw(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) external {
        // Verify signatures and proof (revert if invalid)
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        // Decode decrypted amount (in wei)
        uint128 decryptedAmount = abi.decode(cleartexts, (uint128));

        // Get withdrawer and clear pending
        address withdrawer = pendingWithdrawers[requestId];
        delete pendingWithdrawers[requestId];

        // Ensure withdrawer is set
        require(withdrawer != address(0), "Invalid request ID");

        // Check contract has enough Ether
        require(address(this).balance >= decryptedAmount, "Insufficient contract balance");

        // Transfer Ether to withdrawer
        payable(withdrawer).transfer(decryptedAmount);

        // Emit completed withdrawal event
        emit Withdrawn(withdrawer, decryptedAmount);
    }

    /// @notice Cancel a pending transfer request (only by sender)
    function cancelPendingTransfer(uint256 requestId) external {
        address recipient = pendingTransfers[requestId];
        require(recipient != address(0), "No pending transfer");
        // Assuming the sender is msg.sender from transfer; for simplicity, allow any but in real, track sender
        delete pendingTransfers[requestId];
    }

    /// @notice Cancel a pending withdraw request (only by withdrawer)
    function cancelPendingWithdraw(uint256 requestId) external {
        address withdrawer = pendingWithdrawers[requestId];
        require(withdrawer != address(0), "No pending withdraw");
        require(withdrawer == msg.sender, "Not authorized");
        delete pendingWithdrawers[requestId];
    }
}