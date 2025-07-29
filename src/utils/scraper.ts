import axios from 'axios';
import * as cheerio from 'cheerio';
import { Park, DaySchedule, TennisCourt, TimeSlot, ScrapeResult } from '@/types';

const BASE_URL = 'https://www.nycgovparks.org/tennisreservation';
const PARK_IDS = Array.from({ length: 13 }, (_, i) => i + 1); // 1 to 13

// Add headers to mimic a browser request
const axiosInstance = axios.create({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  },
});

async function scrapeParkData(parkId: number): Promise<Park | null> {
  try {
    const url = `${BASE_URL}/availability/${parkId}`;
    console.log(`[Scraper] Attempting to fetch park ${parkId} from: ${url}`);
    
    const response = await axiosInstance.get(url);
    console.log(`[Scraper] Response status for park ${parkId}:`, response.status);
    
    if (response.status !== 200) {
      console.error(`[Scraper] Non-200 status code for park ${parkId}:`, response.status);
      return null;
    }

    const $ = cheerio.load(response.data);
    console.log(`[Scraper] Successfully loaded HTML for park ${parkId}`);
    
    // Log the entire HTML for debugging
    console.log(`[Scraper] HTML content for park ${parkId}:`, response.data);
    
    // Get park details
    const locationDetails = $('#location_details');
    const parkName = locationDetails.find('h2').text().trim();
    const location = locationDetails.find('p').text().trim();
    
    console.log(`[Scraper] Park details:`, { parkId, parkName, location });
    
    if (!parkName) {
      console.log(`[Scraper] No park name found for ID ${parkId}, skipping...`);
      return null;
    }

    // Get schedule tabs
    const schedules: DaySchedule[] = [];
    const tabsCount = $('.nav-tabs li a').length;
    console.log(`[Scraper] Found ${tabsCount} schedule tabs`);

    $('.nav-tabs li a').each((_, tab) => {
      const href = $(tab).attr('href');
      const displayDate = $(tab).html() || '';
      console.log(`[Scraper] Processing tab:`, { href, displayDate });

      if (href && href.startsWith('#')) {
        const date = href.substring(1); // Remove '#' from href
        
        // Get court data for this date
        const courts: TennisCourt[] = [];
        const tabContent = $(`#${date}`);
        const tableRows = tabContent.find('table tr').length;
        console.log(`[Scraper] Found ${tableRows} rows in table for date ${date}`);
        
        // Process each court row
        tabContent.find('table tr').each((rowIndex, row) => {
          if (rowIndex === 0) return; // Skip header row
          
          const courtNumber = $(row).find('td:first').text().trim();
          const slots: TimeSlot[] = [];
          
          // Process each time slot in the row
          $(row).find('td:not(:first)').each((_, cell) => {
            const $cell = $(cell);
            let status: TimeSlot['status'] = 'unavailable';
            let reservationUrl: string | undefined;
            
            // Log cell classes for debugging
            const cellClasses = $cell.attr('class');
            console.log(`[Scraper] Cell classes:`, cellClasses);
            
            if ($cell.hasClass('status2')) {
              status = 'available';
              const reserveLink = $cell.find('a.assign_someone').attr('href');
              if (reserveLink) {
                reservationUrl = `https://www.nycgovparks.org${reserveLink}`;
              }
            } else if ($cell.hasClass('status3')) {
              status = 'booked';
            }
            
            const time = $cell.find('span').text().trim() || $cell.text().trim();
            if (time && time !== 'Not Available' && time !== 'Booked') {
              slots.push({
                time,
                status,
                ...(reservationUrl && { reservationUrl })
              });
              console.log(`[Scraper] Found slot:`, { time, status, reservationUrl });
            }
          });
          
          if (courtNumber && slots.length > 0) {
            courts.push({
              id: `${parkId}-${courtNumber}`,
              courtNumber,
              slots
            });
            console.log(`[Scraper] Added court:`, { courtNumber, slotsCount: slots.length });
          }
        });
        
        if (courts.length > 0) {
          schedules.push({
            date,
            displayDate,
            courts
          });
          console.log(`[Scraper] Added schedule:`, { date, courtsCount: courts.length });
        }
      }
    });

    const result = {
      id: parkId.toString(),
      name: parkName,
      location,
      schedules
    };

    console.log(`[Scraper] Final park data:`, JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`[Scraper] Axios error for park ${parkId}:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers,
        data: error.response?.data
      });
    } else {
      console.error(`[Scraper] Error scraping park ${parkId}:`, error);
    }
    return null;
  }
}

export async function scrapeAllParks(): Promise<ScrapeResult> {
  try {
    console.log('[Scraper] Starting to scrape all parks...');
    
    // Skip Central Park (ID: 12) for now as it has a different structure
    const parkIds = PARK_IDS.filter(id => id !== 12);
    console.log('[Scraper] Will scrape these park IDs:', parkIds);
    
    const parkPromises = parkIds.map(id => scrapeParkData(id));
    const parks = (await Promise.all(parkPromises))
      .filter((park): park is Park => park !== null);
    
    console.log(`[Scraper] Successfully scraped ${parks.length} parks`);
    console.log('[Scraper] All parks data:', JSON.stringify(parks, null, 2));
    
    return {
      success: true,
      parks
    };
  } catch (error) {
    console.error('[Scraper] Error in scrapeAllParks:', error);
    return {
      success: false,
      parks: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 