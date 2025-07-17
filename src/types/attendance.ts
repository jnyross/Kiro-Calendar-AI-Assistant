// Attendance priority enum for calendar events

export enum AttendancePriority {
  MUST = 'MUST',
  SHOULD = 'SHOULD',
  COULD = 'COULD',
  WONT = 'WONT'
}

export interface Attendee {
  contactId: string;
  priority: AttendancePriority;
  status: AttendeeStatus;
  responseTime?: Date;
}

export enum AttendeeStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  TENTATIVE = 'TENTATIVE'
}