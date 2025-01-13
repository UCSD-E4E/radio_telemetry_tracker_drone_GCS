export function logToPython(message: string): void {
    if (window.backend?.log_message) {
        window.backend.log_message(message);
    }
}
