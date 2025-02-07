const TOKENS = {
    // Wrapped Native Tokens
    WMATIC: {
      address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      decimals: 18
    },
    WETH: {
      address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      decimals: 18
    },
    
    // Stablecoins
    USDC: {
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      decimals: 6
    },
    USDT: {
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      decimals: 6
    },
    DAI: {
      address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      decimals: 18
    },
    
    // DeFi Tokens
    AAVE: {
      address: "0xD6DF932A45C0f255f85145f286eA0b292B21C90B",
      decimals: 18
    },
    CRV: {
      address: "0x172370d5Cd63279eFa6d502DAB29171933a610AF",
      decimals: 18
    },
    LINK: {
      address: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39",
      decimals: 18
    },
    
    // Gaming & Metaverse
    SAND: {
      address: "0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683",
      decimals: 18
    },
    MANA: {
      address: "0xA1c57f48F0Deb89f569dFbE6E2B7f46D33606fD4",
      decimals: 18
    }
  };
  
  const POLYGON_DEX_ROUTERS = {
    // Major DEXes
    quickswap: {
      router: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
      factory: "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32"
    },
    sushiswap: {
      router: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
      factory: "0xc35DADB65012eC5796536bD9864eD8773aBc74C4"
    },
    uniswapV3: {
      router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984"
    },
    apeswap: {
      router: "0xC0788A3aD43d79aa53B09c2EaCc313A787d1d607",
      factory: "0xCf083Be4164828f00cAE704EC15a36D711491284"
    },
    jetswap: {
      router: "0x5C6EC38fb0e2609672BDf628B1fD605A523E5923",
      factory: "0x668ad0ed2622C62E24f0d5ab6B6Ac1b9D2cD4AC7"
    }
  };
  
  module.exports = { 
    TOKENS, 
    POLYGON_DEX_ROUTERS 
  };