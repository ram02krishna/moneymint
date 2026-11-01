## Security Measures Implemented

This application includes comprehensive security measures to protect user data and prevent common web vulnerabilities:

### 1. **CSRF Protection**
- Helmet middleware for security headers
- SameSite cookie attributes
- CORS configuration with specific origins
- File: `Backend/server.js`

### 2. **Rate Limiting**
- **Auth endpoints (login/register)**: 5 requests per 15 minutes per IP
- **Data endpoints (income, expense, budget, dashboard)**: 30 requests per 15 minutes per IP
- **General endpoints**: 100 requests per 15 minutes per IP
- Protects against brute force and DoS attacks

### 3. **Input Validation & Sanitization**
- Express-validator for all user inputs
- HTML escaping to prevent XSS attacks
- MongoDB ObjectId validation for all ID parameters
- Schema-level validation with Mongoose
- File: `Backend/middleware/validationMiddleware.js`

### 4. **Authentication & Authorization**
- JWT (JSON Web Tokens) with 1-hour expiration
- Password hashing with bcryptjs
- Secure session management with httpOnly, secure, and sameSite flags
- Protected routes require authentication middleware

### 5. **Database Security**
- Mongoose ODM prevents NoSQL injection
- Parameterized queries through Mongoose methods
- User ID validation before all database operations
- Schema validation on all models

### 6. **Password Security**
- Minimum 8 characters required
- Bcryptjs hashing with automatic salting
- Secure password comparison
- Change password functionality

### 7. **Secure Headers**
- Content-Security-Policy (CSP)
- X-Frame-Options (prevents clickjacking)
- X-Content-Type-Options (prevents MIME sniffing)
- Strict-Transport-Security (HTTPS enforcement)
- X-XSS-Protection (legacy XSS protection)

### 8. **Environment Configuration**
- Sensitive values stored in `.env` file (not in version control)
- Example template provided in `.env.example`
- NODE_ENV-based configuration for development vs production

### For Environment Setup

**Backend Environment Variables** (`.env`):
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/db_name
JWT_SECRET=your_strong_random_secret_key
SESSION_SECRET=your_strong_random_secret_key
PORT=5000
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Frontend Environment Variables** (`.env`):
```
VITE_BASE_URL=https://api.yourdomain.com
```

### For Deployment

1. **HTTPS Only** - Use SSL/TLS certificates
2. **CORS Configuration** - Set specific frontend domain (never use wildcard in production)
3. **Database Security**:
   - Enable MongoDB Atlas IP whitelist
   - Use strong passwords
   - Restrict database user permissions
4. **Regular Updates** - Keep dependencies patched
5. **Monitor Logs** - Watch for suspicious activity
6. **Rotate Secrets** - Every 3-6 months
