import '@fontsource/zen-old-mincho/400.css';
import '@fontsource/zen-old-mincho/700.css';
import '@fontsource/noto-sans-jp/400.css';
import './styles/tokens.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { configureAmplify } from './features/auth/amplify';
import { AuthProvider } from './features/auth/AuthProvider';

configureAmplify();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('#root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
