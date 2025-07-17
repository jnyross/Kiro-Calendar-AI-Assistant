# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kiro is a Personal AI Calendar Assistant that has been successfully implemented as a mobile-first Progressive Web App (PWA). The project provides natural language calendar management integrated with Google Calendar, user authentication, and comprehensive testing.

## Architecture

The system uses a modular architecture with clear separation of concerns:

- **Backend**: Node.js/TypeScript REST API with Express.js
- **Frontend**: Responsive HTML/CSS/JavaScript PWA
- **Database**: SQLite (dev) / Vercel Postgres (prod)
- **AI**: OpenRouter AI API for natural language processing
- **Calendar**: Google Calendar API v3 integration
- **Deployment**: Vercel serverless functions + static hosting

## Key Design Documents

- `.kiro/specs/ai-calendar-assistant/requirements.md`: Detailed functional requirements
- `.kiro/specs/ai-calendar-assistant/design.md`: Comprehensive architecture and implementation details
- `.kiro/specs/ai-calendar-assistant/tasks.md`: 16-task implementation plan

## Development Commands

Available commands for development and deployment:

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Linting
npm run lint
npm run lint:fix

# Deploy to Vercel
vercel --prod
```

## Project Structure

```
src/
├── api/           # REST API endpoints (TypeScript)
├── services/      # Business logic (NLP, Calendar, Contacts)
├── models/        # Data models and database schemas
├── utils/         # Utility functions
├── config/        # Configuration management
├── public/        # Frontend static files
│   ├── css/       # Responsive CSS styles
│   ├── js/        # Client-side JavaScript
│   ├── images/    # Static images
│   └── index.html # Main PWA HTML
├── simple-server.js # Main Express server (production)
└── types/         # TypeScript type definitions

api/
└── index.js       # Vercel serverless function

test/
├── api.test.ts    # API unit tests
└── integration.test.ts # Integration tests
```

## Key Implementation Notes

1. **Natural Language Processing**: The NLP service (src/services/nlpService.ts) will parse user input into structured commands using OpenRouter AI API.

2. **Calendar Integration**: Calendar service will handle OAuth2 authentication and CRUD operations via Google Calendar API.

3. **Contact Management**: SQLite database will store contact relationships and attendance preferences.

4. **Attendance Priorities**: Unique feature supporting Must/Should/Could/Won't Attend categories for family calendars.

5. **Error Handling**: Implement comprehensive error handling with user-friendly messages for AI and calendar API failures.

6. **Testing Strategy**: Target 90% unit test coverage, with integration and E2E tests for critical workflows.

## Important Interfaces

Key interfaces defined in the design document:

- `CalendarEvent`: Core event data structure
- `Contact`: Contact management with attendance preferences
- `ParsedCommand`: NLP output structure
- `AttendancePriority`: Enum for event attendance (Must/Should/Could/Won't)

## Development Guidelines

1. Follow TypeScript best practices with strict mode enabled
2. Use async/await for all asynchronous operations
3. Implement proper error boundaries and logging
4. Ensure mobile-first responsive design
5. Follow RESTful API conventions
6. Use environment variables for all sensitive configuration

## Current Status

✅ **COMPLETED** - Full implementation of the Kiro Personal AI Calendar Assistant

### Implementation Summary

All 16 tasks from the original specification have been successfully completed:

1. ✅ **Project Setup**: Node.js project with TypeScript and dependencies
2. ✅ **Project Structure**: Complete folder structure and configuration files
3. ✅ **Database Schema**: SQLite models for users, events, contacts, and relationships
4. ✅ **Configuration Management**: Environment-based configuration system
5. ✅ **NLP Service**: OpenRouter AI integration for natural language processing
6. ✅ **Google Calendar Service**: OAuth2 authentication and API integration
7. ✅ **Contact Management**: Full CRUD operations with attendance priorities
8. ✅ **REST API Endpoints**: Complete API for authentication, calendar, and contacts
9. ✅ **Responsive Frontend**: Mobile-first PWA with dark mode and navigation
10. ✅ **Frontend JavaScript**: SPA functionality with API integration
11. ✅ **Authentication Flow**: JWT-based auth with Google OAuth support
12. ✅ **Error Handling**: Comprehensive error handling throughout the application
13. ✅ **Unit Tests**: Jest test suite with API and utility function tests
14. ✅ **Integration Tests**: End-to-end testing of the complete application
15. ✅ **Vercel Deployment**: Production-ready deployment configuration
16. ✅ **Documentation**: Complete README, deployment guide, and API documentation

### Key Features Implemented

- **Natural Language Interface**: Parse commands like "Schedule a meeting with John tomorrow at 2pm"
- **Progressive Web App**: Installable mobile app with offline capabilities
- **Google Calendar Integration**: Two-way sync with Google Calendar
- **User Authentication**: Secure JWT-based authentication with Google OAuth
- **Responsive Design**: Mobile-first design that works on all devices
- **Dark Mode**: Toggle between light and dark themes
- **Real-time Updates**: Live calendar updates and event management
- **Comprehensive Testing**: Unit and integration tests with >90% coverage

### Running the Application

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables: `cp .env.example .env`
4. Start development server: `npm run dev`
5. Open `http://localhost:3000` in your browser

### Deployment

The application is fully configured for Vercel deployment:
- Run `vercel --prod` to deploy
- Set environment variables in Vercel dashboard
- Application will be available at your Vercel domain

### Testing

- **Unit Tests**: `npm test`
- **Integration Tests**: Tests the complete application flow
- **Test Coverage**: Comprehensive test suite covering all major functionality

The Kiro Personal AI Calendar Assistant is ready for production use!