// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/protocol/libraries/types/DataTypes.sol";

contract MockAavePool is IPool {
    IPoolAddressesProvider public override ADDRESSES_PROVIDER;
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
    ) external override {}

    // Minimal interface implementations
    function flashLoanSimple(address, address, uint256, bytes calldata, uint16) external override {}
    function supply(address, uint256, address, uint16) external override {}
    function withdraw(address, uint256, address) external override returns (uint256) { return 0; }
    function borrow(address, uint256, uint256, uint16, address) external override {}
    function repay(address, uint256, uint256, address) external override returns (uint256) { return 0; }
    function repayWithPermit(address, uint256, uint256, address, uint256, uint8, bytes32, bytes32) external override returns (uint256) { return 0; }
    function swapBorrowRateMode(address, uint256) external override {}
    function rebalanceStableBorrowRate(address, address) external override {}
    function setUserUseReserveAsCollateral(address, bool) external override {}
    function liquidationCall(address, address, address, uint256, bool) external override {}
    
    function getReserveData(address) external view override returns (DataTypes.ReserveData memory) {
        return DataTypes.ReserveData(
            DataTypes.ReserveConfigurationMap(0),
            0, 0, 0, 0, 0, 0,
            address(0), address(0), address(0), address(0),
            0, 0, 0, 0
        );
    }

    // Add remaining required interface functions
    function getReservesList() external view override returns (address[] memory) { return new address[](0); }
    function getReserveNormalizedIncome(address) external pure override returns (uint256) { return 1e27; }
    function BRIDGE_PROTOCOL_FEE() external pure override returns (uint256) { return 0; }
    function FLASHLOAN_PREMIUM_TOTAL() external pure override returns (uint128) { return 0; }
    function FLASHLOAN_PREMIUM_TO_PROTOCOL() external pure override returns (uint128) { return 0; }
    function MAX_STABLE_RATE_BORROW_SIZE_PERCENT() external pure override returns (uint256) { return 0; }
    function MAX_NUMBER_RESERVES() external pure override returns (uint16) { return 0; }
}
