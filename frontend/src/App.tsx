import GlobalAppProvider from './context/GlobalAppContext';
import MainLayout from './MainLayout';

/**
 * Wrap everything in GlobalAppProvider for both comms and map states.
 */
function App() {
    return (
        <GlobalAppProvider>
            <MainLayout />
        </GlobalAppProvider>
    );
}

export default App;
