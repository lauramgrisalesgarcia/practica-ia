import { Fragment } from 'react'

const BLANK = '___'

// Frase de un ejercicio con el hueco («___») resaltado
export function BlankSentence({ text }: { text: string }) {
  const parts = text.split(BLANK)
  return parts.map((part, index) => (
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 && <span className="font-semibold tracking-widest text-ocean">{BLANK}</span>}
    </Fragment>
  ))
}
