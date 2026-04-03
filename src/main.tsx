import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import './style.css'
import 'lenis/dist/lenis.css'
import { initThemeFromStorage } from './theme/initTheme'
import { hydrateUiPreferencesFromServer } from './theme/syncUserUiPreferences'
import { useAuthStore } from './store/useAuthStore'
import './utils/sendNotification' // Make sendNotification available globally

initThemeFromStorage()

// Ensure framer-motion animations complete even in constrained environments
// (tunnels, throttled browsers). This adds a safety-net style that forces
// opacity to 1 on main content areas after a brief delay.
requestAnimationFrame(() => {
  const style = document.createElement('style')
  style.textContent = 'main > *, [class*="min-h"] > * { opacity: 1 !important; }'
  document.head.appendChild(style)
})

// Initialize auth store
useAuthStore.getState().initialize()

void hydrateUiPreferencesFromServer()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)


