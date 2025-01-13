import GlobalAppProvider from './context/GlobalAppContext';
import MainLayout from './MainLayout';
import FatalErrorModal from './components/FatalErrorModal';

/**
 * Wrap everything in GlobalAppProvider for both comms and map states.
 */
function App() {
    return (
        <GlobalAppProvider>
            <MainLayout />
            <FatalErrorModal />
        </GlobalAppProvider>
    );
}

export default App;
