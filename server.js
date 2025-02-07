import express from 'express';
import axios from 'axios';
import { ethers } from 'ethers';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ###########################################################
// CONFIGURAÇÕES E PARÂMETROS PARA SIMULAÇÃO DE ARBITRAGEM
// ###########################################################

const TRADE_AMOUNT = 1; // Valor base para consulta (1 USDC)
const FLASH_LOAN_AMOUNT = 100; // Valor utópico do flash loan
const SCALING_FACTOR = FLASH_LOAN_AMOUNT / TRADE_AMOUNT; // Fator de escala

// Parâmetros utópicos para teste
const MIN_PROFIT_THRESHOLD = 0.000001; // Lucro absoluto mínimo
const MIN_PROFIT_PERCENTAGE = 0.01;   // Lucro percentual mínimo (0.01%)

// Conjunto de tokens com endereços e decimais
const TOKENS = {
  MATIC: { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18 },
  WMATIC: { address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", decimals: 18 },
  USDT: { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
  USDC: { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
  DAI:  { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", decimals: 18 },
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
// LÓGICA DE SIMULAÇÃO DE FLASH LOAN INTEGRADA
// ###########################################################

// Configurações de simulação (movido para server.js)
const CONFIG_SIMULACAO = {
  taxas: {
    gas: 0.15,       // Taxa de gás (%)
    flashLoan: 0.09  // Taxa do empréstimo relâmpago (%)
  }, 
  valorEmprestimo: 5000 // Valor do flash loan em USD
};

// Variável para armazenar o resultado da última simulação
let lastSimulationResult = null;

// Função para simular a arbitragem (movido e renomeado de iniciarSimulacao)
async function simularArbitragem(flashLoanAmount, priceIn, priceOut, feeBps) {
  const inicio = Date.now();

  try {
    // Configurar provider e signer
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
    const signer = new ethers.Wallet(
      "process.env.PRIVATE_KEY", 
      provider
    );

    // Fazer deploy do contrato
    const contractFactory = await ethers.getContractFactory("ArbitrageSimulator");
    const arbitrageContract = await contractFactory.deploy();
    
    // Usar callStatic para simulação sem estado
    const resultado = await Promise.race([
      arbitrageContract.simulateArbitrageOperation.callStatic(
        ethers.parseUnits(flashLoanAmount.toString(), 6), // USDC decimals
        ethers.parseUnits(priceIn.toString(), 18),        // WMATIC decimals
        ethers.parseUnits(priceOut.toString(), 18),
        feeBps
      ).then(([success, profit, gasCost]) => ({
        sucesso: success,
        lucro: parseFloat(ethers.formatUnits(profit, 6)), // Converter para USDC
        custoGas: parseFloat(ethers.formatUnits(gasCost, 18)), // Converter para MATIC
        tempoExecucao: Date.now() - inicio
      })),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tempo excedido')), 3000)
      )
    ]);

    // Registrar evento no contrato real
    const tx = await arbitrageContract.simulateArbitrageOperation(
      flashLoanAmount,
      priceIn,
      priceOut,
      feeBps
    );
    await tx.wait(); // Esperar pela confirmação

    // Atualiza a variável com o resultado da simulação
    lastSimulationResult = resultado;
    return resultado;

  } catch (erro) {
    lastSimulationResult = { // Garante que lastSimulationResult seja atualizado mesmo em caso de erro
      sucesso: false,
      erro: erro.message,
      tempoExecucao: Date.now() - inicio
    };
    return lastSimulationResult;
  }
}


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
const provider = new ethers.JsonRpcProvider(POLYGON_RPC);

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
  // Implementação do rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < 2000) { // 1 segundo
    const delay = 1000 - timeSinceLastRequest;
    console.log(`⏳ Aguardando ${delay}ms para evitar rate limit...`);
    await sleep(delay);
  }
  try {
    console.log(`🔍 Buscando preço para ${srcToken} → ${destToken}...`);
    const decimalsSrc = TOKENS[srcToken].decimals;
    const weiAmount = ethers.parseUnits(amount.toString(), decimalsSrc).toString();
    const response = await axios.get(PARA_SWAP_API, {
      params: {
        srcToken: TOKENS[srcToken].address,
        destToken: TOKENS[destToken].address,
        amount: weiAmount,
        side: "SELL",
        network: 137,
      },
      headers: { "Content-Type": "application/json" },
    });
    lastRequestTime = Date.now(); // Atualiza o tempo da última requisição
    if (!response.data || !response.data.priceRoute) return null;
    const priceRoute = response.data.priceRoute;

    // Se o impacto máximo foi atingido, ignora a rota
    if (priceRoute.maxImpactReached) {
      console.log(`💡 Impacto máximo atingido para ${srcToken} → ${destToken}, ignorando rota.`);
      return null;
    }
    if (!priceRoute.destAmount || !priceRoute.bestRoute) return null;
    const decimalsDest = TOKENS[destToken].decimals;
    const normalizedAmount = parseFloat(priceRoute.destAmount) / 10 ** decimalsDest;
    const bestExchange = priceRoute.bestRoute[0]?.swaps[0]?.swapExchanges[0]?.exchange || "Desconhecida";
    const result = { amount: normalizedAmount, dex: bestExchange };
    priceCache[cacheKey] = result;
    return result;
  } catch (error) {
    if (
      error.response &&
      error.response.data &&
      error.response.data.error === "ESTIMATED_LOSS_GREATER_THAN_MAX_IMPACT"
    ) {
      console.log(`💡 Impacto de preço muito alto para ${srcToken} → ${destToken}, ignorando rota.`);
      return null;
    }
    console.error("❌ Erro ao obter preço:", error.response?.data || error.message);
    return null;
  }
}

// Função para simular a estimativa de gas (utópica, valor fixo)
async function estimateGas() {
  return 0.000001; // Gas praticamente zero
}

// Função para calcular o lucro em USDC
function calculateProfit(initial, final, gasCost) {
  return final - initial - gasCost;
}

// Função principal para verificar as rotas de arbitragem
async function checkArbitrage() {
  console.log("🔍 Simulando arbitragem na Polygon...");
  priceCache = {}; // Limpa o cache a cada ciclo
  const amount = TRADE_AMOUNT;
  const gasFee = await estimateGas();
  if (!gasFee) {
    console.log("⚠️ Erro ao obter estimativa de gas. Abortando...");
    return;
  }
  let bestProfit = -Infinity;
  let bestRoute = null;
  let bestMovimentacao = 0;
  let bestLogs = "";
  // Variáveis para armazenar os passos que geraram a melhor rota
  let bestStep1 = null;
  let bestStep2 = null;

  // Gera as rotas: USDC → token → USDC (para cada token, exceto USDC)
  const tokens = Object.keys(TOKENS);
  const routes = tokens.filter(t => t !== "USDC").map(t => ["USDC", t, "USDC"]);

  for (const route of routes) {
    console.log("🔄 Verificando rota:", route.join(" → "));
    const step1 = await getBestPrice(route[0], route[1], amount);
    if (!step1) continue;
    const step2 = await getBestPrice(route[1], route[2], step1.amount);
    if (!step2) continue;
    const profit = calculateProfit(amount, step2.amount, gasFee);
    const profitPercentage = (profit / amount) * 100;
    console.log(`💰 Lucro potencial para rota ${route.join(" → ")}: ${profit.toFixed(6)} USDC (${profitPercentage.toFixed(4)}%)`);

    // Aplica os critérios mínimos de lucro
    if (profit < MIN_PROFIT_THRESHOLD || profitPercentage < MIN_PROFIT_PERCENTAGE) {
      console.log(`📉 Lucro abaixo dos critérios mínimos para a rota ${route.join(" → ")}, ignorando.`);
      continue;
    }
    if (profit > bestProfit) {
      bestProfit = profit;
      bestRoute = route;
      bestMovimentacao = step2.amount;
      bestStep1 = step1;
      bestStep2 = step2;
      bestLogs =
        `🔹 ${route[0]} → ${step1.amount.toFixed(6)} ${route[1]} via ${step1.dex}\n` +
        `🔹 ${route[1]} → ${step2.amount.toFixed(6)} ${route[2]} via ${step2.dex}`;
    }
  }

  if (bestProfit >= MIN_PROFIT_THRESHOLD && bestRoute && bestStep1 && bestStep2) {
    // Escala o lucro de acordo com o valor do flash loan
    const scaledProfit = bestProfit * SCALING_FACTOR;
    const profitPercentage = (bestProfit / TRADE_AMOUNT) * 100;

    console.log("💰 Melhor rota encontrada:", bestRoute.join(" → "));
    console.log(bestLogs);
    console.log(`💰 Gas Fee estimado: ${gasFee.toFixed(6)} MATIC`);
    console.log(`💸 Flash Loan utilizado: ${FLASH_LOAN_AMOUNT} USDC`);
    console.log(`🔄 Total movimentado (valor base): ${bestMovimentacao.toFixed(6)} USDC`);
    console.log(`🚀 Lucro final estimado (escalado): ${scaledProfit.toFixed(6)} USDC`);

    // Chamando a função de simulação de flash loan
    const simulacaoResultado = await simularArbitragem(
      FLASH_LOAN_AMOUNT,
      bestStep1.amount,
      bestStep2.amount,
      CONFIG_SIMULACAO.taxas.flashLoan * 100 // Converter para basis points
    );
    console.log("\n📊 Resultados da Simulação de Flash Loan:");
    console.log("-------------------------------");
    console.log(`Status da Simulação: ${simulacaoResultado.sucesso ? '✅ Lucrativo' : '❌ Não lucrativo'}`);
    if (simulacaoResultado.lucro) console.log(`Lucro Estimado na Simulação: $${simulacaoResultado.lucro.toFixed(2)}`);
    console.log(`Tempo de Execução da Simulação: ${simulacaoResultado.tempoExecucao}ms`);
    if (simulacaoResultado.erro) console.log(`Erro na Simulação: ${simulacaoResultado.erro}`);
    console.log("\n⚠️ Atenção: Esta é uma simulação com preços REAIS do servidor backend");


    recordOpportunity(
      bestRoute.join(" → "),
      scaledProfit,
      [
        {
          from: bestRoute[0],
          to: bestRoute[1],
          amount: TRADE_AMOUNT,
          dex: bestStep1.dex
        },
        {
          from: bestRoute[1],
          to: bestRoute[2],
          amount: bestStep1.amount,
          dex: bestStep2.dex
        }
      ],
      gasFee,
      FLASH_LOAN_AMOUNT,
      bestMovimentacao,
      profitPercentage
    );
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

// Inicia o loop de arbitragem em background
mainLoop();

// ###########################################################
// CONFIGURAÇÃO DO SERVIDOR EXPRESS E DEFINIÇÃO DAS ROTAS
// ###########################################################

// Habilita CORS para todas as rotas
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Permite que o Express sirva arquivos estáticos da pasta "public"
app.use(express.static(join(__dirname, "public")));

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

// Rota para enviar resultados da simulação para o frontend
app.get("/api/simulation_result", (req, res) => {
  // Retorna o último resultado da simulação em JSON
  res.json(lastSimulationResult);
});


app.get("/api/opportunities", (req, res) => {
  res.json(opportunityLog);
});

// Rota opcional para resetar o log de oportunidades (útil para testes)
app.post("/api/opportunities/reset", (req, res) => {
  opportunityLog = [];
  res.json({ message: "Log resetado." });
});

// Inicia o servidor na porta definida
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});