import React from 'react';
import { formatAmount, formatPercentage, formatTimestamp } from '../web3-utils';

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

interface TransactionTableProps {
  transactions: Transaction[];
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-700">
        <thead>
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Timestamp
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Route
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Profit
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              DEXs
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Volume
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Gas Fee
            </th>
          </tr>
        </thead>
        <tbody className="bg-gray-800 divide-y divide-gray-700">
          {transactions.map((transaction) => (
            <tr key={transaction.transactionHash}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {formatTimestamp(transaction.timestamp)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {transaction.route.join(' → ')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">
                +{formatAmount(transaction.profit)} USDC ({formatPercentage(transaction.profitPercentage)})
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {transaction.buyDex} → {transaction.sellDex}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {formatAmount(transaction.totalMovementado)} USDC
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                ${formatAmount(transaction.gasFee, 4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionTable;
