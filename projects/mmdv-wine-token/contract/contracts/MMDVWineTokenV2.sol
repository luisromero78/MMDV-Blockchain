// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * MMDV Wine Token V2 (MWT)
 *
 * Versión educativa del token con:
 * - ERC20 con CAP (suministro máximo), pausable y burnable.
 * - Derecho de arrepentimiento 24h (refund).
 * - Bloqueo inicial 48h: solo puedes devolver al owner.
 * - Función de "sellToOwner" (recompra simbólica).
 * - Valor simbólico: 10 EUR por token, con +5% anual (hasta 4 años).
 * - Bonus de fidelidad: +10% de tokens tras 4 años manteniéndolos.
 * - Prioridad en futuros lotes: si mantienes tokens >= 1 año.
 *
 * IMPORTANTE:
 * - Todo es educativo, sin valor financiero real.
 * - Las referencias en EUR son simbólicas y off-chain.
 */

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MMDVWineTokenV2 is ERC20Capped, ERC20Burnable, ERC20Pausable, Ownable {
    // ==== CONSTANTES DE TIEMPO Y VALOR SIMBÓLICO ====

    uint256 public constant COOLDOWN_PERIOD = 1 days;          // Derecho de arrepentimiento
    uint256 public constant TRANSFER_LOCK_PERIOD = 2 days;      // Bloqueo inicial
    uint256 public constant PRIORITY_PERIOD = 365 days;         // Para prioridad en futuros lotes
    uint256 public constant LOYALTY_PERIOD = 4 * 365 days;      // 4 años para bonus

    // Valor simbólico base: 10 EUR por token, expresado en céntimos (1000 = 10,00 €)
    uint256 public constant BASE_VALUE_EUR_CENTS = 1000;

    // Incremento simbólico: 5% anual, en basis points (500 = 5.00%)
    uint256 public constant ANNUAL_INCREASE_BP = 500;
    uint256 public constant MAX_YEARS_BONUS = 4; // máximo 4 años de incremento

    // Bonus de fidelidad: 10% extra en tokens al cumplir 4 años
    uint256 public constant LOYALTY_BONUS_BP = 1000; // 10% = 1000 basis points (sobre 10000)

    // ==== ESTADO ====

    /// @dev Momento en el que cada address recibió tokens por primera vez
    mapping(address => uint256) public firstPurchaseTime;

    /// @dev Si el usuario ya ha reclamado el bonus de fidelidad
    mapping(address => bool) public loyaltyBonusClaimed;

    // ==== EVENTOS ====

    event TokensMinted(address indexed to, uint256 amount, uint256 timestamp);
    event TokensRefunded(address indexed user, uint256 amount, uint256 timestamp);
    event TokensSoldToOwner(address indexed user, uint256 amount, uint256 timestamp);
    event LoyaltyBonusGranted(address indexed user, uint256 bonusAmount, uint256 timestamp);

    constructor(uint256 cap_)
        ERC20("MMDV Wine Token", "MWT")
        ERC20Capped(cap_)
        Ownable(msg.sender)
    {}

    // ===================== MINT EDUCATIVO =====================

    /// @notice Mint controlado por el owner (bodega/proyecto)
    ///         Simula la emisión de tokens asociados a un lote de vino.
    function mintTo(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);

        // Si es la primera vez que recibe tokens, registramos el timestamp
        if (firstPurchaseTime[to] == 0) {
            firstPurchaseTime[to] = block.timestamp;
        }

        emit TokensMinted(to, amount, block.timestamp);
    }

    // ===================== ARREPENTIMIENTO 24H =====================

    /// @notice El usuario devuelve tokens al owner dentro de las primeras 24h
    function refund(uint256 amount) external whenNotPaused {
        uint256 firstTime = firstPurchaseTime[msg.sender];
        require(firstTime != 0, "Sin registro de compra");
        require(
            block.timestamp <= firstTime + COOLDOWN_PERIOD,
            "Plazo de arrepentimiento agotado"
        );

        _transfer(msg.sender, owner(), amount);
        emit TokensRefunded(msg.sender, amount, block.timestamp);
        // La compensacion en dinero fiat/ETH se gestiona off-chain.
    }

    // ===================== RECOMPRA (SELL-TO-OWNER) =====================

    /// @notice El usuario puede vender tokens al owner (simbolico)
    /// @dev On-chain es solo transferencia hacia el owner + evento.
    function sellToOwner(uint256 amount) external whenNotPaused {
        _transfer(msg.sender, owner(), amount);
        emit TokensSoldToOwner(msg.sender, amount, block.timestamp);
        // El pago off-chain (dinero real) lo hace el owner fuera de la blockchain.
    }

    // ===================== BONUS DE FIDELIDAD (4 AÑOS) =====================

    /// @notice Devuelve cuántos años (aprox) lleva manteniendo tokens el usuario
    function yearsHeld(address user) public view returns (uint256) {
        uint256 firstTime = firstPurchaseTime[user];
        if (firstTime == 0 || block.timestamp < firstTime) {
            return 0;
        }
        uint256 diff = block.timestamp - firstTime;
        uint256 years_ = diff / 365 days;
        if (years_ > MAX_YEARS_BONUS) {
            years_ = MAX_YEARS_BONUS;
        }
        return years_;
    }

    /// @notice Multiplicador de valor simbólico (en basis points) según años
    /// @dev 10000 = 100%, 10500 = 105%, etc.
    function virtualValueMultiplier(address user) public view returns (uint256) {
        uint256 yrs = yearsHeld(user);
        return 10000 + (yrs * ANNUAL_INCREASE_BP);
    }

    /// @notice Valor simbólico por token en céntimos de euro
    /// @dev Solo educativo, no representa precio real.
    function virtualValuePerTokenEurCents(address user) public view returns (uint256) {
        uint256 bps = virtualValueMultiplier(user);
        return (BASE_VALUE_EUR_CENTS * bps) / 10000;
    }

    /// @notice Indica si el usuario puede reclamar el bonus de fidelidad (10% extra)
    function canClaimLoyaltyBonus(address user) public view returns (bool) {
        uint256 firstTime = firstPurchaseTime[user];
        if (firstTime == 0) return false;
        if (block.timestamp < firstTime + LOYALTY_PERIOD) return false;
        if (loyaltyBonusClaimed[user]) return false;
        if (balanceOf(user) == 0) return false;
        return true;
    }

    /// @notice El usuario reclama +10% de sus tokens actuales tras 4 años
    function claimLoyaltyBonus() external whenNotPaused {
        require(canClaimLoyaltyBonus(msg.sender), "No elegible para bonus");

        uint256 bal = balanceOf(msg.sender);
        uint256 bonus = (bal * LOYALTY_BONUS_BP) / 10000; // 10%

        require(bonus > 0, "Bonus cero");

        loyaltyBonusClaimed[msg.sender] = true;
        _mint(msg.sender, bonus);

        emit LoyaltyBonusGranted(msg.sender, bonus, block.timestamp);
    }

    // ===================== PRIORIDAD EN FUTUROS LOTES =====================

    /// @notice True si el usuario tiene prioridad (mantiene tokens >= 1 año)
    /// @dev La prioridad se interpreta off-chain (lista preferente para nuevos lotes).
    function hasPriority(address user) public view returns (bool) {
        uint256 firstTime = firstPurchaseTime[user];
        if (firstTime == 0) return false;
        if (block.timestamp < firstTime + PRIORITY_PERIOD) return false;
        if (balanceOf(user) == 0) return false;
        return true;
    }

    // ===================== REGLAS DE TRANSFERENCIA (BLOQUEO 48H) =====================

    /// @dev Sobrescribimos _update para aplicar pausa y restricciones de 48h
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        // Mint o burn no se tocan (from == address(0) o to == address(0))
        if (from != address(0) && to != address(0)) {
            // Si no es el owner y tiene registro de primera compra:
            if (from != owner()) {
                uint256 firstTime = firstPurchaseTime[from];

                // Dentro de las primeras 48h solo puede enviar tokens al owner
                if (firstTime != 0 && block.timestamp < firstTime + TRANSFER_LOCK_PERIOD) {
                    require(
                        to == owner(),
                        "Durante 48h solo puedes devolver tokens al owner"
                    );
                }
            }
        }

        super._update(from, to, value);
    }

    // ===================== CAP, PAUSA Y DECIMALES =====================

    function _mint(address account, uint256 amount)
        internal
        override(ERC20, ERC20Capped)
    {
        super._mint(account, amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Usamos 0 decimales para trabajar en unidades enteras (1 token = 1 unidad)
    function decimals() public pure override returns (uint8) {
        return 0;
    }
}

