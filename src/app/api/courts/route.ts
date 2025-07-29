import { NextResponse } from 'next/server';
import { runPythonScript, readCSVData } from '@/utils/pythonRunner';
import { store } from '@/utils/store';

export async function GET(request: Request) {
  try {
    console.log('[API] Received request:', request.url);
    const { searchParams } = new URL(request.url);
    const usePreviousData = searchParams.get('usePreviousData') === 'true';
    
    console.log('[API] Request params:', { usePreviousData });

    try {
      if (!usePreviousData) {
        console.log('[API] Running Python script to fetch fresh data');
        await runPythonScript();
      } else {
        console.log('[API] Using existing CSV files without running Python script');
      }
      
      console.log('[API] Reading CSV data');
      const parks = await readCSVData();
      
      if (!parks || parks.length === 0) {
        console.log('[API] No parks data found');
        return NextResponse.json({
          success: false,
          error: 'No court data available. Please try running Find Slots first.'
        }, { status: 404 });
      }

      console.log(`[API] Successfully retrieved ${parks.length} parks`);
      // Store the data for future reference
      store.setScrapedData(parks);
      
      return NextResponse.json({
        success: true,
        parks,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('[API] Error processing request:', error);
      if (error instanceof Error && error.message.includes('CSV files are missing')) {
        return NextResponse.json({
          success: false,
          error: 'No previous data available. Please use Find Slots first.'
        }, { status: 404 });
      }
      throw error; // Re-throw other errors to be caught by outer try-catch
    }
  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'An unexpected error occurred while fetching court availability'
    }, { status: 500 });
  }
} 