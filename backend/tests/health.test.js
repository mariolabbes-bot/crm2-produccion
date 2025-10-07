const request = require('supertest');
const app = require('../src/serverApp');

describe('Health endpoint', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
