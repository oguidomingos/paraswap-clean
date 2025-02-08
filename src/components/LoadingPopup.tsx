import React from 'react';

interface LoadingPopupProps {
  isOpen: boolean;
  message?: string;
}

const LoadingPopup: React.FC<LoadingPopupProps> = ({ isOpen, message = 'Processing transaction...' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-white text-center">{message}</p>
          <p className="text-gray-400 text-sm text-center mt-2">Please wait while we process your request</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingPopup;
