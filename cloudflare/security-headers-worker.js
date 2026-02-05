/**
 * Cloudflare Worker: Security Headers Injection
 * 
 * This worker injects HTTP security headers before responses reach the browser.
 * Deploy this worker and route it to app.ditax.ch/* to enable proper CSP and security headers.
 * 
 * Setup Instructions: See CLOUDFLARE_SETUP.md
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Forward request to Lovable backend
  const response = await fetch(request);
  
  // Clone response to modify headers
  const newResponse = new Response(response.body, response);
  
  // Content Security Policy (CSP)
  // Note: Adjusted for Lovable's requirements (includes unsafe-inline/unsafe-eval for now)
  newResponse.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpteng.co https://fonts.googleapis.com https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; " +
    "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com; " +
    "img-src 'self' data: blob: https://*.supabase.co https://gqbhilftduwxjszznnzy.supabase.co https://storage.googleapis.com; " +
    "media-src 'self' https://ditax.ch; " +
    "connect-src 'self' https://gqbhilftduwxjszznnzy.supabase.co wss://gqbhilftduwxjszznnzy.supabase.co https://api.openai.com; " +
    "frame-src 'self' https://ditax.productlift.dev; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'none'; " +
    "upgrade-insecure-requests; " +
    "block-all-mixed-content; " +
    "report-uri https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/csp-report"
  );
  
  // Strict Transport Security (HSTS)
  newResponse.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  
  // X-Frame-Options (prevents clickjacking)
  newResponse.headers.set('X-Frame-Options', 'DENY');
  
  // X-Content-Type-Options (prevents MIME sniffing)
  newResponse.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Referrer-Policy (controls referrer information)
  newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions-Policy (restricts browser features)
  newResponse.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  
  // X-XSS-Protection (legacy but still useful)
  newResponse.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Cross-Origin-Opener-Policy
  newResponse.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  
  // Cross-Origin-Resource-Policy
  newResponse.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  
  return newResponse;
}
