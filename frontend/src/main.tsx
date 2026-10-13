import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { createServices } from './composition'
import { SessionProvider } from './features/session/SessionProvider'
import { ServicesProvider } from './services/ServicesProvider'

const services = createServices({ apiUrl: import.meta.env.VITE_API_URL })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ServicesProvider services={services}>
      <BrowserRouter>
        <SessionProvider>
          <App />
        </SessionProvider>
      </BrowserRouter>
    </ServicesProvider>
  </StrictMode>,
)
