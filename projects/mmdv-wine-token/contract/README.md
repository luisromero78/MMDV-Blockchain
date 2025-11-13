# 🍷 Proyecto MMDV — Tokenización de Valor (MMDV Wine Token)

## 🌍 Contexto

La tokenización permite representar activos reales (vino, arte, inmuebles, etc.) en la blockchain,
creando registros verificables, trazables y programables.

Este proyecto forma parte del ecosistema **MMDV** y tiene un objetivo claro:
mostrar, sin humo, cómo pasar de la teoría a un caso práctico real de tokenización aplicable
al mundo del vino (y fácilmente extensible a otros activos).

---

## 🎯 Objetivos del proyecto

1. Diseñar y desplegar un **token ERC-20 capado**: `MMDV Wine Token (MWT)`.
2. Incluir **eventos de trazabilidad** específicos:
   - `WineMinted` → emisión de tokens asociada a un lote de vino.
   - `WineRedeemed` → quema/redención asociada a un lote.
3. Construir una **mini DApp Web3** que:
   - Lea datos directamente de la blockchain (sin necesidad de extensiones tipo MetaMask).
   - Muestre `totalSupply`, `cap`, balances y eventos recientes.
4. Sentar las bases para futuros casos:
   - Tokenización de barricas, colecciones limitadas, experiencias enoturísticas o inmuebles.

---

## 🏗️ Estructura del proyecto

```text
/projects/mmdv-wine-token/
 ├─ contract/             → Smart Contract ERC-20 (Solidity)
 ├─ dapp/                 → Mini DApp Web3 (HTML + JS, solo lectura)
 ├─ assets/               → Recursos visuales del proyecto
 └─ README.md             → Esta ficha técnica
