// tests/moderation.test.js
const request = require('supertest');
const { startInMemoryMongo, stopInMemoryMongo } = require('./test-setup');

let app;
let userToken, modToken, postId, commentId;

beforeAll(async () => {
  await startInMemoryMongo();
  app = require('../server');

  // create normal user with valid username length (>=3)
  await request(app).post('/api/auth/register').send({ username: 'user1', email: 'user1@example.com', password: 'pw' });
  const loginUser = await request(app).post('/api/auth/login').send({ emailOrUsername: 'user1@example.com', password: 'pw' });
  userToken = loginUser.body.token;

  // create post & comment as user
  const postRes = await request(app).post('/api/posts').set('Authorization', `Bearer ${userToken}`).send({ title: 'P', body: 'B' });
  postId = postRes.body._id;
  const commentRes = await request(app).post('/api/comments').set('Authorization', `Bearer ${userToken}`).send({ postId, body: 'ToDelete' });
  commentId = commentRes.body._id;

  // register moderator and promote in DB
  await request(app).post('/api/auth/register').send({ username: 'moderator1', email: 'mod1@example.com', password: 'pwmod' });

  // promote mod to moderator using the User model (direct DB access)
  const User = require('../models/User');
  await User.updateOne({ username: 'moderator1' }, { $set: { role: 'moderator' } });

  const modLogin = await request(app).post('/api/auth/login').send({ emailOrUsername: 'moderator1', password: 'pwmod' });
  modToken = modLogin.body.token;
});

afterAll(async () => {
  await stopInMemoryMongo();
  jest.resetModules();
});

describe('Moderation', () => {
  test('moderator can hard-delete comment and log created', async () => {
    const del = await request(app)
      .delete(`/api/moderation/comment/${commentId}`)
      .set('Authorization', `Bearer ${modToken}`)
      .send({ reason: 'spam' });

    expect(del.statusCode).toBe(200);
    expect(del.body.message).toMatch(/permanently deleted/i);

    const logs = await request(app)
      .get('/api/moderation/logs')
      .set('Authorization', `Bearer ${modToken}`)
      .send();

    expect(logs.statusCode).toBe(200);
    expect(Array.isArray(logs.body.logs)).toBe(true);
    expect(logs.body.logs.length).toBeGreaterThanOrEqual(1);

    // find an entry where action === 'hard_delete' and targetId matches commentId
    const found = logs.body.logs.find(l => {
      if (!l || !l.targetId) return false;
      const tid = typeof l.targetId === 'string' ? l.targetId : (l.targetId.toString ? l.targetId.toString() : String(l.targetId));
      return l.action === 'hard_delete' && tid === String(commentId);
    });

    expect(found).toBeDefined();
  });
});
