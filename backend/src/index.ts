import http from 'http';
import { createApp } from './app';
import { env } from './shared/config/env';
import { serverLog } from './shared/logger/logger';
import { disconnectPrisma } from './shared/prisma/prisma.client';

const httpServer = http.createServer(createApp());
httpServer.listen(env.PORT, () => serverLog(`Running on http://localhost:${env.PORT}`));

const shutdown = () => {
  httpServer.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
