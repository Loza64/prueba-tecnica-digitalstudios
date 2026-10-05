import { PrismaClient } from '@prisma/client';
import { env } from '../../../../shared/config/env';
import { PlanillaRepository, PlanillaUnitOfWork } from '../../domain/planilla.repository';
import { PrismaPlanillaRepository } from './prisma-planilla.repository';

export class PrismaPlanillaUnitOfWork implements PlanillaUnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  run<T>(work: (repository: PlanillaRepository) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => work(new PrismaPlanillaRepository(tx)), {
      maxWait: 5_000,
      timeout: env.SAP_TX_TIMEOUT_MS,
    });
  }
}
