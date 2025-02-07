// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/flashloan/interfaces/IFlashLoanReceiver.sol";

contract MockAavePool is IPool {
    address public override ADDRESSES_PROVIDER;

    constructor(address provider) {
        ADDRESSES_PROVIDER = provider;
    }

    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata interestRateModes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external override {
        require(assets.length == amounts.length, "Length mismatch");
        
        // Transfer tokens to receiver
        for (uint256 i = 0; i < assets.length; i++) {
            IERC20(assets[i]).transfer(receiverAddress, amounts[i]);
        }

        // Calculate premiums (0.09% fee)
        uint256[] memory premiums = new uint256[](amounts.length);
        for (uint256 i = 0; i < amounts.length; i++) {
            premiums[i] = (amounts[i] * 9) / 10000;
        }

        // Execute operation
        IFlashLoanReceiver(receiverAddress).executeOperation(
            assets,
            amounts,
            premiums,
            msg.sender,
            params
        );

        // Get tokens back
        for (uint256 i = 0; i < assets.length; i++) {
            require(
                IERC20(assets[i]).transferFrom(
                    receiverAddress,
                    address(this),
                    amounts[i] + premiums[i]
                ),
                "Transfer failed"
            );
        }
    }

    // Required interface implementations (empty since not used in tests)
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external override {}
    function withdraw(address asset, uint256 amount, address to) external override returns (uint256) { return 0; }
    function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external override {}
    function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external override returns (uint256) { return 0; }
    function repayWithATokens(address asset, uint256 amount, uint256 interestRateMode) external override returns (uint256) { return 0; }
    function swapBorrowRateMode(address asset, uint256 interestRateMode) external override {}
    function rebalanceStableBorrowRate(address asset, address user) external override {}
    function setUserUseReserveAsCollateral(address asset, bool useAsCollateral) external override {}
    function liquidationCall(address collateralAsset, address debtAsset, address user, uint256 debtToCover, bool receiveAToken) external override {}
    function flashLoanSimple(address receiverAddress, address asset, uint256 amount, bytes calldata params, uint16 referralCode) external override {}
    function getUserAccountData(address user) external view override returns (uint256, uint256, uint256, uint256, uint256, uint256) { return (0,0,0,0,0,0); }
    function initReserve(address asset, address aTokenAddress, address stableDebtAddress, address variableDebtAddress, address interestRateStrategyAddress) external override {}
    function dropReserve(address asset) external override {}
    function setReserveInterestRateStrategyAddress(address asset, address rateStrategyAddress) external override {}
    function setConfiguration(address asset, uint256 configuration) external override {}
    function getConfiguration(address asset) external view override returns (DataTypes.ReserveConfigurationMap memory) { return DataTypes.ReserveConfigurationMap(0); }
    function getUserConfiguration(address user) external view override returns (DataTypes.UserConfigurationMap memory) { return DataTypes.UserConfigurationMap(0); }
    function getReserveNormalizedIncome(address asset) external view override returns (uint256) { return 0; }
    function getReserveNormalizedVariableDebt(address asset) external view override returns (uint256) { return 0; }
    function getReserveData(address asset) external view override returns (DataTypes.ReserveData memory) { 
        return DataTypes.ReserveData(
            DataTypes.ReserveConfigurationMap(0),
            uint128(0),
            uint128(0),
            DataTypes.ReserveCache(
                0, 0, 0, 0,
                address(0),
                address(0),
                address(0),
                address(0),
                address(0)
            )
        );
    }
    function finalizeTransfer(address asset, address from, address to, uint256 amount, uint256 balanceFromBefore, uint256 balanceToBefore) external override {}
    function getReservesList() external view override returns (address[] memory) { return new address[](0); }
    function getReserveAddressById(uint16 id) external view override returns (address) { return address(0); }
    function POOL_REVISION() external view override returns (uint256) { return 0; }
    function FLASHLOAN_PREMIUM_TOTAL() external view override returns (uint128) { return 0; }
    function FLASHLOAN_PREMIUM_TO_PROTOCOL() external view override returns (uint128) { return 0; }
    function MAX_STABLE_RATE_BORROW_SIZE_PERCENT() external view override returns (uint256) { return 0; }
    function MAX_NUMBER_RESERVES() external view override returns (uint16) { return 0; }
}
