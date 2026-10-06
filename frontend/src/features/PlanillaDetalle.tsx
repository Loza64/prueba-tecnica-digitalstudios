import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  enviarASap,
  getErrorMessage,
  getPlanilla,
  type Estado,
  type Planilla,
} from '../api/planillas'
import { formatDateTime, sumar } from '../lib/format'
import { MovimientosTable } from './MovimientosTable'
import { Totales } from './Totales'

const ESTADO_LABEL: Record<Estado, string> = {
  Borrador: 'Borrador',
  Aprobada: 'Aprobada',
  EnviadaSAP: 'Enviada a SAP',
}

function getMotivoEnvio(planilla: Planilla, cuadrada: boolean): string {
  switch (planilla.estado) {
    case 'EnviadaSAP': {
      const detalles: string[] = []
      if (planilla.enviadaSapAt) {
        detalles.push(`el ${formatDateTime(planilla.enviadaSapAt)}`)
      }
      if (planilla.sapReferencia) {
        detalles.push(`con la referencia ${planilla.sapReferencia}`)
      }
      return `Enviada${detalles.length > 0 ? ` ${detalles.join(' ')}` : ''}.`
    }
    case 'Borrador':
      return 'Apruebe la planilla para poder enviarla a SAP.'
    case 'Aprobada':
      return cuadrada
        ? ''
        : 'La planilla está descuadrada y no puede enviarse a SAP.'
  }
}

export function PlanillaDetalle({ id }: { id: number }) {
  const queryClient = useQueryClient()
  const queryKey = ['planilla', id]
  const [centroCosto, setCentroCosto] = useState('')

  const planillaQuery = useQuery({ queryKey, queryFn: () => getPlanilla(id) })

  const envio = useMutation({
    mutationFn: () => enviarASap(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  const planilla = planillaQuery.data

  if (planillaQuery.isPending) {
    return (
      <div className="hoja" aria-busy="true" aria-live="polite">
        <p className="sr-only">Cargando planilla…</p>
        <div className="sk sk-titulo" />
        <div className="sk sk-bloque" />
        <div className="sk sk-bloque sk-alto" />
      </div>
    )
  }

  if (!planilla) {
    return (
      <div className="hoja" role="alert">
        <h1>No se pudo cargar la planilla</h1>
        <p>{getErrorMessage(planillaQuery.error)}</p>
        <button
          type="button"
          className="btn"
          onClick={() => planillaQuery.refetch()}
        >
          Reintentar
        </button>
      </div>
    )
  }

  const centros = [
    ...new Map(
      planilla.movimientos.map((m) => [m.centroCostoId, m.centroCostoNombre])
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], 'es'))

  const visibles = centroCosto
    ? planilla.movimientos.filter(
        (m) => String(m.centroCostoId) === centroCosto
      )
    : planilla.movimientos
  const centroSeleccionado = centros.find(
    ([cid]) => String(cid) === centroCosto
  )?.[1]

  const cuadrada =
    Math.round(planilla.totalDebitos * 100) ===
    Math.round(planilla.totalCreditos * 100)
  const puedeEnviar = planilla.estado === 'Aprobada' && cuadrada
  const motivo = getMotivoEnvio(planilla, cuadrada)

  return (
    <article className="hoja">
      <header className="encabezado">
        <div>
          <h1>Planilla {planilla.periodo}</h1>
          <p className="sub">Número {planilla.id}</p>
        </div>
        <div className="accion">
          <span className={`estado estado-${planilla.estado}`}>
            {ESTADO_LABEL[planilla.estado]}
          </span>
          <button
            type="button"
            className="btn"
            disabled={!puedeEnviar || envio.isPending}
            aria-describedby={motivo ? 'motivo-envio' : undefined}
            onClick={() => envio.mutate()}
          >
            {envio.isPending ? 'Enviando…' : 'Enviar a SAP'}
          </button>
        </div>
      </header>

      {motivo && (
        <p id="motivo-envio" className="motivo">
          {motivo}
        </p>
      )}

      {envio.isSuccess && (
        <p className="aviso ok" role="status">
          Planilla enviada a SAP. Referencia {envio.data.sapReferencia}.
        </p>
      )}
      {envio.isError && (
        <p className="aviso error" role="alert">
          No se pudo enviar a SAP. {getErrorMessage(envio.error)}
        </p>
      )}

      <Totales
        debitos={planilla.totalDebitos}
        creditos={planilla.totalCreditos}
      />

      <section className="movimientos">
        <div className="filtro">
          <label htmlFor="centro-costo">Centro de costo</label>
          <select
            id="centro-costo"
            value={centroCosto}
            onChange={(e) => setCentroCosto(e.target.value)}
          >
            <option value="">Todos</option>
            {centros.map(([cid, nombre]) => (
              <option key={cid} value={cid}>
                {nombre}
              </option>
            ))}
          </select>
          <span className="conteo" aria-live="polite">
            {visibles.length} de {planilla.movimientos.length} movimientos
          </span>
        </div>

        {planilla.movimientos.length === 0 ? (
          <p className="vacio">Esta planilla todavía no tiene movimientos.</p>
        ) : (
          <MovimientosTable
            movimientos={visibles}
            subtotal={
              centroSeleccionado
                ? {
                    etiqueta: centroSeleccionado,
                    debitos: sumar(visibles, 'D'),
                    creditos: sumar(visibles, 'C'),
                  }
                : undefined
            }
          />
        )}
      </section>
    </article>
  )
}
