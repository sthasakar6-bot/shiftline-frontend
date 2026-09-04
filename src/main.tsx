import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { setupAutoUpdate } from './lib/autoUpdate'
import { setupInstallPromptCapture } from './lib/installPrompt'

setupAutoUpdate()
setupInstallPromptCapture()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
