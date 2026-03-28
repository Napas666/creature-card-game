// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/CreatureCard.sol";
import "../src/CardMinter.sol";
import "../src/BattleEngine.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        CreatureCard card   = new CreatureCard("ipfs://creatures/");
        CardMinter   minter = new CardMinter(address(card));
        BattleEngine engine = new BattleEngine(address(card));

        card.setMinterContract(address(minter));
        card.setBattleEngineContract(address(engine));

        vm.stopBroadcast();

        console.log("CreatureCard:", address(card));
        console.log("CardMinter:  ", address(minter));
        console.log("BattleEngine:", address(engine));
    }
}
