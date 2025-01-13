import React from 'react';

interface ModalProps {
    title?: string;
    show: boolean;
    onClose: () => void;
    children: React.ReactNode;
    width?: string; // e.g. 'w-96'
}

const Modal: React.FC<ModalProps> = ({
    title,
    show,
    onClose,
    children,
    width = 'w-96',
}) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
            <div className={`bg-white rounded-lg p-6 max-h-[80vh] overflow-y-auto space-y-4 ${width}`}>
                <div className="flex items-start justify-between">
                    {title && <h3 className="text-lg font-medium text-gray-900">{title}</h3>}
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <svg className="w-5 h-5" fill="currentColor">
                            <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 ...
                "
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
};

export default Modal;
