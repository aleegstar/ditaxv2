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
  // SECURITY: Validate request URL to prevent SSRF
  const url = new URL(request.url);
  const allowedHosts = ['ditaxv2.lovable.app', 'app.ditax.ch', 'ditax.ch'];
  
  if (!allowedHosts.some(host => url.hostname === host || url.hostname.endsWith('.' + host))) {
    return new Response('Forbidden', { status: 403 });
  }

  // SECURITY: Block requests to private/internal IPs to prevent SSRF
  if (url.hostname === 'localhost' || 
      url.hostname === '127.0.0.1' || 
      url.hostname === '0.0.0.0' ||
      url.hostname.startsWith('10.') || 
      url.hostname.startsWith('192.168.') || 
      url.hostname.startsWith('172.') ||
      url.hostname === '169.254.169.254' ||
      url.hostname.endsWith('.internal') ||
      url.hostname.endsWith('.local')) {
    return new Response('Forbidden', { status: 403 });
  }

  // SECURITY: Only allow HTTPS protocol
  if (url.protocol !== 'https:') {
    return new Response('Forbidden', { status: 403 });
  }
  
  // Forward validated request to origin using sanitized URL
  const sanitizedUrl = new URL(url.pathname + url.search, `https://${url.hostname}`);
  const sanitizedRequest = new Request(sanitizedUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    redirect: 'manual',
  });
  const response = await fetch(sanitizedRequest);
  
  // Clone response to modify headers
  const newResponse = new Response(response.body, response);
  
  // Content Security Policy (CSP) — production hardened
  newResponse.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' https://cdn.gpteng.co; " +
    "style-src 'self' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob: https://*.supabase.co https://storage.googleapis.com; " +
    "media-src 'self' https://ditax.ch; " +
    "connect-src 'self' https://gqbhilftduwxjszznnzy.supabase.co wss://gqbhilftduwxjszznnzy.supabase.co; " +
    "frame-src 'self' https://ditax.productlift.dev; " +
    "worker-src 'self' blob:; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'none'; " +
    "upgrade-insecure-requests; " +
    "block-all-mixed-content; " +
    "report-uri https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/csp-report"
  );

  // HSTS — 2-year, includeSubDomains, preload eligible
  newResponse.headers.set('Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload');

  // Clickjacking
  newResponse.headers.set('X-Frame-Options', 'DENY');

  // MIME sniffing
  newResponse.headers.set('X-Content-Type-Options', 'nosniff');

  // Referrer
  newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy — explicit deny for sensitive surfaces
  newResponse.headers.set('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self), usb=(), ' +
    'accelerometer=(), gyroscope=(), magnetometer=(), serial=(), ' +
    'midi=(), bluetooth=(), interest-cohort=()');

  // Cross-Origin isolation
  newResponse.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  newResponse.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  newResponse.headers.set('Cross-Origin-Embedder-Policy', 'credentialless');

  // Reporting endpoint
  newResponse.headers.set('Report-To',
    '{"group":"csp","max_age":10886400,"endpoints":[{"url":"https://gqbhilftduwxjszznnzy.supabase.co/functions/v1/csp-report"}]}');

  // Remove server fingerprinting headers if present
  newResponse.headers.delete('Server');
  newResponse.headers.delete('X-Powered-By');

  return newResponse;
}
