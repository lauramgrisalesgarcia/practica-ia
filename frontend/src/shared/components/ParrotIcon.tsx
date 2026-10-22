// Contorno de cabeza, pico, pecho y espalda
const PARROT_OUTLINE =
  'M52 28 C56 14 74 14 80 26 C84 24 92 30 98 40 C94 44 90 44 86 42 C85 48 82 52 76 56 C80 66 81 76 74 88 C68 94 56 92 52 84 C46 76 44 66 44 58 C40 50 40 40 52 28 Z'

// Ala y cresta
const PARROT_WING = 'M50 48 C60 54 68 66 62 82 C56 70 50 64 44 62 M52 28 C48 20 44 14 38 10 M58 20 C56 12 54 8 50 4'

// Cola larga que baja desde el cuerpo
const PARROT_TAIL = 'M50 84 L42 110 C48 114 54 112 56 108 L62 86'

// Patas y rama donde se posa
const PARROT_FEET = 'M62 90 L62 100 M70 88 L70 100 M14 102 C44 108 84 106 108 98'

interface ParrotIconProps {
  className?: string
}

// Loro en línea sin relleno: el trazo toma el color del texto (currentColor)
// Es decorativo; el nombre de la plataforma lo da el texto que lo acompaña
export function ParrotIcon({ className = '' }: ParrotIconProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={PARROT_OUTLINE} />
      <path d={PARROT_WING} />
      <path d={PARROT_TAIL} />
      <path d={PARROT_FEET} />
      <circle cx="70" cy="33" r="3" />
    </svg>
  )
}
