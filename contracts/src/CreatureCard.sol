// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @notice Ability types — drive visual generation on the frontend
enum AbilityType { FIRE, ICE, LIGHTNING, POISON, VOID }

struct CardStats {
    uint8 attack;        // 1–100: drives claw/horn size
    uint8 health;        // 1–100: drives body mass
    uint8 speed;         // 1–100: drives wing/fin size
    AbilityType abilityType; // drives color scheme + unique appendage
    uint32 wins;
    uint32 losses;
    uint256 mintedAt;
}

contract CreatureCard is ERC721, Ownable {
    using Strings for uint256;

    uint256 private _nextTokenId;
    mapping(uint256 => CardStats) private _stats;

    address public minterContract;
    address public battleEngineContract;
    string  private _baseTokenURI;

    event CardMinted(address indexed to, uint256 indexed tokenId, CardStats stats);
    event StatsUpdated(uint256 indexed tokenId, uint32 wins, uint32 losses);

    error OnlyMinter();
    error OnlyBattleEngine();
    error TokenDoesNotExist(uint256 tokenId);

    constructor(string memory baseURI) ERC721("CreatureCard", "CRTR") Ownable(msg.sender) {
        _baseTokenURI = baseURI;
    }

    // --- Admin ---
    function setMinterContract(address minter) external onlyOwner {
        minterContract = minter;
    }

    function setBattleEngineContract(address engine) external onlyOwner {
        battleEngineContract = engine;
    }

    // --- Minting (called only by CardMinter) ---
    function mintCard(
        address to,
        uint8 attack,
        uint8 health,
        uint8 speed,
        AbilityType abilityType
    ) external returns (uint256 tokenId) {
        if (msg.sender != minterContract) revert OnlyMinter();

        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        _stats[tokenId] = CardStats({
            attack:      attack,
            health:      health,
            speed:       speed,
            abilityType: abilityType,
            wins:        0,
            losses:      0,
            mintedAt:    block.timestamp
        });

        emit CardMinted(to, tokenId, _stats[tokenId]);
    }

    // --- Battle result recording (called only by BattleEngine) ---
    function recordWin(uint256 tokenId) external {
        if (msg.sender != battleEngineContract) revert OnlyBattleEngine();
        if (!_tokenExists(tokenId)) revert TokenDoesNotExist(tokenId);
        _stats[tokenId].wins++;
        emit StatsUpdated(tokenId, _stats[tokenId].wins, _stats[tokenId].losses);
    }

    function recordLoss(uint256 tokenId) external {
        if (msg.sender != battleEngineContract) revert OnlyBattleEngine();
        if (!_tokenExists(tokenId)) revert TokenDoesNotExist(tokenId);
        _stats[tokenId].losses++;
        emit StatsUpdated(tokenId, _stats[tokenId].wins, _stats[tokenId].losses);
    }

    // --- Reads ---
    function getStats(uint256 tokenId) external view returns (CardStats memory) {
        if (!_tokenExists(tokenId)) revert TokenDoesNotExist(tokenId);
        return _stats[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (!_tokenExists(tokenId)) revert TokenDoesNotExist(tokenId);
        return string(abi.encodePacked(_baseTokenURI, tokenId.toString(), ".json"));
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    function _tokenExists(uint256 tokenId) internal view returns (bool) {
        return tokenId < _nextTokenId;
    }
}
