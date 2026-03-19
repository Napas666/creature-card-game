# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:20-alpine AS build-frontend

WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# ── Stage 2: Runtime (Anvil + nginx) ──────────────────────────────────────────
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    curl git nginx bash jq \
    && rm -rf /var/lib/apt/lists/*

# Install Foundry (anvil + forge)
RUN curl -L https://foundry.paradigm.xyz | bash
ENV PATH="/root/.foundry/bin:$PATH"
RUN foundryup

# Copy contracts and install dependencies
COPY contracts/ /app/contracts/
WORKDIR /app/contracts
RUN git init && git config user.email "build@docker" && git config user.name "Docker" \
 && git add -A && git commit -m "init" --allow-empty \
 && forge install foundry-rs/forge-std \
 && forge install OpenZeppelin/openzeppelin-contracts \
 && forge build

# Copy built frontend
COPY --from=build-frontend /app/frontend/dist /usr/share/nginx/html

# nginx config
COPY nginx.conf /etc/nginx/sites-available/default

# Entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80 8545

ENTRYPOINT ["/entrypoint.sh"]
