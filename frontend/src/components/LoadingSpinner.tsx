import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue-500' | 'red-500' | 'green-500' | 'purple-500';
  message?: string;
  overlay?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue-500',
  message = '',
  overlay = false,
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const colorClasses = {
    'blue-500': 'border-blue-500',
    'red-500': 'border-red-500',
    'green-500': 'border-green-500',
    'purple-500': 'border-purple-500',
  };

  const spinner = (
    <div className="flex flex-col justify-center items-center">
      <div
        className={`animate-spin rounded-full border-t-4 ${colorClasses[color]} ${sizeClasses[size]}`}
      ></div>
      {message && (
        <p className="mt-4 text-gray-700 text-lg font-medium">{message}</p>
      )}
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" role="status" aria-live="polite">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center h-full w-full" role="status" aria-live="polite">
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
