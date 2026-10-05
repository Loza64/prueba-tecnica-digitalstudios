import cors from 'cors';
import express, { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildContainer, Container } from './composition-root';
import { buildApiRouter } from './interfaces/http/routes';
import { corsConfig, jsonConfig, urlEncodeConfig } from './shared/config/express.config';
import { errorHandler } from './shared/middlewares/error-handler.middleware';
import { swaggerSpec } from './swagger';

export const createApp = (container: Container = buildContainer()): Express => {
  const app = express();

  app.use(cors(corsConfig));
  app.use(express.json(jsonConfig));
  app.use(express.urlencoded(urlEncodeConfig));

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/api', buildApiRouter(container));

  app.use((_req, res) => {
    res.status(404).json({ status: 404, message: 'Ruta no encontrada' });
  });
  app.use(errorHandler);

  return app;
};
