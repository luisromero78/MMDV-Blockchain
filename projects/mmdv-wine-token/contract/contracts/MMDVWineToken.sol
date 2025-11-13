// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MMDVWineToken is ERC20, ERC20Capped, ERC20Burnable, ERC20Pausable, Ownable {
    constructor(uint256 cap_)
        ERC20("MMDV Wine Token", "MWT")
        ERC20Capped(cap_)
        Ownable(msg.sender)
    {}

    // mint solo para el owner (el cap lo hace cumplir ERC20Capped)
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // pausar / reanudar transferencias
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // Requerido por OZ v5 para herencia múltiple (Capped + Pausable)
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
