const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { pool } = require('./db');
const { authenticateToken, SECRET_KEY } = require('./middleware/authMiddleware');
const userRoutes = require('./routes/userRoutes');
const treatProviderRoutes = require('./routes/treatProviderRoutes');
const savedHousesRoutes = require('./routes/savedHousesRoutes');


const app = express();
app.use(express.json());
app.use(cors());

// Routes
app.use('/users', userRoutes);
app.use('/treatproviders', treatProviderRoutes);
app.use('/savedhouses', savedHousesRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports = { app};