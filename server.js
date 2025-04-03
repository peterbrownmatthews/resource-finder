import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Proxy endpoint for Google Places API to keep API key secure
app.get('/api/places', async (req, res) => {
  try {
    const { lat, lng, keyword, radius } = req.query;
    const location = `${lat},${lng}`;

    console.log('Searching for:', {
      query: keyword,
      location,
      radius
    });

    const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
      params: {
        location,
        radius,
        keyword,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    console.log(`Found ${response.data.results.length} results for "${keyword}"`);
    
    if (response.data.error_message) {
      console.error('Google API Error:', response.data.error_message);
    }

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('API Key:', process.env.GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing');
}); 