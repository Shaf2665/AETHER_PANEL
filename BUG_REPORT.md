# Dashboard Bug Report
**Date**: $(date)  
**Tested URL**: https://dashboard.aetherpanel.com  
**Test Account**: mmshaf21@gmail.com

## Critical Bugs Found

### 1. **CRITICAL: Rate Limiting Blocking Legitimate Login Attempts**
**Severity**: 🔴 Critical  
**Location**: `backend/src/server.js` (lines 74-92, 94-110)  
**Issue**: 
- Both email/password login and Discord OAuth are being blocked with `429 Too Many Requests` errors
- Users cannot log into the dashboard
- Error appears in console: `Failed to load resource: the server responded with a status of 429 (Too Many Requests)`

**Root Cause**:
- Auth routes (`/api/auth/*`) are being hit by **TWO rate limiters**:
  1. General limiter on line 92: `app.use('/api/', limiter)` - 60 requests per 15 minutes
  2. Auth limiter on line 145: `app.use('/api/auth', authLimiter, authRoutes)` - 10 attempts per 15 minutes
- Both limiters are applied sequentially, causing double rate limiting
- Behind Cloudflare proxy, IP detection might be incorrect, causing all requests from Cloudflare's IP to be counted together

**Impact**: 
- Users cannot log in
- Dashboard is completely inaccessible
- Both authentication methods are blocked

**Recommended Fix**:
1. Exclude `/api/auth` routes from the general limiter
2. Only apply `authLimiter` to auth routes
3. Improve IP detection for Cloudflare (use `CF-Connecting-IP` header)
4. Consider increasing auth limiter limits or implementing a whitelist for trusted IPs

**Code Changes Needed**:
```javascript
// In backend/src/server.js
// Change line 92 from:
app.use('/api/', limiter);

// To:
app.use('/api/', (req, res, next) => {
  // Skip general limiter for auth routes (they have their own limiter)
  if (req.path.startsWith('/auth')) {
    return next();
  }
  limiter(req, res, next);
});
```

Or better yet, apply limiters more specifically:
```javascript
// Apply general limiter to specific route groups only
app.use('/api/coins', limiter);
app.use('/api/servers', limiter);
app.use('/api/revenue', limiter);
app.use('/api/resources', limiter);
app.use('/api/admin', limiter);
// Auth routes get authLimiter only (already applied on line 145)
```

---

## Additional Issues Found (Cannot Test Due to Login Block)

### 2. **Potential: IP Detection Behind Cloudflare**
**Severity**: 🟡 Medium  
**Location**: `backend/src/server.js` (keyGenerator functions)  
**Issue**: 
- Rate limiters use `X-Forwarded-For` header for IP detection
- Cloudflare provides `CF-Connecting-IP` header which is more reliable
- All requests from Cloudflare might be counted as the same IP

**Recommended Fix**:
```javascript
keyGenerator: (req) => {
  if (isProduction) {
    // Prefer Cloudflare's connecting IP header
    if (req.headers['cf-connecting-ip']) {
      return req.headers['cf-connecting-ip'];
    }
    // Fallback to X-Forwarded-For
    if (req.headers['x-forwarded-for']) {
      const forwarded = req.headers['x-forwarded-for'].split(',')[0].trim();
      return forwarded || req.ip;
    }
  }
  return req.ip;
}
```

---

## Testing Status

### ✅ Tested (Login Page)
- Login page loads correctly
- Form validation appears to work (inputs are marked as required)
- UI elements are properly structured
- No broken images detected
- Discord OAuth button is present

### ❌ Cannot Test (Blocked by Rate Limiting)
- Dashboard home page
- Server management
- Store page
- Admin panel
- User settings
- Revenue/Earn Coins features
- Theme customization
- Branding settings
- Store management
- All authenticated routes

---

## Recommendations

1. **Immediate Action Required**: Fix the double rate limiting issue to restore login functionality
2. **Improve IP Detection**: Use Cloudflare-specific headers for better IP detection
3. **Rate Limiter Configuration**: Review and adjust rate limiter limits based on actual usage patterns
4. **Monitoring**: Add logging for rate limit hits to understand usage patterns
5. **Error Messages**: Improve error messages for rate limit errors to inform users when they can retry

---

## Next Steps

Once login is fixed, the following areas need comprehensive testing:
1. Dashboard home page functionality
2. Server creation and management
3. Store page and template display
4. Admin panel (all sections)
5. Theme editor functionality
6. Branding customization
7. Store management (pricing and templates)
8. Revenue/Earn Coins features
9. User profile and settings
10. Navigation and routing
11. Error handling across all pages
12. Form validations
13. API error responses
14. Responsive design on different screen sizes

