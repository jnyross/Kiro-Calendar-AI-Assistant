import nlpService from '../src/services/nlpService';
import { formatDate } from '../src/utils/dateHelpers';

/**
 * Example script demonstrating the NLP service capabilities
 * Run with: npx ts-node examples/nlp-examples.ts
 */

const examples = [
  // Event creation
  'Schedule a meeting with John tomorrow at 2pm',
  'Create a team standup every Monday at 9am',
  'Set up a quarterly review meeting on the 15th of each month',
  'Schedule a 2-hour workshop next Friday at 10am in Conference Room A',
  
  // Event updates
  'Update the project sync to 4pm instead of 3pm',
  'Reschedule the budget meeting to next Wednesday',
  'Move the all-hands meeting to the main auditorium',
  
  // Event deletion
  'Cancel the 3pm meeting today',
  'Delete the training session on Friday',
  'Remove the standup meeting this week',
  
  // Queries
  'What\'s on my calendar for next Tuesday?',
  'Show me my schedule for this week',
  'List all events for next month',
  'When is my next meeting with Sarah?',
  
  // Attendee management
  'Add Sarah to the budget review meeting',
  'Invite John to the project kickoff',
  'Remove Mike from the weekly standup',
  
  // Time finding
  'Find time for a 2-hour workshop next week',
  'Find a 30-minute slot tomorrow afternoon',
  'When am I free for a quick chat?',
  
  // Conflict checking
  'Check if I have any conflicts next Monday afternoon',
  'Am I double-booked on Friday?',
  'Are there any overlapping meetings this week?',
  
  // Reminders
  'Remind me to call the dentist in 2 hours',
  'Set a reminder to submit the report tomorrow at 9am',
  'Alert me 15 minutes before the meeting',
  
  // Contact management
  'Add contact John Smith with email john@example.com',
  'Find contact information for Sarah Johnson',
  'Search for contacts in the engineering team',
  
  // Complex examples
  'Schedule a recurring weekly team meeting every Tuesday at 2pm with John, Sarah, and Mike in Room 101',
  'Create a monthly all-hands meeting on the first Friday of each month at 3pm',
  'Find time for a 3-hour training session next week, avoiding Monday and Friday',
];

async function runExamples() {
  console.log('🤖 NLP Service Examples');
  console.log('========================\n');

  for (const example of examples) {
    try {
      console.log(`📝 Input: "${example}"`);
      
      const result = await nlpService.parseCommand(example);
      
      console.log(`🎯 Intent: ${result.intent}`);
      console.log(`📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      
      if (Object.keys(result.entities).length > 0) {
        console.log('📋 Entities:');
        
        // Display entities in a readable format
        Object.entries(result.entities).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            let displayValue = value;
            
            // Format dates
            if (key === 'dateTime' || key === 'reminderTime') {
              displayValue = formatDate(value as Date, 'YYYY-MM-DD HH:mm');
            } else if (key === 'timeRange') {
              const range = value as { start: Date; end: Date };
              displayValue = `${formatDate(range.start, 'YYYY-MM-DD')} to ${formatDate(range.end, 'YYYY-MM-DD')}`;
            } else if (key === 'recurringPattern') {
              const pattern = value as any;
              displayValue = `${pattern.frequency} (interval: ${pattern.interval})`;
              if (pattern.daysOfWeek) {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                displayValue += ` on ${pattern.daysOfWeek.map((d: number) => days[d]).join(', ')}`;
              }
            } else if (Array.isArray(value)) {
              displayValue = value.join(', ');
            }
            
            console.log(`   - ${key}: ${displayValue}`);
          }
        });
      }
      
      console.log(''); // Empty line for separation
    } catch (error) {
      console.error(`❌ Error processing "${example}":`, error);
      console.log(''); // Empty line for separation
    }
  }
}

// Run the examples
runExamples().catch(console.error);