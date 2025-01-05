import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ text }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const iconRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isHovered && iconRef.current) {
            const rect = iconRef.current.getBoundingClientRect();
            setPosition({
                top: rect.top - 30,
                left: rect.left + rect.width / 2,
            });
        }
    }, [isHovered]);

    return (
        <div 
            ref={iconRef}
            className="relative inline-block"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
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
            {isHovered && createPortal(
                <div 
                    className="fixed z-[9999] pointer-events-none"
                    style={{ 
                        top: position.top,
                        left: position.left,
                    }}
                >
                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap transform -translate-x-1/2">
                        {text}
                        <div className="w-2 h-2 bg-gray-900 transform rotate-45 absolute left-1/2 -translate-x-1/2 top-full -mt-1"></div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Tooltip;
