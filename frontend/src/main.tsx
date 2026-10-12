import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { devAuthService } from './features/auth/mockUsers'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App authService={devAuthService} />
  </StrictMode>,
)
