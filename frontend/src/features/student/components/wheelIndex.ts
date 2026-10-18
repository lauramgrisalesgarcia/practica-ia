// Opción centrada en la rueda según su desplazamiento
export function indexAtScroll(scrollTop: number, itemHeight: number, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.round(scrollTop / itemHeight)))
}

// Opción al moverse con las flechas (step = 1 o -1); sin opción elegida empieza por la primera
export function stepIndex(selected: number, step: number, count: number): number {
  return selected === -1 ? 0 : Math.min(count - 1, Math.max(0, selected + step))
}
