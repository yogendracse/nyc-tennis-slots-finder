'use client';

import dynamic from 'next/dynamic';
import { useState, useRef } from 'react';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Park } from '@/types';
import { MagnifyingGlassIcon, ClockIcon, MapPinIcon, ArrowPathIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Dynamic import of ParksMap with no SSR
const ParksMap = dynamic(() => import('@/components/ParksMap'), {
  ssr: false, // This will only render the map on the client side
  loading: () => (
    <div className="w-full h-[400px] rounded-lg overflow-hidden shadow-lg bg-gray-100 flex items-center justify-center">
      <div className="text-gray-500">Loading map...</div>
    </div>
  ),
});

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [parks, setParks] = useState<Park[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedParkId, setSelectedParkId] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleParkClick = (parkId: string) => {
    setSelectedParkId(parkId);
    // Scroll to the park's section
    const parkElement = document.getElementById(`park-${parkId}`);
    if (parkElement) {
      parkElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchData = async (usePreviousData: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[UI] Fetching data with params:', {
        usePreviousData,
        selectedDate: format(selectedDate, 'yyyy-MM-dd')
      });

      const response = await fetch(`/api/courts?usePreviousData=${usePreviousData}`);
      const data = await response.json();

      console.log('[UI] Received response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch data');
      }

      if (data.success) {
        console.log('[UI] Setting parks data:', data.parks);
        setParks(data.parks);
        setLastUpdate(data.timestamp ? new Date(data.timestamp) : new Date());

        // Debug log for selected date's data
        const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
        data.parks.forEach((park: Park) => {
          const slots = park.availableSlots[selectedDateStr] || [];
          console.log(`[UI] Park ${park.name} has ${slots.length} slots for ${selectedDateStr}`);
        });
      } else {
        throw new Error(data.error || 'Failed to fetch tennis courts');
      }
    } catch (error) {
      console.error('[UI] Error fetching data:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindSlots = () => fetchData(false);
  const handleUsePreviousData = () => fetchData(true);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  // Debug log whenever selectedDate or parks change
  console.log('[UI] Rendering with:', {
    selectedDate: selectedDateStr,
    parksCount: parks.length,
    parksWithSlots: parks.filter(park => park.availableSlots[selectedDateStr]?.length > 0).length,
    error
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">NYC Tennis Slots Finder</h1>
          <p className="text-xl text-gray-600">Find available tennis courts across NYC parks in one place</p>
        </div>

        {/* Search Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="w-full md:w-auto md:flex-grow">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <DatePicker
                selected={selectedDate}
                onChange={handleDateChange}
                dateFormat="MMMM d, yyyy"
                minDate={new Date()}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 h-10"
                wrapperClassName="w-full"
                calendarClassName="!text-sm"
                popperProps={{
                  strategy: "fixed"
                }}
                popperClassName="!z-[9999]"
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto md:self-end">
              <button
                onClick={handleFindSlots}
                disabled={isLoading}
                className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2 h-10 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Loading...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="-ml-1 mr-2 h-4 w-4" />
                    Find Slots
                  </>
                )}
              </button>
              <button
                onClick={handleUsePreviousData}
                disabled={isLoading}
                className="flex-1 md:flex-none inline-flex items-center justify-center px-4 py-2 h-10 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px]"
              >
                <ArrowPathIcon className="-ml-1 mr-2 h-4 w-4" />
                Use Previous Data
              </button>
            </div>
          </div>

          {lastUpdate && (
            <p className="mt-4 text-sm text-gray-500">
              Last updated: {format(lastUpdate, 'MMM d, yyyy HH:mm:ss')}
            </p>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
            <div className="flex items-center">
              <ExclamationCircleIcon className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
            {error.includes('previous data') && (
              <p className="mt-2 text-sm text-red-600">
                Please click the "Find Slots" button to fetch fresh data.
              </p>
            )}
          </div>
        )}

        {/* Map Section */}
        {parks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Tennis Courts Locations
            </h2>
            <ParksMap
              parks={parks}
              onParkClick={handleParkClick}
            />
          </div>
        )}

        {/* Results */}
        <div ref={resultsRef} className="space-y-8">
          {parks.map((park) => {
            const availableSlots = park.availableSlots[selectedDateStr] || [];
            
            // Skip parks with no available slots for the selected date
            if (availableSlots.length === 0) return null;

            return (
              <div 
                key={park.id} 
                id={`park-${park.id}`}
                className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 ${
                  selectedParkId === park.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Park Name: {park.id} : {park.name}
                  </h3>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-gray-600">{park.details}</p>
                    <p className="text-sm text-gray-600 flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      {park.address}
                    </p>
                  </div>
                </div>

                <div className="p-6">
                  <h4 className="font-medium text-gray-900 mb-4">
                    Next Available slots on {format(selectedDate, 'MMMM d, yyyy')}:
                  </h4>
                  <div className="space-y-4">
                    {Object.entries(
                      availableSlots.reduce((acc, slot) => {
                        if (!acc[slot.court]) {
                          acc[slot.court] = [];
                        }
                        acc[slot.court].push(slot);
                        return acc;
                      }, {} as Record<string, typeof availableSlots>)
                    ).map(([court, slots]) => (
                      <div key={court} className="border-t pt-4 first:border-t-0 first:pt-0">
                        <h5 className="font-medium text-gray-700 mb-2">{court}</h5>
                        <div className="flex flex-wrap gap-2">
                          {slots.map((slot, index) => (
                            <a
                              key={`${court}-${index}`}
                              href={slot.reservationLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-md text-sm hover:bg-green-200 transition-colors"
                            >
                              <ClockIcon className="h-4 w-4 mr-2" />
                              {slot.time}
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          }).filter(Boolean)}
        </div>

        {/* No Results State */}
        {!isLoading && !error && (!parks.length || !parks.some(park => 
          park.availableSlots[selectedDateStr]?.length > 0
        )) && (
          <div className="text-center text-gray-600 mt-8">
            <p>No available courts found for {format(selectedDate, 'MMMM d, yyyy')}.</p>
            <p className="mt-2">Try selecting a different date or click "Find Slots" to refresh the data.</p>
          </div>
        )}
      </div>
    </div>
  );
}
