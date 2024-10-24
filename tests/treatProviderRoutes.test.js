const request = require('supertest');
const { app } = require('../app');
const { pool } = require('../db');

describe('Treat Provider Routes', () => {
  let testUserId;
  let testUserToken;
  let testTreatProviderId;

  beforeAll(async () => {
    const userRes = await request(app)
      .post('/users/signup')
      .send({
        email: 'treatprovider@example.com',
        password: 'password123',
        wantsToBeTreatProvider: true
      });

    testUserId = userRes.body.userId;
    testUserToken = userRes.body.token;
    testTreatProviderId = userRes.body.treatProviderId;
  });

  test('POST /treatproviders/treatproviders should create a new treat provider', async () => {
    const res = await request(app)
      .post('/treatproviders/treatproviders')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({
        address: '123 Treat St',
        treatsProvided: 'Candy, Chocolate',
        hours: '6 PM - 9 PM',
        hauntedhouse: false,
        description: 'Family-friendly treats'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('treatproviderid');
  });

  test('GET /treatproviders/treatproviders should return all treat providers', async () => {
    const res = await request(app)
      .get('/treatproviders/treatproviders');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  test('GET /treatproviders/treatproviders/:id should return a single treat provider', async () => {
    const res = await request(app)
      .get(`/treatproviders/treatproviders/${testTreatProviderId}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('treatproviderid', testTreatProviderId);
  });

  test('GET /treatproviders/treatprovidersfilter should filter treat providers', async () => {
    const res = await request(app)
      .get('/treatproviders/treatprovidersfilter')
      .query({ hauntedhouse: 'false', treats: 'Candy' });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBeTruthy();
  });

  test('PUT /treatproviders/treatproviders should update treat provider profile', async () => {
    const res = await request(app)
      .put('/treatproviders/treatproviders')
      .set('Authorization', `Bearer ${testUserToken}`)
      .send({
        address: '456 Spooky Lane',
        hauntedhouse: true
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('address', '456 Spooky Lane');
    expect(res.body).toHaveProperty('hauntedhouse', true);
  });
});