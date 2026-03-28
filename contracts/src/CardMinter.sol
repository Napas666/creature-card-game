// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CreatureCard.sol";

/// @notice Pack rarities with different stat ranges and prices
enum PackRarity { COMMON, RARE, LEGENDARY, ELEMENTAL }

struct PackConfig {
    uint256 price;      // per pack (not per card)
    uint8   count;      // cards per pack
    uint8   statMin;    // minimum stat value (1–200)
    uint8   statMax;    // maximum stat value
    bool    fixedAbility; // if true, all cards share forcedAbility
    AbilityType forcedAbility;
    string  name;
}

contract CardMinter is Ownable {
    CreatureCard public immutable cardContract;

    // Pack configs indexed by PackRarity
    mapping(PackRarity => PackConfig) public packs;

    event PackOpened(address indexed buyer, PackRarity rarity, uint256[] tokenIds);
    error InsufficientPayment(uint256 sent, uint256 required);
    error InvalidPackRarity();

    constructor(address cardAddress) Ownable(msg.sender) {
        cardContract = CreatureCard(cardAddress);

        // COMMON: cheap, 3 cards, wide stat range 10–65
        packs[PackRarity.COMMON] = PackConfig({
            price: 0.01 ether, count: 3,
            statMin: 10, statMax: 65,
            fixedAbility: false, forcedAbility: AbilityType.FIRE,
            name: "Common Pack"
        });

        // RARE: medium, 3 cards, stats 40–85
        packs[PackRarity.RARE] = PackConfig({
            price: 0.03 ether, count: 3,
            statMin: 40, statMax: 85,
            fixedAbility: false, forcedAbility: AbilityType.FIRE,
            name: "Rare Pack"
        });

        // LEGENDARY: expensive, 2 cards, stats 75–100
        packs[PackRarity.LEGENDARY] = PackConfig({
            price: 0.08 ether, count: 2,
            statMin: 75, statMax: 100,
            fixedAbility: false, forcedAbility: AbilityType.FIRE,
            name: "Legendary Pack"
        });

        // ELEMENTAL: medium, 4 cards, stats 25–75, ability set by buyer
        packs[PackRarity.ELEMENTAL] = PackConfig({
            price: 0.02 ether, count: 4,
            statMin: 25, statMax: 75,
            fixedAbility: true, forcedAbility: AbilityType.FIRE, // overridden at call time
            name: "Elemental Pack"
        });
    }

    /// @notice Open any standard pack (COMMON / RARE / LEGENDARY)
    function openPack(PackRarity rarity) external payable returns (uint256[] memory tokenIds) {
        if (rarity == PackRarity.ELEMENTAL) revert InvalidPackRarity(); // use openElementalPack
        PackConfig storage cfg = packs[rarity];
        if (msg.value < cfg.price) revert InsufficientPayment(msg.value, cfg.price);

        tokenIds = _mintPack(msg.sender, cfg, AbilityType.FIRE /*unused*/, false);
        _refund(cfg.price);
        emit PackOpened(msg.sender, rarity, tokenIds);
    }

    /// @notice Open an elemental pack — caller picks the ability type
    function openElementalPack(AbilityType ability) external payable returns (uint256[] memory tokenIds) {
        PackConfig storage cfg = packs[PackRarity.ELEMENTAL];
        if (msg.value < cfg.price) revert InsufficientPayment(msg.value, cfg.price);

        tokenIds = _mintPack(msg.sender, cfg, ability, true);
        _refund(cfg.price);
        emit PackOpened(msg.sender, PackRarity.ELEMENTAL, tokenIds);
    }

    /// @notice Owner gift mint
    function mintGift(address to, uint8 attack, uint8 health, uint8 speed, AbilityType abilityType)
        external onlyOwner returns (uint256)
    { return cardContract.mintCard(to, attack, health, speed, abilityType); }

    function updatePackPrice(PackRarity rarity, uint256 newPrice) external onlyOwner {
        packs[rarity].price = newPrice;
    }

    function withdraw() external onlyOwner { payable(owner()).transfer(address(this).balance); }

    /* ─── Internal ──────────────────────────────────────────────────── */
    function _mintPack(
        address to,
        PackConfig storage cfg,
        AbilityType forcedAbility,
        bool useForced
    ) internal returns (uint256[] memory ids) {
        ids = new uint256[](cfg.count);
        uint8 range = cfg.statMax - cfg.statMin;

        for (uint256 i = 0; i < cfg.count; i++) {
            uint256 seed = uint256(keccak256(abi.encodePacked(
                block.prevrandao, block.timestamp, to, i, cfg.statMin
            )));
            uint8 atk   = cfg.statMin + uint8(seed         % (range + 1));
            uint8 hp    = cfg.statMin + uint8((seed >> 8)  % (range + 1));
            uint8 spd   = cfg.statMin + uint8((seed >> 16) % (range + 1));
            AbilityType ab = useForced ? forcedAbility : AbilityType((seed >> 24) % 5);
            ids[i] = cardContract.mintCard(to, atk, hp, spd, ab);
        }
    }

    function _refund(uint256 price) internal {
        uint256 excess = msg.value - price;
        if (excess > 0) payable(msg.sender).transfer(excess);
    }
}
