import axios, { AxiosError } from 'axios';
import { ParsedCommand, CommandIntent, RecurrenceFrequency, RecurringPattern, ReminderType } from '../types';
import { logger, logError, logInfo, logDebug } from '../utils/logger';
import { config } from '../config';
import { cache } from '../utils/cache';
import { addTime } from '../utils/dateHelpers';

/**
 * NLP Service for parsing natural language commands using OpenRouter AI
 * 
 * Example inputs this service can handle:
 * - "Schedule a meeting with John tomorrow at 2pm"
 * - "Create a recurring weekly team standup every Monday at 9am"
 * - "Find time for a 2-hour workshop next week"
 * - "Add Sarah to the budget review meeting"
 * - "Remind me to call the dentist in 2 hours"
 * - "What's on my calendar for next Tuesday?"
 * - "Cancel the 3pm meeting today"
 * - "Update the project sync to 4pm instead of 3pm"
 * - "Check if I have any conflicts next Monday afternoon"
 * - "Set up a monthly all-hands meeting on the first Friday of each month"
 */
export class NLPService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000; // 1 second
  private rateLimitReset: number = 0;

  constructor() {
    this.apiKey = config.openrouter.apiKey;
    this.baseUrl = config.openrouter.baseUrl;
    this.model = config.openrouter.model;

    if (!this.apiKey) {
      logger.warn('OpenRouter API key not configured. NLP features will use fallback parsing.');
    }
  }

  /**
   * Parse natural language input and extract intent and entities
   * @param input Natural language command
   * @returns Parsed command with intent and entities
   */
  async parseCommand(input: string): Promise<ParsedCommand> {
    try {
      logInfo('Parsing command', { input });
      
      // Check cache first
      const cacheKey = `nlp:${input.toLowerCase().trim()}`;
      const cachedResult = cache.get<ParsedCommand>(cacheKey);
      if (cachedResult) {
        logDebug('Returning cached parse result', { input });
        return cachedResult;
      }

      // Check rate limiting
      if (this.rateLimitReset > Date.now()) {
        logger.warn('Rate limited, using fallback parser', {
          resetTime: new Date(this.rateLimitReset)
        });
        return this.fallbackParse(input);
      }

      // Try API parsing
      let parsedCommand: ParsedCommand;
      if (this.apiKey) {
        parsedCommand = await this.parseWithAI(input);
      } else {
        parsedCommand = await this.fallbackParse(input);
      }

      // Cache the result
      cache.set(cacheKey, parsedCommand, 3600); // Cache for 1 hour

      return parsedCommand;
    } catch (error) {
      logError('Error parsing command', error as Error, { input });
      // Fall back to simple parsing
      return this.fallbackParse(input);
    }
  }

  /**
   * Parse command using OpenRouter AI
   * @param input Natural language input
   * @returns Parsed command
   */
  private async parseWithAI(input: string): Promise<ParsedCommand> {
    const prompt = this.buildPrompt(input);
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.post(
          `${this.baseUrl}/chat/completions`,
          {
            model: this.model,
            messages: [
              {
                role: 'system',
                content: 'You are a calendar assistant AI that parses natural language commands into structured data. Respond only with valid JSON.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1,
            max_tokens: 500
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': config.cors.origin as string,
              'X-Title': 'Kiro Calendar Assistant'
            },
            timeout: 10000 // 10 second timeout
          }
        );

        const content = response.data.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from AI');
        }

        // Parse JSON response
        const parsed = JSON.parse(content);
        return this.validateAndTransformAIResponse(parsed, input);

      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          
          // Handle rate limiting
          if (axiosError.response?.status === 429) {
            const retryAfter = axiosError.response.headers['retry-after'];
            this.rateLimitReset = Date.now() + (parseInt(retryAfter) || 60) * 1000;
            logger.warn('Rate limited by OpenRouter', { 
              retryAfter,
              resetTime: new Date(this.rateLimitReset)
            });
          }

          // Don't retry on client errors (except rate limiting)
          if (axiosError.response?.status && axiosError.response.status >= 400 && axiosError.response.status < 500 && axiosError.response.status !== 429) {
            throw error;
          }
        }

        if (attempt < this.maxRetries) {
          logDebug(`Retrying AI parse (attempt ${attempt + 1}/${this.maxRetries})`, { input });
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        } else {
          throw error;
        }
      }
    }

    // If all retries failed, fall back
    return this.fallbackParse(input);
  }

  /**
   * Build the prompt for the AI model
   * @param input User input
   * @returns Formatted prompt
   */
  private buildPrompt(input: string): string {
    const currentDate = new Date().toISOString();
    
    return `Parse the following natural language command into structured data.

Current date/time: ${currentDate}

Command: "${input}"

Extract the following information:
1. Intent (one of: CREATE_EVENT, UPDATE_EVENT, DELETE_EVENT, LIST_EVENTS, QUERY_SCHEDULE, ADD_CONTACT, QUERY_CONTACT, SET_REMINDER, FIND_TIME, FIND_FREE_TIME, ADD_ATTENDEE, CHECK_CONFLICTS)
2. Date/time information (convert relative times like "tomorrow", "next week", "in 2 hours" to absolute dates)
3. Duration (in minutes)
4. Event title
5. Attendees (array of names)
6. Location
7. Description
8. Contact name (for contact-related commands)
9. Time range (for queries)
10. Recurring pattern (frequency, interval, days of week, etc.)
11. Event ID (for updates/deletes if mentioned)
12. Reminder time and type

Respond with JSON in this exact format:
{
  "intent": "INTENT_NAME",
  "confidence": 0.95,
  "entities": {
    "dateTime": "2024-01-15T14:00:00.000Z",
    "duration": 60,
    "title": "Meeting title",
    "attendees": ["John", "Sarah"],
    "location": "Conference Room A",
    "description": "Discuss project updates",
    "contactName": "John Doe",
    "timeRange": {
      "start": "2024-01-15T00:00:00.000Z",
      "end": "2024-01-15T23:59:59.000Z"
    },
    "recurringPattern": {
      "frequency": "WEEKLY",
      "interval": 1,
      "daysOfWeek": [1, 3, 5]
    },
    "eventId": "event-123",
    "reminderTime": "2024-01-15T13:45:00.000Z",
    "reminderType": "PUSH"
  }
}

Include only the fields that are relevant to the command. Use null for missing optional fields.`;
  }

  /**
   * Validate and transform AI response into ParsedCommand
   * @param aiResponse Raw AI response
   * @param originalText Original input text
   * @returns Validated ParsedCommand
   */
  private validateAndTransformAIResponse(aiResponse: any, originalText: string): ParsedCommand {
    // Validate intent
    const intent = aiResponse.intent && Object.values(CommandIntent).includes(aiResponse.intent)
      ? aiResponse.intent as CommandIntent
      : CommandIntent.UNKNOWN;

    // Transform entities
    const entities = aiResponse.entities || {};
    
    // Parse dates
    if (entities.dateTime) {
      entities.dateTime = new Date(entities.dateTime);
    }
    if (entities.timeRange) {
      entities.timeRange = {
        start: new Date(entities.timeRange.start),
        end: new Date(entities.timeRange.end)
      };
    }
    if (entities.reminderTime) {
      entities.reminderTime = new Date(entities.reminderTime);
    }

    // Validate recurring pattern
    if (entities.recurringPattern) {
      const pattern = entities.recurringPattern;
      entities.recurringPattern = {
        frequency: Object.values(RecurrenceFrequency).includes(pattern.frequency)
          ? pattern.frequency
          : RecurrenceFrequency.DAILY,
        interval: pattern.interval || 1,
        daysOfWeek: pattern.daysOfWeek,
        dayOfMonth: pattern.dayOfMonth,
        endDate: pattern.endDate ? new Date(pattern.endDate) : undefined,
        occurrences: pattern.occurrences
      };
    }

    // Validate reminder type
    if (entities.reminderType && !Object.values(ReminderType).includes(entities.reminderType)) {
      entities.reminderType = ReminderType.PUSH;
    }

    return {
      intent,
      entities,
      confidence: aiResponse.confidence || 0.5,
      originalText
    };
  }

  /**
   * Fallback parser for when AI is unavailable
   * @param input Natural language input
   * @returns Parsed command
   */
  private async fallbackParse(input: string): Promise<ParsedCommand> {
    const lowerInput = input.toLowerCase().trim();
    const parsedCommand: ParsedCommand = {
      intent: CommandIntent.UNKNOWN,
      entities: {},
      confidence: 0.3,
      originalText: input
    };

    // Detect intent based on keywords
    parsedCommand.intent = this.detectIntent(lowerInput);
    parsedCommand.confidence = parsedCommand.intent !== CommandIntent.UNKNOWN ? 0.6 : 0.3;

    // Extract entities based on intent
    parsedCommand.entities = await this.extractEntities(input, parsedCommand.intent);

    return parsedCommand;
  }

  /**
   * Detect intent from keywords
   * @param input Lowercase input string
   * @returns Detected intent
   */
  private detectIntent(input: string): CommandIntent {
    const intentPatterns: Array<[RegExp, CommandIntent]> = [
      [/\b(add|invite)\b.*\b(to|attendee|participant)\b/, CommandIntent.ADD_ATTENDEE],
      [/\b(schedule|create|add|new|set up)\b.*\b(event|meeting|appointment)\b/, CommandIntent.CREATE_EVENT],
      [/\b(update|change|modify|reschedule|move)\b.*\b(event|meeting|appointment)\b/, CommandIntent.UPDATE_EVENT],
      [/\b(delete|cancel|remove)\b.*\b(event|meeting|appointment)\b/, CommandIntent.DELETE_EVENT],
      [/\b(list|show|what's|what is)\b.*\b(calendar|schedule|events|appointments)\b/, CommandIntent.LIST_EVENTS],
      [/\b(when|what time)\b.*\b(meeting|event|appointment)\b/, CommandIntent.QUERY_SCHEDULE],
      [/\b(add|create|new)\b.*\b(contact|person)\b/, CommandIntent.ADD_CONTACT],
      [/\b(find|search|lookup|who)\b.*\b(contact|person|email|phone)\b/, CommandIntent.QUERY_CONTACT],
      [/\b(remind|reminder|alert)\b/, CommandIntent.SET_REMINDER],
      [/\b(find time|find slot|available|free time)\b/, CommandIntent.FIND_TIME],
      [/\b(conflict|conflicts|overlapping|double.?booked)\b/, CommandIntent.CHECK_CONFLICTS],
      [/\b(create|schedule|add|new|set up)\b.*\b(every|daily|weekly|monthly|yearly|recurring)\b/, CommandIntent.CREATE_EVENT],
    ];

    for (const [pattern, intent] of intentPatterns) {
      if (pattern.test(input)) {
        return intent;
      }
    }

    return CommandIntent.UNKNOWN;
  }

  /**
   * Extract entities from text based on intent
   * @param text Original input text
   * @param intent Detected intent
   * @returns Extracted entities
   */
  private async extractEntities(text: string, intent: CommandIntent): Promise<ParsedCommand['entities']> {
    const entities: ParsedCommand['entities'] = {};

    // Extract date/time
    const dateTimeResult = this.extractDateTime(text);
    if (dateTimeResult.dateTime) {
      entities.dateTime = dateTimeResult.dateTime;
    }
    if (dateTimeResult.duration) {
      entities.duration = dateTimeResult.duration;
    }

    // Extract title for event-related intents
    if ([CommandIntent.CREATE_EVENT, CommandIntent.UPDATE_EVENT].includes(intent)) {
      entities.title = this.extractTitle(text);
    }

    // Extract attendees
    const attendees = this.extractAttendees(text);
    if (attendees.length > 0) {
      entities.attendees = attendees;
    }

    // Extract location
    const location = this.extractLocation(text);
    if (location) {
      entities.location = location;
    }

    // Extract contact name
    if ([CommandIntent.ADD_CONTACT, CommandIntent.QUERY_CONTACT, CommandIntent.ADD_ATTENDEE].includes(intent)) {
      entities.contactName = this.extractContactName(text);
    }

    // Extract time range for queries
    if ([CommandIntent.LIST_EVENTS, CommandIntent.QUERY_SCHEDULE, CommandIntent.FIND_TIME, CommandIntent.CHECK_CONFLICTS].includes(intent)) {
      const timeRange = this.extractTimeRange(text);
      if (timeRange) {
        entities.timeRange = timeRange;
      }
    }

    // Extract recurring pattern
    const recurringPattern = this.extractRecurringPattern(text);
    if (recurringPattern) {
      entities.recurringPattern = recurringPattern;
    }

    // Extract reminder info
    if (intent === CommandIntent.SET_REMINDER) {
      const reminderInfo = this.extractReminderInfo(text);
      if (reminderInfo.reminderTime) {
        entities.reminderTime = reminderInfo.reminderTime;
      }
      if (reminderInfo.reminderType) {
        entities.reminderType = reminderInfo.reminderType;
      }
    }

    return entities;
  }

  /**
   * Extract date and time entities from text
   * @param text Input text
   * @returns Extracted date/time information
   */
  private extractDateTime(text: string): { dateTime?: Date; duration?: number } {
    const now = new Date();
    const result: { dateTime?: Date; duration?: number } = {};

    // Time patterns
    const timePatterns = [
      /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
      /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i,
      /\b(\d{1,2})\s*(am|pm)\b/i
    ];

    // Extract time
    let hours: number | undefined;
    let minutes = 0;
    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        hours = parseInt(match[1]);
        if (match[2]) {
          minutes = parseInt(match[2]);
        }
        if (match[3]) {
          const period = match[3].toLowerCase();
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
        }
        break;
      }
    }

    // Date extraction
    const datePatterns: Array<[RegExp, (match: RegExpMatchArray) => Date]> = [
      [/\btomorrow\b/i, () => addTime(now, 1, 'days')],
      [/\btoday\b/i, () => now],
      [/\byesterday\b/i, () => addTime(now, -1, 'days')],
      [/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, (match) => {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = dayNames.indexOf(match[1].toLowerCase());
        const currentDay = now.getDay();
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7;
        return addTime(now, daysToAdd, 'days');
      }],
      [/\bnext\s+week\b/i, () => addTime(now, 7, 'days')],
      [/\bnext\s+month\b/i, () => addTime(now, 1, 'months')],
      [/\bin\s+(\d+)\s+(hour|hours)\b/i, (match) => addTime(now, parseInt(match[1]), 'hours')],
      [/\bin\s+(\d+)\s+(minute|minutes)\b/i, (match) => addTime(now, parseInt(match[1]), 'minutes')],
      [/\bin\s+(\d+)\s+(day|days)\b/i, (match) => addTime(now, parseInt(match[1]), 'days')],
      [/\bon\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/i, (match) => {
        const month = parseInt(match[1]) - 1;
        const day = parseInt(match[2]);
        const year = match[3] ? parseInt(match[3]) : now.getFullYear();
        return new Date(year, month, day);
      }]
    ];

    let baseDate = now;
    for (const [pattern, extractor] of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        baseDate = extractor(match);
        break;
      }
    }

    // Combine date and time
    if (hours !== undefined) {
      result.dateTime = new Date(baseDate);
      result.dateTime.setHours(hours, minutes, 0, 0);
    } else if (baseDate !== now) {
      result.dateTime = baseDate;
    }

    // Extract duration
    const durationPatterns = [
      /\b(\d+)-hour\b/i,
      /\b(\d+)\s*(?:hour|hours|hr|hrs)\b/i,
      /\b(\d+\.?\d*)\s*(?:hour|hours|hr|hrs)\b/i,
      /\b(\d+)\s*(?:minute|minutes|min|mins)\b/i
    ];

    for (const pattern of durationPatterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1]);
        if (pattern.toString().includes('hour')) {
          result.duration = value * 60;
        } else {
          result.duration = value;
        }
        break;
      }
    }

    // Default duration for meetings
    if (!result.duration && result.dateTime && 
        (text.includes('meeting') || text.includes('appointment'))) {
      result.duration = 60; // Default 1 hour
    }

    return result;
  }

  /**
   * Extract event title from text
   * @param text Input text
   * @returns Extracted title
   */
  private extractTitle(text: string): string {
    // Remove common command words
    let title = text
      .replace(/\b(schedule|create|add|new|set up|update|change|modify)\b/gi, '')
      .replace(/\b(event|meeting|appointment)\b/gi, '')
      .replace(/\b(with|at|on|in|for|from|to)\b.*$/gi, '')
      .trim();

    // Clean up quotes
    const quotedMatch = text.match(/["']([^"']+)["']/);
    if (quotedMatch) {
      title = quotedMatch[1];
    }

    return title || 'Untitled Event';
  }

  /**
   * Extract attendee names from text
   * @param text Input text
   * @returns Array of attendee names
   */
  private extractAttendees(text: string): string[] {
    const attendees: string[] = [];
    
    // Pattern for "with X, Y, and Z"
    const withPattern = /\bwith\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s*,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)*(?:\s+and\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)?)\b/i;
    const withMatch = text.match(withPattern);
    if (withMatch) {
      const names = withMatch[1]
        .split(/\s*,\s*|\s+and\s+/i)
        .map(name => name.trim())
        .filter(name => name.length > 0 && !/(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+\s*(?:am|pm))/i.test(name));
      attendees.push(...names);
    }

    // Pattern for "invite X" or "add X"
    const invitePattern = /\b(?:invite|add)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/gi;
    let inviteMatch;
    while ((inviteMatch = invitePattern.exec(text)) !== null) {
      attendees.push(inviteMatch[1]);
    }

    return [...new Set(attendees)]; // Remove duplicates
  }

  /**
   * Extract location from text
   * @param text Input text
   * @returns Extracted location
   */
  private extractLocation(text: string): string | undefined {
    // Pattern for "at/in [location]"
    const locationPatterns = [
      /\b(?:at|in)\s+(?:the\s+)?([A-Z][^,.]+?)(?:\s*(?:,|\.|\b(?:on|at|with|for|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+\s*(?:am|pm))\b))/i,
      /\b(?:location|place|venue):\s*([^,.]+)/i
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        const location = match[1].trim();
        // Filter out time-related words
        if (!/\b(?:tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+\s*(?:am|pm))\b/i.test(location)) {
          return location;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract contact name from text
   * @param text Input text
   * @returns Extracted contact name
   */
  private extractContactName(text: string): string | undefined {
    // Patterns for contact extraction
    const patterns = [
      /\b(?:contact|person|add|find|search|lookup)\s+(?:named?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/i,
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'s\s+(?:email|phone|contact)\b/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Extract time range from text
   * @param text Input text
   * @returns Extracted time range
   */
  private extractTimeRange(text: string): { start: Date; end: Date } | undefined {
    const now = new Date();
    
    // Patterns for time ranges
    const rangePatterns: Array<[RegExp, (match: RegExpMatchArray) => { start: Date; end: Date }]> = [
      [/\btoday\b/i, () => {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }],
      [/\btomorrow\b/i, () => {
        const start = addTime(now, 1, 'days');
        start.setHours(0, 0, 0, 0);
        const end = addTime(now, 1, 'days');
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }],
      [/\bthis\s+week\b/i, () => {
        const start = new Date(now);
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }],
      [/\bnext\s+week\b/i, () => {
        const start = new Date(now);
        start.setDate(start.getDate() - start.getDay() + 7);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }],
      [/\bthis\s+month\b/i, () => {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
      }],
      [/\bnext\s+month\b/i, () => {
        const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
        return { start, end };
      }]
    ];

    for (const [pattern, extractor] of rangePatterns) {
      const match = text.match(pattern);
      if (match) {
        return extractor(match);
      }
    }

    // Check for specific date mentions
    const dateTimeResult = this.extractDateTime(text);
    if (dateTimeResult.dateTime) {
      const start = new Date(dateTimeResult.dateTime);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateTimeResult.dateTime);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    return undefined;
  }

  /**
   * Extract recurring pattern from text
   * @param text Input text
   * @returns Extracted recurring pattern
   */
  private extractRecurringPattern(text: string): RecurringPattern | undefined {
    // Check if it's a recurring event
    if (!/(every|daily|weekly|monthly|yearly|recurring)/i.test(text)) {
      return undefined;
    }

    const pattern: RecurringPattern = {
      frequency: RecurrenceFrequency.DAILY,
      interval: 1
    };

    // Extract frequency
    if (/\bdaily\b/i.test(text) || /\bevery\s+day\b/i.test(text)) {
      pattern.frequency = RecurrenceFrequency.DAILY;
    } else if (/\bweekly\b/i.test(text) || /\bevery\s+week\b/i.test(text)) {
      pattern.frequency = RecurrenceFrequency.WEEKLY;
    } else if (/\bmonthly\b/i.test(text) || /\bevery\s+month\b/i.test(text)) {
      pattern.frequency = RecurrenceFrequency.MONTHLY;
    } else if (/\byearly\b/i.test(text) || /\bevery\s+year\b/i.test(text)) {
      pattern.frequency = RecurrenceFrequency.YEARLY;
    }

    // Extract interval
    const intervalMatch = text.match(/\bevery\s+(\d+)\s+(?:days?|weeks?|months?|years?)\b/i);
    if (intervalMatch) {
      pattern.interval = parseInt(intervalMatch[1]);
    }

    // Extract days of week for weekly recurrence
    if (pattern.frequency === RecurrenceFrequency.WEEKLY) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const daysOfWeek: number[] = [];
      
      // Check for specific days
      const dayPattern = /\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s*(?:,\s*|\s+and\s+)(monday|tuesday|wednesday|thursday|friday|saturday|sunday))*/gi;
      const dayMatches = text.matchAll(dayPattern);
      
      for (const match of dayMatches) {
        for (let i = 1; i < match.length; i++) {
          if (match[i]) {
            const dayIndex = dayNames.indexOf(match[i].toLowerCase());
            if (dayIndex !== -1) {
              daysOfWeek.push(dayIndex);
            }
          }
        }
      }

      // Also check for individual day mentions
      const singleDayPattern = /\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi;
      const singleDayMatches = text.matchAll(singleDayPattern);
      
      for (const match of singleDayMatches) {
        const dayIndex = dayNames.indexOf(match[1].toLowerCase());
        if (dayIndex !== -1) {
          daysOfWeek.push(dayIndex);
        }
      }

      if (daysOfWeek.length > 0) {
        pattern.daysOfWeek = [...new Set(daysOfWeek)].sort();
      }
    }

    // Extract day of month for monthly recurrence
    if (pattern.frequency === RecurrenceFrequency.MONTHLY) {
      const dayOfMonthMatch = text.match(/\bon\s+the\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
      if (dayOfMonthMatch) {
        pattern.dayOfMonth = parseInt(dayOfMonthMatch[1]);
      }
    }

    // Extract end date or occurrences
    const untilMatch = text.match(/\buntil\s+([^,]+)/i);
    if (untilMatch) {
      const endDate = this.extractDateTime(untilMatch[1]).dateTime;
      if (endDate) {
        pattern.endDate = endDate;
      }
    }

    const occurrencesMatch = text.match(/\bfor\s+(\d+)\s+(?:times?|occurrences?)\b/i);
    if (occurrencesMatch) {
      pattern.occurrences = parseInt(occurrencesMatch[1]);
    }

    return pattern;
  }

  /**
   * Extract reminder information from text
   * @param text Input text
   * @returns Extracted reminder info
   */
  private extractReminderInfo(text: string): { reminderTime?: Date; reminderType?: ReminderType } {
    const result: { reminderTime?: Date; reminderType?: ReminderType } = {};

    // Extract reminder time
    const reminderTimeResult = this.extractDateTime(text);
    if (reminderTimeResult.dateTime) {
      result.reminderTime = reminderTimeResult.dateTime;
    }

    // Extract reminder type
    if (/\bemail\b/i.test(text)) {
      result.reminderType = ReminderType.EMAIL;
    } else if (/\bsms\b|\btext\b/i.test(text)) {
      result.reminderType = ReminderType.SMS;
    } else {
      result.reminderType = ReminderType.PUSH;
    }

    return result;
  }
}

// Export singleton instance
export default new NLPService();