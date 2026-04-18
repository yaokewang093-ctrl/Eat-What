import express, { Request, Response } from 'express';
import axios from 'axios';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// 获取附近餐厅 API: GET /api/restaurants/nearby?lat=xxx&lng=xxx&radius=500
router.get('/nearby', async (req: Request, res: Response) => {
  const { lat, lng, radius = 500, cuisine, price_range } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and Longitude are required' });
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lng as string);
  const searchRadius = parseInt(radius as string);

  // 1 degree ≈ 111,000 meters
  const latDelta = searchRadius / 111000;
  const lngDelta = searchRadius / (111000 * Math.cos(latitude * (Math.PI / 180)));

  try {
    const amapKey = process.env.VITE_AMAP_KEY;
    console.log('Nearby request for:', lat, lng, 'cuisine:', cuisine, 'using key:', amapKey ? 'PRESENT' : 'MISSING');
    let restaurants = [];

    // Map frontend cuisine names to Amap POI types
    const cuisineTypeMap: Record<string, string> = {
      '中餐': '050100',
      '西餐': '050200',
      '日韩料理': '050117|050118|050119',
      '快餐小吃': '050300|050301|050302|050303|050304|050305',
      '火锅': '050111|050112|050113|050114|050115|050116',
      '甜品饮品': '050400|050500|050700|050800|050900',
      '酒馆': '050600|050601|050602',
    };

    // If a specific cuisine is selected, we use keywords for better accuracy
    // If "全部" is selected, we use the broad Food & Beverage type (050000)
    const amapKeywords = (cuisine && cuisine !== '全部') ? (cuisine as string) : undefined;
    const amapTypes = amapKeywords ? undefined : '050000';

    // Try to fetch from Amap POI search first for "real" data
    if (amapKey && amapKey !== 'your_amap_api_key_here') {
      console.log('Attempting Amap POI search with keywords:', amapKeywords, 'types:', amapTypes);
      try {
        // Fetch multiple pages to get more "all" restaurants
        const pagesToFetch = [1, 2, 3];
        const allPoiPromises = pagesToFetch.map(page => 
          axios.get('https://restapi.amap.com/v3/place/around', {
            params: {
              key: amapKey,
              location: `${longitude},${latitude}`,
              radius: radius,
              types: amapTypes,
              keywords: amapKeywords,
              offset: 25, // Max results per page
              page: page,
              extensions: 'all'
            }
          })
        );

        const responses = await Promise.all(allPoiPromises);
        let allPois: any[] = [];
        
        responses.forEach(response => {
          if (response.data.status === '1' && response.data.pois) {
            allPois = [...allPois, ...response.data.pois];
          }
        });

        console.log('Total Amap POIs fetched:', allPois.length);

        if (allPois.length > 0) {
          // Remove duplicates based on ID
          const uniquePois = Array.from(new Map(allPois.map(item => [item.id, item])).values());
          
          restaurants = uniquePois.map((poi: any) => ({
            id: poi.id,
            name: poi.name,
            address: poi.address || poi.adname,
            cuisine_type: poi.type.split(';')[1] || poi.type.split(';')[0],
            rating: parseFloat(poi.biz_ext?.rating) || 4.0,
            price_range: poi.biz_ext?.cost ? `￥${poi.biz_ext.cost}` : '中等',
            latitude: parseFloat(poi.location.split(',')[1]),
            longitude: parseFloat(poi.location.split(',')[0]),
            image_url: poi.photos?.[0]?.url || `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(poi.name + ' restaurant food')}&image_size=square`
          }));
        } else {
          console.log('Amap POI search returned no results for keywords:', amapKeywords);
        }
      } catch (poiError) {
        console.error('Amap POI search error:', poiError);
      }
    }

    // If Amap failed or no key, fallback to Supabase
    if (restaurants.length === 0) {
      console.log('Falling back to Supabase search...');
      // ... (rest of the fallback logic)
      let query = supabase
        .from('restaurants')
        .select('*')
        .gte('latitude', latitude - latDelta)
        .lte('latitude', latitude + latDelta)
        .gte('longitude', longitude - lngDelta)
        .lte('longitude', longitude + lngDelta);

      if (cuisine) {
        query = query.eq('cuisine_type', cuisine);
      }

      const { data, error } = await query;
      if (error) throw error;
      restaurants = data || [];
    }

    // Final fallback to mock data for demo if everything else fails
    if (restaurants.length === 0) {
      console.log('Final fallback to mock data');
      restaurants = [
        {
          id: 'mock-1',
          name: `${cuisine !== '全部' ? cuisine : ''}餐厅 (示例数据)`,
          address: '当前位置周边 (由于API限制暂无真实数据)',
          latitude: latitude + 0.001,
          longitude: longitude + 0.001,
          cuisine_type: cuisine !== '全部' ? cuisine : '美食',
          rating: 4.5,
          price_range: '中等',
          image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500'
        }
      ];
    }

    res.json({
      restaurants,
      total_count: restaurants.length,
    });
  } catch (error) {
    console.error('Nearby restaurants error:', error);
    res.status(500).json({ error: 'Failed to fetch nearby restaurants' });
  }
});

export default router;
