// test/integration/auth.integration.test.ts
import request from 'supertest';
import { buildApp } from '../../src/app';

describe('POST /api/v1/auth/login', () => {
  const app = buildApp();

  it('rejects malformed payloads with 400 before hitting the DB', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects unknown extra fields (strict schema)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'a@b.com', password: 'Passw0rd!123', evilField: 'x' });
    expect(res.status).toBe(400);
  });
});