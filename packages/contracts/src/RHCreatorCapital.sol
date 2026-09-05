// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {EIP712} from "openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";

contract RHCreatorCapital is ReentrancyGuard, Ownable, EIP712 {
    using ECDSA for bytes32;

    struct CreatorMarket {
        bytes32 marketId;
        string xUserId;
        address creatorWallet;
        bool claimed;
        bool listed;
        uint256 supply;
        uint256 reserve;
        uint256 totalVolume;
        uint256 lifetimeCreatorRewards;
        uint64 createdAt;
    }

    // Constants for fee calculation (basis points)
    uint256 public constant TOTAL_FEE_BPS = 125; // 1.25%
    uint256 public constant CREATOR_FEE_SHARE_BPS = 9500; // 95% of 1.25%
    uint256 public constant PROTOCOL_FEE_SHARE_BPS = 500; // 5% of 1.25%

    // State Variables
    address public backendSigner;
    uint256 public protocolFeeBalance;
    
    // Mappings
    mapping(bytes32 => CreatorMarket) public markets;
    mapping(bytes32 => mapping(address => uint256)) public keyBalances;
    mapping(bytes32 => uint256) public creatorRewards;
    mapping(address => uint256) public nonces;

    // TypeHash for EIP-712
    bytes32 public constant CLAIM_TYPEHASH = keccak256(
        "ClaimCreator(bytes32 marketId,string xUserId,address creatorWallet,uint256 nonce,uint256 deadline)"
    );

    // Events
    event CreatorMarketCreated(bytes32 indexed marketId, string xUserId, uint256 timestamp);
    event CreatorClaimed(bytes32 indexed marketId, address indexed creatorWallet);
    event KeysBought(bytes32 indexed marketId, address indexed buyer, uint256 keyAmount, uint256 ethAmount, uint256 creatorFee, uint256 protocolFee, uint256 newSupply);
    event KeysSold(bytes32 indexed marketId, address indexed seller, uint256 keyAmount, uint256 ethReceived, uint256 creatorFee, uint256 protocolFee, uint256 newSupply);
    event CreatorRewardsClaimed(bytes32 indexed marketId, address indexed creator, uint256 amount);
    event ProtocolRevenueCollected(bytes32 indexed marketId, uint256 amount);

    error MarketAlreadyExists();
    error MarketDoesNotExist();
    error MarketAlreadyClaimed();
    error InvalidSignature();
    error SignatureExpired();
    error InsufficientPayment();
    error InsufficientKeys();
    error SlippageExceeded();
    error Unauthorized();
    error NoRewards();
    error TransferFailed();

    constructor(address _backendSigner) Ownable(msg.sender) EIP712("RH Creator Capital", "1") {
        backendSigner = _backendSigner;
    }

    function setBackendSigner(address _signer) external onlyOwner {
        backendSigner = _signer;
    }

    function createMarket(string calldata xUserId) external returns (bytes32) {
        bytes32 marketId = keccak256(abi.encodePacked("X", xUserId));
        if (markets[marketId].createdAt != 0) revert MarketAlreadyExists();

        markets[marketId] = CreatorMarket({
            marketId: marketId,
            xUserId: xUserId,
            creatorWallet: address(0),
            claimed: false,
            listed: true,
            supply: 0,
            reserve: 0,
            totalVolume: 0,
            lifetimeCreatorRewards: 0,
            createdAt: uint64(block.timestamp)
        });

        emit CreatorMarketCreated(marketId, xUserId, block.timestamp);
        return marketId;
    }

    function getPrice(uint256 supply, uint256 amount) public pure returns (uint256) {
        // Bonding Curve: price = supply^2 / 16000 (standard friend.tech curve in ETH)
        // sum1 = (supply - 1) * supply * (2 * supply - 1) / 6
        // sum2 = (supply - 1 + amount) * (supply + amount) * (2 * (supply + amount) - 1) / 6
        // price = (sum2 - sum1) * 1 ether / 16000
        uint256 sum1 = supply == 0 ? 0 : (supply - 1) * supply * (2 * supply - 1) / 6;
        uint256 sum2 = supply == 0 && amount == 1 ? 0 : (supply - 1 + amount) * (supply + amount) * (2 * (supply + amount) - 1) / 6;
        uint256 summation = sum2 - sum1;
        return (summation * 1 ether) / 16000;
    }

    function getBuyPrice(bytes32 marketId, uint256 amount) public view returns (uint256) {
        return getPrice(markets[marketId].supply, amount);
    }

    function getSellPrice(bytes32 marketId, uint256 amount) public view returns (uint256) {
        return getPrice(markets[marketId].supply - amount, amount);
    }

    function getBuyPriceAfterFee(bytes32 marketId, uint256 amount) public view returns (uint256 price, uint256 fee) {
        price = getBuyPrice(marketId, amount);
        fee = (price * TOTAL_FEE_BPS) / 10000;
    }

    function getSellPriceAfterFee(bytes32 marketId, uint256 amount) public view returns (uint256 price, uint256 fee) {
        price = getSellPrice(marketId, amount);
        fee = (price * TOTAL_FEE_BPS) / 10000;
    }

    function buyKeys(bytes32 marketId, uint256 amount, uint256 maxEthIn) external payable nonReentrant {
        CreatorMarket storage market = markets[marketId];
        if (market.createdAt == 0) revert MarketDoesNotExist();

        (uint256 price, uint256 fee) = getBuyPriceAfterFee(marketId, amount);
        uint256 totalCost = price + fee;

        if (msg.value < totalCost) revert InsufficientPayment();
        if (totalCost > maxEthIn) revert SlippageExceeded();

        uint256 creatorFee = (fee * CREATOR_FEE_SHARE_BPS) / 10000;
        uint256 protocolFee = fee - creatorFee;

        keyBalances[marketId][msg.sender] += amount;
        market.supply += amount;
        market.reserve += price;
        market.totalVolume += totalCost;
        market.lifetimeCreatorRewards += creatorFee;

        creatorRewards[marketId] += creatorFee;
        protocolFeeBalance += protocolFee;

        emit KeysBought(marketId, msg.sender, amount, price, creatorFee, protocolFee, market.supply);

        if (msg.value > totalCost) {
            (bool success, ) = msg.sender.call{value: msg.value - totalCost}("");
            if (!success) revert TransferFailed();
        }
    }

    function sellKeys(bytes32 marketId, uint256 amount, uint256 minEthOut) external nonReentrant {
        CreatorMarket storage market = markets[marketId];
        if (market.createdAt == 0) revert MarketDoesNotExist();
        if (keyBalances[marketId][msg.sender] < amount) revert InsufficientKeys();

        (uint256 price, uint256 fee) = getSellPriceAfterFee(marketId, amount);
        uint256 netPayout = price - fee;

        if (netPayout < minEthOut) revert SlippageExceeded();

        uint256 creatorFee = (fee * CREATOR_FEE_SHARE_BPS) / 10000;
        uint256 protocolFee = fee - creatorFee;

        keyBalances[marketId][msg.sender] -= amount;
        market.supply -= amount;
        market.reserve -= price;
        market.totalVolume += price;
        market.lifetimeCreatorRewards += creatorFee;

        creatorRewards[marketId] += creatorFee;
        protocolFeeBalance += protocolFee;

        emit KeysSold(marketId, msg.sender, amount, netPayout, creatorFee, protocolFee, market.supply);

        (bool success, ) = msg.sender.call{value: netPayout}("");
        if (!success) revert TransferFailed();
    }

    function claimMarket(bytes32 marketId, string calldata xUserId, uint256 deadline, bytes calldata signature) external {
        CreatorMarket storage market = markets[marketId];
        if (market.createdAt == 0) revert MarketDoesNotExist();
        if (market.claimed) revert MarketAlreadyClaimed();
        if (block.timestamp > deadline) revert SignatureExpired();

        bytes32 structHash = keccak256(
            abi.encode(
                CLAIM_TYPEHASH,
                marketId,
                keccak256(bytes(xUserId)),
                msg.sender,
                nonces[msg.sender]++,
                deadline
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);
        if (signer != backendSigner) revert InvalidSignature();

        market.claimed = true;
        market.creatorWallet = msg.sender;

        emit CreatorClaimed(marketId, msg.sender);
    }

    function claimCreatorRewards(bytes32 marketId) external nonReentrant {
        CreatorMarket storage market = markets[marketId];
        if (!market.claimed || market.creatorWallet != msg.sender) revert Unauthorized();

        uint256 amount = creatorRewards[marketId];
        if (amount == 0) revert NoRewards();

        creatorRewards[marketId] = 0;

        emit CreatorRewardsClaimed(marketId, msg.sender, amount);

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    function withdrawProtocolFees(address payable to) external onlyOwner nonReentrant {
        uint256 amount = protocolFeeBalance;
        if (amount == 0) revert NoRewards();

        protocolFeeBalance = 0;
        
        (bool success, ) = to.call{value: amount}("");
        if (!success) revert TransferFailed();
    }
}
