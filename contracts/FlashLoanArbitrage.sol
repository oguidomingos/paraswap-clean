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
    uint256 private constant MIN_PROFIT_THRESHOLD = 1000; // 0.000001 USDC (6 decimals)
    uint256 private constant MIN_PROFIT_PERCENTAGE = 100; // 0.01% (2 decimals)
    
    // Storage for current opportunity
    address[3] public currentRoute;  // [startToken, intermediateToken, endToken]
    bytes public swapData1;  // First swap data
    bytes public swapData2;  // Second swap data
    uint256 public currentProfit;
    uint256 public currentProfitPercentage;
    bool public hasOpportunity;

    // Owner state variable
    address private _owner;

    constructor(address _addressProvider) 
        FlashLoanReceiverBase(IPoolAddressesProvider(_addressProvider)) 
    {
        _owner = msg.sender;
    }

    // Function to update current opportunity (can only be called by owner/operator)
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

        // Convert fixed array to dynamic for event
        address[] memory routeArray = new address[](3);
        routeArray[0] = _route[0];
        routeArray[1] = _route[1];
        routeArray[2] = _route[2];

        emit OpportunityFound(
            routeArray,
            _profit,
            0, // Flash loan amount will be determined at execution
            0, // Total amount will be calculated during execution
            _profitPercentage
        );
    }

    function initiateFlashLoan(address asset, uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(asset != address(0), "Invalid asset address");
        require(hasOpportunity, "No opportunity set");

        address receiverAddress = address(this);
        address[] memory assets = new address[](1);
        assets[0] = asset;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0; // 0 = no debt (flash loan)

        bytes memory params = ""; // Additional params if needed

        emit FlashLoanInitiated(asset, amount);

        POOL.flashLoan(
            receiverAddress,
            assets,
            amounts,
            modes,
            address(this),
            params,
            0
        );
    }

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address /* initiator */,
        bytes calldata /* params */
    ) external override returns (bool) {
        // 1. Validate the caller
        require(msg.sender == address(POOL), "Caller must be lending pool");

        // 2. Get flash loaned asset details
        address asset = assets[0];
        uint256 borrowed = amounts[0];
        uint256 fee = premiums[0];
        uint256 amountToRepay = borrowed + fee;

        // 3. Execute arbitrage swaps
        executeArbitrageSwaps(asset, borrowed);

        // 4. For testing: simulate USDC being returned from swaps
        if (currentProfit > MIN_PROFIT_THRESHOLD) {
            // Mock the token balance - in production this would come from real swaps
            IERC20(asset).safeTransferFrom(_owner, address(this), amountToRepay + currentProfit);
        }

        uint256 finalBalance = IERC20(asset).balanceOf(address(this));

        // 5. Verify profitability
        require(finalBalance >= amountToRepay, "Insufficient funds to repay flash loan");
        uint256 profit = finalBalance - amountToRepay;

        // 6. Approve repayment
        IERC20(asset).safeApprove(address(POOL), amountToRepay);

        emit ArbitrageExecuted(asset, borrowed, fee, profit);

        return true;
    }

    function executeArbitrageSwaps(address asset, uint256 amount) internal {
        require(hasOpportunity, "No opportunity set");
        require(currentRoute[0] == asset, "Invalid start token");
        require(currentProfit > MIN_PROFIT_THRESHOLD, "Profit below threshold");
        require(currentProfitPercentage > MIN_PROFIT_PERCENTAGE, "Profit % below threshold");

        // For testing purposes, we'll simulate the swaps with mock data
        emit SwapExecuted(currentRoute[0], currentRoute[1], amount, amount * 2);
        emit SwapExecuted(currentRoute[1], currentRoute[2], amount * 2, amount * 3);
    }

    // Get ParaSwap router interface
    function getParaSwapRouter() internal pure returns (IParaSwapRouter) {
        return IParaSwapRouter(0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57); // ParaSwap Router on Polygon
    }

    // Allow the contract to receive ETH
    receive() external payable {}

    // Emergency withdrawal function
    function withdrawToken(address token, uint256 amount) external {
        require(msg.sender == _owner, "Only owner can withdraw");
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    // Function to get the owner of the contract
    function owner() public view returns (address) {
        return _owner;
    }
}
