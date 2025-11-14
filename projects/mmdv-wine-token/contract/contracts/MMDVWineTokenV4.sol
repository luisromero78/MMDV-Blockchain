// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MMDVWineTokenV4 is ERC20, ERC20Capped, ERC20Burnable, ERC20Pausable, Ownable {
    // Cap EDUCATIVO: 1.000.000 tokens ENTEROS (1 token = 1 unidad de vino)
    uint256 public constant MAX_SUPPLY = 1_000_000;

    // Valor simbólico educativo: 8 "unidades" por token (simula 8€)
    uint256 public constant BASE_PRICE_UNITS = 8;

    // Tiempos clave
    uint256 public constant CANCEL_WINDOW = 24 hours;
    uint256 public constant LOCK_PERIOD = 365 days;

    struct Holding {
        uint256 amount;           // tokens comprados/vigentes
        uint64  firstPurchaseAt;  // timestamp de la primera compra
    }

    mapping(address => Holding) public holdings;

    // Prioridad para futuros lotes
    mapping(address => bool) public priorityEligible;

    event RefundRequested(address indexed holder, uint256 amount, uint256 valueUnits);
    event BuybackExecuted(address indexed holder, uint256 amount, uint256 valueUnits);

    constructor()
        ERC20("MMDV Wine Token V4", "MWT4")
        ERC20Capped(MAX_SUPPLY)
        Ownable(msg.sender)
    {}

    /// @notice 0 decimales: 1 token = 1 unidad de vino
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    // ============ MINT EDUCATIVO ============

    /// @notice Mint educativo: el owner reparte tokens de un lote a los participantes.
    /// @dev amount está en UNIDADES ENTERAS (sin 18 decimales).
    function educationalMint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Destino invalido");
        require(amount > 0, "Cantidad > 0");

        _mint(to, amount); // ERC20Capped comprueba que no pasemos de MAX_SUPPLY

        Holding storage h = holdings[to];
        h.amount += amount;
        if (h.firstPurchaseAt == 0) {
            h.firstPurchaseAt = uint64(block.timestamp);
        }

        // El que participa en este lote gana prioridad para futuros lotes
        priorityEligible[to] = true;
    }

    // ============ VALOR TEORICO / MINIMO ============

    /// @notice Devuelve el multiplicador de valor teórico en funcion del tiempo.
    /// 0–1 año: 1.00x, 1–2: 1.25x, 2–3: 1.50x, 3–4: 1.75x, >4: 2.00x
    function currentValueMultiplierBps(address holder) public view returns (uint256 multiplierBps) {
        Holding memory h = holdings[holder];
        if (h.firstPurchaseAt == 0) return 10_000; // 1.00x

        uint256 heldSeconds = block.timestamp - h.firstPurchaseAt;
        uint256 year = 365 days;

        if (heldSeconds < year) return 10_000;        // 1.00x
        if (heldSeconds < 2 * year) return 12_500;    // 1.25x
        if (heldSeconds < 3 * year) return 15_000;    // 1.50x
        if (heldSeconds < 4 * year) return 17_500;    // 1.75x
        return 20_000;                                // 2.00x
    }

    /// @notice Precio minimo teorico por token (en unidades simbolicas).
    function currentMinPricePerTokenUnits(address holder) public view returns (uint256) {
        uint256 multBps = currentValueMultiplierBps(holder);
        // BASE_PRICE_UNITS * multiplierBps / 10_000
        return (BASE_PRICE_UNITS * multBps) / 10_000;
    }

    /// @notice Bonus teorico de fidelidad tras 4 años (10% extra de tokens).
    function loyaltyBonusAmount(address holder) public view returns (uint256) {
        Holding memory h = holdings[holder];
        if (h.firstPurchaseAt == 0 || h.amount == 0) return 0;

        uint256 heldSeconds = block.timestamp - h.firstPurchaseAt;
        if (heldSeconds < 4 * 365 days) return 0;

        // 10% de los tokens mantenidos
        return (h.amount * 10) / 100;
    }

    // ============ CANCELACIÓN 24H ============

    /// @notice El holder puede "devolver" tokens dentro de las primeras 24h.
    /// @dev On-chain se queman; el reembolso en euros es off-chain, pero queda el evento.
    function cancelWithin24h(uint256 amount) external {
        Holding storage h = holdings[msg.sender];
        require(h.firstPurchaseAt != 0, "Sin compra registrada");
        require(block.timestamp <= h.firstPurchaseAt + CANCEL_WINDOW, "Ventana de cancelacion vencida");
        require(amount > 0 && amount <= h.amount, "Cantidad invalida");

        h.amount -= amount;
        _burn(msg.sender, amount);

        uint256 valueUnits = amount * BASE_PRICE_UNITS;
        emit RefundRequested(msg.sender, amount, valueUnits);
    }

    // ============ OPCION DE RECOMPRA DEL OWNER ============

    /// @notice El owner recompra tokens a un holder.
    /// @dev Requiere que el holder haya hecho approve(owner, amount) previamente.
    function ownerBuyback(address from, uint256 amount) external onlyOwner {
        require(from != address(0), "Holder invalido");
        require(amount > 0, "Cantidad > 0");

        // Transferimos los tokens al owner (requiere allowance)
        _spendAllowance(from, msg.sender, amount);
        _update(from, msg.sender, amount);

        uint256 pricePerToken = currentMinPricePerTokenUnits(from);
        uint256 valueUnits = pricePerToken * amount;

        emit BuybackExecuted(from, amount, valueUnits);
    }

    // ============ BLOQUEO DE TRANSFERENCIAS ============

    /// @dev Bloqueamos transferencias a terceros durante el primer año,
    ///      pero permitimos:
    ///      - mint (from == 0)
    ///      - burn (to == 0)
    ///      - envios al owner (p.ej. recompra / devolucion a la bodega)
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped, ERC20Pausable)
    {
        if (from != address(0) && to != address(0)) {
            // Transferencia "normal" (no mint / no burn)
            if (to != owner()) {
                // Si NO es retorno al owner, aplicamos bloqueo de 1 año
                Holding memory hFrom = holdings[from];
                require(hFrom.firstPurchaseAt != 0, "Sin fecha de compra");
                require(
                    block.timestamp >= hFrom.firstPurchaseAt + LOCK_PERIOD,
                    "Tokens bloqueados el primer ano"
                );
            }

            // Actualizar holdings basicos (solo a nivel educativo)
            if (value > 0) {
                Holding storage hf = holdings[from];
                if (hf.amount >= value) {
                    hf.amount -= value;
                } else {
                    hf.amount = 0;
                }

                Holding storage ht = holdings[to];
                ht.amount += value;
                if (ht.firstPurchaseAt == 0) {
                    ht.firstPurchaseAt = uint64(block.timestamp);
                }
                priorityEligible[to] = true;
            }
        }

        super._update(from, to, value);
    }

    // ============ PAUSA ============

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
