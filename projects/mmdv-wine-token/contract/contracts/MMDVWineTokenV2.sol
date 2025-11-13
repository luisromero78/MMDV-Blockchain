// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MMDVWineTokenV2 is ERC20Capped, ERC20Burnable, ERC20Pausable, Ownable {
    /// @dev tiempo de arrepentimiento (24h) y de bloqueo (48h)
    uint256 public constant COOLDOWN_PERIOD = 1 days;
    uint256 public constant TRANSFER_LOCK_PERIOD = 2 days;

    /// @dev momento en el que cada address recibió tokens por primera vez
    mapping(address => uint256) public firstPurchaseTime;

    event TokensMinted(address indexed to, uint256 amount, uint256 timestamp);
    event TokensRefunded(address indexed user, uint256 amount, uint256 timestamp);
    event TokensSoldToOwner(address indexed user, uint256 amount, uint256 timestamp);

    constructor(uint256 cap_)
        ERC20("MMDV Wine Token", "MWT")
        ERC20Capped(cap_)
        Ownable(msg.sender)
    {}

    // ============= MINT EDUCATIVO =============

    /// @notice Mint controlado por el owner (bodega/proyecto)
    function mintTo(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);

        // si es la primera vez que recibe tokens, registramos el timestamp
        if (firstPurchaseTime[to] == 0) {
            firstPurchaseTime[to] = block.timestamp;
        }

        emit TokensMinted(to, amount, block.timestamp);
    }

    // ============= LÓGICA DE ARREPENTIMIENTO 24H =============

    /// @notice El usuario devuelve tokens al owner dentro de las primeras 24h
    function refund(uint256 amount) external whenNotPaused {
        uint256 firstTime = firstPurchaseTime[msg.sender];
        require(firstTime != 0, "Sin registro de compra");
        require(
            block.timestamp <= firstTime + COOLDOWN_PERIOD,
            "Plazo de arrepentimiento agotado"
        );

        // Transferimos los tokens del usuario al owner
        _transfer(msg.sender, owner(), amount);

        emit TokensRefunded(msg.sender, amount, block.timestamp);
        // La compensacion en fiat/ETH se gestiona off-chain.
    }

    // ============= LÓGICA DE “RECOMPRA” / SELL-TO-OWNER =============

    /// @notice El usuario puede vender sus tokens al owner en cualquier momento
    /// (a nivel on-chain es solo una transferencia hacia el owner)
    function sellToOwner(uint256 amount) external whenNotPaused {
        _transfer(msg.sender, owner(), amount);
        emit TokensSoldToOwner(msg.sender, amount, block.timestamp);
        // El pago off-chain (dinero real) lo hace el owner fuera de la blockchain.
    }

    // ============= REGLAS DE TRANSFERENCIA (BLOQUEO 48H) =============

    /// @dev Sobrescribimos _update para aplicar reglas de bloqueo inicial
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        // mint o burn no se tocan
        if (from != address(0) && to != address(0)) {
            // si no es el owner y tiene registrado un primer timestamp
            if (from != owner()) {
                uint256 firstTime = firstPurchaseTime[from];

                // si está dentro de los primeros 2 dias desde su primera compra
                if (firstTime != 0 && block.timestamp < firstTime + TRANSFER_LOCK_PERIOD) {
                    // solo puede enviar al owner (devolucion / recompra)
                    require(
                        to == owner(),
                        "Durante 48h solo puedes devolver tokens al owner"
                    );
                }
            }
        }

        super._update(from, to, value);
    }

    // ============= CAP Y HOOKS DE OZ =============

    function _mint(address account, uint256 amount)
        internal
        override(ERC20, ERC20Capped)
    {
        super._mint(account, amount);
    }

    // ============= PAUSE DE EMERGENCIA =============

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
