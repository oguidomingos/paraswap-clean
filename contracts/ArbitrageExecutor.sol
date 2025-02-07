// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ArbitrageExecutor is Ownable {
    mapping(address => bool) public approvedRouters;
    
    constructor(address initialOwner) Ownable(initialOwner) {}

    function approveRouter(address router) external onlyOwner {
        approvedRouters[router] = true;
    }

    function startArbitrage(
        address tokenIn,
        uint256 amount,
        SwapRoute[] calldata route
    ) external onlyOwner {
        require(approvedRouters[route[0].router], "Router not approved");
        require(approvedRouters[route[1].router], "Router not approved");
        
        // Implementação simplificada para exemplo
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amount);
    }

    struct SwapRoute {
        address tokenIn;
        address tokenOut;
        address router;
        uint256 amountIn;
    }
}
