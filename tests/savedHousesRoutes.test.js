const request = require('supertest');
const { app } = require('../app');
const { pool } = require('../db');

describe('Saved Houses Routes', () => {
  let testUserId;
  let testUserToken;
  let testTreatProviderId;

  beforeAll(async () => {
    const userRes = await request(app)
      .post('/users/signup')
      .send({
        email: 'savedhouses@example.com',
        password: 'password123',
        wantsToBeTreatProvider: false
      });

    testUserId = userRes.body.userId;
    testUserToken = userRes.body.token;

    const providerRes = await request(app)
      .post('/treatproviders/treatproviders')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({
        address: '789 Halloween Ave',
        treatsProvided: 'Chocolate',
        hours: '7 PM - 10 PM',
        hauntedhouse: true,
        description: 'Spooky treats!'
      });

    testTreatProviderId = providerRes.body.treatproviderid;
  });

  test('POST /savedhouses/savedhouses should save a house for a user', async () => {
    const res = await request(app)
      .post('/savedhouses/savedhouses')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({ treatProviderId: testTreatProviderId });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('message', 'House saved successfully');
  });

  test('GET /savedhouses/savedhouses should return saved houses for a user', async () => {
    const res = await request(app)
      .get('/savedhouses/savedhouses')
      .set('Authorization', `Bearer ${testUserToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('DELETE /savedhouses/savedhouses/:treatProviderId should delete a saved house', async () => {
    const res = await request(app)
      .delete(`/savedhouses/savedhouses/${testTreatProviderId}`)
      .set('Authorization', `Bearer ${testUserToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message', 'Saved house deleted successfully');
  });
});