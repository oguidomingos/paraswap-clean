// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";

contract MockPoolAddressesProvider is IPoolAddressesProvider {
    address private _pool;
    string private _marketId;

    constructor(address pool, string memory marketId) {
        _pool = pool;
        _marketId = marketId;
    }

    function getPool() external view override returns (address) {
        return _pool;
    }

    function getMarketId() external view override returns (string memory) {
        return _marketId;
    }

    // Required interface implementations (empty since not used in tests)
    function setMarketId(string calldata newMarketId) external override {}
    function getAddress(bytes32 id) external view override returns (address) { return address(0); }
    function setAddressAsProxy(bytes32 id, address newImplementationAddress) external override {}
    function setAddress(bytes32 id, address newAddress) external override {}
    function getPoolConfigurator() external view override returns (address) { return address(0); }
    function getPriceOracle() external view override returns (address) { return address(0); }
    function getACLManager() external view override returns (address) { return address(0); }
    function getACLAdmin() external view override returns (address) { return address(0); }
    function getPriceOracleSentinel() external view override returns (address) { return address(0); }
    function getPoolDataProvider() external view override returns (address) { return address(0); }
    function owner() external view override returns (address) { return address(0); }
    function transferOwnership(address newOwner) external override {}
    function renounceOwnership() external override {}
}
