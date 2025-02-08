// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";

contract MockPoolAddressesProvider is IPoolAddressesProvider {
    address public pool;
    address public poolConfigurator;
    
    constructor(address _pool) {
        pool = _pool;
        poolConfigurator = address(0);
    }
    
    function getPool() external view override returns (address) {
        return pool;
    }

    function getPoolConfigurator() external view override returns (address) {
        return poolConfigurator;
    }

    // Minimal implementations for other required functions
    function setAddress(bytes32 id, address newAddress) external override {}
    function setAddressAsProxy(bytes32 id, address newImplementationAddress) external override {}
    function getAddress(bytes32 id) external view override returns (address) { return address(0); }
    function getMarketId() external view override returns (string memory) { return ""; }
    function setMarketId(string calldata newMarketId) external override {}
    function setPoolImpl(address newPoolImpl) external override {}
    function setPoolConfiguratorImpl(address newPoolConfiguratorImpl) external override {}
    function setPriceOracle(address newPriceOracle) external override {}
    function getPriceOracle() external view override returns (address) { return address(0); }
    function setACLManager(address newAclManager) external override {}
    function getACLManager() external view override returns (address) { return address(0); }
    function setACLAdmin(address newAclAdmin) external override {}
    function getACLAdmin() external view override returns (address) { return address(0); }
    function setPriceOracleSentinel(address newPriceOracleSentinel) external override {}
    function getPriceOracleSentinel() external view override returns (address) { return address(0); }
    function setPoolDataProvider(address newDataProvider) external override {}
    function getPoolDataProvider() external view override returns (address) { return address(0); }
}
