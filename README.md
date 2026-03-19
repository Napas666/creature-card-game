# Creature Card Game

Коллекционная карточная игра с бэкендом на блокчейне и 3D процедурной генерацией существ.

## Стек

| Слой | Технология |
|------|-----------|
| Блокчейн | Solidity 0.8.24 + Foundry |
| NFT стандарт | ERC-721 (OpenZeppelin v5) |
| Фронтенд | React + Vite |
| 3D рендер | Three.js |
| Web3 | ethers.js v6 |

## Архитектура контрактов

```
CreatureCard.sol   — ERC-721. Хранит статы карты (ATK/HP/SPD/AbilityType), W/L рекорды.
CardMinter.sol     — Продаёт паки по 3 карты (0.03 ETH). Генерирует случайные статы.
BattleEngine.sol   — Управляет матчами. Детерминированный расчёт через StatsLib.
lib/StatsLib.sol   — Чистая библиотека: пошаговая симуляция боя.
```

## Процедурная генерация существ (Three.js)

Каждый стат карты → визуальная характеристика существа:

| Стат (1–100) | Что меняется |
|-------------|-------------|
| **Attack** | Длина и количество когтей (1–3 шт), размер морды |
| **Health** | Масса тела (rx, ry, rz сферы) |
| **Speed** | Размах крыльев (0.2–1.6 единицы) |
| **AbilityType** | Цветовая схема + уникальный орган: FIRE=гребень, ICE=кристаллы, LIGHTNING=рог-тор, POISON=хвост-жало, VOID=орбитальное кольцо |

## Быстрый старт

### 1. Контракты (локально)

```bash
cd contracts

# Запустить локальный блокчейн
anvil

# В другом терминале — задеплоить
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# Скопировать адреса в frontend/src/utils/contractConfig.js
```

### 2. Фронтенд

```bash
cd frontend
npm install
npm run dev
```

Открыть http://localhost:5173, подключить MetaMask к сети Anvil (chainId 31337).

### 3. Тесты контрактов

```bash
cd contracts
forge test -vv
```

## Деплой на тестнет (Sepolia)

```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

## Структура

```
creature-card-game/
├── contracts/
│   ├── src/
│   │   ├── CreatureCard.sol
│   │   ├── CardMinter.sol
│   │   ├── BattleEngine.sol
│   │   └── lib/StatsLib.sol
│   ├── script/Deploy.s.sol
│   └── test/CreatureCard.t.sol
└── frontend/
    └── src/
        ├── three/
        │   ├── CreatureBuilder.js   ← процедурная 3D генерация
        │   ├── BattleScene.js       ← Three.js сцена
        │   ├── BattleAnimator.js    ← анимации атак
        │   └── ParticleSystem.js    ← спецэффекты способностей
        ├── hooks/
        │   ├── useWallet.js
        │   ├── useCards.js
        │   └── useBattle.js
        └── components/
            ├── BattleArena.jsx
            ├── CardCollection.jsx
            └── WalletConnect.jsx
```
