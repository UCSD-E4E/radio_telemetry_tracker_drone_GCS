// frontend/src/App.tsx
import { useEffect, useState } from 'react';
import { fetchBackend } from './utils/backend';
import Map from './components/Map';

function App() {
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const initBackend = async () => {
      try {
        const backendInstance = await fetchBackend();
        backendInstance.error_message.connect(setError);
      } catch (err) {
        console.error('Failed to initialize backend:', err);
        setError('Failed to initialize backend');
      }
    };

    initBackend();
  }, []);

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg">
          {error}
        </div>
      )}
      <Map center={[32.8801, -117.2340]} zoom={13} />
    </div>
  );
}

export default App;
