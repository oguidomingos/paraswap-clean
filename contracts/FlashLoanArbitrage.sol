// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { FlashLoanReceiverBase } from "@aave/core-v3/contracts/flashloan/base/FlashLoanReceiverBase.sol";
import { IPool } from "@aave/core-v3/contracts/interfaces/IPool.sol";
import { IPoolAddressesProvider } from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IParaSwapRouter.sol";

contract FlashLoanArbitrage is FlashLoanReceiverBase {
    using SafeERC20 for IERC20;

    // Events to track flash loan and arbitrage operations
    event FlashLoanInitiated(address asset, uint256 amount);
    event ArbitrageExecuted(address asset, uint256 borrowed, uint256 fee, uint256 profit);
    event SwapExecuted(address fromToken, address toToken, uint256 amountIn, uint256 amountOut);
    event OpportunityFound(
        address[] route,
        uint256 profit,
        uint256 flashLoanAmount,
        uint256 totalMovimentado,
        uint256 profitPercentage
    );

    // Constants for arbitrage calculations
    uint256 private constant MIN_PROFIT_THRESHOLD = 1000;
    uint256 private constant MIN_PROFIT_PERCENTAGE = 100;
    
    // Storage for current opportunity
    address[3] public currentRoute;
    bytes public swapData1;
    bytes public swapData2;
    uint256 public currentProfit;
    uint256 public currentProfitPercentage;
    bool public hasOpportunity;

    address private _owner;

    constructor(address _addressProvider) 
        FlashLoanReceiverBase(IPoolAddressesProvider(_addressProvider)) 
    {
        _owner = msg.sender;
    }

    function updateOpportunity(
        address[3] calldata _route,
        uint256 _profit,
        uint256 _profitPercentage,
        bytes calldata _swapData1,
        bytes calldata _swapData2
    ) external {
        require(msg.sender == _owner, "Only owner can update opportunity");
        
        if (_route[0] == address(0)) {
            hasOpportunity = false;
            return;
        }

        require(_route[2] == _route[0], "End token must match start token");
        
        currentRoute = _route;
        swapData1 = _swapData1;
        swapData2 = _swapData2;
        currentProfit = _profit;
        currentProfitPercentage = _profitPercentage;
        hasOpportunity = true;

        address[] memory routeArray = new address[](3);
        (routeArray[0], routeArray[1], routeArray[2]) = (_route[0], _route[1], _route[2]);
        emit OpportunityFound(routeArray, _profit, 0, 0, _profitPercentage);
    }

    function initiateFlashLoan(address asset, uint256 amount) external {
        require(amount > 0 && asset != address(0) && hasOpportunity, "Invalid inputs");

        address[] memory assets = new address[](1);
        assets[0] = asset;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        emit FlashLoanInitiated(asset, amount);
        POOL.flashLoan(address(this), assets, amounts, new uint256[](1), address(this), "", 0);
    }

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address,
        bytes calldata
    ) external override returns (bool) {
        require(msg.sender == address(POOL), "Unauthorized caller");
        
        address asset = assets[0];
        uint256 amountOwed = amounts[0] + premiums[0];

        executeArbitrageSwaps(asset, amounts[0]);
        IERC20(asset).safeApprove(address(POOL), amountOwed);
        
        return true;
    }

    function executeArbitrageSwaps(address asset, uint256 amount) internal {
        require(hasOpportunity, "No opportunity set");
        require(currentRoute[0] == asset, "Invalid start token");
        require(currentProfit > MIN_PROFIT_THRESHOLD, "Profit below threshold");
        require(currentProfitPercentage > MIN_PROFIT_PERCENTAGE, "Profit % below threshold");

        // Simulate swaps for testing
        emit SwapExecuted(currentRoute[0], currentRoute[1], amount, amount * 2);
        emit SwapExecuted(currentRoute[1], currentRoute[2], amount * 2, amount * 3);
    }

    function getParaSwapRouter() internal pure returns (IParaSwapRouter) {
        return IParaSwapRouter(0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57);
    }

    receive() external payable {}

    function withdrawToken(address token, uint256 amount) external {
        require(msg.sender == _owner, "Unauthorized");
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    function owner() public view returns (address) {
        return _owner;
    }
}
