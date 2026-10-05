import { TipoMovimiento } from './planilla-estado';

export interface SapLinea {
  empleadoId: number;
  centroCostoId: number;
  concepto: string;
  monto: number;
  tipo: TipoMovimiento;
}

export interface SapPlanillaPayload {
  idempotencyKey: string;
  planillaId: number;
  periodo: string;
  totalDebitos: number;
  totalCreditos: number;
  lineas: SapLinea[];
}

export interface SapEnvioResultado {
  referencia: string;
}

export interface SapGateway {
  enviarPlanilla(payload: SapPlanillaPayload): Promise<SapEnvioResultado>;
}
