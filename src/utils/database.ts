import { Pool } from 'pg';

// Create a connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'nyc_tennis',
});

// Helper function to run queries
export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

// Tennis court types
export interface TennisCourt {
  court_id: string;
  park_name: string;
  park_details?: string;
  address: string;
  lat: number;
  lon: number;
  num_courts: number;
  phone?: string;
  email?: string;
  hours?: string;
  website?: string;
  court_type?: string;
}

export interface CourtAvailability {
  court_id: string;
  date: string;
  time: string;
  court: string;
  status: string;
  reservation_link?: string;
}

// Helper functions for common queries
export async function getAllCourts(): Promise<TennisCourt[]> {
  const result = await query(`
    SELECT 
      court_id,
      park_name,
      park_details,
      address,
      CAST(lat AS DECIMAL(10,6)) as lat,
      CAST(lon AS DECIMAL(10,6)) as lon,
      num_courts,
      phone,
      email,
      hours,
      website,
      court_type
    FROM dwh.tennis_courts
    ORDER BY park_name
  `);

  // Ensure lat/lon are valid numbers
  return result.map(court => ({
    ...court,
    lat: parseFloat(court.lat) || 40.7831, // Default to Central Park coordinates if invalid
    lon: parseFloat(court.lon) || -73.9712
  }));
}

export async function getCourtAvailability(
  courtId: string,
  date: string
): Promise<CourtAvailability[]> {
  return query(`
    SELECT 
      court_id, 
      date, 
      time,
      court,
      status,
      reservation_link
    FROM dwh.court_availability
    WHERE 
      court_id = $1 
      AND date = $2
      AND status = 'Reserve this time'
      AND reservation_link IS NOT NULL
    ORDER BY 
      court,
      CASE 
        WHEN time LIKE '%a.m.' THEN 0
        WHEN time LIKE '%p.m.' THEN 1
      END,
      CASE
        WHEN time LIKE '12:%' THEN 0
        ELSE CAST(SUBSTRING(time FROM '^[0-9]+') AS INTEGER)
      END
  `, [courtId, date]);
}

export async function getLatestAvailabilityUpdate(): Promise<Date | null> {
  const result = await query(`
    SELECT last_updated AT TIME ZONE 'America/New_York' as et_time
    FROM dwh.court_availability
    ORDER BY last_updated DESC
    LIMIT 1
  `);
  return result.length > 0 ? new Date(result[0].et_time) : null;
} 