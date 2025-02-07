import express from 'express';
import axios from 'axios';
import { ethers } from 'ethers';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Configurar dotenv para variáveis de ambiente
dotenv.config();

// Import ABI do arquivo compilado
const FlashLoanArbitrageJSON = JSON.parse(
  readFileSync(
    new URL('./artifacts/contracts/FlashLoanArbitrage.sol/FlashLoanArbitrage.json', import.meta.url)
  )
);
const FlashLoanArbitrageABI = FlashLoanArbitrageJSON.abi;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ###########################################################
// CONFIGURAÇÕES E PARÂMETROS PARA ARBITRAGEM
// ###########################################################

const TRADE_AMOUNT = 1; // Valor base para consulta (1 USDC)
const FLASH_LOAN_AMOUNT = 100;
const SCALING_FACTOR = FLASH_LOAN_AMOUNT / TRADE_AMOUNT;

const MIN_PROFIT_THRESHOLD = 0.05;    // Lucro absoluto mínimo (0.05 USDC)
const MIN_PROFIT_PERCENTAGE = 0.1;     // Lucro percentual mínimo (0.1%)
const MAX_SLIPPAGE = 0.5;             // Slippage máximo permitido (0.5%)

const TOKENS = {
  MATIC:  { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18 },
  WMATIC: { address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", decimals: 18 },
  USDT:   { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
  USDC:   { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
  DAI:    { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", decimals: 18 },
  WETH:   { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18 },
  QUICK:  { address: "0x831753DD7087CaC61aB5644b308642cc1c33Dc13", decimals: 18 },
  SUSHI:  { address: "0x0b3F868E0BE5597D5DB7fEB59E1CADBb0fdDa50a", decimals: 18 },
  AAVE:   { address: "0xD6DF932A45C0f255f85145f286eA0b292B21C90B", decimals: 18 }
};

// ###########################################################
// ESTADO GLOBAL
// ###########################################################

let opportunityLog = [];
let priceCache = {};
let lastRequestTime = 0;
let isMonitoring = false;
const flashLoanOperations = new Map();

// ###########################################################
// CONFIGURAÇÃO DA BLOCKCHAIN
// ###########################################################

const PARA_SWAP_API = "https://apiv5.paraswap.io";
const POLYGON_RPC = process.env.POLYGON_RPC;
const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider);
const flashLoanContract = new ethers.Contract(
  process.env.FLASHLOAN_CONTRACT_ADDRESS || '',
  FlashLoanArbitrageABI,
  signer
);

// ###########################################################
// FUNÇÕES DE UTILIDADE
// ###########################################################

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getGasPrice() {
  const gasPrice = await provider.getFeeData();
  return gasPrice.maxFeePerGas || gasPrice.gasPrice;
}

async function getEthPrice() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    return response.data.ethereum.usd;
  } catch (error) {
    console.error("Erro ao buscar preço do ETH:", error);
    return null;
  }
}

// ###########################################################
// FUNÇÕES DE PREÇO E ARBITRAGEM
// ###########################################################

async function getBestPrice(srcToken, destToken, amount) {
  const cacheKey = `${srcToken}-${destToken}-${amount}`;
  if (priceCache[cacheKey] && Date.now() - priceCache[cacheKey].timestamp < 30000) {
    return priceCache[cacheKey].data;
  }

  await sleep(Math.max(0, 1000 - (Date.now() - lastRequestTime)));
  lastRequestTime = Date.now();

  try {
    const response = await axios.get(`${PARA_SWAP_API}/prices`, {
      params: {
        srcToken: TOKENS[srcToken].address,
        destToken: TOKENS[destToken].address,
        amount: ethers.parseUnits(amount.toString(), TOKENS[srcToken].decimals).toString(),
        network: 137, // Polygon network ID
        partner: 'paraswap.io'
      }
    });

    const priceRoute = response.data.priceRoute;
    if (!priceRoute) return null;

    const result = {
      amount: Number(ethers.formatUnits(priceRoute.destAmount, TOKENS[destToken].decimals)),
      route: priceRoute,
      gasEstimate: priceRoute.gasCost,
    };

    priceCache[cacheKey] = {
      data: result,
      timestamp: Date.now()
    };

    return result;
  } catch (error) {
    console.error(`Error fetching price ${srcToken} -> ${destToken}:`, error.message);
    return null;
  }
}

async function calculateProfitability(route, amounts) {
  const gasPrice = await getGasPrice();
  const ethPrice = await getEthPrice();
  
  if (!gasPrice || !ethPrice) return null;

  const estimatedGasLimit = 500000; // Estimated gas limit for the entire flash loan operation
  const gasCostWei = gasPrice.mul(estimatedGasLimit);
  const gasCostETH = Number(ethers.formatEther(gasCostWei));
  const gasCostUSD = gasCostETH * ethPrice;

  const borrowed = amounts[0];
  const returned = amounts[amounts.length - 1];
  const profit = returned - borrowed;
  const profitPercentage = (profit / borrowed) * 100;

  return {
    profit,
    profitPercentage,
    gasCostUSD,
    isViable: profit > MIN_PROFIT_THRESHOLD && 
              profitPercentage > MIN_PROFIT_PERCENTAGE && 
              profit > gasCostUSD
  };
}

async function calculateArbitrage(route) {
  const amounts = [FLASH_LOAN_AMOUNT];
  let currentAmount = FLASH_LOAN_AMOUNT;

  // Calculate amounts through the route
  for (let i = 0; i < route.length - 1; i++) {
    const price = await getBestPrice(route[i], route[i + 1], currentAmount);
    if (!price) return null;
    
    currentAmount = price.amount;
    amounts.push(currentAmount);
  }

  const profitability = await calculateProfitability(route, amounts);
  if (!profitability || !profitability.isViable) return null;

  return {
    route,
    amounts,
    ...profitability
  };
}

async function findArbitrageOpportunities() {
  const baseRoutes = [
    ["USDC", "WETH", "USDC"],
    ["USDC", "WMATIC", "USDC"],
    ["USDC", "QUICK", "USDC"],
    ["USDC", "SUSHI", "USDC"],
    ["USDC", "AAVE", "USDC"]
  ];

  const opportunities = [];

  for (const route of baseRoutes) {
    const result = await calculateArbitrage(route);
    if (result) {
      opportunities.push(result);
    }
  }

  return opportunities.sort((a, b) => b.profit - a.profit);
}

// ###########################################################
// MONITORAMENTO DE OPORTUNIDADES
// ###########################################################

async function executeArbitrage(opportunity) {
  try {
    // Preparar os parâmetros da rota de arbitragem
    const swapRoute = {
      path: opportunity.route.map(token => TOKENS[token].address),
      amounts: opportunity.amounts.map((amount, index) => 
        ethers.parseUnits(amount.toString(), TOKENS[opportunity.route[index]].decimals)
      )
    };

    // Codificar os parâmetros da rota
    const params = ethers.AbiCoder.defaultAbiCoder().encode(
      ['tuple(address[] path, uint256[] amounts)'],
      [swapRoute]
    );

    const operationId = Date.now().toString();
    const asset = TOKENS.USDC.address;
    const amount = ethers.parseUnits(FLASH_LOAN_AMOUNT.toString(), TOKENS.USDC.decimals);

    // Registrar início da operação
    flashLoanOperations.set(operationId, {
      status: "pending",
      opportunity,
      timestamp: Date.now()
    });

    // Executar flash loan
    const tx = await flashLoanContract.initiateFlashLoan(asset, amount, params);
    
    console.log(`🚀 Flash loan iniciado: ${tx.hash}`);

    // Atualizar status
    flashLoanOperations.set(operationId, {
      status: "processing",
      opportunity,
      timestamp: Date.now(),
      txHash: tx.hash
    });

    // Aguardar confirmação
    const receipt = await tx.wait();
    
    flashLoanOperations.set(operationId, {
      status: "completed",
      opportunity,
      timestamp: Date.now(),
      txHash: tx.hash,
      receipt
    });

    console.log(`✅ Flash loan concluído: ${tx.hash}`);
    return true;
  } catch (error) {
    console.error("❌ Erro na execução do flash loan:", error);
    return false;
  }
}

async function monitorOpportunities() {
  while (isMonitoring) {
    try {
      console.log("🔍 Buscando oportunidades de arbitragem...");
      const opportunities = await findArbitrageOpportunities();

      if (opportunities.length > 0) {
        const bestOpportunity = opportunities[0];
        console.log(`
          ✨ Oportunidade encontrada!
          Rota: ${bestOpportunity.route.join(' -> ')}
          Lucro: $${bestOpportunity.profit.toFixed(2)} (${bestOpportunity.profitPercentage.toFixed(2)}%)
          Custo de gás: $${bestOpportunity.gasCostUSD.toFixed(2)}
        `);

        const success = await executeArbitrage(bestOpportunity);
        if (success) {
          await sleep(10000); // Aguarda 10 segundos após uma execução bem-sucedida
        }
      } else {
        console.log("😴 Nenhuma oportunidade lucrativa encontrada");
      }
    } catch (error) {
      console.error("❌ Erro no monitoramento:", error);
    }

    await sleep(5000); // Intervalo entre verificações
  }
}

// ###########################################################
// CONFIGURAÇÃO DO EXPRESS
// ###########################################################

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// ###########################################################
// ROTAS DA API
// ###########################################################

app.get("/api/status", (req, res) => {
  res.json({
    isMonitoring,
    opportunityCount: opportunityLog.length,
    flashLoanCount: flashLoanOperations.size
  });
});

app.post("/api/monitor/start", (req, res) => {
  if (!isMonitoring) {
    isMonitoring = true;
    monitorOpportunities();
    res.json({ message: "Monitoramento iniciado" });
  } else {
    res.json({ message: "Monitoramento já está ativo" });
  }
});

app.post("/api/monitor/stop", (req, res) => {
  isMonitoring = false;
  res.json({ message: "Monitoramento interrompido" });
});

app.get("/api/opportunities", (req, res) => {
  res.json(Array.from(flashLoanOperations.values()));
});

app.get("/api/opportunities/latest", async (req, res) => {
  const opportunities = await findArbitrageOpportunities();
  res.json(opportunities);
});

app.post("/api/opportunities/reset", (req, res) => {
  flashLoanOperations.clear();
  res.json({ message: "Histórico resetado" });
});

app.get("/api/flashloan/:operationId", (req, res) => {
  const operation = flashLoanOperations.get(req.params.operationId);
  if (!operation) {
    return res.status(404).json({ error: "Operação não encontrada" });
  }
  res.json(operation);
});

// ###########################################################
// INICIALIZAÇÃO DO SERVIDOR
// ###########################################################

app.listen(PORT, () => {
  console.log(`
    🚀 Servidor iniciado na porta ${PORT}
    💰 Flash Loan Amount: ${FLASH_LOAN_AMOUNT} USDC
    📊 Profit Threshold: ${MIN_PROFIT_THRESHOLD} USDC (${MIN_PROFIT_PERCENTAGE}%)
    🔄 Max Slippage: ${MAX_SLIPPAGE}%
  `);
});

process.on('SIGINT', () => {
  isMonitoring = false;
  console.log("\n👋 Encerrando o monitoramento...");
  process.exit();
});
