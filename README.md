# Creature Card Game

A blockchain collectible card game with procedural 3D creature generation.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Solidity 0.8.24 + Foundry |
| NFT Standard | ERC-721 (OpenZeppelin v5) |
| Frontend | React + Vite |
| 3D Rendering | Three.js |
| Web3 | ethers.js v6 |

## Live Demo

Deployed on Sepolia testnet — open [http://5.42.125.8:8081](http://5.42.125.8:8081) with MetaMask (Sepolia network).

## Smart Contracts (Sepolia)

| Contract | Address |
|----------|---------|
| CreatureCard (ERC-721) | `0xc8aC48801FfBB890F616feB1B219BB2B51C472C6` |
| CardMinter | `0x68069F9FC8Ae45164F497C09F28e4EEDb2D69c7D` |
| BattleEngine | `0x698EEED4030BDEBA48588fFB471D7e608C2e5E4a` |

## Contract Architecture

```
CreatureCard.sol   — ERC-721. Stores card stats (ATK/HP/SPD/AbilityType), W/L records, level system.
CardMinter.sol     — Sells packs (4 rarity tiers). Generates random stats on-chain.
BattleEngine.sol   — Single-transaction battle: battle(myToken, opponentToken).
lib/StatsLib.sol   — Pure library: turn-based battle simulation with RNG variance.
```

## Pack Types

| Pack | Price | Cards | Stat Range |
|------|-------|-------|------------|
| 📦 Common | 0.01 ETH | 3 | 10–65 |
| 💎 Rare | 0.03 ETH | 3 | 40–85 |
| 👑 Legendary | 0.08 ETH | 2 | 75–100 |
| ✨ Elemental | 0.02 ETH | 4 | 25–75 (choose ability type) |

## Procedural Creature Generation (Three.js)

Each card stat drives a visual trait of the 3D creature:

| Stat (1–200) | Visual Effect |
|-------------|---------------|
| **Attack** | Claw count and size (1–3), jaw scale |
| **Health** | Body mass (sphere radii rx/ry/rz) |
| **Speed** | Wing span (0.2–1.6 units) |
| **AbilityType** | Color scheme + unique organ: FIRE=spine ridge, ICE=crystal cluster, LIGHTNING=helical horns, POISON=stinger tail, VOID=orbiting rings |

Winning battles permanently upgrades a random stat. Every 5 wins = level up with a bonus boost.

## Quick Start

### 1. Contracts (local)

```bash
cd contracts

# Start local blockchain
anvil

# In another terminal — deploy
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# Copy addresses to frontend/src/utils/contractConfig.js
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, connect MetaMask to Anvil network (chainId 31337).

### 3. Contract Tests

```bash
cd contracts
forge test -vv
```

## Deploy to Testnet (Sepolia)

```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

## Project Structure

```
creature-card-game/
├── contracts/
│   ├── src/
│   │   ├── CreatureCard.sol
│   │   ├── CardMinter.sol
│   │   ├── BattleEngine.sol
│   │   └── lib/StatsLib.sol
│   ├── script/
│   │   ├── Deploy.s.sol
│   │   └── DeployBattleEngine.s.sol
│   └── test/CreatureCard.t.sol
└── frontend/
    └── src/
        ├── three/
        │   ├── CreatureBuilder.js    ← procedural 3D generation
        │   ├── BattleScene.js        ← Three.js arena scene
        │   └── ParticleSystem.js     ← ability particle effects
        ├── hooks/
        │   ├── useWallet.js
        │   ├── useCards.js
        │   └── useBattle.js
        └── components/
            ├── BattleArena.jsx
            ├── CardCollection.jsx
            ├── PackOpeningScene.jsx  ← 3D chest opening animation
            └── WalletConnect.jsx
```
