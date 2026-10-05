export enum PlanillaEstado {
  Borrador = 'Borrador',
  Aprobada = 'Aprobada',
  EnviadaSAP = 'EnviadaSAP',
}

export type TipoMovimiento = 'D' | 'C';

export const parsePlanillaEstado = (value: string): PlanillaEstado => {
  if ((Object.values(PlanillaEstado) as string[]).includes(value)) {
    return value as PlanillaEstado;
  }
  throw new Error(`Estado de planilla desconocido en la base de datos: "${value}"`);
};

export const parseTipoMovimiento = (value: string): TipoMovimiento => {
  const tipo = value.trim().toUpperCase();
  if (tipo === 'D' || tipo === 'C') return tipo;
  throw new Error(`Tipo de movimiento desconocido en la base de datos: "${value}"`);
};
