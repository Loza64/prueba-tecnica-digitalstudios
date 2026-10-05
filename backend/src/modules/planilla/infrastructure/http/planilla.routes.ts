import { Router } from 'express';
import { validateIdParam } from '../../../../shared/middlewares/validate-id-param.middleware';
import { PlanillaController } from './planilla.controller';

export const buildPlanillaRouter = (controller: PlanillaController): Router => {
  const router = Router();

  router.param('id', validateIdParam);

  router.get('/:id', controller.obtener);
  router.post('/:id/enviar-sap', controller.enviarASap);

  return router;
};
