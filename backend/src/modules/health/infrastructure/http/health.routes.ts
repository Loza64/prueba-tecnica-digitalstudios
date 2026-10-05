import { Router } from 'express';
import { getCircuitBreakersStatus } from '../../../../shared/resilience/circuit-breaker.registry';

const router = Router();

router.get('/hello', (_req, res) => {
  res.status(200).json({ message: 'hello server' });
});

router.get('/circuit-breakers', (_req, res) => {
  res.status(200).json({ data: getCircuitBreakersStatus() });
});

export default router;
