import { AppError } from '../../../shared/errors/AppError';
import { Movimiento, Planilla } from '../domain/planilla.entity';
import { PlanillaEstado } from '../domain/planilla-estado';
import { PlanillaRepository, PlanillaUnitOfWork } from '../domain/planilla.repository';
import { SapGateway, SapPlanillaPayload } from '../domain/sap.gateway';
import { EnviarPlanillaSapUseCase } from './enviar-planilla-sap.use-case';

const mov = (id: number, monto: number, tipo: 'D' | 'C'): Movimiento => ({
  id, empleadoId: 1, empleadoNombre: 'Ana', centroCostoId: 1, centroCostoNombre: 'Ventas', concepto: 'Salario', monto, tipo,
});

const planilla = (estado: PlanillaEstado, movimientos: Movimiento[] = [mov(1, 100, 'D'), mov(2, 100, 'C')]) =>
  new Planilla(1, '2026-09', estado, movimientos);

const buildFakes = (inicial: Planilla | null) => {
  let actual = inicial;
  const repo: jest.Mocked<PlanillaRepository> = {
    findById: jest.fn(async (_id: number) => actual),
    reservarParaEnvio: jest.fn(async (_id: number) => {
      if (actual && actual.estaAprobada()) {
        actual = new Planilla(actual.id, actual.periodo, PlanillaEstado.EnviadaSAP, actual.movimientos);
        return true;
      }
      return false;
    }),
    registrarEnvioSap: jest.fn(async (_id, ref, at) => {
      if (actual) actual = new Planilla(actual.id, actual.periodo, actual.estado, actual.movimientos, ref, at);
    }),
  };
  const uow: PlanillaUnitOfWork = {
    run: async (work) => {
      const snapshot = actual;
      try {
        return await work(repo);
      } catch (err) {
        actual = snapshot;
        throw err;
      }
    },
  };
  const sap: jest.Mocked<SapGateway> = { enviarPlanilla: jest.fn(async (_payload: SapPlanillaPayload) => ({ referencia: 'SAP-REF-1' })) };
  return { repo, uow, sap, estado: () => actual?.estado };
};

describe('EnviarPlanillaSapUseCase', () => {
  it('envía una planilla aprobada y cuadrada, y guarda la referencia de SAP', async () => {
    const f = buildFakes(planilla(PlanillaEstado.Aprobada));
    const result = await new EnviarPlanillaSapUseCase(f.repo, f.uow, f.sap).execute(1);

    expect(result).toMatchObject({ planillaId: 1, estado: 'EnviadaSAP', sapReferencia: 'SAP-REF-1', totalDebitos: 100, totalCreditos: 100 });
    expect(f.sap.enviarPlanilla).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: 'planilla-1' }));
    expect(f.repo.registrarEnvioSap).toHaveBeenCalledWith(1, 'SAP-REF-1', expect.any(Date));
  });

  it('404 si la planilla no existe', async () => {
    const f = buildFakes(null);
    await expect(new EnviarPlanillaSapUseCase(f.repo, f.uow, f.sap).execute(1)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('409 si está en Borrador y no llama a SAP', async () => {
    const f = buildFakes(planilla(PlanillaEstado.Borrador));
    await expect(new EnviarPlanillaSapUseCase(f.repo, f.uow, f.sap).execute(1)).rejects.toMatchObject({ statusCode: 409 });
    expect(f.sap.enviarPlanilla).not.toHaveBeenCalled();
  });

  it('409 si ya fue enviada y no llama a SAP', async () => {
    const f = buildFakes(planilla(PlanillaEstado.EnviadaSAP));
    await expect(new EnviarPlanillaSapUseCase(f.repo, f.uow, f.sap).execute(1)).rejects.toMatchObject({ statusCode: 409 });
    expect(f.sap.enviarPlanilla).not.toHaveBeenCalled();
  });

  it('422 si está descuadrada, no llama a SAP y hace rollback del estado', async () => {
    const f = buildFakes(planilla(PlanillaEstado.Aprobada, [mov(1, 100, 'D'), mov(2, 90, 'C')]));
    await expect(new EnviarPlanillaSapUseCase(f.repo, f.uow, f.sap).execute(1)).rejects.toMatchObject({ statusCode: 422 });
    expect(f.sap.enviarPlanilla).not.toHaveBeenCalled();
    expect(f.estado()).toBe(PlanillaEstado.Aprobada);
  });

  it('422 si no tiene movimientos', async () => {
    const f = buildFakes(planilla(PlanillaEstado.Aprobada, []));
    await expect(new EnviarPlanillaSapUseCase(f.repo, f.uow, f.sap).execute(1)).rejects.toMatchObject({ statusCode: 422 });
  });

  it('si SAP falla propaga el error, no registra el envío y la planilla sigue Aprobada (rollback)', async () => {
    const f = buildFakes(planilla(PlanillaEstado.Aprobada));
    f.sap.enviarPlanilla.mockRejectedValue(new AppError('SAP caído', 502));

    await expect(new EnviarPlanillaSapUseCase(f.repo, f.uow, f.sap).execute(1)).rejects.toMatchObject({ statusCode: 502 });
    expect(f.repo.registrarEnvioSap).not.toHaveBeenCalled();
    expect(f.estado()).toBe(PlanillaEstado.Aprobada);
  });

  it('doble envío concurrente: SAP se llama una sola vez y la otra solicitud recibe 409', async () => {
    const f = buildFakes(planilla(PlanillaEstado.Aprobada));
    const useCase = new EnviarPlanillaSapUseCase(f.repo, f.uow, f.sap);

    const results = await Promise.allSettled([useCase.execute(1), useCase.execute(1)]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ statusCode: 409 });
    expect(f.sap.enviarPlanilla).toHaveBeenCalledTimes(1);
  });

  it('permite reintentar tras un fallo de SAP', async () => {
    const f = buildFakes(planilla(PlanillaEstado.Aprobada));
    const useCase = new EnviarPlanillaSapUseCase(f.repo, f.uow, f.sap);
    f.sap.enviarPlanilla.mockRejectedValueOnce(new AppError('SAP caído', 502));

    await expect(useCase.execute(1)).rejects.toMatchObject({ statusCode: 502 });
    await expect(useCase.execute(1)).resolves.toMatchObject({ estado: 'EnviadaSAP' });
  });
});
