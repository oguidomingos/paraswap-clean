import express from 'express';

import axios from 'axios';
import { FlashLoanArbitrageABI } from './contracts/FlashLoanArbitrage.sol/FlashLoanArbitrage.json';
import { ethers } from 'ethers';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const **filename = fileURLToPath(import.meta.url);
const **dirname = dirname(\_\_filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ###########################################################
// CONFIGURAÇÕES E PARÂMETROS PARA ARBITRAGEM
// ###########################################################

const TRADE_AMOUNT = 1; // Valor base para consulta (1 USDC)
// Valor utópico de flash loan (para escala dos cálculos, a integração com Aave será feita separadamente)
const FLASH_LOAN_AMOUNT = 100;
const SCALING_FACTOR = FLASH_LOAN_AMOUNT / TRADE_AMOUNT;

const MIN_PROFIT_THRESHOLD = 0.000001; // Lucro absoluto mínimo
const MIN_PROFIT_PERCENTAGE = 0.01; // Lucro percentual mínimo (0.01%)

// Conjunto de tokens com endereços e decimais
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
// LÓGICA DE ARBITRAGEM
// ###########################################################

// Array para registrar oportunidades encontradas
let opportunityLog = [];

// Função para registrar e exibir as oportunidades encontradas
function recordOpportunity(route, profit, steps, gasFee, flashLoanAmount, totalMovimentado, profitPercentage) {
opportunityLog.push({
route,
profit,
steps,
gasFee,
flashLoanAmount,
totalMovimentado,
profitPercentage,
timestamp: Date.now()
});
console.log("Oportunidades registradas:", opportunityLog);
}

// Endereço da API e do RPC da Polygon
const PARA_SWAP_API = "https://api.paraswap.io/prices";
const POLYGON_RPC = process.env.POLYGON_RPC;
const provider = new ethers.JsonRpcProvider(POLYGON_RPC)

// Cache de preços para evitar requisições duplicadas
let priceCache = {};
// Variável para controlar o tempo da última requisição
let lastRequestTime = 0;

// Função para buscar o melhor preço entre tokens utilizando a API do Paraswap
async function getBestPrice(srcToken, destToken, amount) {
const cacheKey = `${srcToken}-${destToken}-${amount}`;
if (priceCache[cacheKey]) {
console.log(`⚡ Cache hit for ${srcToken} → ${destToken}`);
return priceCache[cacheKey];
}

// Verifica se já passou tempo suficiente desde a última requisição (1 segundo)
const now = Date.now();
if (now - lastRequestTime < 1000) {
const delay = 1000 - (now - lastRequestTime);
console.log(`⏳ Aguardando ${delay}ms para evitar rate limit...`);
await new Promise((resolve) => setTimeout(resolve, delay));
}

try {
console.log(`Fetching price for ${srcToken} → ${destToken}...`);
const response = await axios.get(
`${PARA_SWAP_API}?srcToken=${TOKENS[srcToken].address}&destToken=${TOKENS[destToken].address}&amount=${amount * (10 ** TOKENS[srcToken].decimals)}&srcDecimals=${TOKENS[srcToken].decimals}&destDecimals=${TOKENS[destToken].decimals}`
);

    lastRequestTime = Date.now(); // Atualiza o tempo da última requisição

    const priceData = response.data.priceRoute;
    if (!priceData) {
      console.log(`No price data found for ${srcToken} → ${destToken}`);
      return null;
    }
    const destAmount = priceData.destAmount / (10 ** TOKENS[destToken].decimals);

    // Armazena o resultado no cache
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

// Função para calcular a rota de arbitragem e o lucro potencial
async function calculateArbitrage(startToken, middleToken, endToken) {
const price1 = await getBestPrice(startToken, middleToken, TRADE_AMOUNT);
if (!price1) return null;

const price2 = await getBestPrice(middleToken, endToken, price1.amount);
if (!price2) return null;

const profit = (price2.amount - TRADE_AMOUNT) _ SCALING_FACTOR;
const profitPercentage = (profit / (TRADE_AMOUNT _ SCALING_FACTOR)) \* 100;

return {
route: [startToken, middleToken, endToken],
profit: profit,
steps: [price1.route, price2.route],
profitPercentage: profitPercentage
};
}

// Função principal para verificar oportunidades de arbitragem
async function checkArbitrage() {
let bestOpportunity = null;
let bestProfit = -Infinity;

const tokens = Object.keys(TOKENS);

for (let i = 0; i < tokens.length; i++) {
for (let j = 0; j < tokens.length; j++) {
if (i === j) continue; // Evita comparar o mesmo token

      const opportunity = await calculateArbitrage("USDC", tokens[i], "USDC");
      if (opportunity && opportunity.profit > bestProfit) {
        bestProfit = opportunity.profit;
        bestOpportunity = opportunity;
      }
    }

}

    // Estima o custo de gás da transação
    let gasFee = 0;
    if (bestOpportunity && bestOpportunity.steps) {
        try {
            const gasPromises = bestOpportunity.steps.map(async (step) => {
                if (step && step.gasCostUSD) {
                    // Converte o custo de gás de USD para ETH usando o preço atual do ETH
                    const ethPriceUSD = await getEthPrice(); // Implementar getEthPrice()
                    if (ethPriceUSD) {
                        return parseFloat(step.gasCostUSD) / ethPriceUSD;
                    }
                }
                return 0;
            });

            const gasCosts = await Promise.all(gasPromises);
            gasFee = gasCosts.reduce((acc, val) => acc + val, 0);

        } catch (error) {
            console.error("Erro ao estimar o custo do gás:", error);
            gasFee = 0; // Define como 0 em caso de erro
        }
    }

// Verifica se a oportunidade atende aos critérios mínimos de lucro
if (bestOpportunity && bestOpportunity.profit > MIN_PROFIT_THRESHOLD && bestOpportunity.profitPercentage >= MIN_PROFIT_PERCENTAGE) {
const totalMovimentado = (bestOpportunity.profit + TRADE_AMOUNT \* SCALING_FACTOR);
console.log(`✨ Oportunidade encontrada! Lucro: ${bestOpportunity.profit.toFixed(6)} USDC (${bestOpportunity.profitPercentage.toFixed(2)}%)`);
console.log("Rota:", bestOpportunity.route);
console.log("Custo estimado do gás (em ETH):", gasFee);
console.log("Total movimentado na transação:", totalMovimentado.toFixed(2), "USDC");
recordOpportunity(bestOpportunity.route, bestOpportunity.profit, bestOpportunity.steps, gasFee, FLASH_LOAN_AMOUNT, totalMovimentado, bestOpportunity.profitPercentage);
} else {
console.log("⚠️ Nenhuma arbitragem com lucro suficiente encontrada. Lucro máximo:", bestProfit.toFixed(6), "USDC");
}
}

// Função para pausar a execução (sleep)
function sleep(ms) {
return new Promise(resolve => setTimeout(resolve, ms));
}

// Loop principal que roda a verificação de arbitragem a cada 5 segundos
async function mainLoop() {
while (true) {
await checkArbitrage();
await sleep(5000);
}
}

mainLoop();

// ###########################################################
// CONFIGURAÇÃO DO SERVIDOR EXPRESS E DEFINIÇÃO DAS ROTAS
// ###########################################################

// Habilita CORS para todas as rotas
app.use((req, res, next) => {
res.header('Access-Control-Allow-Origin', '\*');
res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
next();
});

// Permite que o Express sirva arquivos estáticos da pasta "public"
app.use(express.static(join(\_\_dirname, "public")));

// Rota para obter preços dos tokens em tempo real
app.get("/api/prices", async (req, res) => {
try {
const priceUSDCtoWMATIC = await getBestPrice("USDC", "WMATIC", TRADE_AMOUNT);
const priceWMATICToUSDC = await getBestPrice("WMATIC", "USDC", TRADE_AMOUNT);
if (!priceUSDCtoWMATIC || !priceWMATICToUSDC) {
return res.status(500).json({ error: "Falha ao buscar preços dos tokens." });
}
res.json({
USDCtoWMATIC: priceUSDCtoWMATIC.amount,
WMATICToUSDC: priceWMATICToUSDC.amount,
});
} catch (error) {
console.error("Erro ao buscar preços:", error);
res.status(500).json({ error: "Erro interno ao buscar preços." });
}
});

app.get("/api/opportunities", (req, res) => {
res.json(opportunityLog);
});

// Rota opcional para resetar o log de oportunidades (útil para testes)
app.post("/api/opportunities/reset", (req, res) => {
opportunityLog = [];
res.json({ message: "Log resetado." });
});

// Endpoint para executar o flash loan
app.post("/api/execute_flashloan", async (req, res) => {
try {
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

        // Obtenha o contrato já deployado, utilizando o endereço (pode vir do .env ou de um arquivo de configuração)
        const flashLoanAddress = process.env.FLASHLOAN_CONTRACT_ADDRESS;
        const flashLoanContract = new ethers.Contract(flashLoanAddress, FlashLoanArbitrageABI, signer);

        // Configure os parâmetros do flash loan
        const asset = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; // Por exemplo, USDC
        const amount = ethers.parseUnits("1000", 6); // Valor do empréstimo

        // Envie a transação
        const tx = await flashLoanContract.initiateFlashLoan(asset, amount);
        const receipt = await tx.wait();

        // Retorne o resultado ou os logs da operação
        res.json({ message: "Flash loan executado", receipt });
    } catch (error) {
      console.error("Erro na execução do flash loan:", error);
      res.status(500).json({ error: error.message });
    }

});

// Inicia o servidor na porta definida
app.listen(PORT, async () => {
console.log(`Servidor rodando na porta ${PORT}`);
});
