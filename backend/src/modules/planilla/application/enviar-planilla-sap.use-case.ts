import { AppError } from '../../../shared/errors/AppError';
import { Planilla } from '../domain/planilla.entity';
import { PlanillaRepository, PlanillaUnitOfWork } from '../domain/planilla.repository';
import { SapGateway, SapPlanillaPayload } from '../domain/sap.gateway';

export interface EnviarPlanillaSapResult {
  planillaId: number;
  periodo: string;
  estado: 'EnviadaSAP';
  sapReferencia: string;
  enviadaSapAt: Date;
  totalDebitos: number;
  totalCreditos: number;
}

export class EnviarPlanillaSapUseCase {
  constructor(
    private readonly planillaRepository: PlanillaRepository,
    private readonly unitOfWork: PlanillaUnitOfWork,
    private readonly sapGateway: SapGateway,
  ) {}

  async execute(planillaId: number): Promise<EnviarPlanillaSapResult> {
    const planilla = await this.planillaRepository.findById(planillaId);
    if (!planilla) {
      throw new AppError(`La planilla ${planillaId} no existe`, 404);
    }
    this.assertEstadoEnviable(planilla);

    return this.unitOfWork.run(async (repository) => {
      const reservada = await repository.reservarParaEnvio(planillaId);
      if (!reservada) {
        throw new AppError('La planilla ya está siendo enviada o fue enviada a SAP por otra solicitud', 409);
      }

      const actual = await repository.findById(planillaId);
      if (!actual) {
        throw new AppError(`La planilla ${planillaId} no existe`, 404);
      }
      this.assertContablementValida(actual);

      const resultado = await this.sapGateway.enviarPlanilla(this.buildPayload(actual));

      const enviadaAt = new Date();
      await repository.registrarEnvioSap(planillaId, resultado.referencia, enviadaAt);

      return {
        planillaId,
        periodo: actual.periodo,
        estado: 'EnviadaSAP',
        sapReferencia: resultado.referencia,
        enviadaSapAt: enviadaAt,
        totalDebitos: actual.totalDebitos,
        totalCreditos: actual.totalCreditos,
      };
    });
  }

  private assertEstadoEnviable(planilla: Planilla): void {
    if (planilla.yaFueEnviada()) {
      throw new AppError(
        `La planilla ${planilla.id} ya fue enviada a SAP${planilla.sapReferencia ? ` (ref. ${planilla.sapReferencia})` : ''}`,
        409,
      );
    }
    if (!planilla.estaAprobada()) {
      throw new AppError(
        `Solo se pueden enviar planillas en estado «Aprobada». Estado actual: «${planilla.estado}»`,
        409,
      );
    }
  }

  private assertContablementValida(planilla: Planilla): void {
    if (!planilla.tieneMovimientos()) {
      throw new AppError('La planilla no tiene movimientos para enviar', 422);
    }
    if (!planilla.estaCuadrada()) {
      throw new AppError(
        `La planilla está descuadrada: débitos ${planilla.totalDebitos.toFixed(2)} ≠ créditos ${planilla.totalCreditos.toFixed(2)}`,
        422,
      );
    }
  }

  private buildPayload(planilla: Planilla): SapPlanillaPayload {
    return {
      idempotencyKey: `planilla-${planilla.id}`,
      planillaId: planilla.id,
      periodo: planilla.periodo,
      totalDebitos: planilla.totalDebitos,
      totalCreditos: planilla.totalCreditos,
      lineas: planilla.movimientos.map((m) => ({
        empleadoId: m.empleadoId,
        centroCostoId: m.centroCostoId,
        concepto: m.concepto,
        monto: m.monto,
        tipo: m.tipo,
      })),
    };
  }
}
