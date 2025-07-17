# NLP Service Documentation

The NLP Service (`src/services/nlpService.ts`) is a comprehensive natural language processing service that parses user commands into structured data using OpenRouter AI integration with intelligent fallback parsing.

## Features

### Core Capabilities

1. **Intent Recognition**: Identifies the user's intention from natural language commands
2. **Entity Extraction**: Extracts relevant information like dates, times, names, locations
3. **Relative Time Parsing**: Handles expressions like "tomorrow", "next week", "in 2 hours"
4. **Recurring Pattern Detection**: Parses recurring event patterns (daily, weekly, monthly, yearly)
5. **Contact Name Recognition**: Identifies and extracts contact names from text
6. **Caching**: Intelligent caching of parsed results to improve performance
7. **Fallback Parsing**: Robust fallback system when AI service is unavailable

### Supported Command Intents

- `CREATE_EVENT`: Creating new calendar events
- `UPDATE_EVENT`: Modifying existing events
- `DELETE_EVENT`: Removing events
- `LIST_EVENTS`: Listing calendar events
- `QUERY_SCHEDULE`: Querying schedule information
- `ADD_CONTACT`: Adding new contacts
- `QUERY_CONTACT`: Searching for contacts
- `SET_REMINDER`: Setting reminders
- `FIND_TIME`: Finding available time slots
- `ADD_ATTENDEE`: Adding attendees to events
- `CHECK_CONFLICTS`: Checking for scheduling conflicts

## Configuration

The service requires the following environment variables:

```env
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/gpt-3.5-turbo
```

## Usage

### Basic Usage

```typescript
import nlpService from './src/services/nlpService';

const result = await nlpService.parseCommand('Schedule a meeting with John tomorrow at 2pm');

console.log(result.intent); // CREATE_EVENT
console.log(result.entities.title); // "meeting"
console.log(result.entities.attendees); // ["John"]
console.log(result.entities.dateTime); // Date object for tomorrow at 2pm
console.log(result.confidence); // 0.85
```

### Example Commands

#### Event Creation
```
"Schedule a meeting with John tomorrow at 2pm"
"Create a team standup every Monday at 9am"
"Set up a quarterly review meeting on the 15th of each month"
"Schedule a 2-hour workshop next Friday at 10am in Conference Room A"
```

#### Event Management
```
"Update the project sync to 4pm instead of 3pm"
"Cancel the 3pm meeting today"
"Reschedule the budget meeting to next Wednesday"
```

#### Queries
```
"What's on my calendar for next Tuesday?"
"Show me my schedule for this week"
"When is my next meeting with Sarah?"
```

#### Time Management
```
"Find time for a 2-hour workshop next week"
"Check if I have any conflicts next Monday afternoon"
"When am I free for a quick chat?"
```

#### Attendee Management
```
"Add Sarah to the budget review meeting"
"Invite John to the project kickoff"
```

#### Reminders
```
"Remind me to call the dentist in 2 hours"
"Set a reminder to submit the report tomorrow at 9am"
"Alert me 15 minutes before the meeting"
```

#### Contact Management
```
"Add contact John Smith with email john@example.com"
"Find contact information for Sarah Johnson"
```

## Architecture

### AI Integration

The service uses OpenRouter AI for advanced natural language understanding:

1. **Prompt Engineering**: Carefully crafted prompts guide the AI to extract structured data
2. **Response Validation**: AI responses are validated and transformed into TypeScript types
3. **Error Handling**: Comprehensive error handling with retry logic
4. **Rate Limiting**: Intelligent rate limit handling with exponential backoff

### Fallback System

When AI is unavailable, the service falls back to:

1. **Regex-based Intent Detection**: Pattern matching for common command structures
2. **Manual Entity Extraction**: Custom parsing functions for dates, times, names, etc.
3. **Confidence Scoring**: Lower confidence scores for fallback parsing

### Caching Strategy

- **Memory Cache**: In-memory caching with TTL (time-to-live)
- **Cache Keys**: Based on normalized input text
- **Cache Invalidation**: Automatic cleanup of expired entries

## Entity Types

### Temporal Entities

- `dateTime`: Specific date and time
- `duration`: Duration in minutes
- `timeRange`: Start and end date range
- `reminderTime`: Reminder date and time

### Event Entities

- `title`: Event title
- `location`: Event location
- `description`: Event description
- `attendees`: Array of attendee names

### Contact Entities

- `contactName`: Contact name for contact-related operations

### Recurring Patterns

- `frequency`: DAILY, WEEKLY, MONTHLY, YEARLY
- `interval`: Interval between occurrences
- `daysOfWeek`: Days of week for weekly recurrence
- `dayOfMonth`: Day of month for monthly recurrence
- `endDate`: End date for recurrence
- `occurrences`: Number of occurrences

### Reminders

- `reminderType`: EMAIL, SMS, PUSH
- `reminderTime`: When to send the reminder

## Error Handling

The service includes comprehensive error handling:

1. **API Errors**: Graceful handling of OpenRouter API failures
2. **Network Errors**: Retry logic with exponential backoff
3. **Rate Limiting**: Automatic rate limit detection and handling
4. **Validation Errors**: Input validation and sanitization
5. **Fallback Mechanisms**: Automatic fallback to local parsing

## Performance Considerations

1. **Caching**: Reduces API calls for repeated queries
2. **Timeout Handling**: 10-second timeout for API requests
3. **Memory Management**: Automatic cache cleanup
4. **Batch Processing**: Efficient handling of multiple requests

## Testing

The service includes comprehensive tests:

```bash
# Run NLP service tests
npm test -- nlpService.test.ts

# Run example demonstrations
npx ts-node examples/nlp-examples.ts
```

## Future Enhancements

1. **Context Awareness**: Multi-turn conversation context
2. **Learning**: User-specific learning and adaptation
3. **Language Support**: Multi-language support
4. **Voice Integration**: Voice command processing
5. **Advanced Scheduling**: Smart scheduling suggestions
6. **Integration**: Better integration with calendar providers

## API Reference

### `parseCommand(input: string): Promise<ParsedCommand>`

Parses a natural language command and returns structured data.

**Parameters:**
- `input`: Natural language command string

**Returns:**
- `ParsedCommand`: Object containing intent, entities, confidence, and original text

**Example:**
```typescript
const result = await nlpService.parseCommand('Schedule a meeting tomorrow at 2pm');
```

### Types

#### `ParsedCommand`
```typescript
interface ParsedCommand {
  intent: CommandIntent;
  entities: {
    dateTime?: Date;
    duration?: number;
    title?: string;
    attendees?: string[];
    location?: string;
    description?: string;
    contactName?: string;
    timeRange?: {
      start: Date;
      end: Date;
    };
    recurringPattern?: RecurringPattern;
    eventId?: string;
    reminderTime?: Date;
    reminderType?: ReminderType;
  };
  confidence: number;
  originalText: string;
}
```

#### `CommandIntent`
```typescript
enum CommandIntent {
  CREATE_EVENT = 'CREATE_EVENT',
  UPDATE_EVENT = 'UPDATE_EVENT',
  DELETE_EVENT = 'DELETE_EVENT',
  LIST_EVENTS = 'LIST_EVENTS',
  QUERY_SCHEDULE = 'QUERY_SCHEDULE',
  ADD_CONTACT = 'ADD_CONTACT',
  QUERY_CONTACT = 'QUERY_CONTACT',
  SET_REMINDER = 'SET_REMINDER',
  FIND_TIME = 'FIND_TIME',
  ADD_ATTENDEE = 'ADD_ATTENDEE',
  CHECK_CONFLICTS = 'CHECK_CONFLICTS',
  UNKNOWN = 'UNKNOWN'
}
```