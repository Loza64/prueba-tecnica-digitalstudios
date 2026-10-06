import type { Movimiento } from '../api/planillas'

const money = new Intl.NumberFormat('es-SV', {
  style: 'currency',
  currency: 'USD',
})
const dateTime = new Intl.DateTimeFormat('es-SV', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export const formatMoney = (value: number) => money.format(value)
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso))

// Suma en centavos para evitar errores de punto flotante.
export function sumar(movimientos: Movimiento[], tipo: 'D' | 'C'): number {
  const cents = movimientos
    .filter((m) => m.tipo === tipo)
    .reduce((acc, m) => acc + Math.round(m.monto * 100), 0)
  return cents / 100
}
