# Security Documentation

## JWT Authentication System

This backend implements a production-ready JWT authentication system with access tokens and refresh tokens.

### Features

#### 1. **Token Management**
- **Access Tokens**: Short-lived (15 minutes default) for API requests
- **Refresh Tokens**: Long-lived (7 days default) stored in database with revocation support
- **Token Rotation**: Refresh tokens are rotated on each use for enhanced security
- **Token Blacklisting**: Revoked tokens are tracked in the database

#### 2. **Security Features**

##### Password Security
- Minimum 8 characters (configurable)
- Requires uppercase, lowercase, and numbers
- Bcrypt hashing with salt rounds
- Password strength validation

##### Rate Limiting
- Login attempts: 5 per 15 minutes per IP/email
- Token refresh: 10 per minute per IP
- Registration: 3 per hour per IP
- Prevents brute force attacks

##### Security Headers
- X-Frame-Options: DENY (prevents clickjacking)
- X-Content-Type-Options: nosniff
- X-XSS-Protection: enabled
- Strict-Transport-Security (HTTPS only in production)
- Content-Security-Policy
- Referrer-Policy

##### Cookie Security
- HttpOnly: Prevents JavaScript access
- Secure: HTTPS only in production
- SameSite: Strict (prevents CSRF)
- Configurable domain

#### 3. **Token Storage**

Refresh tokens are stored in the database with:
- User association
- Expiration tracking
- Revocation status
- IP address and user agent tracking
- Automatic cleanup of expired tokens

#### 4. **Error Handling**

All authentication errors return:
- Generic error messages (prevents user enumeration)
- Error codes for programmatic handling
- Consistent error format

### Environment Variables

Required environment variables (see `.env.example`):

```bash
# JWT Secrets (REQUIRED in production)
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>

# Optional configuration
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
JWT_ISSUER=find-a-company-api
JWT_AUDIENCE=find-a-company-client
COOKIE_DOMAIN=yourdomain.com
```

### Generating Secure Secrets

For production, generate strong secrets:

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate JWT_REFRESH_SECRET
openssl rand -base64 32
```

### API Endpoints

#### Authentication

- `POST /api/auth/register` - Register new user
  - Rate limited: 3 per hour per IP
  - Validates email format and password strength

- `POST /api/auth/login` - Login user
  - Rate limited: 5 per 15 minutes per IP/email
  - Returns access token and refresh token
  - Sets secure HTTP-only cookies

- `POST /api/auth/refresh` - Refresh access token
  - Rate limited: 10 per minute
  - Implements token rotation
  - Returns new access and refresh tokens

- `POST /api/auth/logout` - Logout user
  - Revokes current refresh token
  - Clears cookies

- `POST /api/auth/logout-all` - Logout from all devices
  - Revokes all refresh tokens for user
  - Clears cookies

- `GET /api/auth/me` - Get current user info
  - Requires authentication
  - Returns user details

### Token Usage

#### Access Token
- Short-lived (15 minutes)
- Used for API authentication
- Sent in `Authorization: Bearer <token>` header or cookie

#### Refresh Token
- Long-lived (7 days)
- Used to obtain new access tokens
- Stored in database with revocation support
- Rotated on each use

### Security Best Practices

1. **Never commit secrets to version control**
   - Use environment variables
   - Use `.env` files (gitignored)
   - Use secret management services in production

2. **Use HTTPS in production**
   - Required for secure cookies
   - Prevents token interception
   - Enables HSTS header

3. **Monitor for suspicious activity**
   - Track failed login attempts
   - Monitor token refresh patterns
   - Alert on unusual activity

4. **Regular token cleanup**
   - Expired tokens are automatically cleaned up
   - Revoked tokens remain for audit purposes

5. **Password requirements**
   - Enforce strong passwords
   - Consider password complexity requirements
   - Implement password reset flow

### Migration to Production

Before deploying to production:

1. ✅ Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET`
2. ✅ Set `NODE_ENV=production`
3. ✅ Configure `COOKIE_DOMAIN` for your domain
4. ✅ Enable HTTPS
5. ✅ Set up proper CORS origins
6. ✅ Configure rate limiting (consider Redis for distributed systems)
7. ✅ Set up monitoring and logging
8. ✅ Run database migrations
9. ✅ Test authentication flow end-to-end

### Rate Limiting

Current implementation uses in-memory rate limiting. For production with multiple servers, consider:

- Redis-based rate limiting
- Distributed rate limiting service
- API gateway rate limiting

### Token Expiration

Default expiration times:
- Access Token: 15 minutes
- Refresh Token: 7 days

These can be configured via environment variables:
- `ACCESS_TOKEN_EXPIRY` (e.g., "15m", "1h")
- `REFRESH_TOKEN_EXPIRY` (e.g., "7d", "30d")

### Troubleshooting

#### "JWT_SECRET is not configured"
- Set `JWT_SECRET` environment variable
- Generate a strong secret for production

#### "Token has expired"
- Use refresh token to get new access token
- If refresh token expired, user must login again

#### "Too many requests"
- Rate limit exceeded
- Wait for the rate limit window to reset
- Check rate limit configuration

### Additional Security Considerations

1. **CSRF Protection**: Consider adding CSRF tokens for state-changing operations
2. **2FA**: Consider implementing two-factor authentication
3. **Device Tracking**: Track and manage user devices
4. **Session Management**: Implement session timeout warnings
5. **Audit Logging**: Log all authentication events for security auditing

