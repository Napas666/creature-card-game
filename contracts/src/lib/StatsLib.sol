// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../CreatureCard.sol";

library StatsLib {
    /// @notice Turn-based simulation. Returns (winnerToken, loserToken, rounds).
    ///         Pure — no state access.
    function resolveBattle(
        uint256 aToken, CardStats memory a,
        uint256 bToken, CardStats memory b,
        uint256 seed
    ) internal pure returns (uint256 winner, uint256 loser, uint8 rounds) {
        int256 aHP = int256(uint256(a.health) * 10);
        int256 bHP = int256(uint256(b.health) * 10);

        // Speed determines first strike
        bool aTurn = a.speed >= b.speed;
        rounds = 0;

        while (aHP > 0 && bHP > 0 && rounds < 50) {
            uint256 rng = uint256(keccak256(abi.encodePacked(seed, rounds)));
            uint256 variance = rng % 40; // 0–39 → multiplier 80–119%

            if (aTurn) {
                int256 dmg = int256((uint256(a.attack) * (80 + variance)) / 100);
                // Same ability type bonus: +15%
                if (a.abilityType == b.abilityType) dmg = (dmg * 115) / 100;
                bHP -= dmg;
            } else {
                int256 dmg = int256((uint256(b.attack) * (80 + variance)) / 100);
                if (b.abilityType == a.abilityType) dmg = (dmg * 115) / 100;
                aHP -= dmg;
            }
            aTurn = !aTurn;
            rounds++;
        }

        if (aHP > bHP) {
            winner = aToken;
            loser  = bToken;
        } else {
            winner = bToken;
            loser  = aToken;
        }
    }
}
