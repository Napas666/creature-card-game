#!/bin/bash
set -e

ANVIL_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
RPC="http://127.0.0.1:8545"

echo "==> Starting Anvil..."
anvil --host 0.0.0.0 --port 8545 \
      --block-time 2 \
      --accounts 10 \
      --silent &
ANVIL_PID=$!

# Wait for Anvil to be ready
echo "==> Waiting for Anvil..."
for i in $(seq 1 20); do
  if curl -sf -X POST --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
     -H 'Content-Type: application/json' "$RPC" > /dev/null 2>&1; then
    echo "==> Anvil ready"
    break
  fi
  sleep 1
done

# Deploy contracts
echo "==> Deploying contracts..."
cd /app/contracts
forge script script/Deploy.s.sol \
  --rpc-url "$RPC" \
  --private-key "$ANVIL_KEY" \
  --broadcast \
  --silent

echo "==> Contracts deployed at deterministic addresses:"
echo "    CreatureCard: 0x5FbDB2315678afecb367f032d93F642f64180aa3"
echo "    CardMinter:   0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
echo "    BattleEngine: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"

echo "==> Starting nginx..."
nginx -g 'daemon off;'
