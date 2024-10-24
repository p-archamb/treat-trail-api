const dotenv = require('dotenv');
const path = require('path');
const { pool, closePool } = require('../db');

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const { pool } = require('../db')

beforeAll(async () => {
    // Any setup before all tests run
    await pool.query('BEGIN');
  });

  afterAll(async () => {
    await pool.query('ROLLBACK');
    await closePool();
    await pool.end();
  });