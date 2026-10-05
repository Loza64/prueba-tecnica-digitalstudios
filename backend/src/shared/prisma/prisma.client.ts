import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

let instance: PrismaClient | undefined;

export const getPrisma = (): PrismaClient => {
  if (!instance) {
    instance = new PrismaClient({ log: env.isDev ? ['warn', 'error'] : ['error'] });
  }
  return instance;
};

export const disconnectPrisma = async (): Promise<void> => {
  if (instance) {
    await instance.$disconnect();
    instance = undefined;
  }
};
