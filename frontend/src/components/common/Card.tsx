import React, { ReactNode } from 'react';

interface CardProps {
    title?: string;
    children: ReactNode;
    className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className }) => {
    return (
        <div className={`card ${className || ''}`}>
            {title && (
                <div className="border-b border-gray-200 pb-2 mb-3">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                </div>
            )}
            {children}
        </div>
    );
};

export default Card;
