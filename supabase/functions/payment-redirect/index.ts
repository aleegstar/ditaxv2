import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * payment-redirect Edge Function
 * 
 * Bridge page for Despia native app payment flow.
 * After Stripe Checkout completes, Stripe redirects here.
 * This function serves a minimal HTML page that redirects to
 * the app's deeplink, closing the in-app browser automatically.
 * 
 * Flow:
 * 1. Stripe redirects to: payment-redirect?session_id=xxx&tax_year=2024&tax_return_id=yyy&scheme=ditax
 * 2. This function serves a minimal HTML page
 * 3. JavaScript redirects to: ditax://oauth/payment-success?session_id=xxx&tax_year=2024&tax_return_id=yyy
 * 4. Despia catches the deeplink, closes the browser session
 * 5. WebView navigates to /payment-success?session_id=xxx&tax_year=2024&tax_return_id=yyy
 */
serve(async (req) => {
  const url = new URL(req.url);
  const scheme = url.searchParams.get('scheme') || 'ditax';
  const sessionId = url.searchParams.get('session_id') || '';
  const taxYear = url.searchParams.get('tax_year') || '';
  const taxReturnId = url.searchParams.get('tax_return_id') || '';

  // Sanitize scheme to prevent XSS (only allow alphanumeric and hyphens)
  const safeScheme = scheme.replace(/[^a-zA-Z0-9-]/g, '');

  // Build deeplink params
  const params = new URLSearchParams();
  if (sessionId) params.set('session_id', sessionId);
  if (taxYear) params.set('tax_year', taxYear);
  if (taxReturnId) params.set('tax_return_id', taxReturnId);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Weiterleitung...</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fff; color: #333; }
    .loader { text-align: center; }
    .spinner { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Zahlung erfolgreich – Weiterleitung zur App...</p>
  </div>
  <script>
    (function() {
      try {
        var deeplink = '${safeScheme}://oauth/payment-success?${params.toString()}';
        console.log('Redirecting to deeplink:', deeplink);
        window.location.href = deeplink;
        
        // Fallback: if deeplink doesn't work after 3s, show manual hint
        setTimeout(function() {
          document.querySelector('p').textContent = 'Bitte schliesse diesen Tab, um zur App zurückzukehren.';
          document.querySelector('.spinner').style.display = 'none';
        }, 3000);
      } catch(e) {
        document.querySelector('p').textContent = 'Fehler: ' + e.message;
      }
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
