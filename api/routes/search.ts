import express, { Request, Response } from 'express';
import axios from 'axios';

const router = express.Router();

// 地址搜索 API: GET /api/search/location?address=xxx&city=xxx
router.get('/location', async (req: Request, res: Response) => {
  const { address, city } = req.query;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    const amapKey = process.env.VITE_AMAP_KEY;
    console.log('Search request for address:', address, 'city:', city, 'using key:', amapKey ? 'PRESENT' : 'MISSING');

    if (!amapKey || amapKey === 'your_amap_api_key_here') {
      console.log('Error: Amap Key is missing or default!');
      return res.status(500).json({ error: 'Amap Key is not configured' });
    }

    const response = await axios.get('https://restapi.amap.com/v3/geocode/geo', {
      params: {
        address,
        city: city || undefined, // Use city if provided to prioritize search
        key: amapKey,
      },
    });

    console.log('Amap search response status:', response.data.status);

    if (response.data.status === '1' && response.data.geocodes.length > 0) {
      const location = response.data.geocodes[0].location.split(',');
      const result = {
        longitude: parseFloat(location[0]),
        latitude: parseFloat(location[1]),
        formatted_address: response.data.geocodes[0].formatted_address,
      };
      console.log('Search result:', result);
      res.json(result);
    } else {
      console.log('Amap search failed or no results:', response.data);
      res.status(404).json({ error: 'Address not found' });
    }
  } catch (error) {
    console.error('Search location error:', error);
    res.status(500).json({ error: 'Failed to search location' });
  }
});

export default router;
