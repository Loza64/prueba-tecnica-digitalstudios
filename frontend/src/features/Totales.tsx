import { formatMoney } from '../lib/format'

interface Props {
  debitos: number
  creditos: number
}

export function Totales({ debitos, creditos }: Props) {
  const diferencia = Math.round((debitos - creditos) * 100) / 100
  const cuadrada = diferencia === 0

  return (
    <section className="cuenta-t" aria-label="Totales de la planilla">
      <div className="cuenta-t__lado">
        <span className="cuenta-t__etiqueta">Débitos</span>
        <strong className="cuenta-t__monto">{formatMoney(debitos)}</strong>
      </div>
      <div className="cuenta-t__lado">
        <span className="cuenta-t__etiqueta">Créditos</span>
        <strong className="cuenta-t__monto">{formatMoney(creditos)}</strong>
      </div>
      <p className={`cuenta-t__saldo ${cuadrada ? 'ok' : 'error'}`}>
        {cuadrada
          ? 'La planilla está cuadrada.'
          : `La planilla está descuadrada por ${formatMoney(Math.abs(diferencia))}. No podrá enviarse a SAP.`}
      </p>
    </section>
  )
}
