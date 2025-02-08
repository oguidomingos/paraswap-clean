import React from 'react';
import { formatAmount } from '../web3-utils';

interface LoanAmountSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const LoanAmountSlider: React.FC<LoanAmountSliderProps> = ({
  value,
  onChange,
  min = 1000,
  max = 100000,
  step = 1000
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className="bg-gray-800/50 p-4 rounded-lg space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-sm text-gray-400">Flash Loan Amount (USDC)</label>
        <span className="text-sm font-medium">${formatAmount(value)}</span>
      </div>
      
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-blue-500
          [&::-webkit-slider-thumb]:hover:bg-blue-600
          [&::-webkit-slider-thumb]:transition-colors"
      />

      <div className="flex justify-between text-xs text-gray-500">
        <span>${formatAmount(min)}</span>
        <div className="space-x-2">
          <button
            onClick={() => onChange(25000)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            25K
          </button>
          <button
            onClick={() => onChange(50000)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            50K
          </button>
          <button
            onClick={() => onChange(100000)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            100K
          </button>
        </div>
        <span>${formatAmount(max)}</span>
      </div>
    </div>
  );
};

export default LoanAmountSlider;
