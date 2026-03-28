// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CreatureCard.sol";
import "./lib/StatsLib.sol";

struct Battle {
    uint256 challengerTokenId;
    uint256 opponentTokenId;
    address challenger;
    uint256 winner;
    uint256 loser;
    uint256 timestamp;
    uint8   rounds;
}

contract BattleEngine is Ownable {
    CreatureCard public immutable cardContract;

    mapping(uint256 => Battle) public battles;
    uint256 private _nextBattleId;

    event BattleResolved(uint256 indexed battleId, uint256 winnerToken, uint256 loserToken, uint8 rounds);

    error NotCardOwner(uint256 tokenId);

    constructor(address cardAddress) Ownable(msg.sender) {
        cardContract = CreatureCard(cardAddress);
    }

    /// @notice Single-transaction battle: caller's card vs any opponent card.
    ///         Caller must own myTokenId. opponentTokenId can be any existing card.
    function battle(uint256 myTokenId, uint256 opponentTokenId)
        external
        returns (uint256 battleId)
    {
        if (cardContract.ownerOf(myTokenId) != msg.sender) revert NotCardOwner(myTokenId);

        CardStats memory cStats = cardContract.getStats(myTokenId);
        CardStats memory oStats = cardContract.getStats(opponentTokenId);

        battleId = ++_nextBattleId;

        uint256 seed = uint256(keccak256(abi.encodePacked(block.prevrandao, battleId, msg.sender)));

        (uint256 winToken, uint256 loseToken, uint8 rounds) =
            StatsLib.resolveBattle(myTokenId, cStats, opponentTokenId, oStats, seed);

        battles[battleId] = Battle({
            challengerTokenId: myTokenId,
            opponentTokenId:   opponentTokenId,
            challenger:        msg.sender,
            winner:            winToken,
            loser:             loseToken,
            timestamp:         block.timestamp,
            rounds:            rounds
        });

        cardContract.recordWin(winToken);
        cardContract.recordLoss(loseToken);

        emit BattleResolved(battleId, winToken, loseToken, rounds);
    }

    function getBattle(uint256 battleId) external view returns (Battle memory) {
        return battles[battleId];
    }

    function totalBattles() external view returns (uint256) {
        return _nextBattleId;
    }
}
