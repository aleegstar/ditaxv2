/**
 * Native OAuth callback bootstrap
 * Runs BEFORE React loads for instant deeplink redirect.
 * Extracted to external file to satisfy strict CSP (no 'unsafe-inline' on script-src).
 */
(function () {
  if (window.location.pathname.indexOf('/native-callback') !== 0) return;

  var hash = window.location.hash.substring(1);
  if (!hash) return;

  var params = new URLSearchParams(hash);
  var accessToken = params.get('access_token');
  if (!accessToken) return;

  var refreshToken = params.get('refresh_token');
  var pathParts = window.location.pathname.split('/');
  var scheme = pathParts[2] || 'ditax';

  var deeplink = scheme + '://oauth/auth?access_token=' + encodeURIComponent(accessToken);
  if (refreshToken) {
    deeplink += '&refresh_token=' + encodeURIComponent(refreshToken);
  }

  window.location.href = deeplink;
})();
