# Cloudflare Workers Setup Guide

This guide explains how to deploy the security headers worker to inject proper HTTP security headers for ditax.ch.

## Why Cloudflare Workers?

Lovable's hosting platform does not support custom HTTP headers via `_headers` files. Cloudflare Workers solve this by:
- Acting as a proxy between users and Lovable
- Injecting security headers before responses reach browsers
- Providing true HTTP-level CSP (not just meta-tags)
- Enabling CSP violation reporting via `report-uri`
- Improving aikido.dev security score from ~60% to 90%+

## Prerequisites

- Domain `ditax.ch` registered with Hostinger
- Access to Hostinger DNS management
- Free Cloudflare account

## Step-by-Step Implementation

### Step 1: Create Cloudflare Account

1. Go to [cloudflare.com](https://cloudflare.com)
2. Sign up for a free account
3. Verify your email address

### Step 2: Add Domain to Cloudflare

1. Click **"Add a Site"** in Cloudflare Dashboard
2. Enter `ditax.ch` (root domain)
3. Select **Free Plan**
4. Click **"Continue"**
5. Cloudflare will scan your existing DNS records
6. Note the **Cloudflare Nameservers** shown (e.g., `ns1.cloudflare.com`, `ns2.cloudflare.com`)

### Step 3: Change Nameservers at Hostinger

1. Log in to [Hostinger Control Panel](https://hpanel.hostinger.com)
2. Navigate to **Domains** → Select `ditax.ch`
3. Click **DNS / Nameservers**
4. Select **"Change Nameservers"** → **"Custom Nameservers"**
5. Enter the Cloudflare nameservers from Step 2:
   - Nameserver 1: `ns1.cloudflare.com`
   - Nameserver 2: `ns2.cloudflare.com`
6. Save changes

⏰ **DNS propagation takes 1-24 hours.** Cloudflare will email you when complete.

### Step 4: Create Cloudflare Worker

1. In Cloudflare Dashboard, click **Workers & Pages** (left sidebar)
2. Click **"Create"** → **"Create Worker"**
3. Name the worker: `ditax-security-headers`
4. Click **"Deploy"** (deploys the default worker)
5. Click **"Edit Code"**
6. Replace ALL code with the content from `cloudflare/security-headers-worker.js`
7. Click **"Save and Deploy"**

### Step 5: Route Worker to Domain

1. Go to Cloudflare Dashboard → Select `ditax.ch`
2. Click **Workers Routes** (left sidebar)
3. Click **"Add Route"**
4. Configure route:
   - **Route:** `app.ditax.ch/*`
   - **Worker:** Select `ditax-security-headers`
   - **Zone:** `ditax.ch`
5. Click **"Save"**

### Step 6: Configure DNS Records

1. In Cloudflare Dashboard, go to **DNS** → **Records**
2. Verify the `app` A-record exists:
   - **Type:** A
   - **Name:** `app`
   - **IPv4 address:** `185.158.133.1` (Lovable's IP)
   - **Proxy status:** **Proxied** (orange cloud icon) ← **IMPORTANT!**
3. If the record doesn't exist, create it
4. Ensure proxy status is **Proxied** (not DNS Only)

### Step 7: Test the Implementation

#### Test 1: Verify Headers with curl

```bash
curl -I https://app.ditax.ch
```

**Expected output should include:**
```
HTTP/2 200
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline' ...
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
```

#### Test 2: Browser DevTools

1. Open `https://app.ditax.ch` in browser
2. Open DevTools (F12)
3. Go to **Network** tab
4. Refresh page
5. Click on the document request (app.ditax.ch)
6. Go to **Headers** tab
7. Verify **Response Headers** include all security headers

#### Test 3: Security Scanner

1. Go to [aikido.dev](https://aikido.dev)
2. Run security scan for `https://app.ditax.ch`
3. Expected results:
   - ✅ CSP header properly set
   - ✅ HSTS enabled
   - ✅ X-Frame-Options set
   - ✅ X-Content-Type-Options set
   - ⚠️ CSP allows unsafe-inline/eval (known issue, see below)

## Troubleshooting

### Headers not appearing

1. **Check proxy status:** DNS record must be "Proxied" (orange cloud)
2. **Clear cache:** Cloudflare Dashboard → Caching → **"Purge Everything"**
3. **Wait for DNS:** Nameserver changes take up to 24 hours
4. **Check Worker logs:** Workers & Pages → `ditax-security-headers` → Logs

### DNS not resolving

1. Check nameserver propagation: [whatsmydns.net](https://whatsmydns.net)
2. Verify nameservers at Hostinger match Cloudflare exactly
3. Wait longer (DNS propagation can take 24-48 hours)

### Worker not executing

1. Verify route: `app.ditax.ch/*` must match exactly
2. Check worker is deployed (not just saved)
3. Ensure worker code has no syntax errors
4. Check Worker logs for errors

## Cost Overview

- **Cloudflare Free Plan:** €0/month
- **Worker Requests:** First 100,000 requests/day free
- **Bandwidth:** Unlimited on Free Plan
- **DNS:** Free

For normal traffic (< 100k requests/day), this solution is **completely free**.

## Remaining Security Issues

After implementing Cloudflare Workers, these issues remain:

### 1. CSP unsafe-inline / unsafe-eval (Medium Priority)

**Issue:** CSP allows `'unsafe-inline'` and `'unsafe-eval'`

**Impact:** Reduces XSS protection effectiveness

**Solution:** 
- Long-term: Migrate to nonce-based CSP (20-40 hours work)
- Short-term: Accept as known limitation of current architecture

### 2. glob Dependency Vulnerability (Low Priority)

**Issue:** Transitive dependency with known vulnerabilities

**Solution:**
```bash
npm audit
npm audit fix
npm update
```

## Future Improvements

### Phase 1: Nonce-based CSP (Recommended)

1. Generate unique nonce per request in worker
2. Inject nonce into HTML
3. Update CSP to `script-src 'nonce-{nonce}'`
4. Remove `'unsafe-inline'` and `'unsafe-eval'`

**Estimated time:** 20-40 hours

### Phase 2: Subresource Integrity (SRI)

Add integrity hashes for all external scripts/styles

### Phase 3: CSP Reporting Dashboard

Build admin dashboard to view CSP violations

## Support

- **Cloudflare Docs:** [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers)
- **CSP Reference:** [content-security-policy.com](https://content-security-policy.com)
- **aikido.dev:** [aikido.dev](https://aikido.dev)

## Expected aikido.dev Score

**Before Cloudflare Workers:** ~60%
- ❌ CSP not set as HTTP header
- ❌ HSTS missing
- ❌ Security headers incomplete

**After Cloudflare Workers:** ~90%
- ✅ CSP set as HTTP header
- ✅ HSTS enabled
- ✅ All security headers present
- ⚠️ CSP allows unsafe-inline/eval (accepted limitation)
- ⚠️ Path traversal (fixed in Priority 1)
- ✅ JWT false positive (documented)
