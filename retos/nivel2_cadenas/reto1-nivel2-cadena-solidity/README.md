# Reto 1 — Cadena & Solidity (Nivel 2)

Votación on-chain en Ethereum (Sepolia). Objetivo: entender **EVM, gas y ejecución determinista** con un contrato simple y una página estática para documentación.

## Stack
- Solidity `^0.8.21`
- Hardhat + Ethers v6
- tests con Chai
- GitHub Pages en `/docs`

## Uso

```bash
npm i
cp .env.example .env   # rellena RPC, PRIVATE_KEY, etc.
npm run compile
npm test
npm run deploy:sepolia
