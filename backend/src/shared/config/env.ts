import { config } from 'dotenv';

config();

export const env = {
  PORT: Number(process.env.PORT) || 4200,
  ORIGIN: process.env.ORIGIN,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',
  SAP_MOCK_LATENCY_MS: Number(process.env.SAP_MOCK_LATENCY_MS) || 300,
  SAP_MOCK_FAIL_RATE: Number(process.env.SAP_MOCK_FAIL_RATE) || 0,
  SAP_TX_TIMEOUT_MS: Number(process.env.SAP_TX_TIMEOUT_MS) || 15_000,
  CB_TIMEOUT_MS: Number(process.env.CB_TIMEOUT_MS) || 8_000,
  CB_ERROR_THRESHOLD_PERCENTAGE: Number(process.env.CB_ERROR_THRESHOLD_PERCENTAGE) || 50,
  CB_RESET_TIMEOUT_MS: Number(process.env.CB_RESET_TIMEOUT_MS) || 15_000,
  CB_VOLUME_THRESHOLD: Number(process.env.CB_VOLUME_THRESHOLD) || 5,
};
