# Security Implementation

## Overview
RentEase implements comprehensive security measures to protect against common web vulnerabilities and attacks.

## Security Features

### 1. Rate Limiting
Prevents abuse by limiting the number of requests per IP address.

#### API Rate Limiting
- **Limit**: 100 requests per 15 minutes per IP
- **Applies to**: All `/api/*` endpoints
- **Purpose**: Prevents API abuse and DDoS attacks

#### Authentication Rate Limiting
- **Limit**: 5 failed attempts per 15 minutes per IP
- **Applies to**: `/api/auth/register`, `/api/auth/login`, `/api/auth/signin`
- **Purpose**: Prevents brute force attacks on user accounts
- **Note**: Only failed requests count toward the limit

#### Payment Rate Limiting
- **Limit**: 10 requests per hour per IP
- **Applies to**: 
  - `/api/payments/cash`
  - `/api/payments/initiate`
  - `/api/tenants/:id/payment`
  - `/api/tenants/:id/make-payment`
- **Purpose**: Prevents payment spam and fraud attempts

#### Upload Rate Limiting
- **Limit**: 20 uploads per hour per IP
- **Applies to**: `/api/mpesa/upload-statement`
- **Purpose**: Prevents abuse of file upload functionality

### 2. Input Sanitization

#### MongoDB Injection Prevention
- Automatically removes `$` and `.` from user input
- Prevents NoSQL injection attacks
- Uses `express-mongo-sanitize` middleware

#### HTTP Parameter Pollution (HPP) Protection
- Prevents attacks using duplicate parameters
- Whitelist: `sort`, `filter`, `page`, `limit`
- Uses `hpp` middleware

### 3. Request Size Limiting
- **Maximum payload size**: 10MB
- Prevents large payload attacks
- Returns 413 (Payload Too Large) for oversized requests

### 4. Security Headers

#### Helmet.js
Automatically sets secure HTTP headers:
- X-Frame-Options: DENY (prevents clickjacking)
- X-Content-Type-Options: nosniff (prevents MIME sniffing)
- X-XSS-Protection: enabled
- Strict-Transport-Security (HSTS)

#### Custom Headers
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Content-Security-Policy**: Restricts resource loading
- **X-Frame-Options**: DENY
- **X-Content-Type-Options**: nosniff
- **X-XSS-Protection**: 1; mode=block

### 5. Session Security

#### Session Configuration
- **Default Duration**: 7 days
- **Remember Me Duration**: 30 days
- **Cookie Settings**:
  - httpOnly: true (prevents XSS access)
  - secure: true (HTTPS only in production)
  - sameSite: 'lax' (CSRF protection)

#### Session Validation
- Automatic session validation on every request
- Checks session age against configured maximum
- Returns 401 with `sessionExpired: true` for expired sessions
- Client automatically redirects to sign-in page

#### Auto-Refresh
- Client refreshes session every 5 minutes
- Prevents timeout during active usage
- Uses rolling sessions (extends on each request)

### 6. Suspicious Activity Detection

Monitors and blocks requests containing:
- **Path Traversal**: `../`, `/etc/`, `/proc/`, `/sys/`
- **SQL Injection**: `union`, `select`, `insert`, `update`, `delete`, `drop`, etc.
- **XSS Patterns**: `<script>`, `javascript:`, `onerror=`, `onclick=`

Returns 403 (Forbidden) and logs suspicious activity.

### 7. CORS Configuration

#### Allowed Origins
- `http://localhost:5173` (Development)
- `http://localhost:3000` (Development)
- `process.env.FRONTEND_URL` (Production)
- `process.env.PRODUCTION_URL` (Production)

#### Settings
- Credentials: Enabled
- Blocks requests from unauthorized origins

### 8. Proxy Configuration
- Trusts reverse proxy headers (for Render, Nginx, etc.)
- Required for accurate IP detection in rate limiting

## Response Codes

### Security-Related Responses
- **401 Unauthorized**: Invalid or expired session
- **403 Forbidden**: Suspicious activity detected, CORS violation
- **413 Payload Too Large**: Request exceeds 10MB
- **429 Too Many Requests**: Rate limit exceeded

## Rate Limit Response Format
```json
{
  "error": "Too many requests",
  "message": "You have exceeded the rate limit. Please try again later.",
  "retryAfter": 900
}
```

## Environment Variables

### Required for Security
- `SESSION_SECRET`: Session encryption key (auto-generated if not provided)
- `NODE_ENV`: Set to `production` for secure cookies
- `FRONTEND_URL`: Allowed CORS origin (production)
- `PRODUCTION_URL`: Alternate production URL

## Best Practices

### For Developers
1. Never commit `.env` files
2. Use environment variables for all secrets
3. Test rate limits in development
4. Monitor security logs in production
5. Keep dependencies updated (`npm audit`)

### For Production
1. Set `NODE_ENV=production`
2. Use strong `SESSION_SECRET` (32+ characters)
3. Enable HTTPS (required for secure cookies)
4. Consider using Redis for distributed rate limiting
5. Monitor rate limit violations
6. Set up alerts for suspicious activity

## Logging

All security events are logged with:
- Timestamp
- IP address
- Event type (rate limit, suspicious activity, etc.)
- Request details

### Log Prefixes
- `🔐` General security events
- `⚠️` Rate limit warnings
- `🚨` Critical security violations (auth attempts, suspicious activity)
- `💳` Payment-related security events
- `📁` Upload-related security events

## Testing Rate Limits

### Development Testing
Rate limits are active in development. To test:

```bash
# Test auth rate limit (should block after 5 attempts)
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/signin \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
```

## Monitoring

### What to Monitor
1. Rate limit violations (429 responses)
2. Suspicious activity (403 responses)
3. Failed authentication attempts
4. Large payload attempts (413 responses)
5. Session expiration patterns

### Recommended Tools
- Application logs
- Error tracking (Sentry, etc.)
- Analytics platform
- Uptime monitoring

## Future Enhancements

### Planned Improvements
1. Redis-based distributed rate limiting
2. IP reputation checking
3. Two-factor authentication (2FA)
4. Advanced fraud detection for payments
5. Automated security scanning
6. Rate limit bypass for whitelisted IPs
7. Geographic blocking

## Maintenance

### Regular Tasks
- Review security logs weekly
- Update dependencies monthly
- Audit rate limit thresholds quarterly
- Review and update CORS origins
- Test security measures after major updates

## Support

For security concerns or vulnerabilities:
1. Do not create public issues
2. Contact development team directly
3. Provide detailed reproduction steps
4. Allow time for patch development
