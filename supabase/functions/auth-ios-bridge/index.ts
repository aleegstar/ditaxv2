import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * auth-ios-bridge Edge Function
 * 
 * Lightweight HTML page that runs inside ASWebAuthenticationSession on iOS.
 * Reads OAuth tokens from the URL hash fragment and redirects to the app's deeplink.
 * 
 * Flow:
 * 1. Supabase redirects to: auth-ios-bridge?scheme=ditax#access_token=xxx&refresh_token=yyy
 * 2. This function serves a minimal HTML page (~1KB)
 * 3. JavaScript reads window.location.hash
 * 4. JavaScript redirects to: ditax://oauth/auth?access_token=xxx&refresh_token=yyy
 * 5. Despia catches the deeplink, closes ASWebAuthenticationSession
 * 6. WebView navigates to /auth?access_token=xxx, Auth.tsx calls setSession()
 */
serve(async (req) => {
  const url = new URL(req.url);
  const scheme = url.searchParams.get('scheme') || 'ditax';

  // Sanitize scheme to prevent XSS (only allow alphanumeric and hyphens)
  const safeScheme = scheme.replace(/[^a-zA-Z0-9-]/g, '');

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
    <p>Anmeldung wird abgeschlossen...</p>
  </div>
  <script>
    (function() {
      try {
        var hash = window.location.hash.substring(1);
        if (!hash) {
          document.querySelector('p').textContent = 'Keine Tokens erhalten. Bitte versuche es erneut.';
          return;
        }
        var params = new URLSearchParams(hash);
        var accessToken = params.get('access_token');
        var refreshToken = params.get('refresh_token');
        
        if (!accessToken) {
          document.querySelector('p').textContent = 'Kein Access Token erhalten.';
          return;
        }
        
        var deeplink = '${safeScheme}://oauth/auth?access_token=' + encodeURIComponent(accessToken);
        if (refreshToken) {
          deeplink += '&refresh_token=' + encodeURIComponent(refreshToken);
        }
        
        window.location.href = deeplink;
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
