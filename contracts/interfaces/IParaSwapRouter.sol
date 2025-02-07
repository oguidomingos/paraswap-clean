// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IParaSwapRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        bytes calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256 amountOut);
}
