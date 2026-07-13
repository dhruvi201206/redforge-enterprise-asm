import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { RedforgeStateProvider } from './context/RedforgeStateContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RedforgeStateProvider>
      <App />
    </RedforgeStateProvider>
  </StrictMode>,
);
