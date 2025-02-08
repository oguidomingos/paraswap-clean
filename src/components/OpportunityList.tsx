import React from 'react';
import { formatAmount, formatPercentage, formatTimestamp } from '../web3-utils';

interface Opportunity {
  route: string[];
  profit: number;
  profitPercentage: number;
  timestamp: number;
  totalMovementado: number;
  gasFee: number;
  buyDex: string;
  sellDex: string;
  buyPrice: number;
  sellPrice: number;
}

interface OpportunityListProps {
  opportunities: Opportunity[];
  onExecute: (opportunity: Opportunity) => void;
  loanAmount: number;
}

const OpportunityList: React.FC<OpportunityListProps> = ({ opportunities, onExecute, loanAmount }) => {
  const hasNewOpportunity = opportunities.length > 0 && 
    Date.now() - opportunities[0].timestamp < 10000; // Highlight if less than 10s old

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-medium">Arbitrage Opportunities</h3>
          {hasNewOpportunity && (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full animate-pulse">
              New Opportunity!
            </span>
          )}
        </div>
        <div className="text-sm text-gray-400">
          Last updated: {formatTimestamp(Date.now())}
        </div>
      </div>

      <div className="overflow-y-auto max-h-[600px] pr-2 -mr-2">
        {opportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <svg className="w-12 h-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01" />
            </svg>
            <p className="text-gray-400">No arbitrage opportunities found yet</p>
            <p className="text-sm text-gray-500 mt-2">We'll notify you when we find one!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {opportunities.map((opp, index) => (
              <div 
                key={index} 
                className={`bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-colors duration-200 ${
                  Date.now() - opp.timestamp < 10000 ? 'ring-2 ring-green-500/50' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-green-400">
                        +{formatAmount(opp.profit * (loanAmount / 1000000))} USDC
                      </span>
                      <span className="text-xs text-gray-400">
                        ({formatPercentage(opp.profitPercentage)})
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Found {formatTimestamp(opp.timestamp)}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-gray-800/50 p-3 rounded-lg">
                    <div className="text-xs text-gray-400 mb-2">Trade Route</div>
                    <div className="flex items-center space-x-2 text-sm text-gray-300 flex-wrap">
                      <div className="flex items-center">
                        <span className="bg-gray-700 px-2 py-1 rounded">{opp.route[0]}</span>
                        <div className="flex flex-col mx-2">
                          <span className="text-xs text-green-400">{opp.buyDex}</span>
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <span className="bg-gray-700 px-2 py-1 rounded">{opp.route[1]}</span>
                        <div className="flex flex-col mx-2">
                          <span className="text-xs text-red-400">{opp.sellDex}</span>
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                        <span className="bg-gray-700 px-2 py-1 rounded">{opp.route[2]}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-800/50 p-2 rounded">
                      <div className="text-xs text-gray-400">Buy Price ({opp.buyDex})</div>
                      <div className="font-medium">{formatAmount(opp.buyPrice)} {opp.route[1]}/USDC</div>
                    </div>
                    <div className="bg-gray-800/50 p-2 rounded">
                      <div className="text-xs text-gray-400">Sell Price ({opp.sellDex})</div>
                      <div className="font-medium">{formatAmount(opp.sellPrice)} {opp.route[1]}/USDC</div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-800/50 p-2 rounded">
                    <div className="text-xs text-gray-400">Total Volume</div>
                    <div className="text-sm font-medium">{formatAmount(opp.totalMovementado)} USDC</div>
                  </div>
                  <div className="bg-gray-800/50 p-2 rounded">
                    <div className="text-xs text-gray-400">Gas Fee</div>
                    <div className="text-sm font-medium">${formatAmount(opp.gasFee, 4)}</div>
                  </div>
                  <div className="bg-gray-800/50 p-2 rounded">
                    <div className="text-xs text-gray-400">Spread</div>
                    <div className="text-sm font-medium text-green-400">{formatPercentage(opp.profitPercentage)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OpportunityList;
