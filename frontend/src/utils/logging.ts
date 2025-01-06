/**
 * Utility function to log messages from JavaScript to Python backend.
 * Only logs when running in the PyQt WebEngine environment.
 */
export function logToPython(message: string): void {
    if (window.backend?.log_message) {
        window.backend.log_message(message);
    }
} 