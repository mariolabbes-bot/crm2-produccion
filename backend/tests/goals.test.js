const request = require('supertest');
const app = require('../src/serverApp');

// Nota: estas pruebas asumen existencia de un token válido y datos semilla.
// Para simplificar, se puede mockear auth middleware o extender con un token generado.

describe('Goals listing protected', () => {
  it('rejects without token', async () => {
    const res = await request(app).get('/api/goals');
    expect(res.statusCode).toBe(401); // Asumiendo que auth() responde 401
  });
});
