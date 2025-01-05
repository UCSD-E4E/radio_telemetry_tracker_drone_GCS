import React from 'react';

interface ErrorModalProps {
    errorMessage: string;
    onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ errorMessage, onClose }) => {
    if (!errorMessage) return null;

    const errorParts = errorMessage.split('\n\n');
    const mainError = errorParts[0];
    const details = errorParts.slice(1);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
            <div className="bg-white rounded-lg p-6 w-[32rem] max-h-[80vh] overflow-y-auto space-y-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-red-700">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <h3 className="text-lg font-medium">Connection Error</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                </div>

                <div className="text-red-700 font-medium">{mainError}</div>

                {details.map((section, index) => {
                    const lines = section.split('\n');
                    const title = lines[0];
                    const items = lines.slice(1).filter(line => line.trim());

                    return (
                        <div key={index} className="space-y-2">
                            {title && <div className="font-medium text-gray-700">{title}</div>}
                            {items.length > 0 && (
                                <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm pl-2">
                                    {items.map((item, i) => (
                                        <li key={i}>{item.replace(/^[•\d.]\s*/, '')}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    );
                })}

                <div className="flex justify-end pt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white 
                        bg-red-600 hover:bg-red-700 rounded-md focus:outline-none 
                        focus:ring-2 focus:ring-red-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ErrorModal; 