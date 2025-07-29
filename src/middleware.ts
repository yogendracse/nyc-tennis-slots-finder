import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds
const MAX_REQUESTS = 100;

// In-memory store for rate limiting
const rateLimit = new Map<string, { count: number; timestamp: number }>();

// Clean up old rate limit entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimit.entries()) {
    if (now - value.timestamp > RATE_LIMIT_WINDOW) {
      rateLimit.delete(key);
    }
  }
}, 60 * 60 * 1000);

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;"
  );

  // Only apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.ip ?? 'anonymous';
    const current = rateLimit.get(ip) ?? { count: 0, timestamp: Date.now() };

    // Reset count if window has passed
    if (Date.now() - current.timestamp > RATE_LIMIT_WINDOW) {
      current.count = 0;
      current.timestamp = Date.now();
    }

    current.count++;
    rateLimit.set(ip, current);

    if (current.count > MAX_REQUESTS) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', MAX_REQUESTS.toString());
    response.headers.set('X-RateLimit-Remaining', (MAX_REQUESTS - current.count).toString());
    response.headers.set('X-RateLimit-Reset', (current.timestamp + RATE_LIMIT_WINDOW).toString());
  }

  return response;
} 