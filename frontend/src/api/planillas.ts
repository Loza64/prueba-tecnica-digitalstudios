import axios from 'axios'

export type Estado = 'Borrador' | 'Aprobada' | 'EnviadaSAP'

export interface Movimiento {
  id: number
  empleadoId: number
  empleadoNombre: string
  centroCostoId: number
  centroCostoNombre: string
  concepto: string
  monto: number
  tipo: 'D' | 'C'
}

export interface Planilla {
  id: number
  periodo: string
  estado: Estado
  sapReferencia: string | null
  enviadaSapAt: string | null
  totalDebitos: number
  totalCreditos: number
  movimientos: Movimiento[]
}

export interface EnvioSap {
  planillaId: number
  sapReferencia: string
  enviadaSapAt: string
}

const http = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '' })

export const getPlanilla = async (id: number): Promise<Planilla> =>
  (
    await http.get<{ data: Planilla }>(`/api/planillas/${id}`, {
      timeout: 15_000,
    })
  ).data.data

export const enviarASap = async (id: number): Promise<EnvioSap> =>
  (
    await http.post<{ data: EnvioSap }>(
      `/api/planillas/${id}/enviar-sap`,
      null,
      { timeout: 30_000 }
    )
  ).data.data

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    if (error.response) {
      return error.response.data?.message ?? `Error ${error.response.status}`
    }
    if (error.code === 'ECONNABORTED') {
      return 'El servidor tardó demasiado en responder.'
    }
    return 'No se pudo conectar con el servidor.'
  }
  return 'Ocurrió un error inesperado.'
}
