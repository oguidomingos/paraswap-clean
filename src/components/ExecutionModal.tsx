import React from 'react';
import { formatAmount, formatPercentage } from '../web3-utils';

interface ExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  opportunity: {
    route: string[];
    profit: number;
    profitPercentage: number;
    totalMovementado: number;
    gasFee: number;
  } | null;
}

const ExecutionModal: React.FC<ExecutionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  opportunity
}) => {
  if (!isOpen || !opportunity) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl">
        <h3 className="text-xl font-semibold mb-4">Confirm Flash Loan Execution</h3>
        
        <div className="space-y-4 mb-6">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-2">Trade Route</div>
            <div className="flex items-center space-x-2 text-sm flex-wrap">
              {opportunity.route.map((token, idx) => (
                <React.Fragment key={idx}>
                  <span className="bg-gray-600 px-2 py-1 rounded">
                    {token}
                  </span>
                  {idx < opportunity.route.length - 1 && (
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700/50 p-3 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Expected Profit</div>
              <div className="font-medium text-green-400">
                +{formatAmount(opportunity.profit)} USDC
              </div>
              <div className="text-xs text-gray-500">
                ({formatPercentage(opportunity.profitPercentage)})
              </div>
            </div>
            <div className="bg-gray-700/50 p-3 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Gas Fee</div>
              <div className="font-medium">
                ${formatAmount(opportunity.gasFee, 4)}
              </div>
              <div className="text-xs text-gray-500">
                Estimated cost
              </div>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-400">Important</div>
                <div className="text-xs text-gray-400 mt-1">
                  This will execute a flash loan with a total volume of {formatAmount(opportunity.totalMovementado)} USDC.
                  Make sure you have enough funds to cover gas fees.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
          >
            Confirm Execution
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExecutionModal;
