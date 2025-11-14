// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MMDV Wine Token V5 (educacional)
/// @notice Cada token representa 1 botella de vino. Este contrato es didáctico:
///         todas las “reglas económicas” se expresan en unidades simbólicas,
///         no en euros on-chain.
contract MMDVWineTokenV5 is ERC20, ERC20Capped, ERC20Burnable, ERC20Pausable, Ownable {
    // -------------------------------------------------------------------------
    //  Parámetros educativos básicos
    // -------------------------------------------------------------------------

    /// @notice Cap EDUCATIVO: 1.000.000 tokens ENTEROS (1 token = 1 unidad)
    uint256 public constant MAX_SUPPLY = 1_000_000;

    /// @notice Precio simbólico inicial: 10 "unidades" por token (no euros).
    uint256 public constant BASE_PRICE_UNITS = 10;

    /// @notice Periodo de cancelación: 24h desde la primera compra.
    uint256 public constant CANCELLATION_PERIOD = 1 days;

    /// @notice Período de bloqueo: 1 año sin poder transferir a terceros.
    uint256 public constant MIN_LOCK_PERIOD = 365 days;

    /// @notice Precio simbólico de recompra del owner (por token).
    uint256 public constant BUYBACK_PRICE_UNITS = 12;

    // -------------------------------------------------------------------------
    //  Tracking de holdings para reglas educativas
    // -------------------------------------------------------------------------

    struct Holding {
        uint256 amount;          // tokens “educativos” asociados a este tracking
        uint64 firstPurchaseAt;  // timestamp de la primera compra
    }

    /// @notice Información educativa de cada holder.
    mapping(address => Holding) public holdings;

    /// @notice Marcamos quién tiene prioridad para futuros lotes tokenizados.
    mapping(address => bool) public hasPriorityForNextLot;

    // -------------------------------------------------------------------------
    //  Constructor
    // -------------------------------------------------------------------------

    constructor()
        ERC20("MMDV Wine Token V5", "MWT5")
        ERC20Capped(MAX_SUPPLY)
        Ownable(msg.sender)
    {}

    /// @notice Usamos 0 decimales: 1 token = 1 unidad completa de vino.
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    // -------------------------------------------------------------------------
    //  Mint educativo inicial
    // -------------------------------------------------------------------------

    /// @notice Mint educativo: el owner entrega tokens de un lote a un comprador.
    /// @dev amount está en UNIDADES ENTERAS (sin 18 decimales).
    ///      On-chain se asume que el precio de compra es BASE_PRICE_UNITS.
    function educationalMint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Destino no valido");
        require(amount > 0, "Cantidad debe ser > 0");

        _mint(to, amount); // ERC20Capped controla que no superemos MAX_SUPPLY

        Holding storage h = holdings[to];
        h.amount += amount;

        if (h.firstPurchaseAt == 0) {
            h.firstPurchaseAt = uint64(block.timestamp);
        }

        // Marcamos prioridad para futuros lotes.
        if (!hasPriorityForNextLot[to]) {
            hasPriorityForNextLot[to] = true;
        }
    }

    // -------------------------------------------------------------------------
    //  Cancelación dentro de 24h
    // -------------------------------------------------------------------------

    /// @notice El comprador puede devolver tokens al owner durante las primeras 24h.
    /// @dev El reembolso económico se realiza fuera de la cadena; aquí solo se
    ///      registra la devolución de los tokens.
    function cancelWithin24h(uint256 amount) external {
        Holding storage h = holdings[msg.sender];
        require(h.firstPurchaseAt != 0, "Sin compra registrada");
        require(block.timestamp <= h.firstPurchaseAt + CANCELLATION_PERIOD, "Periodo de cancelacion pasado");
        require(amount > 0, "Cantidad debe ser > 0");
        require(balanceOf(msg.sender) >= amount, "Saldo insuficiente");

        // Transferimos los tokens de vuelta al owner (simula la devolucion).
        _transfer(msg.sender, owner(), amount);

        if (h.amount >= amount) {
            h.amount -= amount;
        } else {
            h.amount = 0;
        }
    }

    // -------------------------------------------------------------------------
    //  Valor teorico y bonus por antigüedad
    // -------------------------------------------------------------------------

    /// @notice Devuelve el multiplicador de valor teorico en basis points (bps).
    /// 0–1 año: 1.00x, 1–2: 1.05x, 2–3: 1.10x, 3–4: 1.15x, >4: 1.20x
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

    /// @notice Bonus teorico de fidelidad tras 4 años (10% extra de tokens).
    function loyaltyBonusAmount(address holder) public view returns (uint256) {
        Holding memory h = holdings[holder];
        if (h.firstPurchaseAt == 0 || h.amount == 0) return 0;

        uint256 heldSeconds = block.timestamp - h.firstPurchaseAt;
        if (heldSeconds < 4 * 365 days) return 0;

        // 10% de los tokens mantenidos
        return (h.amount * 10) / 100;
    }

    // -------------------------------------------------------------------------
    //  Precio minimo de reventa (educativo)
    // -------------------------------------------------------------------------

    /// @notice Calcula el precio minimo teorico de reventa por token
    ///         segun el tiempo holdeado.
    /// @dev BASE_PRICE_UNITS + 25% por cada año completo transcurrido
    ///      a partir del primer año.
    function minResalePriceUnitsPerToken(address holder) public view returns (uint256) {
        Holding memory h = holdings[holder];
        if (h.firstPurchaseAt == 0) {
            return BASE_PRICE_UNITS;
        }

        uint256 heldSeconds = block.timestamp - h.firstPurchaseAt;
        if (heldSeconds < MIN_LOCK_PERIOD) {
            // Antes del año, el precio minimo es el de compra.
            return BASE_PRICE_UNITS;
        }

        uint256 yearsAfterFirst = heldSeconds / 365 days; // 1,2,3...
        uint256 percentage = 100 + (25 * yearsAfterFirst); // +25% cada año
        return (BASE_PRICE_UNITS * percentage) / 100;
    }

    /// @notice Funcion de ayuda para frontends:
    ///         valida si un precio propuesto respeta el minimo teorico.
    function validateResalePrice(
        address holder,
        uint256 proposedPriceUnitsPerToken
    ) external view returns (bool ok, uint256 minPriceUnitsPerToken) {
        uint256 minPrice = minResalePriceUnitsPerToken(holder);
        return (proposedPriceUnitsPerToken >= minPrice, minPrice);
    }

    // -------------------------------------------------------------------------
    //  Recompra por parte del owner (buyback educativo)
    // -------------------------------------------------------------------------

    event OwnerBuyback(address indexed seller, uint256 amount, uint256 priceUnitsPerToken);

    /// @notice El owner puede recomprar tokens de un holder a un precio simbólico fijo.
    /// @dev El pago en dinero se hace fuera de la cadena. Aquí solo movemos tokens
    ///      y dejamos trazabilidad on-chain mediante un evento.
    function ownerBuyback(address seller, uint256 amount) external onlyOwner {
        require(seller != address(0), "Seller invalido");
        require(amount > 0, "Cantidad debe ser > 0");
        require(balanceOf(seller) >= amount, "Saldo insuficiente");

        // El seller debe haber dado allowance al owner para este amount.
        _spendAllowance(seller, _msgSender(), amount);
        _transfer(seller, owner(), amount);

        Holding storage h = holdings[seller];
        if (h.amount >= amount) {
            h.amount -= amount;
        } else {
            h.amount = 0;
        }

        emit OwnerBuyback(seller, amount, BUYBACK_PRICE_UNITS);
    }

    // -------------------------------------------------------------------------
    //  Pausa / reanuda
    // -------------------------------------------------------------------------

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // -------------------------------------------------------------------------
    //  Regla de bloqueo 1 año en las transferencias
    // -------------------------------------------------------------------------

    /// @dev No permite transferir a terceros (distintos del owner) hasta que haya
    ///      pasado MIN_LOCK_PERIOD desde la primera compra.
    function _enforceTransferLock(address from, address to) internal view {
        // Mint/burn: from o to = address(0) => sin bloqueo
        if (from == address(0) || to == address(0)) {
            return;
        }

        // Transferencias hacia el owner SIEMPRE permitidas
        if (to == owner()) {
            return;
        }

        // Transferencias saliendo del owner (distribucion inicial) permitidas
        if (from == owner()) {
            return;
        }

        Holding memory h = holdings[from];
        require(h.firstPurchaseAt != 0, "Sin datos de holding");
        require(
            block.timestamp >= h.firstPurchaseAt + MIN_LOCK_PERIOD,
            "Tokens bloqueados durante 1 ano"
        );
    }

    // -------------------------------------------------------------------------
    //  Resolucion de herencia multiple (ERC20 + Capped + Pausable)
    // -------------------------------------------------------------------------

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped, ERC20Pausable)
    {
        _enforceTransferLock(from, to);
        super._update(from, to, value);
    }
  
}
