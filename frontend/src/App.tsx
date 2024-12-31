import { useEffect, useState } from 'react';
import { fetchBackend, Backend } from './utils/backend';

function App() {
  const [num1, setNum1] = useState<string>('');
  const [num2, setNum2] = useState<string>('');
  const [operator, setOperator] = useState<string>('+');
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [backend, setBackend] = useState<Backend | undefined>(undefined);

  useEffect(() => {
    const loadBackend = async () => {
      try {
        const backendInstance = await fetchBackend();
        setBackend(backendInstance);

        backendInstance.calculation_result.connect((value: number) => {
          setResult(value);
          setError('');
        });

        backendInstance.error_message.connect((message: string) => {
          setError(message);
          setResult(null);
        });
      } catch (error) {
        console.error('Failed to connect to backend:', error);
        setError('Failed to connect to backend');
      }
    };

    loadBackend();
  }, []);

  const handleCalculate = async () => {
    if (backend && num1 && num2) {
      try {
        await backend.calculate(parseFloat(num1), operator, parseFloat(num2));
      } catch (error) {
        console.error('Error during calculation:', error);
        setError('Calculation failed');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Calculator App
        </h1>
      </header>
      
      <main className="bg-white rounded-lg shadow p-6 max-w-md mx-auto">
        <div className="space-y-4">
          <div className="flex space-x-4">
            <input
              type="number"
              value={num1}
              onChange={(e) => setNum1(e.target.value)}
              placeholder="First number"
              className="flex-1 p-2 border rounded"
            />
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="p-2 border rounded bg-white"
            >
              <option value="+">+</option>
              <option value="-">-</option>
              <option value="*">×</option>
              <option value="/">÷</option>
            </select>
            <input
              type="number"
              value={num2}
              onChange={(e) => setNum2(e.target.value)}
              placeholder="Second number"
              className="flex-1 p-2 border rounded"
            />
          </div>

          <button
            onClick={handleCalculate}
            className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Calculate
          </button>

          {result !== null && (
            <div className="text-center text-xl font-bold text-gray-700">
              Result: {result}
            </div>
          )}

          {error && (
            <div className="text-center text-red-500">
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;