const { expect } = require("chai");
const { ethers } = require("hardhat");
const { POLYGON_DEX_ROUTERS } = require("../ignition/modules/dexConfig");

describe("Lock", function () {
  let lock;
  let owner;
  const AAVE_POOL_PROVIDER = "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb";
  
  // Tokens da Polygon
  const TOKENS = {
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    LINK: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39"
  };

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    
    const Lock = await ethers.getContractFactory("Lock");
    lock = await Lock.deploy(AAVE_POOL_PROVIDER);
    await lock.deployed();

    // Aprova os routers das DEXs
    for (const dex of Object.values(POLYGON_DEX_ROUTERS)) {
      await lock.approveRouter(dex.router);
    }
  });

  it("Should execute arbitrage successfully", async function () {
    // Exemplo de rota USDC → LINK → USDC
    const route = [
      {
        tokenIn: TOKENS.USDC,
        tokenOut: TOKENS.LINK,
        router: POLYGON_DEX_ROUTERS.quickswap.router,
        amountIn: ethers.utils.parseUnits("100", 6) // 100 USDC
      },
      {
        tokenIn: TOKENS.LINK,
        tokenOut: TOKENS.USDC,
        router: POLYGON_DEX_ROUTERS.sushiswap.router,
        amountIn: 0 // Será determinado pelo output do primeiro swap
      }
    ];

    // Executa a arbitragem
    await expect(lock.startArbitrage(
      TOKENS.USDC,
      ethers.utils.parseUnits("100", 6),
      route
    )).to.emit(lock, "ArbitrageExecuted");
  });
});