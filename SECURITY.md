# Security Policy

## Supabase Key Security Model

This project uses Supabase for backend services. Understanding the difference between public and private keys is crucial:

### ANON Key (Public & Safe to Expose)

The `SUPABASE_PUBLISHABLE_KEY` (also called ANON key) is **intentionally public** and safe to include in client-side code:

- ✅ **Designed for public exposure** - Can be safely committed to Git
- ✅ **Protected by Row Level Security (RLS)** - All database access is restricted by RLS policies
- ✅ **Limited permissions** - Only allows operations explicitly permitted by RLS policies
- ✅ **No admin privileges** - Cannot bypass security rules

**Location in code:**
- `src/integrations/supabase/client.ts`
- Used for all client-side database operations

### SERVICE_ROLE Key (Secret & Never Exposed)

The `SUPABASE_SERVICE_ROLE_KEY` is a **true secret** with admin privileges:

- ❌ **Never committed to repository**
- ❌ **Never exposed client-side**
- ✅ **Only stored in:**
  - Supabase Dashboard (Settings → API)
  - Edge Function environment variables (`Deno.env.get()`)
  - Secure CI/CD secrets

**Usage:**
- Only used in Edge Functions via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`
- Bypasses RLS policies for admin operations
- Never accessible to end users

## Security Scanners & False Positives

Security scanning tools (like aikido.dev) may flag the ANON key as a "leaked secret". This is a **false positive** because:

1. The ANON key is designed to be public (similar to Firebase API keys)
2. All security is enforced server-side via RLS policies
3. The key cannot perform privileged operations
4. This is the standard Supabase security architecture

## Current Security Measures

### HTTP Security Headers

**Challenge:** Lovable's hosting platform does not support `_headers` files for HTTP-level security headers.

**Solution:** Defense-in-depth approach using multiple protection layers:

#### Layer 1: Static Meta-Tags in `index.html` (Primary Protection)
- CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Active from first HTML load, before any JavaScript execution
- Recognized by security scanners like aikido.dev
- Provides immediate XSS and clickjacking protection

#### Layer 2: Dynamic Meta-Tags via `src/utils/securityHeaders.ts` (Backup Layer)
- Runtime validation and enforcement
- Ensures meta-tags remain present even if HTML is modified at runtime
- Called from `src/main.tsx` on application bootstrap
- Provides defense against runtime DOM manipulation

#### Layer 3: Reference HTTP Headers in `public/_headers` (Future-Proofing)
- Kept for documentation purposes
- Ready for migration to hosting platforms that support HTTP headers
- Reference for Cloudflare Workers or reverse proxy configuration
- Contains ideal security header configuration for production deployments

### Security Headers Included

- **Content-Security-Policy (CSP)** - Prevents XSS attacks by restricting content sources
- **Strict-Transport-Security (HSTS)** - Enforces HTTPS connections only
- **X-Frame-Options** - Prevents clickjacking by blocking iframe embedding
- **X-Content-Type-Options** - Prevents MIME-type sniffing attacks
- **Referrer-Policy** - Controls referrer information leakage
- **Permissions-Policy** - Restricts browser features (camera, microphone, geolocation, etc.)

### Meta-Tag Limitations

⚠️ **Important:** Meta-tags are weaker than HTTP headers because:
- `report-uri` directive is not supported in meta-tags (CSP violation reporting disabled)
- Some browsers prioritize HTTP headers over meta-tags
- Meta-tags can be modified by malicious browser extensions
- Not all security headers can be set via meta-tags

### Future Security Enhancements

For maximum security, consider:
- **Cloudflare Workers:** Inject HTTP headers at CDN edge before serving content
- **Platform Migration:** Move to Vercel/Netlify which support `_headers` or `vercel.json`
- **Reverse Proxy:** Set up Nginx/Apache for full HTTP header control
- **Contact Lovable Support:** Inquire about HTTP header configuration methods

### CSP Violation Reporting

CSP violations are logged to `security_audit_logs_immutable` via the `csp-report` Edge Function for security monitoring (currently disabled in meta-tag implementation due to browser limitations).

### Row Level Security (RLS)

All database tables have RLS policies enabled. Examples:

- Users can only access their own data (filtered by `auth.uid()`)
- Admin operations require role verification via `public.has_role()` function
- No public read/write access except where explicitly granted

### Authentication & Authorization

- Multi-factor authentication (MFA) support
- Passkey authentication for passwordless login
- Role-based access control (RBAC) via `user_roles` table
- Security definer functions prevent RLS recursion

### Data Encryption

- Sensitive fields encrypted at rest using field-level encryption
- Documents encrypted before storage
- Encryption keys managed via KMS (Key Management Service)

### Audit Logging

All security-relevant actions are logged to:
- `security_audit_logs` (mutable, for active monitoring)
- `security_audit_logs_immutable` (append-only, for compliance)

## Reporting Security Issues

If you discover a security vulnerability, please email: security@ditax.ch

We will respond within 48 hours and work with you to address the issue promptly.

## Security Scanner False Positives

### JWT Token "Leak" (aikido.dev)

**Finding:** "Uncovered a JSON Web Token in `src/integrations/supabase/client.ts`"  
**Status:** ⚠️ **FALSE POSITIVE**

**Explanation:**
- The flagged token is the **Supabase ANON key** (public key), not a secret JWT
- Supabase ANON keys are **DESIGNED to be public** (similar to Firebase API keys)
- All security is enforced **server-side via Row Level Security (RLS)**
- The key has **NO admin privileges** and cannot bypass security rules
- This key is functionally equivalent to a public API endpoint identifier

**Why This is Safe:**
1. **RLS Enforcement:** Every database query is validated against Row Level Security policies
2. **No Secret Data:** The ANON key cannot access data without proper authentication
3. **Rate Limited:** All requests through the ANON key are rate-limited by Supabase
4. **Intended Design:** Supabase's security model requires client-side ANON key exposure

**References:**
- [Supabase API Keys Documentation](https://supabase.com/docs/guides/api#api-keys)
- [Row Level Security Deep Dive](https://supabase.com/docs/learn/auth-deep-dive/auth-row-level-security)
- [Why ANON Keys Are Safe](https://supabase.com/docs/guides/auth#use-the-anon-key-on-the-client)

**Action Required:** None - this is expected behavior and does not represent a security risk.

---

## Cloudflare Workers Implementation (Recommended)

To overcome Lovable hosting limitations, we implement HTTP security headers via **Cloudflare Workers**:

### Architecture
```
User → Cloudflare Worker (injects headers) → Lovable Backend → Response
```

### Benefits
- ✅ True HTTP-level security headers (not just meta-tags)
- ✅ CSP `report-uri` functionality works
- ✅ Improves aikido.dev score from ~60% to ~90%
- ✅ Zero cost on Cloudflare Free Plan
- ✅ No changes to Lovable codebase required

### Implementation Guide
See **`cloudflare/CLOUDFLARE_SETUP.md`** for complete step-by-step setup instructions.

**Worker Code:** `cloudflare/security-headers-worker.js`

### Expected Results
After Cloudflare Workers implementation:
- **CSP Header:** Set as HTTP header (aikido.dev will detect it)
- **HSTS:** Enabled with 1-year max-age
- **Security Score:** ~90% on aikido.dev
- **Remaining Issues:** CSP unsafe-inline/eval (long-term roadmap)

## Roadmap

Future security enhancements planned:

1. **Nonce-based CSP** - Replace `unsafe-inline` with nonce-based script execution (20-40 hours)
2. **Subresource Integrity (SRI)** - Add integrity checks for external scripts
3. **Certificate Transparency** - Monitor SSL/TLS certificates
4. **Automated dependency scanning** - Regular npm audit checks via GitHub Dependabot
5. **Penetration Testing** - Schedule annual third-party security audits
6. **CSP Violation Dashboard** - Build admin dashboard for CSP violation monitoring

## Compliance

This application implements security measures aligned with:

- OWASP Top 10 security risks mitigation
- Swiss data protection regulations
- Industry best practices for web application security

---

**Last Updated:** 2025-01-21
**Security Contact:** security@ditax.ch
