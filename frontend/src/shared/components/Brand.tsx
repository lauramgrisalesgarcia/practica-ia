interface BrandProps {
  // light: sobre fondos oscuros (la I y la A en mint, que contrasta con ocean)
  tone?: 'dark' | 'light'
  className?: string
}

// Logo de la plataforma: «PractIcA» con la I y la A destacadas
export function Brand({ tone = 'dark', className = '' }: BrandProps) {
  const highlight = tone === 'light' ? 'text-mint' : 'text-teal'

  return (
    <span role="img" aria-label="PractIcA" className={`font-bold tracking-tight ${className}`}>
      Pract
      <span data-highlight className={highlight}>
        I
      </span>
      c
      <span data-highlight className={highlight}>
        A
      </span>
    </span>
  )
}
