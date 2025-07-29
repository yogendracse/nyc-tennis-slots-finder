'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Park } from '@/types';

interface ParksMapProps {
  parks: Park[];
  onParkClick?: (parkId: string) => void;
}

export default function ParksMap({ parks, onParkClick }: ParksMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Fix Leaflet marker icon issue
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/marker-icon-2x.png',
      iconUrl: '/marker-icon.png',
      shadowUrl: '/marker-shadow.png',
    });
  }, []);

  // Calculate center of all parks
  const center = parks.length > 0 ? parks.reduce(
    (acc, park) => {
      acc[0] += park.latitude;
      acc[1] += park.longitude;
      return acc;
    },
    [0, 0]
  ).map(coord => coord / parks.length) : [40.7831, -73.9712];

  // Custom marker icon
  const customIcon = new L.Icon({
    iconUrl: '/tennis-marker.svg',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  if (!mounted) return null;

  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        center={[center[0], center[1]]}
        zoom={12}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {parks.map((park) => (
          <Marker
            key={park.id}
            position={[park.latitude, park.longitude]}
            icon={customIcon}
            eventHandlers={{
              click: () => onParkClick?.(park.id),
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-sm">{park.name}</h3>
                <p className="text-xs text-gray-600 mt-1">{park.address}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
} 