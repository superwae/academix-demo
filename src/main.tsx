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


