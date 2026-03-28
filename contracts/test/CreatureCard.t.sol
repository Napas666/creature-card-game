// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/CreatureCard.sol";
import "../src/CardMinter.sol";
import "../src/BattleEngine.sol";

contract CreatureCardTest is Test {
    CreatureCard card;
    CardMinter   minter;
    BattleEngine engine;

    address alice = address(0xA11CE);
    address bob   = address(0xB0B);

    function setUp() public {
        card   = new CreatureCard("ipfs://test/");
        minter = new CardMinter(address(card));
        engine = new BattleEngine(address(card));

        card.setMinterContract(address(minter));
        card.setBattleEngineContract(address(engine));
    }

    function test_openPack() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256[] memory ids = minter.openPack{value: 0.03 ether}(PackRarity.COMMON);

        assertEq(ids.length, 3);
        assertEq(card.ownerOf(ids[0]), alice);
        assertEq(card.ownerOf(ids[1]), alice);
        assertEq(card.ownerOf(ids[2]), alice);
        assertEq(card.totalSupply(), 3);
    }

    function test_statsInRange() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256[] memory ids = minter.openPack{value: 0.03 ether}(PackRarity.COMMON);

        for (uint256 i = 0; i < ids.length; i++) {
            CardStats memory s = card.getStats(ids[i]);
            assertTrue(s.attack  >= 10 && s.attack  <= 100);
            assertTrue(s.health  >= 10 && s.health  <= 100);
            assertTrue(s.speed   >= 10 && s.speed   <= 100);
        }
    }

    function test_battle_full_flow() public {
        // Mint cards for both players
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);

        vm.prank(alice);
        uint256[] memory aCards = minter.openPack{value: 0.03 ether}(PackRarity.COMMON);

        vm.prank(bob);
        uint256[] memory bCards = minter.openPack{value: 0.03 ether}(PackRarity.COMMON);

        uint256 aCard = aCards[0];
        uint256 bCard = bCards[0];

        // Alice battles Bob's card in one tx
        vm.prank(alice);
        uint256 battleId = engine.battle(aCard, bCard);

        Battle memory b = engine.getBattle(battleId);
        assertTrue(b.timestamp != 0, "battle should exist");
        assertTrue(b.winner == aCard || b.winner == bCard, "winner should be one of the two cards");

        // Check win/loss records
        CardStats memory winnerStats = card.getStats(b.winner);
        CardStats memory loserStats  = card.getStats(b.loser);
        assertEq(winnerStats.wins,   1);
        assertEq(winnerStats.losses, 0);
        assertEq(loserStats.wins,    0);
        assertEq(loserStats.losses,  1);
    }

    function test_cannotMintWithoutMinterRole() public {
        vm.expectRevert(abi.encodeWithSelector(CreatureCard.OnlyMinter.selector));
        card.mintCard(alice, 50, 50, 50, AbilityType.FIRE);
    }

    function test_refundExcessPayment() public {
        vm.deal(alice, 1 ether);
        uint256 before = alice.balance;

        vm.prank(alice);
        minter.openPack{value: 0.1 ether}(PackRarity.COMMON);

        // Should only charge 0.03 ether (3 cards × 0.01)
        assertEq(alice.balance, before - 0.03 ether);
    }

    function test_giftMint() public {
        card.setBattleEngineContract(address(engine)); // already set, just confirming owner
        minter.mintGift(alice, 99, 99, 99, AbilityType.VOID);
        assertEq(card.ownerOf(0), alice);
        CardStats memory s = card.getStats(0);
        assertEq(s.attack, 99);
    }
}
