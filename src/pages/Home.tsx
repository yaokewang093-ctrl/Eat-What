import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Map from '../components/Map';
import { Search, MapPin, Star, Utensils, Navigation, LocateFixed, Shuffle, X } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  cuisine_type: string;
  rating: number;
  price_range: string;
  latitude: number;
  longitude: number;
  image_url: string;
}

export default function Home() {
  const [address, setAddress] = useState('');
  const [center, setCenter] = useState<[number, number]>([121.4737, 31.2304]); // Default Shanghai
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('全部');
  const [selectedRadius, setSelectedRadius] = useState(500);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomWinner, setRandomWinner] = useState<Restaurant | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);

  const cuisines = ['全部', '中餐', '西餐', '日韩料理', '快餐小吃', '火锅', '甜品饮品', '酒馆'];
  const distances = [500, 1000, 2000, 3000, 5000];

  const fetchReviews = async (restaurant: Restaurant) => {
    console.log('Fetching reviews for:', restaurant.name);
    setSelectedRestaurant(restaurant);
    setReviewLoading(true);
    setShowReviewModal(true);
    try {
      const res = await axios.get(`/api/reviews/${restaurant.id}/reviews`);
      setReviews(res.data.reviews || []);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setReviews([]);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent, cuisineFilter?: string, radiusFilter?: number) => {
    if (e) e.preventDefault();
    if (!address.trim() && !center) return;

    setLoading(true);
    setError('');
    try {
      let lat = center[1];
      let lng = center[0];

      if (address.trim()) {
        const cityParam = currentCity ? `&city=${encodeURIComponent(currentCity)}` : '';
        const locRes = await axios.get(`/api/search/location?address=${encodeURIComponent(address)}${cityParam}`);
        lat = locRes.data.latitude;
        lng = locRes.data.longitude;
        setCenter([lng, lat]);
      }

      const filter = cuisineFilter || selectedCuisine;
      const radius = radiusFilter || selectedRadius;
      let url = `/api/restaurants/nearby?lat=${lat}&lng=${lng}&radius=${radius}`;
      if (filter !== '全部') {
        url += `&cuisine=${encodeURIComponent(filter)}`;
      }

      const restRes = await axios.get(url);
      setRestaurants(restRes.data.restaurants || []);
    } catch (err: any) {
      const status = err.response?.status;
      const errorMsg = err.response?.data?.error || err.message;
      setError(`搜索失败 (${status || '网络错误'}): ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationComplete = async (lng: number, lat: number, formattedAddress?: string) => {
    setCenter([lng, lat]);
    if (formattedAddress) {
      setAddress(formattedAddress);
      // Extract city from formattedAddress if possible (very simple logic)
      const cityMatch = formattedAddress.match(/.*?[省|市](.*?[市|区])/);
      if (cityMatch && cityMatch[1]) {
        setCurrentCity(cityMatch[1]);
      } else if (formattedAddress.includes('市')) {
        const city = formattedAddress.split('市')[0] + '市';
        setCurrentCity(city);
      }
    }
    
    setLoading(true);
    try {
      let url = `/api/restaurants/nearby?lat=${lat}&lng=${lng}&radius=${selectedRadius}`;
      if (selectedCuisine !== '全部') {
        url += `&cuisine=${encodeURIComponent(selectedCuisine)}`;
      }
      const restRes = await axios.get(url);
      setRestaurants(restRes.data.restaurants || []);
    } catch (err) {
      console.error('Failed to fetch restaurants after geolocation');
    } finally {
      setLoading(false);
    }
  };

  const handleNativeGeolocation = () => {
    if (!navigator.geolocation) {
      alert('您的浏览器不支持定位功能');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { longitude, latitude } = position.coords;
        handleLocationComplete(longitude, latitude);
      },
      (err) => {
        console.error('Native geolocation error:', err);
        alert('定位失败，请检查浏览器权限设置');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleCuisineChange = (cuisine: string) => {
    setSelectedCuisine(cuisine);
    handleSearch(undefined, cuisine);
  };

  const handleRadiusChange = (radius: number) => {
    setSelectedRadius(radius);
    handleSearch(undefined, undefined, radius);
  };

  const handleRandomSelect = () => {
    if (restaurants.length === 0) return;
    
    setLoading(true);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * restaurants.length);
      setRandomWinner(restaurants[randomIndex]);
      setShowRandomModal(true);
      setLoading(false);
    }, 800);
  };

  useEffect(() => {
    const fetchNearby = async () => {
      try {
        let url = `/api/restaurants/nearby?lat=${center[1]}&lng=${center[0]}&radius=${selectedRadius}`;
        if (selectedCuisine !== '全部') {
          url += `&cuisine=${encodeURIComponent(selectedCuisine)}`;
        }
        const restRes = await axios.get(url);
        setRestaurants(restRes.data.restaurants || []);
      } catch (err) {
        console.error('Failed to fetch initial restaurants');
      }
    };
    fetchNearby();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4">
          <h1 className="text-2xl font-bold text-orange-500 flex items-center gap-2">
            <Utensils /> 等会吃什么
          </h1>
          <form onSubmit={handleSearch} className="flex-1 w-full flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="输入地址找餐厅..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-orange-500 text-white px-6 py-2 rounded-full font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {loading ? '搜索中...' : '搜索'}
            </button>
            <button
              type="button"
              onClick={handleNativeGeolocation}
              disabled={loading}
              title="使用浏览器定位"
              className="p-2 border border-gray-200 rounded-full text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <LocateFixed className="w-5 h-5" />
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-[3] relative bg-gray-200 h-1/2 md:h-full">
          <Map
            center={center}
            radius={selectedRadius}
            restaurants={restaurants}
            onMarkerClick={(r) => fetchReviews(r)}
            onLocationComplete={handleLocationComplete}
          />
          
          <div className="absolute top-4 left-4 right-4 flex flex-col gap-2 pointer-events-none">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar pointer-events-auto">
              {cuisines.map((c) => (
                <button
                  key={c}
                  onClick={() => handleCuisineChange(c)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shadow-md transition-all ${
                    selectedCuisine === c ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar pointer-events-auto">
              {distances.map((d) => (
                <button
                  key={d}
                  onClick={() => handleRadiusChange(d)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shadow-md transition-all ${
                    selectedRadius === d ? 'bg-orange-600 text-white' : 'bg-white/90 text-gray-700 hover:bg-white'
                  }`}
                >
                  {d >= 1000 ? `${d / 1000}km` : `${d}m`}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-100 text-red-600 px-4 py-2 rounded-lg shadow-lg">
              {error}
            </div>
          )}
        </div>

        <div className="flex-[2] bg-white overflow-y-auto h-1/2 md:h-full shadow-2xl border-l border-gray-100 relative">
          <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-white sticky top-0 z-10">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">附近餐厅 ({restaurants.length})</h2>
              <p className="text-xs text-gray-400">当前范围内的美食都在这里</p>
            </div>
            <button
              onClick={handleRandomSelect}
              disabled={loading || restaurants.length === 0}
              className="flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-full text-sm font-bold hover:bg-orange-200 transition-all disabled:opacity-50 active:scale-95"
            >
              <Shuffle className="w-4 h-4" /> 帮我选
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {restaurants.length > 0 ? (
              restaurants.map((restaurant) => (
                <div key={restaurant.id} className="p-4 hover:bg-orange-50 transition-colors cursor-pointer group" onClick={() => fetchReviews(restaurant)}>
                  <div className="flex gap-4">
                    <img
                      src={restaurant.image_url}
                      alt={restaurant.name}
                      className="w-24 h-24 rounded-lg object-cover shadow-sm"
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{restaurant.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center text-yellow-500">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="ml-1 text-sm font-medium">{restaurant.rating}</span>
                          </div>
                          <span className="text-gray-300">|</span>
                          <span className="text-sm text-gray-500">{restaurant.cuisine_type}</span>
                          <span className="text-gray-300">|</span>
                          <span className="text-sm text-gray-500">{restaurant.price_range}</span>
                        </div>
                        <div className="flex items-start gap-1 mt-2 text-gray-500">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <p className="text-sm line-clamp-1">{restaurant.address}</p>
                        </div>
                      </div>
                      <button className="flex items-center gap-1 text-sm text-orange-500 font-medium hover:text-orange-600 mt-2">
                        <Navigation className="w-4 h-4" /> 查看评价
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-400">
                <p>暂无餐厅信息，换个地方试试？</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Review Modal */}
      {showReviewModal && selectedRestaurant && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedRestaurant.name}</h3>
                <p className="text-sm text-gray-500">餐厅评价</p>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {reviewLoading ? (
                <div className="flex flex-col items-center py-12">
                  <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-500">正在加载评价...</p>
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-50 last:border-0 pb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-gray-800">{review.user_id}</span>
                        <div className="flex text-yellow-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-gray-200'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                      <p className="text-xs text-gray-400 mt-2">{new Date(review.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400"><p>暂无更多评价</p></div>
              )}
            </div>
            
            <div className="p-6 bg-gray-50">
              <button onClick={() => setShowReviewModal(false)} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all">知道了</button>
            </div>
          </div>
        </div>
      )}

      {/* Random Select Modal */}
      {showRandomModal && randomWinner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="relative h-48">
              <img src={randomWinner.image_url} alt={randomWinner.name} className="w-full h-full object-cover" />
              <button onClick={() => setShowRandomModal(false)} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-4 left-6 right-6">
                <p className="text-orange-400 text-sm font-bold tracking-widest uppercase">今日首选</p>
                <h3 className="text-white text-2xl font-black mt-1 leading-tight">{randomWinner.name}</h3>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center text-yellow-500 bg-yellow-50 px-2 py-1 rounded-lg">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="ml-1 text-sm font-bold">{randomWinner.rating}</span>
                </div>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-600 font-medium">{randomWinner.cuisine_type}</span>
              </div>
              
              <div className="flex items-start gap-2 text-gray-500 mb-6">
                <MapPin className="w-4 h-4 mt-1 flex-shrink-0 text-orange-500" />
                <p className="text-sm leading-relaxed">{randomWinner.address}</p>
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => fetchReviews(randomWinner)} className="flex-1 py-3 px-4 border border-orange-200 text-orange-600 rounded-xl font-bold hover:bg-orange-50 transition-all">查看评价</button>
                <button onClick={() => setShowRandomModal(false)} className="flex-1 py-3 px-4 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all active:scale-95">就吃这家!</button>
              </div>
              <button onClick={handleRandomSelect} className="w-full mt-3 py-2 text-sm text-gray-400 font-medium hover:text-gray-600 transition-colors">不喜欢？再选一次</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
