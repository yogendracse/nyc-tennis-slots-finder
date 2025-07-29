'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Park, TimeSlot } from '@/types';
import { format } from 'date-fns';

interface ParksMapProps {
  parks: Park[];
  selectedDate: Date;
  onParkClick?: (parkId: string) => void;
}

interface SlotSummary {
  total: number;
  morning: number;   // Before 12:00
  afternoon: number; // 12:00 - 16:59
  evening: number;   // 17:00 onwards
}

function getSlotSummary(slots: TimeSlot[]): SlotSummary {
  return slots.reduce((summary, slot) => {
    // Add debug logging
    console.log('Processing time slot:', slot.time);

    // Parse time like "6:00 a.m." or "2:30 p.m."
    const timeComponents = slot.time.toLowerCase().split(' ');
    const timeStr = timeComponents[0];
    const period = timeComponents[1]; // Will be "a.m." or "p.m."
    
    let [hours, minutes] = timeStr.split(':').map(Number);
    
    // Convert to 24-hour format
    if (period === 'p.m.' && hours !== 12) {
      hours += 12;
    } else if (period === 'a.m.' && hours === 12) {
      hours = 0;
    }

    // Add debug logging
    console.log(`Converted ${slot.time} to ${hours}:${minutes} (24-hour format)`);

    // Classify slots
    if (hours < 12) {
      summary.morning++;
      console.log(`${slot.time} classified as morning`);
    } else if (hours < 17) {
      summary.afternoon++;
      console.log(`${slot.time} classified as afternoon`);
    } else {
      summary.evening++;
      console.log(`${slot.time} classified as evening`);
    }
    summary.total++;
    
    return summary;
  }, { total: 0, morning: 0, afternoon: 0, evening: 0 });
}

export default function ParksMap({ parks, selectedDate, onParkClick }: ParksMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [expandedParkId, setExpandedParkId] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/marker-icon-2x.png',
      iconUrl: '/marker-icon.png',
      shadowUrl: '/marker-shadow.png',
    });
  }, []);

  const center = parks.length > 0 ? parks.reduce(
    (acc, park) => {
      acc[0] += park.latitude;
      acc[1] += park.longitude;
      return acc;
    },
    [0, 0]
  ).map(coord => coord / parks.length) : [40.7831, -73.9712];

  const customIcon = new L.Icon({
    iconUrl: '/tennis-marker.svg',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  if (!isClient) return null;

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

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
        {parks.map((park) => {
          const dateSlots = park.availableSlots[selectedDateStr] || [];
          const summary = getSlotSummary(dateSlots);

          return (
            <Marker
              key={park.id}
              position={[park.latitude, park.longitude]}
              icon={customIcon}
              eventHandlers={{
                click: () => {
                  if (expandedParkId === park.id) {
                    onParkClick?.(park.id);
                  } else {
                    setExpandedParkId(park.id);
                  }
                },
              }}
            >
              <Popup>
                <div className="p-3 min-w-[250px]">
                  <h3 className="font-bold text-sm mb-2">{park.name}</h3>
                  <p className="text-xs text-gray-600 mb-2">{park.address}</p>
                  
                  <div className="mt-3 space-y-1 text-sm">
                    <div className={`font-semibold ${summary.total > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                      {summary.total > 0 ? (
                        `${summary.total} Available Slots on ${format(selectedDate, 'MMMM d, yyyy')}`
                      ) : (
                        `No available slots on ${format(selectedDate, 'MMMM d, yyyy')}`
                      )}
                    </div>
                    {summary.total > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                        <div className="bg-yellow-50 p-2 rounded" title="6:00 a.m. - 11:59 a.m.">
                          <div className="font-medium text-yellow-800">Morning</div>
                          <div className="text-yellow-600">{summary.morning} slots</div>
                        </div>
                        <div className="bg-blue-50 p-2 rounded" title="12:00 p.m. - 4:59 p.m.">
                          <div className="font-medium text-blue-800">Afternoon</div>
                          <div className="text-blue-600">{summary.afternoon} slots</div>
                        </div>
                        <div className="bg-purple-50 p-2 rounded" title="5:00 p.m. - onwards">
                          <div className="font-medium text-purple-800">Evening</div>
                          <div className="text-purple-600">{summary.evening} slots</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onParkClick?.(park.id);
                    }}
                    className="mt-3 w-full text-xs bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded transition-colors"
                  >
                    View Full Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
} 