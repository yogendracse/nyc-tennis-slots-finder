export interface TimeSlot {
  time: string;
  court: string;
  reservationLink: string;
}

export interface Park {
  id: string;
  name: string;
  details: string;
  address: string;
  latitude: number;
  longitude: number;
  availableSlots: {
    [date: string]: TimeSlot[];
  };
}

export interface ScrapeResult {
  success: boolean;
  parks: Park[];
  timestamp?: Date;
  error?: string;
} 