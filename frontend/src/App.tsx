import { useEffect, useState } from 'react';
import { fetchBackend } from './utils/backend';
import Map from './components/Map';

function App() {
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const initBackend = async () => {
      try {
        const backendInstance = await fetchBackend();
        backendInstance.error_message.connect((message: string) => {
          setError(message);
        });
      } catch (err) {
        console.error('Failed to initialize backend:', err);
        setError('Failed to initialize backend');
      }
    };

    initBackend();
  }, []);

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      position: 'relative',
      overflow: 'hidden'
    }}>
      {error && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(255, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          {error}
        </div>
      )}
      <Map center={[32.8801, -117.2340]} zoom={13} />
    </div>
  );
}

export default App;