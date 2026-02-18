/**
 * payment-redirect Edge Function
 * 
 * Bridge page for Despia native app payment flow.
 * After Stripe Checkout completes, Stripe redirects here.
 * This function serves a minimal HTML page that redirects to
 * the app's deeplink, closing the in-app browser automatically.
 */
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const scheme = url.searchParams.get('scheme') || 'ditax';
  const sessionId = url.searchParams.get('session_id') || '';
  const taxYear = url.searchParams.get('tax_year') || '';
  const taxReturnId = url.searchParams.get('tax_return_id') || '';

  // Sanitize scheme to prevent XSS
  const safeScheme = scheme.replace(/[^a-zA-Z0-9-]/g, '');

  // Build deeplink params
  const params = new URLSearchParams();
  if (sessionId) params.set('session_id', sessionId);
  if (taxYear) params.set('tax_year', taxYear);
  if (taxReturnId) params.set('tax_return_id', taxReturnId);

  const deeplink = `${safeScheme}://oauth/payment-success?${params.toString()}`;

  // Try direct 302 redirect to deeplink first — most reliable on Android
  // The in-app browser will intercept the custom scheme and close itself
  return new Response(null, {
    status: 302,
    headers: {
      'Location': deeplink,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
});
