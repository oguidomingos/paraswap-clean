require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true
          }
        }
      }
    ]
  },
  networks: {
    hardhat: {
      forking: {
        url: "https://polygon-rpc.com",
        blockNumber: 52000000
      },
      chainId: 137
    }
  }
};
