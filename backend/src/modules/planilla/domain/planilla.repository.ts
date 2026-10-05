import { Planilla } from './planilla.entity';

export interface PlanillaRepository {
  findById(id: number): Promise<Planilla | null>;

  reservarParaEnvio(id: number): Promise<boolean>;

  registrarEnvioSap(id: number, referencia: string, enviadaAt: Date): Promise<void>;
}

export interface PlanillaUnitOfWork {
  run<T>(work: (repository: PlanillaRepository) => Promise<T>): Promise<T>;
}
