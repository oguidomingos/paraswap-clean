import React from 'react';
import { formatAmount } from '../web3-utils';

interface TokenPriceChartProps {
  prices: {[key: string]: {[dex: string]: number}};
  tokens: string[];
}

const TokenPriceChart: React.FC<TokenPriceChartProps> = ({ prices, tokens }) => {
  const getBestDex = (tokenPrices: {[dex: string]: number}) => {
    if (!tokenPrices) return null;
    const entries = Object.entries(tokenPrices);
    return entries.reduce((best, current) => 
      current[1] > best[1] ? current : best
    , entries[0]);
  };

  const getPriceSpread = (tokenPrices: {[dex: string]: number}) => {
    if (!tokenPrices) return 0;
    const prices = Object.values(tokenPrices);
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    return ((max - min) / min) * 100;
  };

  return (
    <div className="space-y-4">
      <div className="overflow-y-auto max-h-[600px] space-y-4">
        {tokens.map(token => {
          const bestDex = getBestDex(prices[token]);
          const priceSpread = getPriceSpread(prices[token]);
          
          return (
            <div key={token} className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-sm font-medium text-gray-300">{token}</h3>
                {bestDex && (
                  <div className="text-xs text-gray-400">
                    Best: {bestDex[0]}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {prices[token] && Object.entries(prices[token]).map(([dex, price]) => {
                  const isBest = bestDex && dex === bestDex[0];
                  return (
                    <div 
                      key={dex} 
                      className={`bg-gray-800/50 rounded p-2 ${
                        isBest ? 'ring-1 ring-green-500/50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-xs text-gray-400">{dex}</div>
                        {isBest && (
                          <span className="w-2 h-2 bg-green-400 rounded-full" />
                        )}
                      </div>
                      <div className="font-medium">{formatAmount(price)} USDC</div>
                    </div>
                  );
                })}
                {!prices[token] && (
                  <div className="col-span-2 sm:col-span-3 text-gray-500 text-sm">
                    No price data available
                  </div>
                )}
              </div>

              {priceSpread > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Price Spread</span>
                    <span className={`font-medium ${
                      priceSpread > 1 ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {formatAmount(priceSpread, 2)}%
                    </span>
                  </div>
                  <div className="h-1 bg-gray-600 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        priceSpread > 1 ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                      style={{ width: `${Math.min(priceSpread * 10, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-400 pt-4 border-t border-gray-700">
        <div>
          {tokens.length} tokens monitored
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span>Live Data</span>
        </div>
      </div>
    </div>
  );
};

export default TokenPriceChart;
