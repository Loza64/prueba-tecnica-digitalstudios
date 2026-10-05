import { PlanillaEstado, TipoMovimiento } from './planilla-estado';

export interface Movimiento {
  id: number;
  empleadoId: number;
  empleadoNombre: string;
  centroCostoId: number;
  centroCostoNombre: string;
  concepto: string;
  monto: number;
  tipo: TipoMovimiento;
}

const toCents = (amount: number): number => Math.round(amount * 100);

export class Planilla {
  constructor(
    public readonly id: number,
    public readonly periodo: string,
    public readonly estado: PlanillaEstado,
    public readonly movimientos: Movimiento[],
    public readonly sapReferencia: string | null = null,
    public readonly enviadaSapAt: Date | null = null,
  ) {}

  private sumCents(tipo: TipoMovimiento): number {
    return this.movimientos
      .filter((m) => m.tipo === tipo)
      .reduce((acc, m) => acc + toCents(m.monto), 0);
  }

  get totalDebitos(): number {
    return this.sumCents('D') / 100;
  }

  get totalCreditos(): number {
    return this.sumCents('C') / 100;
  }

  estaAprobada(): boolean {
    return this.estado === PlanillaEstado.Aprobada;
  }

  yaFueEnviada(): boolean {
    return this.estado === PlanillaEstado.EnviadaSAP;
  }

  tieneMovimientos(): boolean {
    return this.movimientos.length > 0;
  }

  estaCuadrada(): boolean {
    return this.sumCents('D') === this.sumCents('C');
  }

  toPublic() {
    return {
      id: this.id,
      periodo: this.periodo,
      estado: this.estado,
      sapReferencia: this.sapReferencia,
      enviadaSapAt: this.enviadaSapAt,
      totalDebitos: this.totalDebitos,
      totalCreditos: this.totalCreditos,
      movimientos: this.movimientos,
    };
  }
}
