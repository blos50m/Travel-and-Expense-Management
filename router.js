const express = require('express');
const router = express.Router();
const AmadeusService = require('./amadeusService');

// Flight search endpoint
router.post('/flights/search', async (req, res) => {
  try {
      const {
          origin,
          destination,
          departureDate,
          returnDate,
          adults,
          travelClass,
          currency
      } = req.body;

      const flights = await AmadeusService.searchFlights({
          origin,
          destination,
          departureDate,
          returnDate,
          adults,
          travelClass,
          currency
      });

      res.json(flights);
  } catch (error) {
      console.error('Flight search error:', error);
      res.status(500).json({
          error: true,
          message: error.message || 'Failed to search flights'
      });
  }
});
// Hotel Search - Now using GET method
router.get('/hotels', async (req, res) => {
  try {
    const { cityCode } = req.query;  // Get cityCode from query parameters
    if (!cityCode) {
      return res.status(400).json({ error: 'City code is required' });
    }

    console.log("Searching hotels for city:", cityCode);  
    const results = await AmadeusService.searchHotels({ cityCode });
   res.json(results || [])
  } catch (error) {
    console.error('Hotel error:', error);
    res.json([]); 
  }
});


router.post('/transfers', async (req, res) => {
  console.log('Transfer request received:', req.body); // Add this
  try {
    const results = await AmadeusService.searchTransfers(req.body);
    res.json(results || []);
  } catch (error) {
    console.error('Transfer error:', error); // And this
    res.json({ success: false, message: 'No transfers found.' });

  }
});



router.get('/locations', async (req, res) => {
  try {
    const results = await AmadeusService.getLocations(req.query.keyword);
    res.json(results);
  } catch (error) {
    console.error('Location search failed:', error.response?.data || error.message || error);
    res.status(500).json({ error: error.response?.data || error.message || 'Internal Server Error' });
  }
});

module.exports = router;