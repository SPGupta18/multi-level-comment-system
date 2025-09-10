// tests/auth.test.js
const request = require('supertest');
const { startInMemoryMongo, stopInMemoryMongo } = require('./test-setup');
const mongoose = require('mongoose');
let app;

beforeAll(async () => {
  await startInMemoryMongo();
  // import app AFTER DB is up (app will connect only when starting server, but our controllers use mongoose models)
  app = require('../server'); // server exports app
});

afterAll(async () => {
  // cleanup
  await stopInMemoryMongo();
  // ensure require cache cleared for subsequent runs
  jest.resetModules();
});

describe('Auth: register & login', () => {
  test('register creates a user and returns token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', email: 'test@example.com', password: 'password123' })
      .set('Accept', 'application/json');

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ username: 'testuser', email: 'test@example.com' });
  });

  test('login with email returns token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ emailOrUsername: 'test@example.com', password: 'password123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });
});
