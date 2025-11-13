// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MMDVWineTokenV2 is ERC20, ERC20Capped, ERC20Burnable, ERC20Pausable, Ownable {
    // Precio simbólico educativo: 10 "unidades" por token (no usamos euros on-chain)
    uint256 public constant BASE_PRICE_UNITS = 10;

    // Guardamos cuánto compró cada dirección y cuándo empezó a holdear
    struct Holding {
        uint256 amount;
        uint64 firstPurchaseAt;
    }

    mapping(address => Holding) public holdings;

    constructor(uint256 cap_)
        ERC20("MMDV Wine Token V2", "MWT2")
        ERC20Capped(cap_)
        Ownable(msg.sender)
    {}

    // --- Funciones educativas de gestión del lote ---

    /// @notice Mint educativo: el owner reparte tokens de un lote a los participantes.
    function educationalMint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);

        Holding storage h = holdings[to];
        h.amount += amount;
        if (h.firstPurchaseAt == 0) {
            h.firstPurchaseAt = uint64(block.timestamp);
        }
    }

    /// @notice Devuelve el multiplicador de valor teórico en función del tiempo.
    /// 0–1 año: 1.00x, 1–2 años: 1.05x, 2–3 años: 1.10x, 3–4 años: 1.15x, >4 años: 1.20x
    function currentValueMultiplier(address holder) public view returns (uint256 multiplierBps) {
        Holding memory h = holdings[holder];
        if (h.firstPurchaseAt == 0) return 10_000; // 1.00x por defecto

        uint256 heldSeconds = block.timestamp - h.firstPurchaseAt;
        uint256 year = 365 days;

        if (heldSeconds < year) return 10_000;        // 1.00x
        if (heldSeconds < 2 * year) return 10_500;    // 1.05x
        if (heldSeconds < 3 * year) return 11_000;    // 1.10x
        if (heldSeconds < 4 * year) return 11_500;    // 1.15x
        return 12_000;                                // 1.20x
    }

    /// @notice Bonus teórico de fidelidad tras 4 años (10% extra de tokens).
    function loyaltyBonusAmount(address holder) public view returns (uint256) {
        Holding memory h = holdings[holder];
        if (h.firstPurchaseAt == 0 || h.amount == 0) return 0;

        uint256 heldSeconds = block.timestamp - h.firstPurchaseAt;
        if (heldSeconds < 4 * 365 days) return 0;

        // 10% de los tokens mantenidos
        return (h.amount * 10) / 100;
    }

    // --- Pausa / reanuda ---

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // --- Resolución de herencia múltiple en OZ v5 ---
    // Aquí se combinan las lógicas de ERC20, Capped y Pausable.
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
