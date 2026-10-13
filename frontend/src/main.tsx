import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { devAuthService, devTeacherService } from './dev/devServices'
import { ServicesProvider } from './services/ServicesProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ServicesProvider services={{ authService: devAuthService, teacherService: devTeacherService }}>
      <App />
    </ServicesProvider>
  </StrictMode>,
)
