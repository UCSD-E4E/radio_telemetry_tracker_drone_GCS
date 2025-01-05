import React from 'react';

interface LoadingSpinnerProps {
    text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ text }) => {
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            {text && <div className="text-gray-600">{text}</div>}
        </div>
    );
};

export default LoadingSpinner;
