Para integrar flash loans da Aave, executar os swaps usando a conta configurada no Hardhat e extrair os resultados para compor as rotas de arbitragem, você precisará criar (ou adaptar) alguns arquivos no seu projeto. A seguir, listo os principais componentes e arquivos recomendados, com uma breve explicação do que cada um deve conter:

---

## 1. Contrato Inteligente para Flash Loan e Arbitragem

**Arquivo:** `contracts/FlashLoanArbitrage.sol`

**Objetivo:**  
Criar um contrato que:
- Herde ou implemente a interface de flash loan da Aave (por exemplo, para Aave V2, use `FlashLoanReceiverBase`; para Aave V3, a interface correspondente).
- Possua uma função para iniciar o flash loan (por exemplo, `initiateFlashLoan`), que invoca o Lending Pool da Aave.
- Implemente a função de callback (como `executeOperation`) que execute a lógica de arbitragem:
  - Receba o montante emprestado.
  - Realize os swaps (chamando outros contratos ou funções internas que interajam com DEXs como via Paraswap).
  - Calcule se a operação é lucrativa e, em caso afirmativo, reembolse o empréstimo acrescido da taxa.
  - Retorne um valor booleano indicando o sucesso da operação.

**Exemplo (pseudocódigo simplificado):**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { FlashLoanReceiverBase } from "@aave/protocol-v2/contracts/flashloan/base/FlashLoanReceiverBase.sol";
import { ILendingPool } from "@aave/protocol-v2/contracts/interfaces/ILendingPool.sol";

contract FlashLoanArbitrage is FlashLoanReceiverBase {
    constructor(address _addressProvider) FlashLoanReceiverBase(_addressProvider) {}

    // Função para iniciar o flash loan com o ativo desejado
    function initiateFlashLoan(address asset, uint256 amount) external {
        address receiverAddress = address(this);
        address[] memory assets = new address[](1);
        assets[0] = asset;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        uint256[] memory modes = new uint256[](1);
        modes[0] = 0; // 0 = empréstimo sem dívida (flash loan)

        bytes memory params = ""; // Parâmetros extras se necessário

        LENDING_POOL.flashLoan(
            receiverAddress,
            assets,
            amounts,
            modes,
            address(this),
            params,
            0
        );
    }

    // Callback executado pela Aave após liberar o flash loan
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        // 1. Realize os swaps necessários para a arbitragem.
        //    Aqui você pode chamar funções internas ou interagir com outros contratos (por exemplo, via Paraswap).
        // 2. Calcule o lucro e verifique se a operação é lucrativa.
        // 3. Reembolse o flash loan: amounts[0] + premiums[0]
        // Se não for lucrativa, a transação deve reverter para evitar prejuízo.
        
        // Exemplo simplificado (pseudocódigo):
        // uint256 amountObtido = realizarSwaps();
        // uint256 amountDevolver = amounts[0] + premiums[0];
        // require(amountObtido >= amountDevolver, "Arbitragem não lucrativa");
        // Transferir o valor de volta para o Lending Pool

        return true;
    }
}
```

> **Observação:** Esse exemplo é ilustrativo. Na prática, você precisará integrar as chamadas aos DEXs para efetuar os swaps e tratar a lógica de cálculo de lucro de forma robusta.

---

## 2. Script de Deploy

**Arquivo:** `scripts/deploy_flashloan.js`

**Objetivo:**  
Criar um script que compile e faça o deploy do contrato de flash loan no fork da Polygon. Esse script usará a conta definida (via `.env` ou pelas contas padrão do Hardhat).

**Exemplo básico:**

```js
const hre = require("hardhat");

async function main() {
  const FlashLoanArbitrage = await hre.ethers.getContractFactory("FlashLoanArbitrage");
  // Substitua o endereço abaixo pelo addressProvider da Aave na Polygon (ou no fork que você estiver usando)
  const ADDRESS_PROVIDER = "0x..."; 
  const flashLoanContract = await FlashLoanArbitrage.deploy(ADDRESS_PROVIDER);
  await flashLoanContract.deployed();
  console.log("Contrato FlashLoanArbitrage deployado em:", flashLoanContract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Execute-o com:

```bash
npx hardhat run scripts/deploy_flashloan.js --network hardhat
```

---

## 3. Testes e Interação com o Contrato

**Arquivo:** `test/flashloan-arbitrage.test.js`

**Objetivo:**  
Criar testes para simular a execução do flash loan e dos swaps. Você pode utilizar o framework de testes do Hardhat para:
- Chamar a função `initiateFlashLoan` do contrato.
- Simular as operações e confirmar que o contrato executa a lógica corretamente.
- Validar os resultados (por exemplo, se o empréstimo foi reembolsado e se os lucros foram gerados).

Exemplo (de forma simplificada):

```js
const { expect } = require("chai");

describe("FlashLoanArbitrage", function () {
  let flashLoan, owner;

  before(async function () {
    [owner] = await ethers.getSigners();
    const FlashLoanArbitrage = await ethers.getContractFactory("FlashLoanArbitrage");
    // Utilize o addressProvider correto para o teste
    flashLoan = await FlashLoanArbitrage.deploy("0x..."); 
    await flashLoan.deployed();
  });

  it("Deve iniciar um flash loan e executar a operação", async function () {
    // Chame a função de iniciar o flash loan com os parâmetros desejados
    await expect(flashLoan.initiateFlashLoan("0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", ethers.parseUnits("1000", 6)))
      .to.emit(flashLoan, "AlgumEvento") // Caso você tenha eventos para logar o início/resultado
      .withArgs(/* parâmetros esperados */);
  });
});
```

---

## 4. Integração no Backend / Server

**Arquivo:** Atualize o `server.js` ou crie um novo arquivo de rotas (por exemplo, `routes/arbitrage.js`).

**Objetivo:**  
Adicionar endpoints para:
- Disparar a operação de flash loan (ou arbitragem) chamando a função do contrato de flash loan.  
- Consultar os resultados da operação.

**Exemplo de rota:**

```js
// Dentro do server.js (ou num arquivo de rotas separado)
app.post("/api/execute_flashloan", async (req, res) => {
  try {
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
```

> **Dica:** Para obter o ABI do contrato, compile seu contrato (usando `npx hardhat compile`) e importe o arquivo JSON gerado ou copie o ABI para uso no script.

---

## Resumo dos Arquivos Necessários

1. **Contrato Flash Loan:**  
   - `contracts/FlashLoanArbitrage.sol` – Contém a lógica de flash loan e arbitragem.

2. **Script de Deploy:**  
   - `scripts/deploy_flashloan.js` – Faz o deploy do contrato no fork da Polygon.

3. **Testes:**  
   - `test/flashloan-arbitrage.test.js` – Testa a operação do contrato (opcional, mas recomendado para validação).

4. **Integração no Backend:**  
   - Atualize ou crie um endpoint no `server.js` (ou arquivo de rotas específico) para disparar a operação de flash loan.

5. **Configurações Adicionais:**  
   - Variáveis de ambiente no `.env`, como `POLYGON_RPC`, `PRIVATE_KEY` e possivelmente `FLASHLOAN_CONTRACT_ADDRESS` para apontar para o endereço do contrato deployado.

---

## Fluxo Geral

1. **Deploy:**  
   Use o script de deploy para lançar o contrato no ambiente fork.

2. **Identificação de Oportunidades:**  
   Seu backend (já presente no `server.js`) identifica rotas de arbitragem usando os preços do Paraswap.

3. **Execução do Flash Loan:**  
   Quando uma oportunidade lucrativa for identificada, o endpoint `/api/execute_flashloan` (ou similar) será chamado. Esse endpoint acionará a função do contrato de flash loan, que fará a operação de arbitragem.

4. **Resultados:**  
   Os resultados da operação podem ser retornados via resposta do endpoint ou armazenados em logs para consulta posterior (você pode criar outra rota, por exemplo, `/api/flashloan_result`).

---

Com esses arquivos e configurações, você terá um ambiente completo para testar a integração dos flash loans da Aave, executar os swaps utilizando a conta definida no Hardhat e capturar os resultados da operação. Essa estrutura modular facilita o desenvolvimento, a realização de testes e, futuramente, a migração para uma rede real.