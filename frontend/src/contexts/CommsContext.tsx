import { createContext } from 'react';
import type { CommsContextValue } from '../types/commsContext';

const CommsContext = createContext<CommsContextValue | null>(null);
export { CommsContext }; 