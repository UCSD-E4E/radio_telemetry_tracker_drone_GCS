import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    content: string;
    children: ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isHovered && elementRef.current) {
            const rect = elementRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 5,
                left: rect.left + rect.width / 2,
            });
        }
    }, [isHovered]);

    return (
        <div
            ref={elementRef}
            className="relative inline-block"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {children}
            {isHovered && createPortal(
                <div
                    className="fixed z-[9999] pointer-events-none"
                    style={{
                        top: position.top,
                        left: position.left,
                    }}
                >
                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap transform -translate-x-1/2">
                        {content}
                        <div className="w-2 h-2 bg-gray-900 transform rotate-45 absolute left-1/2 -translate-x-1/2 -top-1"></div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Tooltip;
