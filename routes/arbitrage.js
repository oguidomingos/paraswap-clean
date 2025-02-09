import express from 'express';
import { ethers } from 'ethers';
const router = express.Router();

// List of supported DEXes
const SUPPORTED_DEXES = [
  'quickswap', 'sushiswap', 'uniswap', 'apeswap',
  'balancer', 'curve', 'dodo', 'kyber'
];

// Simulated DEX price functions
function getTokenPriceFromDex(token1, token2, amount, dex) {
  // Base prices in USDC
  const basePrice = {
    'USDC': 1,
    'WMATIC': 1.2,
    'USDT': 1.0,
    'DAI': 1.0,
    'WETH': 1850,
    'QUICK': 65,
    'SUSHI': 1.45,
    'AAVE': 89,
    'LINK': 14,
    'WBTC': 43000,
    'CRV': 0.65,
    'BAL': 5.8,
    'GHST': 0.95,
    'DPI': 85
  };

  // DEX-specific variance with larger variations for testing
  const getDexVariance = (dex) => {
    const baseVariance = {
      'quickswap': () => 1 + (Math.random() * 0.02 - 0.01),   // ±1%
      'sushiswap': () => 1 + (Math.random() * 0.024 - 0.012), // ±1.2%
      'uniswap': () => 1 + (Math.random() * 0.016 - 0.008),   // ±0.8%
      'apeswap': () => 1 + (Math.random() * 0.03 - 0.015),    // ±1.5%
      'balancer': () => 1 + (Math.random() * 0.022 - 0.011),  // ±1.1%
      'curve': () => 1 + (Math.random() * 0.012 - 0.006),     // ±0.6%
      'dodo': () => 1 + (Math.random() * 0.028 - 0.014),      // ±1.4%
      'kyber': () => 1 + (Math.random() * 0.026 - 0.013)      // ±1.3%
    };
    return (baseVariance[dex] || (() => 1))();
  };

  const price1 = basePrice[token1] || 1;
  const price2 = basePrice[token2] || 1;
  const variance = getDexVariance(dex);

  // Add some natural spread between buy and sell prices
  const isBuy = token1 === 'USDC';
  const spreadMultiplier = isBuy ? 0.998 : 1.002; // 0.2% spread

  return {
    destAmount: Math.floor((amount * price2 * variance * spreadMultiplier) / price1),
    dex
  };
}

// Get current token prices
router.get('/prices', async (req, res) => {
  try {
    const tokens = [
      'WMATIC', 'USDT', 'DAI', 'WETH',
      'QUICK', 'SUSHI', 'AAVE', 'LINK', 'WBTC',
      'CRV', 'BAL', 'GHST', 'DPI'
    ];

    const tokenPrices = {};

    // Get prices for each token from each DEX
    for (const token of tokens) {
      tokenPrices[token] = {};
      for (const dex of SUPPORTED_DEXES) {
        const result = getTokenPriceFromDex('USDC', token, 1000000, dex);
        tokenPrices[token][dex] = result.destAmount / 1e6;
      }
    }

    res.json(tokenPrices);
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({ error: 'Failed to fetch token prices' });
  }
});

// Execute flash loan arbitrage
router.post('/execute', async (req, res) => {
  try {
    const { tokens, amounts, data } = req.body;
    
    // Setup provider and signer
    const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // Connect to contract
    const flashLoanArbitrage = new ethers.Contract(
      process.env.FLASHLOAN_CONTRACT_ADDRESS,
      [
        "function initiateFlashLoan(address[] memory assets, uint256[] memory amounts, bytes memory params) public"
      ],
      wallet
    );

    // Execute flash loan
    const tx = await flashLoanArbitrage.initiateFlashLoan(
      tokens,
      amounts,
      data
    );

    // Wait for transaction confirmation
    const receipt = await tx.wait();

    res.json({
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status === 1 ? 'success' : 'failed'
    });
  } catch (error) {
    console.error('Error executing arbitrage:', error);
    res.status(500).json({ 
      error: 'Failed to execute arbitrage',
      details: error.message 
    });
  }
});

// Utility function to check arbitrage opportunities
async function checkArbitrage(loanAmount = 10000) {
  const opportunities = [];

  try {
    const tokens = [
      'USDC', 'WMATIC', 'USDT', 'DAI', 'WETH',
      'QUICK', 'SUSHI', 'AAVE', 'LINK', 'WBTC',
      'CRV', 'BAL', 'GHST', 'DPI'
    ];

    for (let i = 0; i < tokens.length; i++) {
      const token1 = tokens[i];
      for (let j = 0; j < tokens.length; j++) {
        if (i !== j) {
          const token2 = tokens[j];
          try {
            console.log(`Checking ${token1} ↔ ${token2} across DEXes...`);
            const forward = {};
            const backward = {};
            const amount = loanAmount * 1000000; // Convert to smallest unit

            // Get prices in both directions from each DEX
            for (const dex of SUPPORTED_DEXES) {
              forward[dex] = getTokenPriceFromDex(token1, token2, amount, dex);
              backward[dex] = getTokenPriceFromDex(token2, token1, forward[dex].destAmount, dex);
            }

            // Find arbitrage opportunities between DEXes
            for (const buyDex of SUPPORTED_DEXES) {
              for (const sellDex of SUPPORTED_DEXES) {
                if (buyDex !== sellDex) {
                  const forwardAmount = forward[buyDex].destAmount;
                  const backwardAmount = getTokenPriceFromDex(token2, token1, forwardAmount, sellDex).destAmount;
                  
                  const profit = backwardAmount - amount;
                  const profitPercentage = (profit / amount) * 100;

                  // Only include opportunities with meaningful profit
                  if (profitPercentage > 0.1) {
                    opportunities.push({
                      route: [token1, token2, token1],
                      profit: profit / 1e6,
                      profitPercentage,
                      timestamp: Date.now(),
                      totalMovementado: forwardAmount / 1e6,
                      gasFee: 0.01 + (profitPercentage * 0.001),
                      buyDex,
                      sellDex,
                      buyPrice: forwardAmount / 1e6,
                      sellPrice: backwardAmount / 1e6
                    });
                  }
                }
              }
            }
          } catch (error) {
            console.log(`Error checking ${token1} ↔ ${token2}:`, error);
          }
        }
      }
    }

    // Sort opportunities by profit percentage and limit to top 10
    return opportunities
      .sort((a, b) => b.profitPercentage - a.profitPercentage)
      .slice(0, 10);
  } catch (error) {
    console.error('Error in checkArbitrage:', error);
    throw error;
  }
}

// Get current arbitrage opportunities
router.get('/opportunities', async (req, res) => {
  const loanAmount = req.query.amount ? parseInt(req.query.amount.toString()) : 10000;
  try {
    const opportunities = await checkArbitrage(loanAmount);
    res.json(opportunities);
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch arbitrage opportunities' });
  }
});

export default router;
