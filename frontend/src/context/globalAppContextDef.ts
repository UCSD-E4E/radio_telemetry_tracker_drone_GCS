import { createContext } from 'react';
import type { GlobalAppState } from './globalAppTypes';

export const GlobalAppContext = createContext<GlobalAppState | null>(null); 