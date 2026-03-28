// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

enum AbilityType { FIRE, ICE, LIGHTNING, POISON, VOID }

struct CardStats {
    uint8  attack;
    uint8  health;
    uint8  speed;
    AbilityType abilityType;
    uint32 wins;
    uint32 losses;
    uint8  level;       // wins / 5, capped at 20
    uint256 mintedAt;
}

contract CreatureCard is ERC721, Ownable {
    using Strings for uint256;

    uint256 private _nextTokenId;
    mapping(uint256 => CardStats) private _stats;

    address public minterContract;
    address public battleEngineContract;
    string  private _baseTokenURI;

    uint8 public constant STAT_CAP = 200; // stats can grow beyond 100 through upgrades

    event CardMinted(address indexed to, uint256 indexed tokenId, CardStats stats);
    event StatUpgraded(uint256 indexed tokenId, uint8 attack, uint8 health, uint8 speed, uint8 level);
    event StatsUpdated(uint256 indexed tokenId, uint32 wins, uint32 losses);

    error OnlyMinter();
    error OnlyBattleEngine();
    error TokenDoesNotExist(uint256 tokenId);

    constructor(string memory baseURI) ERC721("CreatureCard", "CRTR") Ownable(msg.sender) {
        _baseTokenURI = baseURI;
    }

    function setMinterContract(address minter) external onlyOwner { minterContract = minter; }
    function setBattleEngineContract(address engine) external onlyOwner { battleEngineContract = engine; }

    function mintCard(
        address to, uint8 attack, uint8 health, uint8 speed, AbilityType abilityType
    ) external returns (uint256 tokenId) {
        if (msg.sender != minterContract) revert OnlyMinter();
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _stats[tokenId] = CardStats({
            attack: attack, health: health, speed: speed,
            abilityType: abilityType, wins: 0, losses: 0,
            level: 0, mintedAt: block.timestamp
        });
        emit CardMinted(to, tokenId, _stats[tokenId]);
    }

    /// @notice Record a win and upgrade stats. Called only by BattleEngine.
    function recordWin(uint256 tokenId) external {
        if (msg.sender != battleEngineContract) revert OnlyBattleEngine();
        if (!_tokenExists(tokenId)) revert TokenDoesNotExist(tokenId);

        CardStats storage s = _stats[tokenId];
        s.wins++;

        // Level = wins / 5, capped at 20
        uint8 newLevel = uint8(s.wins / 5 > 20 ? 20 : s.wins / 5);
        s.level = newLevel;

        // Upgrade boost grows with level: 2 + level/4
        uint8 boost = uint8(2 + newLevel / 4);

        // Pseudo-random pick which stats to upgrade (can hit multiple on higher levels)
        uint256 seed = uint256(keccak256(abi.encodePacked(tokenId, s.wins, block.prevrandao)));

        // Always boost the primary stat (roll % 3)
        uint8 primary = uint8(seed % 3);
        if (primary == 0 && s.attack < STAT_CAP) s.attack  = _add(s.attack,  boost, STAT_CAP);
        else if (primary == 1 && s.health < STAT_CAP) s.health = _add(s.health, boost, STAT_CAP);
        else if (s.speed < STAT_CAP)  s.speed  = _add(s.speed,  boost, STAT_CAP);

        // On level-up: bonus boost to secondary stat too
        if (s.wins % 5 == 0) {
            uint8 secondary = uint8((seed >> 8) % 3);
            if (secondary == 0 && s.attack < STAT_CAP) s.attack  = _add(s.attack,  boost + 1, STAT_CAP);
            else if (secondary == 1 && s.health < STAT_CAP) s.health = _add(s.health, boost + 1, STAT_CAP);
            else if (s.speed < STAT_CAP) s.speed = _add(s.speed, boost + 1, STAT_CAP);
        }

        emit StatUpgraded(tokenId, s.attack, s.health, s.speed, s.level);
        emit StatsUpdated(tokenId, s.wins, s.losses);
    }

    function recordLoss(uint256 tokenId) external {
        if (msg.sender != battleEngineContract) revert OnlyBattleEngine();
        if (!_tokenExists(tokenId)) revert TokenDoesNotExist(tokenId);
        _stats[tokenId].losses++;
        emit StatsUpdated(tokenId, _stats[tokenId].wins, _stats[tokenId].losses);
    }

    function getStats(uint256 tokenId) external view returns (CardStats memory) {
        if (!_tokenExists(tokenId)) revert TokenDoesNotExist(tokenId);
        return _stats[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (!_tokenExists(tokenId)) revert TokenDoesNotExist(tokenId);
        return string(abi.encodePacked(_baseTokenURI, tokenId.toString(), ".json"));
    }

    function totalSupply() external view returns (uint256) { return _nextTokenId; }

    function _tokenExists(uint256 id) internal view returns (bool) { return id < _nextTokenId; }
    function _add(uint8 a, uint8 b, uint8 cap) internal pure returns (uint8) {
        return uint16(a) + b > cap ? cap : a + b;
    }
}
