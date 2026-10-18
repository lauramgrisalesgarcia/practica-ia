// Retardo de los servicios en memoria, para ver los estados de carga
export const DEV_DELAY_MS = 500

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
