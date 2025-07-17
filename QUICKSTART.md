# Kiro Calendar Assistant - Quick Start Guide

## 🚀 Getting Started

Your Kiro Personal AI Calendar Assistant is now ready to run! Follow these steps to get started:

### 1. Prerequisites

Make sure you have:
- Node.js 18+ installed
- A Google Cloud Console account (for Calendar API)
- Your OpenRouter API key (already added to .env)

### 2. Google Calendar API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Google Calendar API and Google People API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
5. Download the credentials and add to your `.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

### 3. Start the Application

```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

The application will be available at: http://localhost:3000

### 4. First Time Setup

1. **Create an Account**: Click "Sign Up" and create your account
2. **Connect Google Calendar**: Go to Settings and click "Connect Google Calendar"
3. **Add Contacts**: Import from Google or add manually
4. **Start Using Natural Language**: Try commands like:
   - "Schedule a meeting with John tomorrow at 2pm"
   - "What's on my calendar next week?"
   - "Find a free slot for a 2-hour workshop"

## 📱 Mobile App Installation

The app is a Progressive Web App (PWA) and can be installed on your phone:

1. Open http://localhost:3000 in your mobile browser
2. Click "Add to Home Screen" in your browser menu
3. The app will install and work like a native app

## 🎯 Key Features

- **Natural Language Input**: Just type what you want to do
- **Google Calendar Sync**: Bi-directional sync with your Google Calendar
- **Smart Scheduling**: Find free time slots automatically
- **Contact Management**: Import from Google or add manually
- **Dark Mode**: Toggle in settings
- **Offline Support**: Works without internet (limited features)
- **Mobile First**: Optimized for mobile devices

## 🔧 Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Check code style
npm run format       # Format code
```

## 🐛 Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Verify all environment variables are set in `.env`

### Google Calendar not syncing
- Ensure Google APIs are enabled in Cloud Console
- Check OAuth redirect URI matches your setup
- Try disconnecting and reconnecting in Settings

### Natural language not working
- Verify OpenRouter API key is correct
- Check you have credits in your OpenRouter account

## 📚 Example Commands

Try these natural language commands:

- "Create a team meeting next Monday at 10am"
- "Add Sarah to the budget review meeting"
- "Remind me to call the dentist in 2 hours"
- "Show me my schedule for tomorrow"
- "Find 30 minutes for a coffee chat next week"
- "Cancel my 3pm meeting"
- "Move the project sync to Friday"

## 🚀 Next Steps

1. **Customize Settings**: Adjust working hours, default reminders, etc.
2. **Import Contacts**: Sync with Google Contacts for better suggestions
3. **Set Up Recurring Events**: "Schedule weekly team standup every Monday at 9am"
4. **Enable Notifications**: Allow browser notifications for reminders

## 📞 Support

For issues or questions:
- Check the logs in `./logs` directory
- Review the documentation in `.kiro/specs/`
- The API endpoints are documented at `/api/health`

Enjoy your new AI-powered calendar assistant! 🎉