import { EnviarPlanillaSapUseCase } from './modules/planilla/application/enviar-planilla-sap.use-case';
import { ObtenerPlanillaUseCase } from './modules/planilla/application/obtener-planilla.use-case';
import { PlanillaRepository, PlanillaUnitOfWork } from './modules/planilla/domain/planilla.repository';
import { SapGateway } from './modules/planilla/domain/sap.gateway';
import { PlanillaController } from './modules/planilla/infrastructure/http/planilla.controller';
import { PrismaPlanillaRepository } from './modules/planilla/infrastructure/persistence/prisma-planilla.repository';
import { PrismaPlanillaUnitOfWork } from './modules/planilla/infrastructure/persistence/prisma-planilla.unit-of-work';
import { MockSapGateway } from './modules/planilla/infrastructure/sap/mock-sap.gateway';
import { getPrisma } from './shared/prisma/prisma.client';

export interface PlanillaPortsOverrides {
  planillaRepository?: PlanillaRepository;
  planillaUnitOfWork?: PlanillaUnitOfWork;
  sapGateway?: SapGateway;
}

export const buildContainer = (overrides: PlanillaPortsOverrides = {}) => {
  const planillaRepository = overrides.planillaRepository ?? new PrismaPlanillaRepository(getPrisma());
  const planillaUnitOfWork = overrides.planillaUnitOfWork ?? new PrismaPlanillaUnitOfWork(getPrisma());
  const sapGateway = overrides.sapGateway ?? new MockSapGateway();

  const enviarPlanillaSapUseCase = new EnviarPlanillaSapUseCase(planillaRepository, planillaUnitOfWork, sapGateway);
  const obtenerPlanillaUseCase = new ObtenerPlanillaUseCase(planillaRepository);
  const planillaController = new PlanillaController(enviarPlanillaSapUseCase, obtenerPlanillaUseCase);

  return { planillaController };
};

export type Container = ReturnType<typeof buildContainer>;
