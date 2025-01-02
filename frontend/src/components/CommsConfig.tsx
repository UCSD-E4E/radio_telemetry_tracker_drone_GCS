import React, { useState, useEffect, MouseEvent } from 'react';

interface CommsConfigProps {
  onConnect: () => void;
}

const InfoTooltip = ({ text }: { text: string }) => {
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const updatePosition = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      top: rect.top - 5,
      left: rect.left + rect.width / 2
    });
  };

  return (
    <div className="relative inline-block group" onMouseEnter={updatePosition}>
      <div className="cursor-help w-3.5 h-3.5 flex items-center justify-center">
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="2"/>
          <circle cx="8" cy="4.5" r="0.5" fill="currentColor"/>
          <rect x="7.5" y="7" width="1" height="5" fill="currentColor"/>
        </svg>
      </div>
      <div 
        style={{ 
          top: tooltipPosition.top, 
          left: tooltipPosition.left 
        }}
        className="fixed transform -translate-x-1/2 -translate-y-full w-48 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[99999]"
      >
        {text}
        <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-full w-2 h-2 bg-gray-900 rotate-45"></div>
      </div>
    </div>
  );
};

export const CommsConfig: React.FC<CommsConfigProps> = ({ onConnect }) => {
  const [interfaceType, setInterfaceType] = useState<'serial' | 'simulated'>('serial');
  const [serialPorts, setSerialPorts] = useState<string[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [baudRate, setBaudRate] = useState<number>(57600);
  const [host, setHost] = useState<string>('localhost');
  const [tcpPort, setTcpPort] = useState<number>(50000);
  const [serverMode, setServerMode] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [ackTimeout, setAckTimeout] = useState<number>(1000);
  const [maxRetries, setMaxRetries] = useState<number>(3);
  const [showCustomBaudRate, setShowCustomBaudRate] = useState(false);
  const [customBaudRateInput, setCustomBaudRateInput] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');

  // Get list of available serial ports
  useEffect(() => {
    let timeoutId: number;

    const getSerialPorts = async () => {
      if (!window.backend) {
        console.log('Backend not ready, waiting...');
        timeoutId = window.setTimeout(getSerialPorts, 1000);
        return;
      }
      try {
        console.log('Fetching serial ports...');
        const ports = await window.backend.get_serial_ports();
        console.log('Received serial ports:', ports);
        setSerialPorts(ports);
        if (ports.length > 0) {
          setSelectedPort(ports[0]);
        }
      } catch (error) {
        console.error('Error getting serial ports:', error);
      }
    };

    getSerialPorts();

    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    if (!window.backend) return;
    
    const handleStatus = (status: string) => {
        setConnectionStatus(status);
    };
    
    window.backend.connection_status.connect(handleStatus);
    return () => {
        window.backend.connection_status.disconnect(handleStatus);
    };
  }, []);

  const handleConnect = async () => {
    if (!window.backend) return;
    setIsConnecting(true);

    const config = {
        interface_type: interfaceType,
        port: interfaceType === 'serial' ? selectedPort : null,
        baudrate: interfaceType === 'serial' ? baudRate : undefined,
        host: interfaceType === 'simulated' ? host : undefined,
        tcp_port: interfaceType === 'simulated' ? tcpPort : undefined,
        server_mode: interfaceType === 'simulated' ? serverMode : undefined,
        ack_timeout: ackTimeout,
        max_retries: maxRetries,
    };

    const handleError = (message: string) => {
        setIsConnecting(false);
        setErrorMessage(message);
        setShowErrorModal(true);
    };
    window.backend.error_message.connect(handleError);

    const success = await window.backend.initialize_comms(config);
    if (success) {
        onConnect();
    }

    window.backend.error_message.disconnect(handleError);
    setIsConnecting(false);
  };

  const handleCustomBaudRate = () => {
    const rate = Number(customBaudRateInput);
    if (!isNaN(rate) && rate > 0) {
      setBaudRate(rate);
      setShowCustomBaudRate(false);
      setCustomBaudRateInput('');
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-lg font-semibold text-gray-900">Communications Setup</h2>
        <p className="mt-1 text-sm text-gray-500">Configure how to connect to the drone's radio system</p>
      </div>
      
      {/* Interface Type Selection */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={() => setInterfaceType('serial')}
            className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
              interfaceType === 'serial'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium mb-1">Serial Connection</div>
            <div className="text-sm text-gray-500">Connect directly to radio hardware</div>
          </button>
          <button
            onClick={() => setInterfaceType('simulated')}
            className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
              interfaceType === 'simulated'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium mb-1">Simulated</div>
            <div className="text-sm text-gray-500">Test with simulated data over TCP/IP</div>
          </button>
        </div>

        {/* Serial Configuration */}
        {interfaceType === 'serial' && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="flex items-center gap-1 mb-2">
                <label className="text-sm font-medium text-gray-700">Serial Port</label>
                <InfoTooltip text="The COM port where your radio device is connected. On Windows, this is usually COM3 or COM4. Check Device Manager if unsure." />
              </div>
              <select
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {serialPorts.length === 0 && (
                  <option value="">No serial ports found</option>
                )}
                {serialPorts.map(port => (
                  <option key={port} value={port}>{port}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-2">
                <label className="text-sm font-medium text-gray-700">Baud Rate</label>
                <InfoTooltip text="Communication speed that must match your radio device. Common rates are: 9600 (slower but reliable), 57600 (balanced), 115200+ (faster but may be less reliable). Check your radio's documentation or configuration to ensure it matches." />
              </div>
              <select
                value={baudRate}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value === -1) {
                    // Show prompt for custom baud rate
                    setShowCustomBaudRate(true);
                  } else {
                    setBaudRate(value);
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={4800}>4800</option>
                <option value={9600}>9600</option>
                <option value={19200}>19200</option>
                <option value={38400}>38400</option>
                <option value={57600}>57600</option>
                <option value={115200}>115200</option>
                <option value={230400}>230400</option>
                <option value={460800}>460800</option>
                <option value={921600}>921600</option>
                <option value={-1}>Custom...</option>
              </select>
            </div>
          </div>
        )}

        {/* Simulated Configuration */}
        {interfaceType === 'simulated' && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="flex items-center gap-1 mb-2">
                <label className="text-sm font-medium text-gray-700">Host</label>
                <InfoTooltip text="IP address or hostname of the simulation server. Use 'localhost' for local testing, or enter a remote IP to connect to a different computer running the simulation." />
              </div>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="localhost"
              />
            </div>
            <div>
              <div className="flex items-center gap-1 mb-2">
                <label className="text-sm font-medium text-gray-700">TCP Port</label>
                <InfoTooltip text="Network port for TCP connection. Default is 50000. Change only if the default port is in use or if connecting to a simulation using a different port." />
              </div>
              <input
                type="number"
                value={tcpPort}
                onChange={(e) => setTcpPort(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="50000"
              />
            </div>
            <div className="pt-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={serverMode}
                  onChange={(e) => setServerMode(e.target.checked)}
                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Server Mode</span>
                <InfoTooltip text="One device must be server, one must be client. Enable if the hardware config on the Field Device Software is set to client mode oppose to server mode. WARNING: Program will freeze while waiting for incoming connection!" />
              </label>
              {serverMode && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-yellow-700">
                      Warning: The program will freeze while waiting for an incoming connection. Make sure the client device is ready before connecting.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Settings */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <svg 
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Advanced Settings
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <div className="flex items-center gap-1 mb-2">
                <label className="text-sm font-medium text-gray-700">ACK Timeout (ms)</label>
                <InfoTooltip text="How long to wait for an acknowledgment before considering a transmission failed. Increase this value if you're experiencing frequent timeouts." />
              </div>
              <input
                type="number"
                value={ackTimeout}
                onChange={(e) => setAckTimeout(Number(e.target.value))}
                min={100}
                max={5000}
                step={100}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <div className="flex items-center gap-1 mb-2">
                <label className="text-sm font-medium text-gray-700">Max Retries</label>
                <InfoTooltip text="Maximum number of times to retry a failed transmission. Increase for better reliability at the cost of latency, decrease for lower latency but less reliability." />
              </div>
              <input
                type="number"
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value))}
                min={0}
                max={10}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Custom Baud Rate Modal */}
      {showCustomBaudRate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
          <div className="bg-white rounded-lg p-6 w-96 space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Custom Baud Rate</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter baud rate
              </label>
              <input
                type="number"
                value={customBaudRateInput}
                onChange={(e) => setCustomBaudRateInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a positive number"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomBaudRate();
                  } else if (e.key === 'Escape') {
                    setShowCustomBaudRate(false);
                    setCustomBaudRateInput('');
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCustomBaudRate(false);
                  setCustomBaudRateInput('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomBaudRate}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect Button */}
      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className={`w-full px-4 py-2 ${
            isConnecting 
                ? 'bg-blue-400 cursor-wait' 
                : 'bg-blue-500 hover:bg-blue-600'
        } text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors`}
      >
        {isConnecting ? (
            <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                        fill="none"
                    />
                    <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                </svg>
                {connectionStatus || 'Connecting...'}
            </div>
        ) : (
            'Connect'
        )}
      </button>

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90%] space-y-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">Connection Status</h3>
            </div>
            <div className="text-sm text-gray-600 whitespace-pre-line">
              {errorMessage}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowErrorModal(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommsConfig; 