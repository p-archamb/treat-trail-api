const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/authMiddleware');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const geocodingClient = mbxGeocoding({ accessToken: process.env.MAPBOX_ACCESS_TOKEN });
const mapboxClient = require('@mapbox/mapbox-sdk/services/geocoding')({ accessToken: process.env.MAPBOX_ACCESS_TOKEN });
const { upload, cloudinary } = require('../config/cloudinaryConfig'); 

function isBlankOrWhitespace(str) {
  return !str || str.trim().length === 0;
}

async function geocodeAddress(address) {
  try {
    const response = await geocodingClient.forwardGeocode({
      query: address,
      limit: 1
    }).send();

    if (response && response.body && response.body.features && response.body.features.length > 0) {
      const [lng, lat] = response.body.features[0].center;
      return { latitude: lat, longitude: lng };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}


// Add a new treat provider
router.post('/treatproviders', authenticateToken, async (req, res) => {
    // Extract data from request body
    const { address, treatsProvided, hours, hauntedHouse, description, photos } = req.body;

    // Get a client from the connection pool
    const client = await pool.connect();
  
    try {
      // Start a database transaction
      await client.query('BEGIN');
  
      // Insert the new treat provider into the TreatProviders table
      const treatProviderResult = await client.query(
        'INSERT INTO TreatProviders (Address, TreatsProvided, Hours, HauntedHouse, Description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [address, treatsProvided, hours, hauntedHouse, description]
      );
  
      // Get the ID of the newly created treat provider
      const treatProviderId = treatProviderResult.rows[0].treatproviderid;
  
      // If photos were provided in the request
      if (photos && Array.isArray(photos)) {
        // Loop through each photo
        for (let photo of photos) {
          // Insert each photo into the TreatProviderPhotos table
          await client.query(
            'INSERT INTO TreatProviderPhotos (TreatProviderID, PhotoURL, Description) VALUES ($1, $2, $3)',
            [treatProviderId, photo.url, photo.description]
          );
        }
      }
  
      // Update the User table to link this treat provider to the user
      await client.query(
        'UPDATE Users SET TreatProviderID = $1 WHERE UserID = $2',
        [treatProviderId, req.user.userId]
      );
  
      // Commit the transaction
      await client.query('COMMIT');
  
      // Fetch the inserted photos
      const photosResult = await client.query(
        'SELECT PhotoID, PhotoURL, Description FROM TreatProviderPhotos WHERE TreatProviderID = $1',
        [treatProviderId]
      );
  
      // Combine the treat provider data with the photos data
      const result = {
        ...treatProviderResult.rows[0],
        photos: photosResult.rows
      };
  
      // Send the created treat provider data (including photos) as the response
      res.status(201).json(result);
    } catch (error) {
      // If any error occurs, roll back the transaction
      await client.query('ROLLBACK');
      console.error('Error creating treat provider:', error);
      res.status(500).json({ error: 'An error occurred while creating the treat provider' });
    } finally {
      // Always release the client back to the pool
      client.release();
    }
  });
  // Get a single treat provider by ID
  router.get('/treatproviders/:id', async (req, res) => {
    const { id } = req.params;
    try {
      // Query the database to get the treat provider by ID
      const result = await pool.query('SELECT * FROM TreatProviders WHERE TreatProviderID = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Treat provider not found' });
      }
      
      const provider = result.rows[0];
      
      // Fetch associated photos
      const photosResult = await pool.query(
        'SELECT PhotoID, PhotoURL, Description FROM TreatProviderPhotos WHERE TreatProviderID = $1',
        [id]
      );
      
      // Add photos to the provider object
      provider.photos = photosResult.rows;
      
      // Send the provider details
      res.json(provider);
    } catch (error) {
      console.error('Error fetching treat provider details:', error);
      res.status(500).json({ error: 'An error occurred while fetching treat provider details' });
    }
  });
// Get all treat providers, and all associated info. No authtoken required so non logged in users can still search treat providers
router.get('/treatproviders', async (req, res) => {
    try {
      // Query the database to get all treat providers
      const treatProvidersResult = await pool.query('SELECT * FROM TreatProviders');
      
      // Extract the rows from the query result
      const treatProviders = treatProvidersResult.rows;
  
      // Iterate over each treat provider to fetch their photos
      for (let provider of treatProviders) {
        // For each treat provider, query the TreatProviderPhotos table
        const photosResult = await pool.query(
          'SELECT PhotoID, PhotoURL, Description FROM TreatProviderPhotos WHERE TreatProviderID = $1', 
          [provider.treatproviderid]
        );
        
        // Add the photos array to the provider object
        provider.photos = photosResult.rows;
      }
  
      // Send the array of treat providers (now including their photos) as the response
      res.json(treatProviders);
  
    } catch (error) {
      // If any error occurs during the process, log it and send an error response
      console.error('Error fetching treat providers:', error);
      res.status(500).json({ error: 'An error occurred while fetching treat providers' });
    }
});

// Advanced search and filter endpoint
router.get('/treatprovidersfilter', async (req, res) => {
  try {
    let query = 'SELECT subquery.*, ';
    let whereConditions = [];
    let params = [];
    let orderBy = 'TreatProviderID ASC';

    // Location-based filtering
    if (req.query.address) {
      try {
        // Geocode the address using Mapbox service
        const geoResponse = await geocodingClient.forwardGeocode({
          query: req.query.address,
          limit: 1
        }).send();

        if (geoResponse.body.features.length > 0) {
          // Extract longitude and latitude from geocoding result
          const [lng, lat] = geoResponse.body.features[0].center;

          // Calculate distance for all treat providers using Haversine formula
          query = `
            SELECT *, 
            (6371 * acos(cos(radians($${params.length + 1})) * cos(radians(latitude))
            * cos(radians(longitude) - radians($${params.length + 2}))
            + sin(radians($${params.length + 1})) * sin(radians(latitude)))) AS distance
            FROM TreatProviders
          `;
          params.push(lat, lng);

          // Set radius for filtering (default 10 km if not specified)
          const radius = parseFloat(req.query.radius) || 10;
          whereConditions.push(`distance < $${params.length + 1}`);
          params.push(radius);

          // Sort results by distance when using location filter
          orderBy = 'distance ASC';
        } else {
          throw new Error('Address not found');
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        return res.status(400).json({ error: 'Invalid address or geocoding failed' });
      }
    } else {
      // If no address provided, select all treat providers without distance calculation
      query = 'SELECT * FROM TreatProviders';
    }

    // Wrap the query in a subquery to allow filtering on calculated distance
    query = `SELECT * FROM (${query}) AS subquery`;

    // Haunted House filter
    if (req.query.hauntedhouse !== undefined) {
      whereConditions.push(`hauntedhouse = $${params.length + 1}`);
      params.push(req.query.hauntedhouse && req.query.hauntedhouse.toLowerCase() === 'true');
    }

    // Treats filter (case-insensitive partial match)
    if (req.query.treats) {
      whereConditions.push(`treatsprovided ILIKE $${params.length + 1}`);
      params.push(`%${req.query.treats}%`);
    }

    // Combine all WHERE conditions
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    // Sorting
    if (req.query.sortBy) {
      const validSortFields = ['treatsprovided', 'hauntedhouse', 'distance'];
      // Use the requested sort field if valid, otherwise default to 'distance' or 'TreatProviderID'
      const sortBy = validSortFields.includes(req.query.sortBy) ? req.query.sortBy : 
                     (req.query.address ? 'distance' : 'TreatProviderID');
      const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
      orderBy = `${sortBy} ${sortOrder}`;
    }

    // Add ORDER BY clause to the query
    query += ` ORDER BY ${orderBy}`;

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    // Log the final query and parameters for debugging
    console.log('Final Query:', query);
    console.log('Parameters:', params);

    // Execute the query
    const result = await pool.query(query, params);

    // Get the total count for pagination
    const countQuery = 'SELECT COUNT(*) FROM TreatProviders';
    const countResult = await pool.query(countQuery);
    const totalRecords = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalRecords / limit);

    // Send the results along with the total count and total pages
    res.json({
      data: result.rows,
      totalRecords,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching treat providers:', error);
    res.status(500).json({ error: 'An error occurred while fetching treat providers' });
  }
});

// Edit treatProvider profile functionality with photo upload
router.put('/treatproviders', authenticateToken, upload.array('photos', 5), async (req, res) => {
  // Extract update fields from request body
  const { address, treatsProvided, hours, hauntedHouse, description } = req.body;
  // Get the user ID from the JWT token
  const userId = req.user.userId;
  // Get a client from the connection pool
  const client = await pool.connect();

  try {
    // Start a database transaction
    await client.query('BEGIN');

    // Get the treatProviderId for the logged-in user
    const userResult = await client.query('SELECT TreatProviderID FROM Users WHERE UserID = $1', [userId]);
    if (!userResult.rows[0] || !userResult.rows[0].treatproviderid) {
      throw new Error('User is not a treat provider');
    }
    const treatProviderId = userResult.rows[0].treatproviderid;

    // Prepare the fields to be updated
    const updateFields = {};
    const validFields = ['TreatsProvided', 'Hours', 'HauntedHouse', 'Description'];
    validFields.forEach(field => {
      if (req.body[field.toLowerCase()] !== undefined) {
        updateFields[field] = req.body[field.toLowerCase()];
      }
    });

    // Handle address update and geocoding
    if (address && !isBlankOrWhitespace(address)) {
      const geoData = await geocodeAddress(address);
      if (geoData) {
        updateFields.Address = address;
        updateFields.Latitude = geoData.latitude;
        updateFields.Longitude = geoData.longitude;
      } else {
        throw new Error('Failed to geocode address');
      }
    } else {
      // If address is empty or only whitespace, set address and coordinates to empty strings
      updateFields.Address = '';
      updateFields.Latitude = null;
      updateFields.Longitude = null;
    }

    // If there are fields to update
    if (Object.keys(updateFields).length > 0) {
      const updateQuery = `
        UPDATE TreatProviders
        SET ${Object.keys(updateFields).map((key, index) => `${key} = $${index + 1}`).join(', ')}
        WHERE TreatProviderID = $${Object.keys(updateFields).length + 1}
        RETURNING *
      `;
      const updateValues = [...Object.values(updateFields), treatProviderId];
      await client.query(updateQuery, updateValues);
    }

    // Handle photo uploads if files are provided
    if (req.files && req.files.length > 0) {
      // Delete existing photos from Cloudinary
      const existingPhotosResult = await client.query('SELECT PhotoURL FROM TreatProviderPhotos WHERE TreatProviderID = $1', [treatProviderId]);
      for (let photo of existingPhotosResult.rows) {
        const publicId = photo.photourl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      }

      // Delete existing photo records from database
      await client.query('DELETE FROM TreatProviderPhotos WHERE TreatProviderID = $1', [treatProviderId]);

      // Insert new photos
      for (let file of req.files) {
        await client.query(
          'INSERT INTO TreatProviderPhotos (TreatProviderID, PhotoURL, Description) VALUES ($1, $2, $3)',
          [treatProviderId, file.path, file.originalname]
        );
      }
    }

    // Commit the transaction
    await client.query('COMMIT');

    // Fetch the updated treat provider data
    const treatProviderResult = await client.query('SELECT * FROM TreatProviders WHERE TreatProviderID = $1', [treatProviderId]);
    
    // Fetch the updated photos
    const photosResult = await client.query('SELECT PhotoID, PhotoURL, Description FROM TreatProviderPhotos WHERE TreatProviderID = $1', [treatProviderId]);

    // Combine treat provider data with photos
    const result = {
      ...treatProviderResult.rows[0],
      photos: photosResult.rows
    };

    // Send the updated data as response
    res.json(result);

  } catch (error) {
    // If any error occurs, rollback the transaction
    await client.query('ROLLBACK');
    console.error('Error updating treat provider profile:', error);
    res.status(500).json({ error: 'An error occurred while updating the profile' });
  } finally {
    // Always release the client back to the pool
    client.release();
  }
});

module.exports = router;
