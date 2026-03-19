// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CreatureCard.sol";

contract CardMinter is Ownable {
    CreatureCard public immutable cardContract;

    uint256 public mintPrice = 0.01 ether;
    uint256 public packSize  = 3;

    event PackOpened(address indexed buyer, uint256[] tokenIds);
    event MintPriceUpdated(uint256 newPrice);

    error InsufficientPayment(uint256 sent, uint256 required);

    constructor(address cardAddress) Ownable(msg.sender) {
        cardContract = CreatureCard(cardAddress);
    }

    /// @notice Buy a pack of `packSize` cards.
    /// @dev Randomness uses block data — acceptable for gaming, not for lotteries.
    function openPack() external payable returns (uint256[] memory tokenIds) {
        uint256 totalCost = mintPrice * packSize;
        if (msg.value < totalCost) revert InsufficientPayment(msg.value, totalCost);

        tokenIds = new uint256[](packSize);
        for (uint256 i = 0; i < packSize; i++) {
            uint256 seed = uint256(keccak256(abi.encodePacked(
                block.prevrandao, block.timestamp, msg.sender, i
            )));
            tokenIds[i] = _mintFromSeed(msg.sender, seed);
        }

        // Refund excess
        uint256 excess = msg.value - totalCost;
        if (excess > 0) payable(msg.sender).transfer(excess);

        emit PackOpened(msg.sender, tokenIds);
    }

    /// @notice Owner can gift cards for airdrops / promotions.
    function mintGift(
        address to,
        uint8 attack,
        uint8 health,
        uint8 speed,
        AbilityType abilityType
    ) external onlyOwner returns (uint256) {
        return cardContract.mintCard(to, attack, health, speed, abilityType);
    }

    function setMintPrice(uint256 newPrice) external onlyOwner {
        mintPrice = newPrice;
        emit MintPriceUpdated(newPrice);
    }

    function setPackSize(uint256 newSize) external onlyOwner {
        require(newSize > 0, "packSize must be > 0");
        packSize = newSize;
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function _mintFromSeed(address to, uint256 seed) internal returns (uint256) {
        uint8 attack      = uint8((seed         % 91) + 10); // 10–100
        uint8 health      = uint8(((seed >> 8)   % 91) + 10);
        uint8 speed       = uint8(((seed >> 16)  % 91) + 10);
        AbilityType atype = AbilityType((seed >> 24) % 5);
        return cardContract.mintCard(to, attack, health, speed, atype);
    }
}
