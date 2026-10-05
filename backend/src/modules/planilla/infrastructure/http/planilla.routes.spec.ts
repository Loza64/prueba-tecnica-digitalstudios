import request from 'supertest';
import { createApp } from '../../../../app';
import { buildContainer } from '../../../../composition-root';
import { Movimiento, Planilla } from '../../domain/planilla.entity';
import { PlanillaEstado } from '../../domain/planilla-estado';
import { PlanillaRepository, PlanillaUnitOfWork } from '../../domain/planilla.repository';
import { SapGateway } from '../../domain/sap.gateway';

const mov = (id: number, monto: number, tipo: 'D' | 'C'): Movimiento => ({
  id, empleadoId: 1, empleadoNombre: 'Ana', centroCostoId: 1, centroCostoNombre: 'Ventas', concepto: 'Salario', monto, tipo,
});

const buildApp = (planillas: Planilla[], sap?: Partial<SapGateway>) => {
  const store = new Map(planillas.map((p) => [p.id, p]));
  const repo: PlanillaRepository = {
    findById: async (id) => store.get(id) ?? null,
    reservarParaEnvio: async (id) => {
      const p = store.get(id);
      if (!p || !p.estaAprobada()) return false;
      store.set(id, new Planilla(p.id, p.periodo, PlanillaEstado.EnviadaSAP, p.movimientos));
      return true;
    },
    registrarEnvioSap: async (id, ref, at) => {
      const p = store.get(id)!;
      store.set(id, new Planilla(p.id, p.periodo, p.estado, p.movimientos, ref, at));
    },
  };
  const uow: PlanillaUnitOfWork = { run: (work) => work(repo) };
  const sapGateway: SapGateway = { enviarPlanilla: async () => ({ referencia: 'SAP-TEST-1' }), ...sap };

  return createApp(buildContainer({ planillaRepository: repo, planillaUnitOfWork: uow, sapGateway }));
};

describe('POST /api/planillas/:id/enviar-sap', () => {
  const ok = new Planilla(1, '2026-09', PlanillaEstado.Aprobada, [mov(1, 100, 'D'), mov(2, 100, 'C')]);
  const borrador = new Planilla(2, '2026-09', PlanillaEstado.Borrador, [mov(3, 50, 'D'), mov(4, 50, 'C')]);
  const descuadrada = new Planilla(3, '2026-09', PlanillaEstado.Aprobada, [mov(5, 100, 'D'), mov(6, 1, 'C')]);

  it('200 al enviar una planilla aprobada', async () => {
    const res = await request(buildApp([ok])).post('/api/planillas/1/enviar-sap');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ planillaId: 1, estado: 'EnviadaSAP', sapReferencia: 'SAP-TEST-1' });
  });

  it('400 con id inválido', async () => {
    const res = await request(buildApp([ok])).post('/api/planillas/abc/enviar-sap');
    expect(res.status).toBe(400);
  });

  it('404 si no existe', async () => {
    const res = await request(buildApp([ok])).post('/api/planillas/99/enviar-sap');
    expect(res.status).toBe(404);
  });

  it('409 si está en Borrador', async () => {
    const res = await request(buildApp([borrador])).post('/api/planillas/2/enviar-sap');
    expect(res.status).toBe(409);
  });

  it('422 si está descuadrada', async () => {
    const res = await request(buildApp([descuadrada])).post('/api/planillas/3/enviar-sap');
    expect(res.status).toBe(422);
  });

  it('el segundo envío de la misma planilla responde 409', async () => {
    const app = buildApp([ok]);
    expect((await request(app).post('/api/planillas/1/enviar-sap')).status).toBe(200);
    expect((await request(app).post('/api/planillas/1/enviar-sap')).status).toBe(409);
  });
});

describe('GET /api/planillas/:id', () => {
  it('devuelve el detalle con totales', async () => {
    const p = new Planilla(1, '2026-09', PlanillaEstado.Aprobada, [mov(1, 100, 'D'), mov(2, 100, 'C')]);
    const res = await request(buildApp([p])).get('/api/planillas/1');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 1, estado: 'Aprobada', totalDebitos: 100, totalCreditos: 100 });
    expect(res.body.data.movimientos).toHaveLength(2);
  });

  it('404 si no existe', async () => {
    const res = await request(buildApp([])).get('/api/planillas/5');
    expect(res.status).toBe(404);
  });
});
