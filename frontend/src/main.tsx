import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { devAuthService, devTeacherService } from './dev/devServices'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App authService={devAuthService} teacherService={devTeacherService} />
  </StrictMode>,
)
