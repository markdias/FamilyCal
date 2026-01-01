/**
 * FamilyCal Type Definitions
 * Based on FEATURED.md and USER_FLOWS.md specifications
 */

// Family Member types
export const MemberRoles = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  INVITED: 'invited',
};

// Event recurrence rules (RRULE format)
export const RecurrenceTypes = {
  NONE: null,
  DAILY: 'FREQ=DAILY',
  WEEKLY: 'FREQ=WEEKLY',
  MONTHLY: 'FREQ=MONTHLY',
  YEARLY: 'FREQ=YEARLY',
};

// Event alert types
export const AlertTypes = {
  NONE: null,
  AT_TIME: 0,
  FIVE_MINUTES: 5,
  FIFTEEN_MINUTES: 15,
  THIRTY_MINUTES: 30,
  ONE_HOUR: 60,
  TWO_HOURS: 120,
  ONE_DAY: 1440,
  TWO_DAYS: 2880,
};

// Calendar types
export const CalendarTypes = {
  SUPABASE: 'supabase',
  EXTERNAL: 'external', // EventKit/Android Calendar
};

/**
 * Family data model
 */
export const FamilyModel = {
  id: 'uuid',
  name: 'string',
  created_at: 'datetime',
  updated_at: 'datetime',
  invitation_token: 'string|null',
};

/**
 * Family Member data model
 */
export const FamilyMemberModel = {
  id: 'uuid',
  family_id: 'uuid',
  name: 'string',
  color: 'string', // Hex color for UI display
  linked_user_id: 'uuid|null', // null if not linked to a user account
  sort_order: 'number',
  is_invited: 'boolean',
  avatar_initials: 'string',
  role: MemberRoles.MEMBER,
  created_at: 'datetime',
};

/**
 * Family Calendar data model
 */
export const FamilyCalendarModel = {
  id: 'uuid',
  family_id: 'uuid',
  name: 'string',
  color: 'string',
  is_default: 'boolean',
  calendar_type: CalendarTypes.SUPABASE,
  external_calendar_id: 'string|null', // For EventKit/Android Calendar
  created_at: 'datetime',
};

/**
 * Calendar Event data model
 */
export const CalendarEventModel = {
  id: 'uuid',
  family_id: 'uuid',
  calendar_id: 'uuid',
  title: 'string',
  start_date: 'datetime', // ISO8601
  end_date: 'datetime', // ISO8601
  location: 'string|null',
  notes: 'string|null',
  meeting_link: 'string|null',
  is_all_day: 'boolean',
  recurrence_rule: RecurrenceTypes.NONE, // RRULE format
  is_deleted: 'boolean', // Soft delete
  alert_minutes: AlertTypes.NONE,
  travel_time_minutes: 'number|null',
  created_by: 'uuid', // User ID
  created_at: 'datetime',
  updated_at: 'datetime',
};

/**
 * Event Attendee data model
 */
export const EventAttendeeModel = {
  event_id: 'uuid',
  member_id: 'uuid',
  calendar_id: 'uuid',
  status: 'string', // 'accepted', 'declined', 'tentative', 'none'
  created_at: 'datetime',
};

/**
 * Checklist data model
 */
export const ChecklistModel = {
  id: 'uuid',
  event_identifier: 'string', // SHA256 hash of "title + date"
  event_title: 'string',
  deleted_at: 'datetime|null',
  deletion_reason: 'string|null',
  created_at: 'datetime',
};

/**
 * Checklist Item data model
 */
export const ChecklistItemModel = {
  id: 'uuid',
  checklist_id: 'uuid',
  title: 'string',
  is_completed: 'boolean',
  created_date: 'datetime',
  due_date: 'datetime|null',
};

/**
 * User Settings data model
 */
export const UserSettingsModel = {
  user_id: 'uuid',
  settings: 'object', // JSON object with all settings
  updated_at: 'datetime',
};

/**
 * App Settings structure (stored in user_settings.settings JSON)
 */
export const AppSettings = {
  // Pro status
  isProEnabled: false,

  // Notifications
  notificationsEnabled: true,
  morningBriefEnabled: true,
  morningBriefTime: '07:00',
  morningBriefWeekdaysOnly: false,
  eventRemindersEnabled: true,

  // Theme
  theme: 'light', // 'light', 'dark', 'auto'

  // Calendar
  defaultCalendarId: 'string|null',
  showDeclinedEvents: true,

  // Spotlight
  spotlightEventIds: ['uuid'], // Array of event IDs
  maxSpotlightEvents: 5,

  // Widgets
  widgetConfig: {
    enabled: false,
    daysToShow: 3,
    showBirthdays: false,
  },

  // Saved Places (Pro feature)
  savedPlaces: [
    {
      id: 'uuid',
      name: 'string',
      address: 'string',
      latitude: 'number',
      longitude: 'number',
    },
  ],

  // Drivers (Pro feature)
  drivers: [
    {
      id: 'uuid',
      name: 'string',
      familyMemberId: 'uuid',
    },
  ],

  // External calendars
  externalCalendars: [
    {
      id: 'uuid',
      name: 'string',
      platform: 'string', // 'ios', 'android', 'google'
      enabled: 'boolean',
    },
  ],
};

/**
 * Invitation data model
 */
export const InvitationModel = {
  id: 'uuid',
  family_id: 'uuid',
  member_id: 'uuid',
  token: 'string',
  expires_at: 'datetime',
  accepted_at: 'datetime|null',
  email: 'string|null', // Legacy email invitations
};

/**
 * User data model (Supabase auth.users)
 */
export const UserModel = {
  id: 'uuid',
  email: 'string',
  created_at: 'datetime',
  last_sign_in_at: 'datetime|null',
};

/**
 * Notification data model
 */
export const NotificationModel = {
  id: 'string',
  type: 'string', // 'event_reminder', 'morning_brief', 'checklist_reminder'
  title: 'string',
  body: 'string',
  data: 'object', // Additional data
  scheduledDate: 'datetime',
  fireDate: 'datetime',
};

/**
 * Morning Brief data model
 */
export const MorningBriefModel = {
  date: 'date', // YYYY-MM-DD
  events: [CalendarEventModel],
  birthdays: [
    {
      memberName: 'string',
      age: 'number',
    },
  ],
  checklists: [
    {
      eventTitle: 'string',
      items: [ChecklistItemModel],
    },
  ],
};
