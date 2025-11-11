// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
 * MMDV Wine Token (MWT)
 *
 * Objetivo:
 * - Token ERC-20 fungible y capado para representar valor vinculado a lotes de vino (u otros activos).
 * - Solo el owner puede mintear (control de emisión).
 * - Eventos específicos de trazabilidad para conectar cada emisión/redención con un batchId.
 *
 * Este contrato es el corazón técnico del proyecto educativo "MMDV – Tokenización de Valor".
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MMDVWineToken is ERC20, Ownable {
    // Tope máximo de tokens (en unidades con 18 decimales).
    uint256 public immutable cap;

    // Emisión de tokens asociada a un lote concreto.
    event WineMinted(
        address indexed to,
        uint256 amount,
        string batchId,
        string note
    );

    // Redención / quema de tokens asociada a un lote.
    event WineRedeemed(
        address indexed from,
        uint256 amount,
        string batchId,
        string note
    );

    constructor(
        uint256 cap_ // Ejemplo: 1_000_000 * 10**18
    )
        ERC20("MMDV Wine Token", "MWT")
        Ownable(msg.sender)
    {
        require(cap_ > 0, "Cap must be > 0");
        cap = cap_;
    }

    /**
     * @dev Mint solo permitido al owner.
     * `batchId` y `note` permiten trazar el contexto de la emision.
     */
    function mint(
        address to,
        uint256 amount,
        string calldata batchId,
        string calldata note
    ) external onlyOwner {
        require(totalSupply() + amount <= cap, "Cap exceeded");
        _mint(to, amount);
        emit WineMinted(to, amount, batchId, note);
    }

    /**
     * @dev Redencion voluntaria del usuario: quema sus tokens
     * y emite un evento con el batchId asociado.
     */
    function redeem(
        uint256 amount,
        string calldata batchId,
        string calldata note
    ) external {
        _burn(msg.sender, amount);
        emit WineRedeemed(msg.sender, amount, batchId, note);
    }
}

