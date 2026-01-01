export interface FamilyMember {
  id: string;
  name: string;
  color: string;
  avatarInitials: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  location?: string;
  notes?: string;
  attendeeIds: string[];
  isAllDay: boolean;
  recurrenceRule?: string;
}

export type ViewMode = 'family' | 'month' | 'day';
export type ThemeMode = 'light' | 'dark' | 'auto';

export interface AppState {
  viewMode: ViewMode;
  theme: ThemeMode;
  selectedDate: string; // ISO string
  currentUserId: string;
  familyMembers: FamilyMember[];
  events: CalendarEvent[];
}
