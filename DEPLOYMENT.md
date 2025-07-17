# Deployment Guide

## Vercel Deployment

### Prerequisites
- Vercel account
- GitHub repository (optional but recommended)
- Environment variables configured

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy
```bash
vercel --prod
```

### Step 4: Configure Environment Variables

In the Vercel dashboard, add these environment variables:

#### Required
- `JWT_SECRET` - A secure random string for JWT token signing
- `NODE_ENV` - Set to `production`

#### Optional (for full functionality)
- `OPENROUTER_API_KEY` - For enhanced NLP features
- `GOOGLE_CLIENT_ID` - For Google Calendar integration
- `GOOGLE_CLIENT_SECRET` - For Google Calendar integration
- `GOOGLE_REDIRECT_URI` - Your domain + `/api/auth/google/callback`

### Step 5: Update Google OAuth Settings

If using Google integration:
1. Go to Google Cloud Console
2. Navigate to OAuth 2.0 Client IDs
3. Add your Vercel domain to authorized origins
4. Add `https://your-domain.vercel.app/api/auth/google/callback` to authorized redirect URIs

## Manual Deployment

### Step 1: Build Preparation
```bash
npm install --production
```

### Step 2: Environment Configuration
```bash
cp .env.example .env
# Edit .env with your production values
```

### Step 3: Start Server
```bash
npm start
```

## Environment Variables Reference

### JWT_SECRET
- **Required**: Yes
- **Description**: Secret key for JWT token signing
- **Example**: `your-super-secret-jwt-key-change-this-in-production`
- **Security**: Use a strong, random string in production

### OPENROUTER_API_KEY
- **Required**: No
- **Description**: API key for OpenRouter (enhanced NLP)
- **Example**: `sk-or-v1-...`
- **Get it from**: https://openrouter.ai/keys

### GOOGLE_CLIENT_ID
- **Required**: No (for Google integration)
- **Description**: Google OAuth client ID
- **Example**: `123456789-abc123.apps.googleusercontent.com`
- **Get it from**: Google Cloud Console

### GOOGLE_CLIENT_SECRET
- **Required**: No (for Google integration)
- **Description**: Google OAuth client secret
- **Example**: `GOCSPX-...`
- **Get it from**: Google Cloud Console

### GOOGLE_REDIRECT_URI
- **Required**: No (for Google integration)
- **Description**: OAuth callback URL
- **Example**: `https://your-domain.vercel.app/api/auth/google/callback`
- **Must match**: Google Cloud Console settings

## Database Notes

- The application uses SQLite for data storage
- In production on Vercel, the database is stored in `/tmp` (temporary)
- For persistent data, consider upgrading to PostgreSQL or similar
- Database tables are automatically created on first run

## Post-Deployment Checklist

- [ ] Application loads successfully
- [ ] User registration works
- [ ] User login works
- [ ] Calendar events can be created
- [ ] Natural language parsing works
- [ ] Google OAuth works (if configured)
- [ ] PWA installation works
- [ ] Responsive design works on mobile
- [ ] Dark mode toggle works
- [ ] API endpoints return expected responses

## Troubleshooting

### Common Issues

1. **Database errors**
   - Check if `/tmp` directory is writable
   - Verify SQLite is properly initialized

2. **Authentication failures**
   - Verify JWT_SECRET is set
   - Check token expiration (7 days default)

3. **Google OAuth errors**
   - Verify redirect URI matches exactly
   - Check Google Cloud Console configuration
   - Ensure client ID and secret are correct

4. **CORS issues**
   - Verify origin settings in CORS configuration
   - Check for trailing slashes in URLs

5. **API errors**
   - Check Vercel function logs
   - Verify environment variables are set
   - Check function timeout settings

### Logs and Debugging

- **Vercel**: Check function logs in Vercel dashboard
- **Local**: Use `console.log` statements and check terminal output
- **Client**: Open browser developer tools

## Performance Optimization

- [ ] Enable gzip compression
- [ ] Implement caching headers
- [ ] Optimize database queries
- [ ] Minify static assets
- [ ] Use CDN for static files

## Security Considerations

- [ ] Use HTTPS in production
- [ ] Implement rate limiting
- [ ] Sanitize user inputs
- [ ] Use secure JWT secrets
- [ ] Regular security updates
- [ ] Implement CSRF protection

## Scaling Considerations

- [ ] Database migration to PostgreSQL
- [ ] Implement Redis for session storage
- [ ] Add database connection pooling
- [ ] Implement API rate limiting
- [ ] Add monitoring and logging
- [ ] Set up error tracking (Sentry, etc.)

## Backup Strategy

- [ ] Database backups
- [ ] Environment variable backups
- [ ] Code repository backups
- [ ] User data export functionality