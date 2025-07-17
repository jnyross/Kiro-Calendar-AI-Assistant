# Kiro - Personal AI Calendar Assistant

A mobile-first Progressive Web App (PWA) that helps you manage your calendar using natural language commands and AI-powered scheduling.

## Features

- 🗣️ **Natural Language Processing**: Create and manage events using plain English
- 📱 **Progressive Web App**: Install and use like a native mobile app
- 🔐 **Secure Authentication**: JWT-based authentication with Google OAuth integration
- 📅 **Calendar Management**: Create, view, and manage calendar events
- 👥 **Contact Management**: Import and manage contacts with attendance priorities
- 🔗 **Google Calendar Integration**: Sync with your existing Google Calendar
- 🌙 **Dark Mode**: Toggle between light and dark themes
- 📊 **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express.js
- **Database**: SQLite with better-sqlite3
- **Authentication**: JWT tokens, Google OAuth2
- **AI/NLP**: OpenRouter API integration
- **Testing**: Jest with unit and integration tests
- **Deployment**: Vercel-ready configuration

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd kiro-personal-ai-calendar-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:3000`

### Environment Variables

Create a `.env` file with the following variables:

```env
# JWT Secret (change this in production)
JWT_SECRET=your-super-secret-jwt-key

# OpenRouter API (for NLP features)
OPENROUTER_API_KEY=your-openrouter-api-key

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

## Usage

### Creating Events

Use natural language to create events:

- "Schedule a meeting with John tomorrow at 2pm"
- "Create a team standup every Monday at 9am"
- "Set up a call with the client next week"

### Managing Calendar

- View events in month, week, or day view
- Click on dates to create new events
- Edit or delete existing events
- Set reminders and add attendees

### Google Integration

1. Go to Settings
2. Click "Connect Google Calendar"
3. Authorize the application
4. Sync your calendar events and contacts

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

### Calendar Events
- `GET /api/calendar/events` - Get user's events
- `POST /api/calendar/events` - Create new event
- `POST /api/calendar/parse` - Parse natural language command

### Google Integration
- `GET /api/auth/google` - Get Google OAuth URL
- `GET /api/auth/google/callback` - Handle OAuth callback
- `POST /api/auth/google/sync-calendar` - Sync calendar
- `POST /api/auth/google/sync-contacts` - Import contacts

## Testing

Run the test suite:

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Test coverage
npm run test:coverage
```

## Deployment

### Vercel Deployment

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy to Vercel:
```bash
vercel --prod
```

3. Set environment variables in Vercel dashboard:
   - `JWT_SECRET`
   - `OPENROUTER_API_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Project Structure

```
kiro-personal-ai-calendar-assistant/
├── api/                    # Vercel API routes
│   └── index.js           # Main API handler
├── src/
│   ├── public/            # Static assets
│   │   ├── css/          # Stylesheets
│   │   ├── js/           # Client-side JavaScript
│   │   ├── images/       # Images and icons
│   │   └── index.html    # Main HTML file
│   └── simple-server.js  # Express server
├── test/                  # Test files
│   ├── api.test.ts       # API unit tests
│   └── integration.test.ts # Integration tests
├── .env.example          # Environment variables template
├── vercel.json           # Vercel configuration
├── package.json          # Dependencies and scripts
└── README.md            # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -am 'Add some feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For questions or issues, please open an issue on the GitHub repository.

## Roadmap

- [ ] Enhanced NLP with more sophisticated AI models
- [ ] Recurring event support
- [ ] Email notifications
- [ ] Team collaboration features
- [ ] Advanced calendar conflict detection
- [ ] Integration with other calendar providers
- [ ] Mobile app (React Native)
- [ ] Voice command support