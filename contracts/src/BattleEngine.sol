// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CreatureCard.sol";
import "./lib/StatsLib.sol";

struct Battle {
    uint256 challengerTokenId;
    uint256 opponentTokenId;
    address challenger;
    address opponent;
    uint256 winner;     // tokenId of winner; 0 = not yet resolved
    uint256 loser;
    uint256 timestamp;
    uint8   rounds;
}

contract BattleEngine is Ownable {
    CreatureCard public immutable cardContract;

    mapping(uint256 => Battle) public battles;
    uint256 private _nextBattleId;

    // Tracks which battles a card is currently committed to
    mapping(uint256 => uint256) public pendingChallenge; // tokenId => battleId

    event BattleCreated(uint256 indexed battleId, uint256 challengerToken, uint256 opponentToken);
    event BattleResolved(uint256 indexed battleId, uint256 winnerToken, uint256 loserToken, uint8 rounds);

    error NotCardOwner(uint256 tokenId);
    error CardAlreadyInBattle(uint256 tokenId);
    error BattleAlreadyResolved(uint256 battleId);
    error WrongOpponentCard(uint256 expected, uint256 got);
    error BattleDoesNotExist(uint256 battleId);

    constructor(address cardAddress) Ownable(msg.sender) {
        cardContract = CreatureCard(cardAddress);
    }

    /// @notice Create a challenge against another card.
    function challenge(uint256 myTokenId, uint256 opponentTokenId) external returns (uint256 battleId) {
        if (cardContract.ownerOf(myTokenId) != msg.sender) revert NotCardOwner(myTokenId);
        if (pendingChallenge[myTokenId] != 0)              revert CardAlreadyInBattle(myTokenId);

        battleId = ++_nextBattleId; // start from 1 so 0 means "none"
        battles[battleId] = Battle({
            challengerTokenId: myTokenId,
            opponentTokenId:   opponentTokenId,
            challenger:        msg.sender,
            opponent:          cardContract.ownerOf(opponentTokenId),
            winner:            0,
            loser:             0,
            timestamp:         block.timestamp,
            rounds:            0
        });

        pendingChallenge[myTokenId] = battleId;
        emit BattleCreated(battleId, myTokenId, opponentTokenId);
    }

    /// @notice Opponent accepts, battle resolves deterministically on-chain.
    function acceptAndResolve(uint256 battleId, uint256 myTokenId) external {
        Battle storage b = battles[battleId];
        if (b.timestamp == 0)            revert BattleDoesNotExist(battleId);
        if (b.winner != 0)               revert BattleAlreadyResolved(battleId);
        if (cardContract.ownerOf(myTokenId) != msg.sender) revert NotCardOwner(myTokenId);
        if (b.opponentTokenId != myTokenId)                revert WrongOpponentCard(b.opponentTokenId, myTokenId);

        CardStats memory cStats = cardContract.getStats(b.challengerTokenId);
        CardStats memory oStats = cardContract.getStats(b.opponentTokenId);

        uint256 seed = uint256(keccak256(abi.encodePacked(block.prevrandao, battleId)));

        (uint256 winToken, uint256 loseToken, uint8 rounds) =
            StatsLib.resolveBattle(
                b.challengerTokenId, cStats,
                b.opponentTokenId,   oStats,
                seed
            );

        b.winner = winToken;
        b.loser  = loseToken;
        b.rounds = rounds;

        cardContract.recordWin(winToken);
        cardContract.recordLoss(loseToken);

        delete pendingChallenge[b.challengerTokenId];

        emit BattleResolved(battleId, winToken, loseToken, rounds);
    }

    function getBattle(uint256 battleId) external view returns (Battle memory) {
        return battles[battleId];
    }

    function totalBattles() external view returns (uint256) {
        return _nextBattleId;
    }
}
