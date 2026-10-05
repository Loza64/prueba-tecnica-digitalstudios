import { env } from '../../../../shared/config/env';
import { SapPlanillaPayload } from '../../domain/sap.gateway';
import { MockSapGateway } from './mock-sap.gateway';

const payload = (planillaId = 1): SapPlanillaPayload => ({
  idempotencyKey: `planilla-${planillaId}`,
  planillaId,
  periodo: '2026-09',
  totalDebitos: 100,
  totalCreditos: 100,
  lineas: [],
});

describe('MockSapGateway', () => {
  const original = { latency: env.SAP_MOCK_LATENCY_MS, fail: env.SAP_MOCK_FAIL_RATE };

  beforeEach(() => {
    env.SAP_MOCK_LATENCY_MS = 0;
    env.SAP_MOCK_FAIL_RATE = 0;
  });

  afterAll(() => {
    env.SAP_MOCK_LATENCY_MS = original.latency;
    env.SAP_MOCK_FAIL_RATE = original.fail;
  });

  it('devuelve una referencia y es idempotente para la misma clave', async () => {
    const gateway = new MockSapGateway();
    const first = await gateway.enviarPlanilla(payload());
    const second = await gateway.enviarPlanilla(payload());

    expect(first.referencia).toBe('SAP-2026-09-000001');
    expect(second.referencia).toBe(first.referencia);
  });

  it('traduce un fallo de SAP a 502', async () => {
    env.SAP_MOCK_FAIL_RATE = 1;
    const gateway = new MockSapGateway();

    await expect(gateway.enviarPlanilla(payload())).rejects.toMatchObject({ statusCode: 502 });
  });
});
