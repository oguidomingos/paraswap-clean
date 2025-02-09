// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/protocol/libraries/types/DataTypes.sol";
import "@aave/core-v3/contracts/flashloan/interfaces/IFlashLoanReceiver.sol";

contract MockAavePool {
    IPoolAddressesProvider public ADDRESSES_PROVIDER;
    uint256 public constant POOL_REVISION = 3;
    
    constructor(address provider) {
        ADDRESSES_PROVIDER = IPoolAddressesProvider(provider);
    }

    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata interestRateModes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external {
        // Simulate flash loan execution
        for (uint256 i = 0; i < assets.length; i++) {
            IERC20(assets[i]).transfer(receiverAddress, amounts[i]);
        }
        
        // Execute callback
        bool success = IFlashLoanReceiver(receiverAddress).executeOperation(
            assets,
            amounts,
            interestRateModes,
            onBehalfOf,
            params
        );
        
        require(success, "Flash loan callback failed");
        
        // Simulate repayment with fee
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 repaymentAmount = amounts[i] * 1005 / 1000; // 0.5% fee
            IERC20(assets[i]).transferFrom(receiverAddress, address(this), repaymentAmount);
        }
    }

    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external {}

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external {}

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        return 0;
    }

    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode,
        address onBehalfOf
    ) external {}

    function repay(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    ) external returns (uint256) {
        return 0;
    }

    function repayWithPermit(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf,
        uint256 deadline,
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS
    ) external returns (uint256) {
        return 0;
    }

    function swapBorrowRateMode(
        address asset,
        uint256 interestRateMode
    ) external {}

    function rebalanceStableBorrowRate(
        address asset,
        address user
    ) external {}

    function setUserUseReserveAsCollateral(
        address asset,
        bool useAsCollateral
    ) external {}

    function liquidationCall(
        address collateralAsset,
        address debtAsset,
        address user,
        uint256 debtToCover,
        bool receiveAToken
    ) external {}

    function getReserveData(
        address asset
    ) external view returns (DataTypes.ReserveData memory) {
        return DataTypes.ReserveData({
            configuration: DataTypes.ReserveConfigurationMap({data: 0}),
            liquidityIndex: uint128(0),
            currentLiquidityRate: uint128(0),
            variableBorrowIndex: uint128(0),
            currentVariableBorrowRate: uint128(0),
            currentStableBorrowRate: uint128(0),
            lastUpdateTimestamp: uint40(0),
            id: uint16(0),
            aTokenAddress: address(0),
            stableDebtTokenAddress: address(0),
            variableDebtTokenAddress: address(0),
            interestRateStrategyAddress: address(0),
            accruedToTreasury: uint128(0),
            unbacked: uint128(0),
            isolationModeTotalDebt: uint128(0)
        });
    }

    function getReservesList() external view returns (address[] memory) {
        return new address[](0);
    }

    function getReserveNormalizedIncome(
        address asset
    ) external pure returns (uint256) {
        return 1e27;
    }

    function getUserAccountData(
        address user
    ) external view returns (
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256
    ) {
        return (0, 0, 0, 0, 0, 0);
    }

    function getUserConfiguration(
        address user
    ) external view returns (DataTypes.UserConfigurationMap memory) {
        return DataTypes.UserConfigurationMap({data: 0});
    }

    function getConfiguration(
        address asset
    ) external view returns (DataTypes.ReserveConfigurationMap memory) {
        return DataTypes.ReserveConfigurationMap({data: 0});
    }

    // Constants
    function BRIDGE_PROTOCOL_FEE() external pure returns (uint256) {
        return 0;
    }

    function FLASHLOAN_PREMIUM_TOTAL() external pure returns (uint128) {
        return 0;
    }

    function FLASHLOAN_PREMIUM_TO_PROTOCOL() external pure returns (uint128) {
        return 0;
    }

    function MAX_NUMBER_RESERVES() external pure returns (uint16) {
        return 0;
    }

    function MAX_STABLE_RATE_BORROW_SIZE_PERCENT() external pure returns (uint256) {
        return 0;
    }

    function getEModeCategoryData(
        uint8 id
    ) external view returns (DataTypes.EModeCategory memory) {
        return DataTypes.EModeCategory({
            ltv: 0,
            liquidationThreshold: 0,
            liquidationBonus: 0,
            priceSource: address(0),
            label: ""
        });
    }
}
