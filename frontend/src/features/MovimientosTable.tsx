import type { Movimiento } from '../api/planillas'
import { formatMoney } from '../lib/format'

interface Props {
  movimientos: Movimiento[]
  subtotal?: { etiqueta: string; debitos: number; creditos: number }
}

export function MovimientosTable({ movimientos, subtotal }: Props) {
  return (
    <div className="tabla-scroll">
      <table>
        <caption className="sr-only">Movimientos de la planilla</caption>
        <thead>
          <tr>
            <th scope="col">Empleado</th>
            <th scope="col">Centro de costo</th>
            <th scope="col">Concepto</th>
            <th scope="col">Tipo</th>
            <th scope="col" className="num">
              Monto
            </th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((m) => (
            <tr key={m.id}>
              <td>{m.empleadoNombre}</td>
              <td>{m.centroCostoNombre}</td>
              <td>{m.concepto}</td>
              <td>{m.tipo === 'D' ? 'Débito' : 'Crédito'}</td>
              <td className="num">{formatMoney(m.monto)}</td>
            </tr>
          ))}
        </tbody>
        {subtotal && (
          <tfoot>
            <tr>
              <th scope="row" colSpan={4}>
                Débitos de {subtotal.etiqueta}
              </th>
              <td className="num">{formatMoney(subtotal.debitos)}</td>
            </tr>
            <tr>
              <th scope="row" colSpan={4}>
                Créditos de {subtotal.etiqueta}
              </th>
              <td className="num">{formatMoney(subtotal.creditos)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
