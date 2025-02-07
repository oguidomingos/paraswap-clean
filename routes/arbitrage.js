import express from 'express';
import axios from 'axios';
import { ethers } from 'ethers';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const PARA_SWAP_API = "https://api.paraswap.io/prices";
const POLYGON_RPC = process.env.POLYGON_RPC;

// ###########################################################
// CONFIGURAÇÕES E PARÂMETROS PARA ARBITRAGEM
// ###########################################################

const TRADE_AMOUNT = 1; // Base amount for query (1 USDC)
const FLASH_LOAN_AMOUNT = 100;
const SCALING_FACTOR = FLASH_LOAN_AMOUNT / TRADE_AMOUNT;

const MIN_PROFIT_THRESHOLD = 0.000001; // Minimum absolute profit
const MIN_PROFIT_PERCENTAGE = 0.01; // Minimum profit percentage (0.01%)

// Token addresses and decimals
const TOKENS = {
    MATIC: { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18 },
    WMATIC: { address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", decimals: 18 },
    USDT: { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
    USDC: { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
    DAI: { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", decimals: 18 },
    WETH: { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18 },
    QUICK: { address: "0x831753DD7087CaC61aB5644b308642cc1c33Dc13", decimals: 18 },
    SUSHI: { address: "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a", decimals: 18 },
    AAVE: { address: "0xD6DF932A45C0f255f85145f286eA0b292B21C90B", decimals: 18 },
    LINK: { address: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39", decimals: 18 },
    WBTC: { address: "0x1BFD67037B42Cf73acf2047067bd4F2C47D9BfD6", decimals: 8 },
    CRV: { address: "0x172370d5Cd63279eFa6d502DAB29171933a610AF", decimals: 18 },
    BAL: { address: "0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3", decimals: 18 },
    GHST: { address: "0x385Eeac5cB85A38A9a07A70c73e0a3271CfB54A7", decimals: 18 },
    DPI: { address: "0x85955046DF4668e1DD369D2DE9f3AEB98DD2A369", decimals: 18 },
};

// ###########################################################
// ARBITRAGE LOGIC
// ###########################################################

// Array to store found opportunities
let opportunityLog = [];

// Function to record and display found opportunities
function recordOpportunity(route, profit, steps, gasFee, flashLoanAmount, totalMovementado, profitPercentage) {
    opportunityLog.push({
        route,
        profit,
        steps,
        gasFee,
        flashLoanAmount,
        totalMovementado,
        profitPercentage,
        timestamp: Date.now()
    });
    console.log("Opportunities recorded:", opportunityLog);
}

// Price cache to avoid duplicate requests
let priceCache = {};
let lastRequestTime = 0;

// Function to get best price between tokens using ParaSwap API
async function getBestPrice(srcToken, destToken, amount) {
    const cacheKey = `${srcToken}-${destToken}-${amount}`;
    if (priceCache[cacheKey]) {
        console.log(`⚡ Cache hit for ${srcToken} → ${destToken}`);
        return priceCache[cacheKey];
    }

    const now = Date.now();
    if (now - lastRequestTime < 1000) {
        const delay = 1000 - (now - lastRequestTime);
        console.log(`⏳ Waiting ${delay}ms to avoid rate limit...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
    }

    try {
        console.log(`Fetching price for ${srcToken} → ${destToken}...`);
        const response = await axios.get(
            `${PARA_SWAP_API}?srcToken=${TOKENS[srcToken].address}&destToken=${TOKENS[destToken].address}&amount=${amount * (10 ** TOKENS[srcToken].decimals)}&srcDecimals=${TOKENS[srcToken].decimals}&destDecimals=${TOKENS[destToken].decimals}`
        );

        lastRequestTime = Date.now();

        const priceData = response.data.priceRoute;
        if (!priceData) {
            console.log(`No price data found for ${srcToken} → ${destToken}`);
            return null;
        }

        const destAmount = priceData.destAmount / (10 ** TOKENS[destToken].decimals);

        priceCache[cacheKey] = {
            amount: destAmount,
            route: priceData,
        };

        return priceCache[cacheKey];
    } catch (error) {
        console.error(`Error fetching price for ${srcToken} → ${destToken}:`, error);
        return null;
    }
}

// Function to calculate arbitrage route and potential profit
async function calculateArbitrage(startToken, middleToken, endToken) {
    const price1 = await getBestPrice(startToken, middleToken, TRADE_AMOUNT);
    if (!price1) return null;

    const price2 = await getBestPrice(middleToken, endToken, price1.amount);
    if (!price2) return null;

    const profit = (price2.amount - TRADE_AMOUNT) * SCALING_FACTOR;
    const profitPercentage = (profit / (TRADE_AMOUNT * SCALING_FACTOR)) * 100;

    return {
        route: [startToken, middleToken, endToken],
        profit,
        steps: [price1.route, price2.route],
        profitPercentage
    };
}

// Main function to check arbitrage opportunities
async function checkArbitrage() {
    let bestOpportunity = null;
    let bestProfit = -Infinity;

    const tokens = Object.keys(TOKENS);

    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === 'USDC') continue;
        const opportunity = await calculateArbitrage("USDC", tokens[i], "USDC");
        if (opportunity && opportunity.profit > bestProfit) {
            bestProfit = opportunity.profit;
            bestOpportunity = opportunity;
        }
    }

    // Estimate gas cost
    let gasFee = 0;
    if (bestOpportunity && bestOpportunity.steps) {
        try {
            // Get current ETH price in USD using ParaSwap API
            const ethPrice = await getBestPrice('WETH', 'USDC', 1);
            if (!ethPrice) {
                throw new Error('Failed to get ETH price');
            }

            const gasPromises = bestOpportunity.steps.map(async (step) => {
                if (step && step.gasCostUSD) {
                    return parseFloat(step.gasCostUSD) / ethPrice.amount;
                }
                return 0;
            });

            const gasCosts = await Promise.all(gasPromises);
            gasFee = gasCosts.reduce((acc, val) => acc + val, 0);
        } catch (error) {
            console.error("Error estimating gas cost:", error);
            gasFee = 0;
        }
    }

    if (bestOpportunity && 
        bestOpportunity.profit > MIN_PROFIT_THRESHOLD && 
        bestOpportunity.profitPercentage >= MIN_PROFIT_PERCENTAGE) {
        
        const totalMovementado = (bestOpportunity.profit + TRADE_AMOUNT * SCALING_FACTOR);
        console.log(`✨ Opportunity found! Profit: ${bestOpportunity.profit.toFixed(6)} USDC (${bestOpportunity.profitPercentage.toFixed(2)}%)`);
        console.log("Route:", bestOpportunity.route);
        console.log("Estimated gas cost (in ETH):", gasFee);
        console.log("Total movement in transaction:", totalMovementado.toFixed(2), "USDC");

        // Update contract with opportunity
        try {
            const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
            const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
            const contract = new ethers.Contract(
                process.env.FLASHLOAN_CONTRACT_ADDRESS,
                ['function updateOpportunity(address[3],uint256,uint256,bytes,bytes) external'],
                signer
            );

            // Convert string token symbols to addresses
            const route = bestOpportunity.route.map(token => TOKENS[token].address);
            const profitScaled = ethers.parseUnits(bestOpportunity.profit.toFixed(6), 6);
            const profitPercentageScaled = ethers.parseUnits(
                bestOpportunity.profitPercentage.toFixed(2),
                2
            );

            await contract.updateOpportunity(
                route,
                profitScaled,
                profitPercentageScaled,
                bestOpportunity.steps[0].data || "0x",
                bestOpportunity.steps[1].data || "0x"
            );

            recordOpportunity(
                bestOpportunity.route, 
                bestOpportunity.profit, 
                bestOpportunity.steps,
                gasFee,
                FLASH_LOAN_AMOUNT,
                totalMovementado,
                bestOpportunity.profitPercentage
            );
        } catch (error) {
            console.error("Error updating contract with opportunity:", error);
        }
    } else {
        console.log("⚠️ No profitable arbitrage found. Max profit:", bestProfit.toFixed(6), "USDC");
    }
}

// Function to pause execution
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Main loop that runs arbitrage check every 5 seconds
async function startArbitrageLoop() {
    while (true) {
        await checkArbitrage();
        await sleep(5000);
    }
}

// ###########################################################
// ROUTE HANDLERS
// ###########################################################

// Get real-time token prices
router.get("/prices", async (req, res) => {
    try {
        const priceUSDCtoWMATIC = await getBestPrice("USDC", "WMATIC", TRADE_AMOUNT);
        const priceWMATICToUSDC = await getBestPrice("WMATIC", "USDC", TRADE_AMOUNT);
        
        if (!priceUSDCtoWMATIC || !priceWMATICToUSDC) {
            return res.status(500).json({ error: "Failed to fetch token prices." });
        }
        
        res.json({
            USDCtoWMATIC: priceUSDCtoWMATIC.amount,
            WMATICToUSDC: priceWMATICToUSDC.amount,
        });
    } catch (error) {
        console.error("Error fetching prices:", error);
        res.status(500).json({ error: "Internal error fetching prices." });
    }
});

// Get recorded opportunities
router.get("/opportunities", (req, res) => {
    res.json(opportunityLog);
});

// Reset opportunities log
router.post("/opportunities/reset", (req, res) => {
    opportunityLog = [];
    res.json({ message: "Log reset." });
});

// Execute flash loan with best opportunity
router.post("/execute", async (req, res) => {
    try {
        const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        
        const contract = new ethers.Contract(
            process.env.FLASHLOAN_CONTRACT_ADDRESS,
            ['function initiateFlashLoan(address,uint256) external'],
            signer
        );

        const tx = await contract.initiateFlashLoan(
            TOKENS.USDC.address,
            ethers.parseUnits(FLASH_LOAN_AMOUNT.toString(), TOKENS.USDC.decimals)
        );
        const receipt = await tx.wait();

        res.json({
            message: "Flash loan executed",
            transactionHash: receipt.hash
        });
    } catch (error) {
        console.error("Error executing flash loan:", error);
        res.status(500).json({ error: error.message });
    }
});

// Start the arbitrage loop
startArbitrageLoop().catch(console.error);

export default router;
