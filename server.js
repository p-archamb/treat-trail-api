// server.js
require('dotenv').config();
const { app } = require('./app');
const { createDatabase, initializeTables } = require('./db');

const PORT = process.env.PORT || 3001;

createDatabase()
  .then(() => initializeTables())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Database and tables initialization completed');
    });
  })
  .catch(err => {
    console.error('Database setup failed:', err);
    process.exit(1);
  });