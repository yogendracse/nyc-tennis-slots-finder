'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { TennisCourt, CourtAvailability } from '@/utils/database';
import { MagnifyingGlassIcon, ClockIcon, MapPinIcon, ArrowPathIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';

// Dynamic import of ParksMap with no SSR
const ParksMap = dynamic(() => import('@/components/ParksMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] rounded-lg overflow-hidden shadow-lg bg-gray-100 flex items-center justify-center">
      <div className="text-gray-500">Loading map...</div>
    </div>
  ),
});

type TimePreference = 'no-preference' | 'morning' | 'afternoon' | 'evening';
type CourtTypePreference = 'no-preference' | 'hard' | 'clay';

const TIME_PREFERENCES = [
  { id: 'no-preference', label: 'No Preference', icon: ClockIcon },
  { id: 'morning', label: 'Morning (6:00 AM - 11:59 AM)', icon: SunIcon },
  { id: 'afternoon', label: 'Afternoon (12:00 PM - 4:59 PM)', icon: SunIcon },
  { id: 'evening', label: 'Evening (5:00 PM onwards)', icon: MoonIcon },
] as const;

const COURT_TYPE_PREFERENCES = [
  { id: 'no-preference', label: 'No Preference' },
  { id: 'hard', label: 'Hard Courts' },
  { id: 'clay', label: 'Clay Courts' },
] as const;

function isTimeInPreference(time: string, preference: TimePreference): boolean {
  if (preference === 'no-preference') return true;

  const timeComponents = time.toLowerCase().split(' ');
  const timeStr = timeComponents[0];
  const period = timeComponents[1]; // Will be "a.m." or "p.m."
  
  let [hours, minutes] = timeStr.split(':').map(Number);
  
  // Convert to 24-hour format
  if (period === 'p.m.' && hours !== 12) {
    hours += 12;
  } else if (period === 'a.m.' && hours === 12) {
    hours = 0;
  }

  switch (preference) {
    case 'morning':
      return hours < 12;
    case 'afternoon':
      return hours >= 12 && hours < 17;
    case 'evening':
      return hours >= 17;
    default:
      return true;
  }
}

function isCourtTypeMatch(court: TennisCourt, preference: CourtTypePreference): boolean {
  if (preference === 'no-preference') return true;
  return court.court_type?.toLowerCase() === preference;
}

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timePreference, setTimePreference] = useState<TimePreference>('no-preference');
  const [courtTypePreference, setCourtTypePreference] = useState<CourtTypePreference>('no-preference');
  const [isLoading, setIsLoading] = useState(false);
  const [courts, setCourts] = useState<TennisCourt[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedParkId, setSelectedParkId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [courtAvailability, setCourtAvailability] = useState<Record<string, CourtAvailability[]>>({});
  const mapRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleCourtClick = (parkId: string) => {
    setSelectedParkId(parkId);
    // Scroll to the court's section
    const courtElement = document.getElementById(`court-${parkId}`);
    if (courtElement) {
      courtElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToMap = () => {
    if (mapRef.current) {
      mapRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleFindSlots = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all courts
      const courtsResponse = await fetch('/api/courts');
      if (!courtsResponse.ok) {
        throw new Error('Failed to fetch courts');
      }
      const courtsData: TennisCourt[] = await courtsResponse.json();
      
      // Filter courts based on court type preference
      const filteredCourts = courtsData.filter(court => isCourtTypeMatch(court, courtTypePreference));
      setCourts(filteredCourts);

      // Fetch availability for filtered courts
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const availabilityPromises = filteredCourts.map(async (court) => {
        const response = await fetch(`/api/courts?parkId=${court.park_id}&date=${dateStr}`);
        const data: CourtAvailability[] = await response.json();
        
        // Filter slots based on time preference
        const filteredData = data.filter(slot => isTimeInPreference(slot.time, timePreference));
        
        return { parkId: court.park_id, availability: filteredData };
      });

      const results = await Promise.all(availabilityPromises);
      const availabilityMap = results.reduce((acc, { parkId, availability }) => {
        if (availability.length > 0) { // Only include courts with available slots
          acc[parkId] = availability;
        }
        return acc;
      }, {} as Record<string, CourtAvailability[]>);

      setCourtAvailability(availabilityMap);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="space-y-6">
            {/* Date Selection */}
            <div>
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

            {/* Court Type Preference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Court Type Preference
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {COURT_TYPE_PREFERENCES.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setCourtTypePreference(id as CourtTypePreference)}
                    className={`flex items-center justify-center px-4 py-2 rounded-md border ${
                      courtTypePreference === id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    } transition-colors`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Preference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Preference
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {TIME_PREFERENCES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTimePreference(id as TimePreference)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md border ${
                      timePreference === id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    } transition-colors`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Find Slots Button */}
            <div className="flex justify-end">
              <button
                onClick={handleFindSlots}
                disabled={isLoading}
                className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Loading...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="-ml-1 mr-2 h-5 w-5" />
                    Find Slots
                  </>
                )}
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
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Map Section */}
        {courts.length > 0 && (
          <div className="mb-8" ref={mapRef}>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Tennis Courts Locations
            </h2>
            <ParksMap
              courts={courts}
              selectedDate={selectedDate}
              onParkClick={handleCourtClick}
            />
          </div>
        )}

        {/* Results */}
        <div ref={resultsRef} className="space-y-8">
          {courts.map((court) => {
            const availableSlots = courtAvailability[court.park_id] || [];
            
            // Skip courts with no available slots
            if (availableSlots.length === 0) return null;

            return (
              <div 
                key={court.park_id} 
                id={`court-${court.park_id}`}
                className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 ${
                  selectedParkId === court.park_id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Park Name: {court.park_id} : {court.park_name}
                  </h3>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-gray-600">{court.park_details}</p>
                    <p className="text-sm text-gray-600 flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      {court.address}
                    </p>
                    {court.phone && (
                      <p className="text-sm text-gray-600">Phone: {court.phone}</p>
                    )}
                    {court.hours && (
                      <p className="text-sm text-gray-600">Hours: {court.hours}</p>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <h4 className="font-medium text-gray-900 mb-4">
                    Next Available slots on {format(selectedDate, 'MMMM d, yyyy')}:
                  </h4>
                  <div className="space-y-4">
                    {Object.entries(
                      availableSlots.reduce((acc, slot) => {
                        if (!acc[slot.court_id]) {
                          acc[slot.court_id] = [];
                        }
                        acc[slot.court_id].push(slot);
                        return acc;
                      }, {} as Record<string, typeof availableSlots>)
                    ).map(([courtName, slots]) => (
                      <div key={courtName} className="border-t pt-4 first:border-t-0 first:pt-0">
                        <h5 className="font-medium text-gray-700 mb-2">Court {courtName}</h5>
                        <div className="flex flex-wrap gap-2">
                          {slots.map((slot, index) => (
                            <a
                              key={`${courtName}-${index}`}
                              href={slot.reservation_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1.5 rounded-md text-sm hover:bg-green-200 transition-colors"
                            >
                              <ClockIcon className="h-4 w-4 mr-1.5" />
                              {slot.time}
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                  <button
                    onClick={scrollToMap}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors group"
                    title="Go back to map"
                    aria-label="Go back to map"
                  >
                    <MapPinIcon className="h-5 w-5" />
                    <span className="hidden group-hover:inline">View on map</span>
                  </button>
                </div>
              </div>
            );
          }).filter(Boolean)}
        </div>

        {/* No Results State */}
        {!isLoading && !error && courts.length > 0 && !Object.values(courtAvailability).some(slots => slots.length > 0) && (
          <div className="text-center text-gray-600 mt-8">
            <p>
              No available {courtTypePreference !== 'no-preference' ? `${courtTypePreference} ` : ''}courts found for {format(selectedDate, 'MMMM d, yyyy')}
              {timePreference !== 'no-preference' && ` during ${timePreference} hours`}.
            </p>
            <p className="mt-2">Try selecting different preferences or click "Find Slots" to refresh the data.</p>
          </div>
        )}
      </div>
    </div>
  );
}
