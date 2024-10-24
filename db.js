// db.js
const { Pool } = require('pg');
const config = require('./config/config');

// psql -U postgres -d treatdb
//\dt (list all tables)
// \d tablename (list all columns)
// \connect treatdb
// \l (list all databases)

/*
DROP TABLE IF EXISTS SavedHouses;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS TreatProviders;
*/

// First, we'll connect to the default 'postgres' database to create our app database if it doesn't exist
const initialPool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres', // Connect to default database
    password: config.dbPassword,
    port: 5432,
});

const createDatabase = async () => {
    const client = await initialPool.connect();
    try {
      const checkDbExists = await client.query(
        "SELECT 1 FROM pg_database WHERE datname = 'treatdb'"
      );
      if (checkDbExists.rows.length === 0) {
        console.log('Creating treatdb database...');
        // Disconnect all other clients before creating the database
        await client.query(`
          SELECT pg_terminate_backend(pg_stat_activity.pid)
          FROM pg_stat_activity
          WHERE pg_stat_activity.datname = 'treatdb'
            AND pid <> pg_backend_pid();
        `);
        await client.query('CREATE DATABASE treatdb');
        console.log('treatdb database created successfully');
      } else {
        console.log('treatdb database already exists');
      }
    } catch (e) {
      console.error('Error creating database:', e);
      throw e;
    } finally {
      client.release();
    }
  };

// After ensuring the database exists, we'll connect to it
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'treatdb',
    password: config.dbPassword,
    port: 5432,
});

const closePool = async () => {
  await pool.end();
};

const initializeTables = async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
  
      // Check if the TreatProviders table exists
      const treatProvidersTableCheck = await client.query("SELECT to_regclass('public.treatproviders')");
      if (!treatProvidersTableCheck.rows[0].to_regclass) {
        console.log('Creating TreatProviders table...');
        await client.query(`
          CREATE TABLE TreatProviders (
            TreatProviderID SERIAL PRIMARY KEY,
            Address VARCHAR(255) NOT NULL,
            TreatsProvided TEXT NOT NULL,
            Hours TEXT NOT NULL,
            HauntedHouse BOOLEAN DEFAULT FALSE,
            Description TEXT,
            Latitude DECIMAL(10, 8),
            Longitude DECIMAL(11, 8)
          )
        `);
        console.log('TreatProviders table created successfully');
      } else {
        console.log('TreatProviders table already exists');
        
        // Check if Latitude and Longitude columns exist, if not, add them
        const columnsCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'treatproviders' AND column_name IN ('latitude', 'longitude')
        `);
        
        if (columnsCheck.rows.length < 2) {
          console.log('Adding Latitude and Longitude columns to TreatProviders table...');
          await client.query(`
            ALTER TABLE TreatProviders
            ADD COLUMN IF NOT EXISTS Latitude DECIMAL(10, 8),
            ADD COLUMN IF NOT EXISTS Longitude DECIMAL(11, 8)
          `);
          console.log('Latitude and Longitude columns added successfully');
        }
      }
  
      // Check if the Users table exists
      const usersTableCheck = await client.query("SELECT to_regclass('public.users')");
      if (!usersTableCheck.rows[0].to_regclass) {
        console.log('Creating Users table...');
        await client.query(`
          CREATE TABLE Users (
            UserID SERIAL PRIMARY KEY,
            Email VARCHAR(255) UNIQUE NOT NULL,
            PasswordHash VARCHAR(255) NOT NULL,
            TreatProviderID INTEGER UNIQUE,
            FOREIGN KEY (TreatProviderID) REFERENCES TreatProviders(TreatProviderID) ON DELETE SET NULL
          )
        `);
        console.log('Users table created successfully');
      } else {
        console.log('Users table already exists');
      }
  
      // Check if the SavedHouses table exists
      const savedHousesTableCheck = await client.query("SELECT to_regclass('public.savedhouses')");
      if (!savedHousesTableCheck.rows[0].to_regclass) {
        console.log('Creating SavedHouses table...');
        await client.query(`
          CREATE TABLE SavedHouses (
            UserID INTEGER,
            TreatProviderID INTEGER,
            PRIMARY KEY (UserID, TreatProviderID),
            FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
            FOREIGN KEY (TreatProviderID) REFERENCES TreatProviders(TreatProviderID) ON DELETE CASCADE
          )
        `);
        console.log('SavedHouses table created successfully');
      } else {
        console.log('SavedHouses table already exists');
      }
  
      // Check if the TreatProviderPhotos table exists
      const photosTableCheck = await client.query("SELECT to_regclass('public.treatproviderphotos')");
      if (!photosTableCheck.rows[0].to_regclass) {
        console.log('Creating TreatProviderPhotos table...');
        await client.query(`
          CREATE TABLE TreatProviderPhotos (
            PhotoID SERIAL PRIMARY KEY,
            TreatProviderID INTEGER NOT NULL,
            PhotoURL VARCHAR(255) NOT NULL,
            Description VARCHAR(255),
            CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (TreatProviderID) REFERENCES TreatProviders(TreatProviderID) ON DELETE CASCADE
          )
        `);
        console.log('TreatProviderPhotos table created successfully');
      } else {
        console.log('TreatProviderPhotos table already exists');
      }
  
      await client.query('COMMIT');
      console.log('All tables initialized successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error initializing tables:', err);
      throw err;
    } finally {
      client.release();
    }
  };
  

module.exports = { createDatabase, pool, closePool, initializeTables };