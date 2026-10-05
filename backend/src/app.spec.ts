import request from 'supertest';
import { createApp } from './app';

describe('app', () => {
  const app = createApp();

  it('GET /api/health/hello returns 200 and greeting', async () => {
    const res = await request(app).get('/api/health/hello');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'hello server' });
  });

  it('unknown route returns 404', async () => {
    const res = await request(app).get('/api/nope');

    expect(res.status).toBe(404);
  });
});
