import React from 'react';

interface TooltipProps {
    text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text }) => {
    return (
        <div className="group relative inline-block">
            <svg
                className="w-4 h-4 text-gray-400 hover:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity fixed z-[9999] pointer-events-none">
                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap absolute bottom-8 left-1/2 transform -translate-x-1/2">
                    {text}
                    <div className="w-2 h-2 bg-gray-900 transform rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                </div>
            </div>
        </div>
    );
};

export default Tooltip;
