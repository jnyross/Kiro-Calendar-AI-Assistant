# Kiro Calendar Assistant - Frontend

## Overview
This is the mobile-first, responsive frontend for the Kiro Calendar Assistant. It's built as a Progressive Web App (PWA) with offline capabilities.

## Features

### Core Features
- **Natural Language Input**: Type commands like "Schedule lunch with Sarah tomorrow at 1pm"
- **Calendar Views**: Month, week, and day views
- **Contact Management**: Add and manage contacts
- **Dark Mode**: Toggle between light and dark themes
- **Offline Support**: Works offline with service worker caching

### Mobile-First Design
- Responsive layout that adapts to all screen sizes
- Touch-friendly interface
- Bottom navigation for easy thumb access on mobile
- Optimized performance for mobile devices

### Progressive Web App
- Installable on mobile devices
- Offline functionality
- Push notifications for event reminders
- App-like experience

## File Structure
```
public/
├── index.html          # Main SPA entry point
├── login.html          # Standalone login page
├── signup.html         # Standalone signup page
├── manifest.json       # PWA manifest
├── service-worker.js   # Service worker for offline support
├── css/
│   └── styles.css      # Main stylesheet (mobile-first)
├── js/
│   └── app.js          # Main application JavaScript
└── images/
    └── placeholder.svg # Placeholder icon
```

## Development

### Local Development
The frontend is served by the Express server from the `/src/public` directory. Start the server with:
```bash
npm run dev
```

### Building for Production
The static files are served directly by Express in production. Ensure all assets are minified and optimized.

### Browser Support
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## API Integration
The frontend communicates with the backend API at `/api/*` endpoints. All API calls include JWT authentication tokens stored in localStorage.

## Customization

### Theme Colors
Edit the CSS variables in `styles.css`:
```css
:root {
    --accent-primary: #4f46e5;
    --bg-primary: #ffffff;
    /* ... */
}
```

### Adding New Views
1. Add navigation item in `index.html`
2. Create view container in main content area
3. Add view switching logic in `app.js`
4. Style the view in `styles.css`

## Security Notes
- JWT tokens are stored in localStorage
- All API calls use HTTPS in production
- Content Security Policy is configured in the Express server
- Service worker only caches GET requests