// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/BattleEngine.sol";
import "../src/CreatureCard.sol";

contract DeployBattleEngine is Script {
    address constant CREATURE_CARD = 0xc8aC48801FfBB890F616feB1B219BB2B51C472C6;

    function run() external {
        vm.startBroadcast();

        BattleEngine engine = new BattleEngine(CREATURE_CARD);
        CreatureCard(CREATURE_CARD).setBattleEngineContract(address(engine));

        vm.stopBroadcast();

        console.log("New BattleEngine:", address(engine));
    }
}
