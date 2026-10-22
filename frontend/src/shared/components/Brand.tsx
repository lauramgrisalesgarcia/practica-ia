import { ParrotIcon } from './ParrotIcon'

interface BrandProps {
  // light: sobre fondos oscuros (todo en cream: apricot sobre ocean no tiene contraste para texto)
  tone?: 'dark' | 'light'
  className?: string
}

// Logo de la plataforma: el loro y «PractIcA» con la I y la A destacadas
export function Brand({ tone = 'dark', className = '' }: BrandProps) {
  const highlight = tone === 'light' ? 'text-cream' : 'text-ocean'
  // El loro lleva su propio color de la paleta, sin heredar el del texto
  const parrotColor = tone === 'light' ? 'text-cream' : 'text-ink'

  return (
    <span role="img" aria-label="PractIcA" className={`inline-flex items-center gap-1.5 font-bold tracking-tight ${className}`}>
      <ParrotIcon className={`h-[1.5em] w-auto shrink-0 ${parrotColor}`} />
      <span>
        Pract
        <span data-highlight className={highlight}>
          I
        </span>
        c
        <span data-highlight className={highlight}>
          A
        </span>
      </span>
    </span>
  )
}
