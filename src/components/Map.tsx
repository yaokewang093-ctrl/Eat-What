import React, { useEffect, useRef } from 'react';

interface MapProps {
  center: [number, number]; // [lng, lat]
  radius: number;
  restaurants: any[];
  onMarkerClick?: (restaurant: any) => void;
  onLocationComplete?: (lng: number, lat: number, address?: string) => void;
}

const Map: React.FC<MapProps> = ({ center, radius, restaurants, onMarkerClick, onLocationComplete }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const circle = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || !window.AMap) return;

    if (!mapInstance.current) {
      mapInstance.current = new window.AMap.Map(mapRef.current, {
        center: center,
        zoom: 14,
      });

      // Add geolocation control
      window.AMap.plugin('AMap.Geolocation', function() {
        const geolocation = new window.AMap.Geolocation({
          enableHighAccuracy: true,
          timeout: 10000,
          offset: [20, 20],
          zoomToAccuracy: true,
          position: 'RB',
        });

        mapInstance.current.addControl(geolocation);

        geolocation.on('complete', (data: any) => {
          console.log('Geolocation successful:', data);
          if (onLocationComplete) {
            onLocationComplete(data.position.lng, data.position.lat, data.formattedAddress);
          }
        });

        geolocation.on('error', (err: any) => {
          console.error('Geolocation error:', err);
          alert('定位失败：' + (err.message || '请确保已开启定位权限并使用安全链接'));
        });
      });
    } else {
      mapInstance.current.setCenter(center);
    }

    // Update radius circle
    if (circle.current) {
      circle.current.setMap(null);
    }
    circle.current = new window.AMap.Circle({
      center: center,
      radius: radius,
      fillColor: '#FF6B35',
      fillOpacity: 0.1,
      strokeColor: '#FF6B35',
      strokeWeight: 2,
      strokeOpacity: 0.5,
    });
    circle.current.setMap(mapInstance.current);

    // Adjust zoom based on radius
    const zoomMap: Record<number, number> = {
      500: 15,
      1000: 14,
      2000: 13,
      3000: 13,
      5000: 12
    };
    if (mapInstance.current) {
      mapInstance.current.setZoom(zoomMap[radius] || 14);
    }

    // Update markers
    markers.current.forEach(m => m.setMap(null));
    markers.current = [];

    restaurants.forEach(restaurant => {
      const marker = new window.AMap.Marker({
        position: [restaurant.longitude, restaurant.latitude],
        title: restaurant.name,
        map: mapInstance.current,
      });

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(restaurant));
      }
      markers.current.push(marker);
    });

  }, [center, radius, restaurants]);

  return <div ref={mapRef} className="w-full h-full rounded-lg shadow-inner" />;
};

export default Map;

declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig: any;
  }
}
