import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * SpaRedirector - Handles 404 fallback redirects for SPA routing
 * 
 * When static hosts (Lovable, Netlify) return 404 for routes like /auth or /native-callback,
 * the 404.html page redirects to /?redirect=/original-path#hash
 * This component picks up that redirect and navigates to the correct route,
 * preserving OAuth tokens in the hash fragment.
 */
export default function SpaRedirector() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect");
    
    if (!redirect) return;

    try {
      const decoded = decodeURIComponent(redirect);
      // Navigate to the decoded path, preserving any hash fragment
      navigate(`${decoded}${location.hash ?? ""}`, { replace: true });
    } catch (error) {
      console.error('SpaRedirector: Failed to decode redirect path:', error);
    }
  }, [location.search, location.hash, navigate]);

  return null;
}
