import React, { useState, useEffect } from 'react';
import OpportunityList from './components/OpportunityList';
import TokenPriceChart from './components/TokenPriceChart';
import StatusBar from './components/StatusBar';
import LoadingPopup from './components/LoadingPopup';
import ExecutionModal from './components/ExecutionModal';
import Toast from './components/Toast';
import LoanAmountSlider from './components/LoanAmountSlider';
import TransactionTable from './components/TransactionTable';
import { getErrorMessage } from './web3-utils';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Transaction {
  timestamp: number;
  route: string[];
  profit: number;
  profitPercentage: number;
  buyDex: string;
  sellDex: string;
  buyPrice: number;
  sellPrice: number;
  totalMovementado: number;
  gasFee: number;
  transactionHash: string;
}

const App: React.FC = () => {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [prices, setPrices] = useState<{[key: string]: {[dex: string]: number}}>({});
  const [tokens] = useState([
    'WMATIC', 'USDT', 'DAI', 'WETH',
    'QUICK', 'SUSHI', 'AAVE', 'LINK', 'WBTC',
    'CRV', 'BAL', 'GHST', 'DPI'
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [nextToastId, setNextToastId] = useState(0);
  const [loanAmount, setLoanAmount] = useState(10000); // Default 10k USDC
  const [autoExecute, setAutoExecute] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const fetchOpportunities = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/opportunities?amount=${loanAmount}`);
      const data = await response.json();
      setOpportunities(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const fetchPrices = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/prices');
      const data = await response.json();
      setPrices(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const newToast = { id: nextToastId, message, type };
    setToasts(prev => [...prev, newToast]);
    setNextToastId(prev => prev + 1);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const executeFlashLoan = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: loanAmount })
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setTransactions(prev => [...prev, {
        timestamp: Date.now(),
        route: selectedOpportunity.route,
        profit: selectedOpportunity.profit,
        profitPercentage: selectedOpportunity.profitPercentage,
        buyDex: selectedOpportunity.buyDex,
        sellDex: selectedOpportunity.sellDex,
        buyPrice: selectedOpportunity.buyPrice,
        sellPrice: selectedOpportunity.sellPrice,
        totalMovementado: selectedOpportunity.totalMovementado,
        gasFee: selectedOpportunity.gasFee,
        transactionHash: data.transactionHash
      }]);
      setError(null);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      addToast(errorMessage, 'error');
      setError(errorMessage);
    } finally {
      setLoading(false);
      setIsModalOpen(false);
      setSelectedOpportunity(null);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchOpportunities();
    fetchPrices();

    // Set up polling intervals
    const opportunitiesInterval = setInterval(fetchOpportunities, 5000);
    const pricesInterval = setInterval(fetchPrices, 5000);

    return () => {
      clearInterval(opportunitiesInterval);
      clearInterval(pricesInterval);
    };
  }, [loanAmount]);

  useEffect(() => {
    if (autoExecute && opportunities.length > 0 && !loading && selectedOpportunity) {
      executeFlashLoan();
    }
  }, [autoExecute, opportunities, loanAmount, loading, selectedOpportunity]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedOpportunity(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Arbitrage Monitor
          </h1>
          <p className="text-gray-400 mt-2">Real-time arbitrage opportunities on Polygon</p>
        </header>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Token Prices</h2>
              <TokenPriceChart prices={prices} tokens={tokens} />
            </div>

            <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
              <StatusBar 
                onExecute={executeFlashLoan} 
                loading={loading}
                latestPrice={prices.WMATIC ? Math.max(
                  prices.WMATIC.quickswap || 0,
                  prices.WMATIC.sushiswap || 0,
                  prices.WMATIC.uniswap || 0
                ) : 0}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Recent Opportunities</h2>
            <div className="space-y-4">
              <LoanAmountSlider
                value={loanAmount}
                onChange={setLoanAmount}
                min={1000}
                max={100000}
                step={1000}
              />
              <OpportunityList 
                opportunities={opportunities}
                onExecute={() => {}}
                loanAmount={loanAmount}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoExecute"
                className="h-5 w-5 rounded text-blue-500 focus:ring-blue-500 cursor-pointer"
                checked={autoExecute}
                onChange={(e) => setAutoExecute(e.target.checked)}
              />
              <label htmlFor="autoExecute" className="text-gray-300">Auto-Execute</label>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Transaction Log</h2>
          <TransactionTable transactions={transactions} />
        </div>
      </div>

      <LoadingPopup
        isOpen={loading}
        message="Executing flash loan... Please confirm the transaction in your wallet."
      />
    </div>
  );
};

export default App;
