import type { ReactNode } from 'react'
import { ServicesContext, type Services } from './servicesContext'

interface ServicesProviderProps {
  services: Services
  children: ReactNode
}

export function ServicesProvider({ services, children }: ServicesProviderProps) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
}
