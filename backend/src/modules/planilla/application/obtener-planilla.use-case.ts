import { AppError } from '../../../shared/errors/AppError';
import { Planilla } from '../domain/planilla.entity';
import { PlanillaRepository } from '../domain/planilla.repository';

export class ObtenerPlanillaUseCase {
  constructor(private readonly planillaRepository: PlanillaRepository) {}

  async execute(planillaId: number): Promise<Planilla> {
    const planilla = await this.planillaRepository.findById(planillaId);
    if (!planilla) {
      throw new AppError(`La planilla ${planillaId} no existe`, 404);
    }
    return planilla;
  }
}
