import { Router } from 'express';
import { Container } from '../../composition-root';
import healthRoutes from '../../modules/health/infrastructure/http/health.routes';
import { buildPlanillaRouter } from '../../modules/planilla/infrastructure/http/planilla.routes';

export const buildApiRouter = (container: Container): Router => {
  const router = Router();

  router.use('/health', healthRoutes);
  router.use('/planillas', buildPlanillaRouter(container.planillaController));

  return router;
};
