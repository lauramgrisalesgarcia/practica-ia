import { ParrotIcon } from './ParrotIcon'

interface BrandProps {
  // light: sobre fondos oscuros (la I y la A en mint, que contrasta con ocean)
  tone?: 'dark' | 'light'
  className?: string
}

// Logo de la plataforma: el loro y «PractIcA» con la I y la A destacadas
export function Brand({ tone = 'dark', className = '' }: BrandProps) {
  const highlight = tone === 'light' ? 'text-mint' : 'text-ocean'

  return (
    <span role="img" aria-label="PractIcA" className={`inline-flex items-center gap-1.5 font-bold tracking-tight ${className}`}>
      <ParrotIcon className="size-[1.4em] shrink-0" />
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
