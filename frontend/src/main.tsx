import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { createServices } from './composition'
import { SessionProvider } from './features/session/SessionProvider'
import { ServicesProvider } from './services/ServicesProvider'

const services = createServices({ apiUrl: import.meta.env.VITE_API_URL })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ServicesProvider services={services}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </ServicesProvider>
  </StrictMode>,
)
