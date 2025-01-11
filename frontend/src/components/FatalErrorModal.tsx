import React, { useContext } from 'react';
import { GlobalAppContext } from '../context/globalAppContextDef';

const FatalErrorModal: React.FC = () => {
    const context = useContext(GlobalAppContext);
    if (!context) throw new Error('FatalErrorModal must be used within GlobalAppProvider');

    const { fatalError } = context;

    if (!fatalError) return null;

    return (
        <div className="fixed inset-0 bg-[#0078D7] text-white flex items-center justify-center z-[99999] font-mono">
            <div className="w-[600px] max-w-[90%] p-8 space-y-8">
                <div className="space-y-4">
                    <div className="text-[96px]">:(</div>
                    <h1 className="text-2xl font-bold">
                        Your field device ran into a problem
                    </h1>
                </div>

                <div className="space-y-6 text-lg">
                    <div className="space-y-2">
                        <p>
                            Please follow these steps to recover:
                        </p>
                        <ol className="list-decimal list-inside space-y-1 ml-4">
                            <li>Retrieve your field device</li>
                            <li>Power cycle the field device</li>
                            <li>Close and restart the Ground Control System application</li>
                        </ol>
                        <p className="mt-4 text-sm opacity-80">
                            To determine what caused this error, check the logs on the field device software.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FatalErrorModal; 