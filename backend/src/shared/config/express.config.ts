import { env } from './env';

const origin = env.ORIGIN ? env.ORIGIN.trim().split(',') : '*';

export const corsConfig = {
  origin,
  credentials: !!env.ORIGIN,
  allowedHeaders: ['Content-Type', 'Authorization'],
};

export const jsonConfig = {
  limit: '1mb',
  strict: false,
  inflate: true,
  type: 'application/json',
};

export const urlEncodeConfig = {
  extended: true,
  limit: '1mb',
  parameterLimit: 1000,
};
