import CircuitBreaker from 'opossum';
import { env } from '../../../../shared/config/env';
import { AppError } from '../../../../shared/errors/AppError';
import { errorLog } from '../../../../shared/logger/logger';
import { isCircuitOpenError, isCircuitTimeoutError } from '../../../../shared/resilience/circuit-breaker.errors';
import { createCircuitBreaker } from '../../../../shared/resilience/circuit-breaker.factory';
import { SapEnvioResultado, SapGateway, SapPlanillaPayload } from '../../domain/sap.gateway';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class MockSapGateway implements SapGateway {
  private readonly procesados = new Map<string, string>();
  private readonly breaker: CircuitBreaker<[SapPlanillaPayload], SapEnvioResultado>;

  constructor() {
    this.breaker = createCircuitBreaker(
      (payload: SapPlanillaPayload) => this.simularEnvio(payload),
      { name: 'sap.enviarPlanilla' },
    );
  }

  async enviarPlanilla(payload: SapPlanillaPayload): Promise<SapEnvioResultado> {
    try {
      return await this.breaker.fire(payload);
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (isCircuitOpenError(err)) {
        throw new AppError('SAP no está disponible temporalmente. Intenta de nuevo en unos segundos.', 503);
      }
      if (isCircuitTimeoutError(err)) {
        throw new AppError('SAP no respondió a tiempo. La planilla sigue «Aprobada».', 504);
      }
      errorLog('SAP envío falló para planilla %d: %O', payload.planillaId, err);
      throw new AppError('SAP no pudo procesar el envío. La planilla sigue «Aprobada».', 502);
    }
  }

  private async simularEnvio(payload: SapPlanillaPayload): Promise<SapEnvioResultado> {
    await sleep(env.SAP_MOCK_LATENCY_MS);

    if (Math.random() < env.SAP_MOCK_FAIL_RATE) {
      throw new Error('SAP (mock): fallo simulado');
    }

    const existente = this.procesados.get(payload.idempotencyKey);
    if (existente) return { referencia: existente };

    const referencia = `SAP-${payload.periodo}-${String(payload.planillaId).padStart(6, '0')}`;
    this.procesados.set(payload.idempotencyKey, referencia);
    return { referencia };
  }
}
