const request = require('supertest');
const { app } = require('../app');
const { pool } = require('../db');

describe('User Routes', () => {
  let testUserId;
  let testUserToken;

  beforeAll(async () => {
    await pool.query('DELETE FROM Users');
  });

  test('POST /users/signup should create a new user', async () => {
    const res = await request(app)
      .post('/users/signup')
      .send({
        email: 'test@example.com',
        password: 'password123',
        wantsToBeTreatProvider: false
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('userId');

    testUserId = res.body.userId;
    testUserToken = res.body.token;
  });

  test('POST /users/login should log in an existing user', async () => {
    const res = await request(app)
      .post('/users/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('GET /users/users should return all users when authenticated', async () => {
    const res = await request(app)
      .get('/users/users')
      .set('Authorization', `Bearer ${testUserToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  test('PUT /users/user/treatprovider should update treat provider status', async () => {
    const res = await request(app)
      .put('/users/user/treatprovider')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({ wantsToBeTreatProvider: true });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('treatProviderId');
  });

  test('DELETE /users/users/:userId should delete the user', async () => {
    const res = await request(app)
      .delete(`/users/users/${testUserId}`)
      .set('Authorization', `Bearer ${testUserToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'User and all associated records deleted successfully');
  });
});