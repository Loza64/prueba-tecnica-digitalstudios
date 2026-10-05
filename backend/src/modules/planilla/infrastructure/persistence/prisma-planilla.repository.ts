import { Prisma, PrismaClient } from '@prisma/client';
import { Planilla } from '../../domain/planilla.entity';
import { PlanillaRepository } from '../../domain/planilla.repository';
import { PlanillaEstado, parsePlanillaEstado, parseTipoMovimiento } from '../../domain/planilla-estado';

type Db = PrismaClient | Prisma.TransactionClient;

export class PrismaPlanillaRepository implements PlanillaRepository {
  constructor(private readonly db: Db) {}

  async findById(id: number): Promise<Planilla | null> {
    const row = await this.db.planilla.findUnique({
      where: { id },
      include: {
        detalles: {
          orderBy: { id: 'asc' },
          include: { empleado: { include: { centroCosto: true } } },
        },
      },
    });

    if (!row) return null;

    return new Planilla(
      row.id,
      row.periodo,
      parsePlanillaEstado(row.estado),
      row.detalles.map((d) => ({
        id: d.id,
        empleadoId: d.empleadoId,
        empleadoNombre: d.empleado.nombre,
        centroCostoId: d.empleado.centroCostoId,
        centroCostoNombre: d.empleado.centroCosto.nombre,
        concepto: d.concepto,
        monto: Number(d.monto.toString()),
        tipo: parseTipoMovimiento(d.tipo),
      })),
      row.sapReferencia,
      row.enviadaSapAt,
    );
  }

  async reservarParaEnvio(id: number): Promise<boolean> {
    const { count } = await this.db.planilla.updateMany({
      where: { id, estado: PlanillaEstado.Aprobada },
      data: { estado: PlanillaEstado.EnviadaSAP },
    });
    return count === 1;
  }

  async registrarEnvioSap(id: number, referencia: string, enviadaAt: Date): Promise<void> {
    await this.db.planilla.update({
      where: { id },
      data: { sapReferencia: referencia, enviadaSapAt: enviadaAt },
    });
  }
}
