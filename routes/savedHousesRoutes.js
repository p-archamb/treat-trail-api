const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/authMiddleware');


// Save a house for a user
router.post('/savedhouses', authenticateToken, async (req, res) => {
    const { treatProviderId } = req.body;
    const userId = req.user.userId;
    try {
      await pool.query(
        'INSERT INTO SavedHouses (UserID, TreatProviderID) VALUES ($1, $2)',
        [userId, treatProviderId]
      );
      res.status(201).json({ message: 'House saved successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error saving house' });
    }
});
  
// Get saved houses for a user
router.get('/savedhouses', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
      const result = await pool.query(
        'SELECT tp.* FROM TreatProviders tp JOIN SavedHouses sh ON tp.TreatProviderID = sh.TreatProviderID WHERE sh.UserID = $1',
        [userId]
      );
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching saved houses' });
    }
});

// Delete a saved house for a user
router.delete('/savedhouses/:treatProviderId', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const treatProviderId = req.params.treatProviderId;

  try {
      const result = await pool.query(
          'DELETE FROM SavedHouses WHERE UserID = $1 AND TreatProviderID = $2 RETURNING *',
          [userId, treatProviderId]
      );

      if (result.rowCount === 0) {
          return res.status(404).json({ error: 'Saved house not found' });
      }

      res.json({ message: 'Saved house deleted successfully' });
  } catch (error) {
      console.error('Error deleting saved house:', error);
      res.status(500).json({ error: 'Error deleting saved house' });
  }
});



module.exports = router;