import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'
import './utils/storageMonitor' // ✅ Мониторинг localStorage
import { prewarmSessionCache } from './utils/sessionManager'

// Pre-warm session cache from localStorage BEFORE React renders
// This makes the first API call faster (avoids parsing localStorage)
prewarmSessionCache();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
