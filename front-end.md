import React, { useState, useEffect } from 'react';
import { simulateFlashLoanTransaction, testSepoliaTransaction } from './web3-utils';
import { ArrowRightCircle, TrendingUp, RefreshCcw, DollarSign, Zap, Cast as Gas, Repeat } from 'lucide-react';

interface Step {
  from: string;
  to: string;
  amount: number;
  dex: string;
}

interface Opportunity {
  route: string;
  profit: number;
  timestamp: number;
  steps: Step[];
  gasFee: number;
  flashLoanAmount: number;
  totalMovimentado: number;
  profitPercentage: number;
}

interface SimulationResult {
  sucesso: boolean;
  lucro?: number;
  tempoExecucao: number;
  erro?: string;
}

interface TransactionSimulationLog {
  timestamp: number;
  result: string;
  gasUsed: string;
  cost: string;
  details: string;
}

function App() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [simulationLogs, setSimulationLogs] = useState<TransactionSimulationLog[]>([]);

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        const response = await fetch('/api/opportunities');
        const data = await response.json();
        setOpportunities(data);
        setLastUpdate(new Date());

        const total = data.reduce((acc: number, curr: Opportunity) => acc + curr.profit, 0);
        setTotalProfit(total);
      } catch (error) {
        console.error('Error fetching opportunities:', error);
      }
    };

    fetchOpportunities();
    const interval = setInterval(fetchOpportunities, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulationResult = (result: SimulationResult) => {
    const log: TransactionSimulationLog = {
      timestamp: Date.now(),
      result: result.sucesso ? 'Simulação bem-sucedida' : 'Simulação falhou',
      gasUsed: result.lucro?.toString() || 'Não disponível',
      cost: result.tempoExecucao.toString(),
      details: result.erro || 'Nenhum erro detectado'
    };
    setSimulationLogs(prev => [log, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="w-8 h-8" />
            Arbitrage Dashboard
          </h1>
          <div className="flex items-center gap-2 text-gray-400">
            <RefreshCcw className="w-4 h-4 animate-spin" />
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </header>

      {/* Simulation Button */}
      <div className="mb-8">
        <button
          onClick={async () => {
            const result = await testSepoliaTransaction();
            handleSimulationResult(result);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Simular Transação
        </button>
      </div>

      {/* Simulation Logs */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Histórico de Simulações</h2>
        {simulationLogs.length === 0 ? (
          <p className="text-gray-500">Nenhuma simulação realizada ainda.</p>
        ) : (
          <div className="space-y-2">
            {simulationLogs.map((log, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${log.result.includes('bem-sucedida') ? 'bg-green-900/20' : 'bg-red-900/20'}`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-medium">{log.result}</span>
                  <span className="text-sm text-gray-400">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-1 text-sm">
                  <p>Gás utilizado: {log.gasUsed}</p>
                  <p>Custo: {log.cost}ms</p>
                  <p>Detalhes: {log.details}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
          <h3 className="text-gray-400 mb-2">Total Opportunities</h3>
          <p className="text-2xl font-bold">{opportunities.length}</p>
        </div>
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
          <h3 className="text-gray-400 mb-2">Total Profit (USDC)</h3>
          <p className="text-2xl font-bold text-green-400">${totalProfit.toFixed(6)}</p>
        </div>
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
          <h3 className="text-gray-400 mb-2">Average Profit (USDC)</h3>
          <p className="text-2xl font-bold text-green-400">
            ${opportunities.length > 0 ? (totalProfit / opportunities.length).toFixed(6) : '0.000000'}
          </p>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="space-y-4">
        {opportunities.map((op, index) => (
          <div key={index} className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">Trade Route</h3>
                <div className="flex items-center gap-2">
                  {op.route.split(' → ').map((token, i, arr) => (
                    <React.Fragment key={i}>
                      <span className="bg-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                        {token}
                      </span>
                      {i < arr.length - 1 && (
                        <ArrowRightCircle className="w-4 h-4 text-gray-500" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <span className="text-green-400 font-bold text-xl">
                +${op.profit.toFixed(6)}
              </span>
            </div>

            {/* Detailed Steps */}
            <div className="space-y-2 mb-4">
              {op.steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-300">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span>{step.from} → {step.amount.toFixed(6)} {step.to}</span>
                  <span className="text-gray-500">via {step.dex}</span>
                </div>
              ))}
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Gas className="w-4 h-4 text-blue-400" />
                <span className="text-gray-400">Gas Fee:</span>
                <span>{op.gasFee.toFixed(6)} MATIC</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-gray-400">Flash Loan:</span>
                <span>{op.flashLoanAmount} USDC</span>
              </div>
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-purple-400" />
                <span className="text-gray-400">Total Volume:</span>
                <span>{op.totalMovimentado.toFixed(6)} USDC</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-400">Profit %:</span>
                <span>{op.profitPercentage.toFixed(4)}%</span>
              </div>
            </div>

            <div className="text-gray-500 text-sm mt-4">
              {new Date(op.timestamp).toLocaleString()}
            </div>
          </div>
        ))}

        {opportunities.length === 0 && (
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-8 text-center text-gray-500">
            <p>No arbitrage opportunities found yet...</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>Real-time arbitrage opportunity monitoring system</p>
      </footer>
    </div>
  );
}

export default App;