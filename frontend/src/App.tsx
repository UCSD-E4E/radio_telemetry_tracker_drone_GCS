import { CommsProvider } from './contexts/CommsContext';
import { MapProvider } from './contexts/MapContext';
import MainLayout from './MainLayout';

function App() {
    return (
        <CommsProvider>
            <MapProvider>
                <MainLayout />
            </MapProvider>
        </CommsProvider>
    );
}

export default App;
