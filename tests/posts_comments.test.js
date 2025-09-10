// tests/posts_comments.test.js
const request = require('supertest');
const { startInMemoryMongo, stopInMemoryMongo } = require('./test-setup');

let app;
let token;
let postId;
let commentId;

beforeAll(async () => {
  await startInMemoryMongo();
  app = require('../server');

  // register and login
  await request(app)
    .post('/api/auth/register')
    .send({ username: 'poster', email: 'poster@example.com', password: 'pass1234' });

  const login = await request(app)
    .post('/api/auth/login')
    .send({ emailOrUsername: 'poster@example.com', password: 'pass1234' });

  token = login.body.token;
});

afterAll(async () => {
  await stopInMemoryMongo();
  jest.resetModules();
});

describe('Posts & Comments', () => {
  test('create post', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'T1', body: 'Body1' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('_id');
    postId = res.body._id;
  });

  test('create top-level comment', async () => {
    const res = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ postId, body: 'Nice post' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('_id');
    commentId = res.body._id;
  });

  test('reply to comment and fetch replies', async () => {
    const r2 = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ postId, body: 'Reply 1', parentCommentId: commentId });
    expect(r2.statusCode).toBe(201);
    const replies = await request(app)
      .get(`/api/comments/replies/${commentId}`)
      .send();
    expect(replies.statusCode).toBe(200);
    expect(replies.body.totalReplies).toBe(1);
  });

  test('paginated top-level comments', async () => {
    const res = await request(app)
      .get(`/api/comments/${postId}?limit=5&page=1`)
      .send();
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('results');
  });
});
