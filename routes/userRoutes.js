const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../middleware/authMiddleware');
  
  /*End points ensure that when a user signs up as a treat provider, a corresponding record is create in the TreatProviders table. 
  We use a transaction to ensure that both the TreatProvider and User operations succed or fail together.
  For treat providers, we first create a TreatPRovider record with placeholder values, then use the returned ID when creating the User record.
  We use a single client for all database operations in each request to maintain the transaction
  */
router.post('/signup', async (req, res) => {
    const { email, password, wantsToBeTreatProvider } = req.body;
    const client = await pool.connect();
  
    try {
      // 1. Use a transaction to ensure atomicity
      await client.query('BEGIN');
  
      const hashedPassword = await bcrypt.hash(password, 10);
      let treatProviderID = null;
  
      if (wantsToBeTreatProvider) {
        // 2. Create TreatProvider record first
        // This ensures the TreatProviderID exists before we reference it in the Users table
        const treatProviderResult = await client.query(
          'INSERT INTO TreatProviders (Address, TreatsProvided, Hours) VALUES ($1, $2, $3) RETURNING TreatProviderID',
          ['', '', '']
        );
        treatProviderID = treatProviderResult.rows[0].treatproviderid;
      }

      // Now insert the user, potentially with a reference to the new TreatProvider
      const userResult = await client.query(
        'INSERT INTO Users (Email, PasswordHash, TreatProviderID) VALUES ($1, $2, $3) RETURNING UserID, TreatProviderID',
        [email, hashedPassword, treatProviderID]
      );
  
      // 3. Commit the transaction
      // This ensures both the TreatProvider and User are created, or neither is
      await client.query('COMMIT');
  
      // Generate JWT after successful signup
      const token = jwt.sign({ 
        userId: userResult.rows[0].userid, 
        treatProviderId: userResult.rows[0].treatproviderid
      }, SECRET_KEY, { expiresIn: '1h' });
  
      res.status(201).json({ 
        token, 
        userId: userResult.rows[0].userid,
        treatProviderId: userResult.rows[0].treatproviderid,
        email: email
      });
    } catch (error) {
      // If any error occurs, roll back the transaction
      await client.query('ROLLBACK');
      console.error('Detailed signup error:', error);
      if (error.code === '23505') {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: 'Error signing up', details: error.message });
      }
    } finally {
      // Always release the client back to the pool
      client.release();
    }
});


router.post('/login', async (req, res) => {
    const { email, password } = req.body;
  
    try {
      // Find the user by email
      const result = await pool.query('SELECT * FROM Users WHERE Email = $1', [email]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
  
      const user = result.rows[0];
  
      // Check if the password is correct
      const isValidPassword = await bcrypt.compare(password, user.passwordhash);
  
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
  
      // Generate a JWT
      const token = jwt.sign(
        { 
          userId: user.userid, 
          treatProviderId: user.treatproviderid
        }, 
        SECRET_KEY, 
        { expiresIn: '1h' }
      );
  
      // Send token to the client
      res.json({ token, userId: user.userid, email: email, treatProviderId: user.treatproviderid });
  
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'An error occurred during login' });
    }
});

// Get all users
router.get('/users', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query('SELECT UserID, Email, TreatProviderID FROM Users');
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'An error occurred while fetching users' });
    }
});

//update user's status as a treat provider. User needs to be logged in
router.put('/user/treatprovider', authenticateToken, async (req, res) => {
    const { wantsToBeTreatProvider } = req.body;
    const userId = req.user.userId;
    const client = await pool.connect();
  
    try {
      // 1. Use a transaction to ensure atomicity
      await client.query('BEGIN');
  
      let treatProviderID = null;
      if (wantsToBeTreatProvider) {
        // 2. Create TreatProvider record first
        // This ensures the TreatProviderID exists before we reference it in the Users table
        const treatProviderResult = await client.query(
          'INSERT INTO TreatProviders (Address, TreatsProvided, Hours) VALUES ($1, $2, $3) RETURNING TreatProviderID',
          ['', '', ''] // Insert placeholder values
        );
        treatProviderID = treatProviderResult.rows[0].treatproviderid;
      }
  
      // Update the user's TreatProviderID
      const result = await client.query(
        'UPDATE Users SET TreatProviderID = $1 WHERE UserID = $2 RETURNING TreatProviderID',
        [treatProviderID, userId]
      );
  
      // 3. Commit the transaction
      // This ensures both the TreatProvider creation (if applicable) and User update succeed, or neither does
      await client.query('COMMIT');
  
      res.json({ treatProviderId: result.rows[0].treatproviderid });
    } catch (error) {
      // If any error occurs, roll back the transaction
      await client.query('ROLLBACK');
      console.error('Error updating treat provider status:', error);
      res.status(500).json({ error: 'Error updating treat provider status' });
    } finally {
      // Always release the client back to the pool
      client.release();
    }
});

router.delete('/users/:userId', authenticateToken, async (req, res) => {
    const userId = req.params.userId;
    const client = await pool.connect();
  
    try {
      await client.query('BEGIN');
  
      // First, delete any records in the SavedHouses table associated with this user
      await client.query('DELETE FROM SavedHouses WHERE UserID = $1', [userId]);
  
      // Next, get the TreatProviderID of the user (if they are a treat provider)
      const treatProviderResult = await client.query('SELECT TreatProviderID FROM Users WHERE UserID = $1', [userId]);
      const treatProviderId = treatProviderResult.rows[0]?.treatproviderid;
  
      // If the user is a treat provider, delete associated SavedHouses records for that TreatProviderID
      if (treatProviderId) {
        await client.query('DELETE FROM SavedHouses WHERE TreatProviderID = $1', [treatProviderId]);
      }
  
      // Delete the treat provider record if it exists
      if (treatProviderId) {
        await client.query('DELETE FROM TreatProviders WHERE TreatProviderID = $1', [treatProviderId]);
      }
  
      // Finally, delete the user
      const result = await client.query('DELETE FROM Users WHERE UserID = $1 RETURNING *', [userId]);
  
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }
  
      await client.query('COMMIT');
      res.json({ message: 'User and all associated records deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'An error occurred while deleting the user' });
    } finally {
      client.release();
    }
});

router.put('/change-password/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  const { currentPassword, newPassword } = req.body;
  const client = await pool.connect();

  try {
    const userResult = await client.query('SELECT * FROM Users WHERE UserID = $1', [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordhash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await client.query('UPDATE Users SET PasswordHash = $1 WHERE UserID = $2', [hashedPassword, userId]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'An error occurred while changing your password' });
  } finally {
    client.release();
  }
});

module.exports = router;