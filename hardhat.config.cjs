require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();


module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.POLYGON_RPC,
        blockNumber: 51600000
      }
    }
  }
};