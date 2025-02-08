import React from 'react';
import { formatAmount } from '../web3-utils';

interface StatusBarProps {
  onExecute: () => Promise<void>;
  loading: boolean;
  latestPrice: number;
}

const StatusBar: React.FC<StatusBarProps> = ({ onExecute, loading, latestPrice }) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Network Status</h3>
        <div className="flex items-center justify-between bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-gray-300">Polygon Mainnet</span>
            </div>
            <span className="text-gray-500">|</span>
            <div className="text-sm">
              <span className="text-gray-400">Last Price:</span>
              <span className="ml-2 text-white">${formatAmount(latestPrice)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-4">
        <button
          onClick={onExecute}
          disabled={loading}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2
            ${loading 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl'
            }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Executing Flash Loan...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Execute Flash Loan</span>
            </>
          )}
        </button>
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-500">
          {loading 
            ? 'Transaction in progress. Please wait...'
            : 'Make sure you have sufficient funds before executing'
          }
        </p>
      </div>
    </div>
  );
};

export default StatusBar;
