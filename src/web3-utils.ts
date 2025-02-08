import { ethers } from 'ethers';

export const shortenAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatAmount = (amount: number, decimals: number = 6) => {
  return amount.toFixed(decimals);
};

export const formatPercentage = (percentage: number) => {
  return `${percentage.toFixed(2)}%`;
};

export const formatTimestamp = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString();
};

export const formatGasPrice = (gasPrice: bigint) => {
  return `${ethers.formatUnits(gasPrice, 'gwei')} gwei`;
};

export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.reason) return error.reason;
  return 'An unknown error occurred';
};

export const getPriceImpact = (inputAmount: number, outputAmount: number) => {
  const impact = ((outputAmount - inputAmount) / inputAmount) * 100;
  return impact.toFixed(2);
};

export const formatUSD = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
