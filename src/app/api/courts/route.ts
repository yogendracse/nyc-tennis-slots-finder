import { NextResponse } from 'next/server';
import { getAllCourts, getCourtAvailability } from '@/utils/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courtId = searchParams.get('courtId');
    const date = searchParams.get('date');

    // If courtId and date are provided, return availability
    if (courtId && date) {
      const availability = await getCourtAvailability(courtId, date);
      return NextResponse.json(availability);
    }

    // Otherwise return all courts
    const courts = await getAllCourts();
    return NextResponse.json(courts);
  } catch (error) {
    console.error('Error fetching courts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courts' },
      { status: 500 }
    );
  }
} 