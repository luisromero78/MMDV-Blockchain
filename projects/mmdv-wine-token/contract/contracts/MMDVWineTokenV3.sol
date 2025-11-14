// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MMDVWineTokenV3 is ERC20, ERC20Capped, ERC20Burnable, ERC20Pausable, Ownable {
    // Cap EDUCATIVO: 1.000.000 tokens ENTEROS (1 token = 1 unidad de vino)
    uint256 public constant MAX_SUPPLY = 1_000_000;

    // Precio simbólico educativo
    uint256 public constant BASE_PRICE_UNITS = 10;

    struct Holding {
        uint256 amount;
        uint64 firstPurchaseAt;
    }

    mapping(address => Holding) public holdings;

    constructor()
        ERC20("MMDV Wine Token V3", "MWT3")
        ERC20Capped(MAX_SUPPLY)
        Ownable(msg.sender)
    {}

    /// @notice 0 decimales: 1 token = 1 unidad de vino
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /// Mint educativo: el owner reparte tokens del lote
    function educationalMint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Destino invalido");
        require(amount > 0, "Cantidad > 0");

        _mint(to, amount); // ERC20Capped impide pasar de MAX_SUPPLY

        Holding storage h = holdings[to];
        h.amount += amount;
        if (h.firstPurchaseAt == 0) {
            h.firstPurchaseAt = uint64(block.timestamp);
        }
    }

    /// Multiplicador teórico según tiempo de hold
    /// 0–1 año: 1.00x, 1–2: 1.05x, 2–3: 1.10x, 3–4: 1.15x, >4: 1.20x
    function currentValueMultiplier(address holder) public view returns (uint256 multiplierBps) {
        Holding memory h = holdings[holder];
        if (h.firstPurchaseAt == 0) return 10_000;

        uint256 heldSeconds = block.timestamp - h.firstPurchaseAt;
        uint256 year = 365 days;

        if (heldSeconds < year) return 10_000;
        if (heldSeconds < 2 * year) return 10_500;
        if (heldSeconds < 3 * year) return 11_000;
        if (heldSeconds < 4 * year) return 11_500;
        return 12_000;
    }

    /// Bonus teórico del 10% tras 4 años
    function loyaltyBonusAmount(address holder) public view returns (uint256) {
        Holding memory h = holdings[holder];
        if (h.firstPurchaseAt == 0 || h.amount == 0) return 0;

        uint256 heldSeconds = block.timestamp - h.firstPurchaseAt;
        if (heldSeconds < 4 * 365 days) return 0;

        return (h.amount * 10) / 100;
    }

    // Pausa / reanuda
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Resolver herencia múltiple ERC20 + Capped + Pausable
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
