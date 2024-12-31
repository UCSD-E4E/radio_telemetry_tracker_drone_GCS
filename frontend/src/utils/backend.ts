export interface Backend {
    calculate(_num1: number, _operator: string, _num2: number): Promise<number>;
    calculation_result: {
        connect: (_callback: (_result: number) => void) => void;
        disconnect: (_callback: (_result: number) => void) => void;
    };
    error_message: {
        connect: (_callback: (_message: string) => void) => void;
        disconnect: (_callback: (_message: string) => void) => void;
    };
}

declare global {
    interface Window {
        QWebChannel: new (
            _transport: unknown,
            _callback: (_channel: unknown) => void
        ) => void;
        qt: {
            webChannelTransport: unknown;
        };
        backend: Backend;
        backendLoaded: boolean;
    }
}

export async function fetchBackend(): Promise<Backend> {
    return new Promise((resolve) => {
        if (window.backend) {
            resolve(window.backend);
        } else {
            window.addEventListener('backendLoaded', () => {
                resolve(window.backend);
            });
        }
    });
} 