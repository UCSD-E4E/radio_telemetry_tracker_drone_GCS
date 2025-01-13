import React from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useContext } from 'react';
import { GlobalAppContext } from '../../../context/globalAppContextDef';

interface MessageProps {
    message: string;
    type: 'error' | 'success';
}

const Message: React.FC<MessageProps> = ({ message, type }) => {
    const context = useContext(GlobalAppContext);
    if (!context) return null;
    const { setMessageVisible, messageVisible } = context;

    if (!messageVisible) return null;

    const styles = {
        error: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-700',
            icon: <ExclamationCircleIcon className="h-5 w-5 text-red-500" />,
            backdrop: 'bg-red-500/5'
        },
        success: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            text: 'text-green-700',
            icon: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
            backdrop: 'bg-green-500/5'
        }
    };

    const currentStyle = styles[type];

    return (
        <div 
            role="alert"
            className={`relative overflow-hidden rounded-lg border ${currentStyle.border} ${currentStyle.backdrop}`}
        >
            <div className={`relative z-10 p-4 ${currentStyle.bg}`}>
                <div className="flex items-start gap-3">
                    {currentStyle.icon}
                    <div className="flex-1 pt-0.5">
                        <p className={`text-sm font-medium ${currentStyle.text}`}>
                            {message}
                        </p>
                    </div>
                </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <button 
                onClick={() => setMessageVisible(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
                <XMarkIcon className="h-5 w-5" />
            </button>
        </div>
    );
};

export default Message; 