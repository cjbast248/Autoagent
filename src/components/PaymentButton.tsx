import React from 'react';

interface PaymentButtonProps {
  text: string;
  url: string;
  amount: number;
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  text,
  url,
  amount
}) => {
  const handlePayment = () => {
    window.open(url, '_blank');
  };

  return (
    <div className="flex justify-center my-6">
      <button 
        onClick={handlePayment}
        className="w-32 h-32 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer shadow-lg hover:shadow-xl"
      >
        <span className="text-white text-2xl font-bold">
          {amount}$
        </span>
      </button>
    </div>
  );
};