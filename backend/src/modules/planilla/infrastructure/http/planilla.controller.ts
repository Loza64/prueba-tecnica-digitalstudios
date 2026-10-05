import { NextFunction, Request, Response } from 'express';
import { EnviarPlanillaSapUseCase } from '../../application/enviar-planilla-sap.use-case';
import { ObtenerPlanillaUseCase } from '../../application/obtener-planilla.use-case';

export class PlanillaController {
  constructor(
    private readonly enviarPlanillaSapUseCase: EnviarPlanillaSapUseCase,
    private readonly obtenerPlanillaUseCase: ObtenerPlanillaUseCase,
  ) {}

  obtener = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const planilla = await this.obtenerPlanillaUseCase.execute(Number(req.params.id));
      res.status(200).json({ data: planilla.toPublic() });
    } catch (err) {
      next(err);
    }
  };

  enviarASap = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.enviarPlanillaSapUseCase.execute(Number(req.params.id));
      res.status(200).json({ message: 'Planilla enviada a SAP', data: result });
    } catch (err) {
      next(err);
    }
  };
}
