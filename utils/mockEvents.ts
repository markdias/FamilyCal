export interface MockEvent {
  id: string;
  title: string;
  color: string; // Single color for backward compatibility
  gradientColors?: string[]; // Array of colors for gradient (left to right)
  date: Date;
  person?: string;
  location?: string;
  startTime?: Date;
  endTime?: Date;
  isRecurring?: boolean;
  originalEventId?: string;
}

// Pastel color palette
export const PASTEL_COLORS = {
  orange: '#FFE5CC',
  purple: '#E5CCFF',
  yellow: '#FF9500',
  green: '#CCFFE5',
  blue: '#CCE5FF',
};

// Generate mock events for December 2025 based on the image description
export function generateMockEvents(year: number, month: number): MockEvent[] {
  const events: MockEvent[] = [];
  const colors = Object.values(PASTEL_COLORS);
  let colorIndex = 0;

  // Helper to add event
  const addEvent = (day: number, title: string, color?: string, gradientColors?: string[]) => {
    events.push({
      id: `event-${year}-${month}-${day}-${events.length}`,
      title,
      color: color || colors[colorIndex % colors.length],
      gradientColors,
      date: new Date(year, month - 1, day),
    });
    if (!color && !gradientColors) colorIndex++;
  };

  // December 1
  addEvent(1, 'OUT of o...', PASTEL_COLORS.orange);
  addEvent(1, 'Off Work', PASTEL_COLORS.orange);
  addEvent(1, 'Family Meeting', undefined, [PASTEL_COLORS.purple, PASTEL_COLORS.yellow, PASTEL_COLORS.green]); // Multi-member event
  addEvent(1, 'School', PASTEL_COLORS.purple);
  addEvent(1, 'Understa...', PASTEL_COLORS.orange);
  addEvent(1, 'Monkey...', PASTEL_COLORS.orange);
  addEvent(1, 'Event 6', PASTEL_COLORS.orange);
  addEvent(1, 'Event 7', PASTEL_COLORS.orange);
  addEvent(1, 'Event 8', PASTEL_COLORS.orange);

  // December 2
  addEvent(2, 'OUT of o...', PASTEL_COLORS.orange);
  addEvent(2, 'Nursery', PASTEL_COLORS.yellow);
  addEvent(2, 'School D...', PASTEL_COLORS.purple);
  addEvent(2, 'Family Dinner', undefined, [PASTEL_COLORS.orange, PASTEL_COLORS.blue, PASTEL_COLORS.green]); // Multi-member event
  addEvent(2, 'Parent M...', PASTEL_COLORS.orange);
  addEvent(2, 'School Pi...', PASTEL_COLORS.purple);
  addEvent(2, 'going ov...', PASTEL_COLORS.orange);
  addEvent(2, 'Event 7', PASTEL_COLORS.orange);

  // December 3
  addEvent(3, 'OUT of of...', PASTEL_COLORS.orange);
  addEvent(3, 'School Dr...', PASTEL_COLORS.purple);
  addEvent(3, 'School', PASTEL_COLORS.purple);
  addEvent(3, 'Family Outing', undefined, [PASTEL_COLORS.blue, PASTEL_COLORS.purple]); // Multi-member event
  addEvent(3, 'GUTS Dis...', PASTEL_COLORS.orange);
  addEvent(3, 'Headteac...', PASTEL_COLORS.orange);
  addEvent(3, 'Lunch wit...', PASTEL_COLORS.orange);
  addEvent(3, 'Event 7', PASTEL_COLORS.orange);
  addEvent(3, 'Event 8', PASTEL_COLORS.orange);

  // December 4
  addEvent(4, 'W - Work...', PASTEL_COLORS.orange);
  addEvent(4, 'Nursery', PASTEL_COLORS.yellow);
  addEvent(4, 'Working...', PASTEL_COLORS.orange);
  addEvent(4, 'School Dr...', PASTEL_COLORS.purple);
  addEvent(4, 'Lunch wit...', PASTEL_COLORS.orange);
  addEvent(4, 'Unavaila...', PASTEL_COLORS.orange);
  addEvent(4, 'Event 7', PASTEL_COLORS.orange);
  addEvent(4, 'Event 8', PASTEL_COLORS.orange);
  addEvent(4, 'Event 9', PASTEL_COLORS.orange);
  addEvent(4, 'Event 10', PASTEL_COLORS.orange);

  // December 5
  addEvent(5, 'W - Work...', PASTEL_COLORS.orange);
  addEvent(5, 'School D...', PASTEL_COLORS.purple);
  addEvent(5, 'School', PASTEL_COLORS.purple);
  addEvent(5, 'Unavaila...', PASTEL_COLORS.orange);
  addEvent(5, 'School Pi...', PASTEL_COLORS.purple);
  addEvent(5, 'Winter Fair', PASTEL_COLORS.orange);
  addEvent(5, 'Event 7', PASTEL_COLORS.orange);
  addEvent(5, 'Event 8', PASTEL_COLORS.orange);

  // December 6
  addEvent(6, 'Gabriella...', PASTEL_COLORS.green);
  addEvent(6, 'Yoga wit...', PASTEL_COLORS.green);
  addEvent(6, 'Jul & Joel', PASTEL_COLORS.green);

  // December 7
  addEvent(7, 'Ben Fras...', PASTEL_COLORS.green);

  // December 8
  addEvent(8, 'W - Work...', PASTEL_COLORS.orange);
  addEvent(8, 'School', PASTEL_COLORS.purple);
  addEvent(8, 'Python Tr...', PASTEL_COLORS.purple);
  addEvent(8, 'Unavaila...', PASTEL_COLORS.orange);
  addEvent(8, 'With Gra...', PASTEL_COLORS.orange);
  addEvent(8, 'Mark/Vince', PASTEL_COLORS.orange);
  addEvent(8, 'Event 7', PASTEL_COLORS.orange);
  addEvent(8, 'Event 8', PASTEL_COLORS.orange);
  addEvent(8, 'Event 9', PASTEL_COLORS.orange);
  addEvent(8, 'Event 10', PASTEL_COLORS.orange);
  addEvent(8, 'Event 11', PASTEL_COLORS.orange);
  addEvent(8, 'Event 12', PASTEL_COLORS.orange);

  // December 9
  addEvent(9, 'Jemma Z...', PASTEL_COLORS.orange);
  addEvent(9, 'W - Work...', PASTEL_COLORS.orange);
  addEvent(9, 'Nursery', PASTEL_COLORS.yellow);
  addEvent(9, 'School', PASTEL_COLORS.purple);
  addEvent(9, 'Headteac...', PASTEL_COLORS.orange);
  addEvent(9, 'Christma...', PASTEL_COLORS.orange);
  addEvent(9, 'Event 7', PASTEL_COLORS.orange);
  addEvent(9, 'Event 8', PASTEL_COLORS.orange);
  addEvent(9, 'Event 9', PASTEL_COLORS.orange);
  addEvent(9, 'Event 10', PASTEL_COLORS.orange);

  // December 10
  addEvent(10, 'W - Work...', PASTEL_COLORS.orange);
  addEvent(10, 'Y6 Amet...', PASTEL_COLORS.orange);
  addEvent(10, 'School', PASTEL_COLORS.purple);
  addEvent(10, 'Bill/Stabil...', PASTEL_COLORS.orange);
  addEvent(10, 'Physio', PASTEL_COLORS.orange);
  addEvent(10, 'Pyhsio', PASTEL_COLORS.orange);
  addEvent(10, 'Event 7', PASTEL_COLORS.orange);
  addEvent(10, 'Event 8', PASTEL_COLORS.orange);
  addEvent(10, 'Event 9', PASTEL_COLORS.orange);
  addEvent(10, 'Event 10', PASTEL_COLORS.orange);
  addEvent(10, 'Event 11', PASTEL_COLORS.orange);

  // December 11
  addEvent(11, 'Talia Bris...', PASTEL_COLORS.orange);
  addEvent(11, 'W - Work...', PASTEL_COLORS.orange);
  addEvent(11, 'Nursery', PASTEL_COLORS.yellow);
  addEvent(11, 'School', PASTEL_COLORS.purple);
  addEvent(11, 'Unavaila...', PASTEL_COLORS.orange);
  addEvent(11, 'Stability...', PASTEL_COLORS.orange);
  addEvent(11, 'Event 7', PASTEL_COLORS.orange);
  addEvent(11, 'Event 8', PASTEL_COLORS.orange);
  addEvent(11, 'Event 9', PASTEL_COLORS.orange);
  addEvent(11, 'Event 10', PASTEL_COLORS.orange);

  // December 12
  addEvent(12, 'Geoff Ste...', PASTEL_COLORS.orange);
  addEvent(12, 'W - Work...', PASTEL_COLORS.orange);
  addEvent(12, 'School D...', PASTEL_COLORS.purple);
  addEvent(12, 'School', PASTEL_COLORS.purple);
  addEvent(12, 'Unavaila...', PASTEL_COLORS.orange);
  addEvent(12, 'School Pi...', PASTEL_COLORS.purple);
  addEvent(12, 'Event 7', PASTEL_COLORS.orange);
  addEvent(12, 'Event 8', PASTEL_COLORS.orange);

  // December 13
  addEvent(13, 'Gemma...', PASTEL_COLORS.green);
  addEvent(13, 'Carol Sin...', PASTEL_COLORS.green);

  // December 14
  addEvent(14, 'Christma...', PASTEL_COLORS.green);
  addEvent(14, 'Sleep', PASTEL_COLORS.yellow);
  addEvent(14, 'Beauty &...', PASTEL_COLORS.green);
  addEvent(14, 'First Nig...', PASTEL_COLORS.green);

  // December 15
  addEvent(15, 'Hanukka...', PASTEL_COLORS.orange);
  addEvent(15, 'W - Work...', PASTEL_COLORS.orange);
  addEvent(15, 'School', PASTEL_COLORS.purple);
  addEvent(15, 'Python Tr...', PASTEL_COLORS.purple);
  addEvent(15, 'Sleep', PASTEL_COLORS.yellow);
  addEvent(15, 'Unavaila...', PASTEL_COLORS.orange);
  addEvent(15, 'Event 7', PASTEL_COLORS.orange);
  addEvent(15, 'Event 8', PASTEL_COLORS.orange);
  addEvent(15, 'Event 9', PASTEL_COLORS.orange);
  addEvent(15, 'Event 10', PASTEL_COLORS.orange);
  addEvent(15, 'Event 11', PASTEL_COLORS.orange);
  addEvent(15, 'Event 12', PASTEL_COLORS.orange);

  // December 16
  addEvent(16, 'Jonny Gil...', PASTEL_COLORS.orange);
  addEvent(16, 'W - Work...', PASTEL_COLORS.orange);
  addEvent(16, 'Christma...', PASTEL_COLORS.orange);
  addEvent(16, 'Nursery', PASTEL_COLORS.yellow);
  addEvent(16, 'School', PASTEL_COLORS.purple);
  addEvent(16, 'Unavaila...', PASTEL_COLORS.orange);
  addEvent(16, 'Event 7', PASTEL_COLORS.orange);
  addEvent(16, 'Event 8', PASTEL_COLORS.orange);
  addEvent(16, 'Event 9', PASTEL_COLORS.orange);
  addEvent(16, 'Event 10', PASTEL_COLORS.orange);
  addEvent(16, 'Event 11', PASTEL_COLORS.orange);
  addEvent(16, 'Event 12', PASTEL_COLORS.orange);

  // December 17
  addEvent(17, 'W - Work...', PASTEL_COLORS.orange);
  addEvent(17, 'School', PASTEL_COLORS.purple);
  addEvent(17, 'Optional...', PASTEL_COLORS.orange);
  addEvent(17, 'Sleep', PASTEL_COLORS.yellow);
  addEvent(17, 'Unavaila...', PASTEL_COLORS.orange);
  addEvent(17, 'Frith Man...', PASTEL_COLORS.orange);
  addEvent(17, 'Event 7', PASTEL_COLORS.orange);

  // December 18
  addEvent(18, 'W - Work...', PASTEL_COLORS.orange);
  addEvent(18, 'Nursery', PASTEL_COLORS.yellow);
  addEvent(18, 'School', PASTEL_COLORS.purple);
  addEvent(18, 'Headteac...', PASTEL_COLORS.orange);
  addEvent(18, 'Unavaila...', PASTEL_COLORS.orange);
  addEvent(18, 'Poppy Cl...', PASTEL_COLORS.orange);
  addEvent(18, 'Event 7', PASTEL_COLORS.orange);
  addEvent(18, 'Event 8', PASTEL_COLORS.orange);
  addEvent(18, 'Event 9', PASTEL_COLORS.orange);
  addEvent(18, 'Event 10', PASTEL_COLORS.orange);

  // December 19
  addEvent(19, 'Last day...', PASTEL_COLORS.orange);
  addEvent(19, 'Laura Ste...', PASTEL_COLORS.orange);
  addEvent(19, 'W - Work...', PASTEL_COLORS.orange);
  addEvent(19, 'School -...', PASTEL_COLORS.purple);
  addEvent(19, 'Sleep', PASTEL_COLORS.yellow);
  addEvent(19, 'Unavaila...', PASTEL_COLORS.orange);
  addEvent(19, 'Event 7', PASTEL_COLORS.orange);
  addEvent(19, 'Event 8', PASTEL_COLORS.orange);
  addEvent(19, 'Event 9', PASTEL_COLORS.orange);
  addEvent(19, 'Event 10', PASTEL_COLORS.orange);

  // December 20
  addEvent(20, 'Tiger wh...', PASTEL_COLORS.green);
  addEvent(20, 'Sleep', PASTEL_COLORS.yellow);

  // December 21
  addEvent(21, "Children'...", PASTEL_COLORS.blue);
  addEvent(21, 'Christma...', PASTEL_COLORS.green);
  addEvent(21, 'Sleep', PASTEL_COLORS.yellow);
  addEvent(21, 'Uni Crew...', PASTEL_COLORS.blue);
  addEvent(21, 'Aston...', PASTEL_COLORS.blue);

  // December 22
  addEvent(22, 'Howard L...', PASTEL_COLORS.orange);
  addEvent(22, 'W - Work...', PASTEL_COLORS.orange);
  addEvent(22, 'Christma...', PASTEL_COLORS.orange);
  addEvent(22, 'Final Revi...', PASTEL_COLORS.orange);
  addEvent(22, 'Play Date...', PASTEL_COLORS.orange);
  addEvent(22, 'Sleep', PASTEL_COLORS.yellow);
  addEvent(22, 'Event 7', PASTEL_COLORS.orange);
  addEvent(22, 'Event 8', PASTEL_COLORS.orange);
  addEvent(22, 'Event 9', PASTEL_COLORS.orange);

  // December 23
  addEvent(23, 'W - Work...', PASTEL_COLORS.orange);
  addEvent(23, 'Christma...', PASTEL_COLORS.orange);
  addEvent(23, 'Nursery', PASTEL_COLORS.yellow);
  addEvent(23, 'Unavaila...', PASTEL_COLORS.orange);
  addEvent(23, 'Private E...', PASTEL_COLORS.orange);

  // December 24
  addEvent(24, 'Christma...', PASTEL_COLORS.orange);
  addEvent(24, 'W - Work...', PASTEL_COLORS.orange);
  addEvent(24, 'Christma...', PASTEL_COLORS.orange);
  addEvent(24, 'Pressies', PASTEL_COLORS.orange);
  addEvent(24, 'Sleep', PASTEL_COLORS.yellow);
  addEvent(24, 'Unavaila...', PASTEL_COLORS.orange);

  // December 25
  addEvent(25, 'Christma...', PASTEL_COLORS.orange);
  addEvent(25, 'H - Holiday', PASTEL_COLORS.orange);
  addEvent(25, 'Christma...', PASTEL_COLORS.orange);
  addEvent(25, 'Sternber...', PASTEL_COLORS.orange);

  // December 26
  addEvent(26, 'Boxing Day', PASTEL_COLORS.orange);
  addEvent(26, 'H - Holiday', PASTEL_COLORS.orange);
  addEvent(26, 'Kwanzaa', PASTEL_COLORS.orange);
  addEvent(26, 'Christma...', PASTEL_COLORS.orange);
  addEvent(26, "Dias for...", PASTEL_COLORS.orange);
  addEvent(26, 'Sleep', PASTEL_COLORS.yellow);
  addEvent(26, 'Event 7', PASTEL_COLORS.orange);
  addEvent(26, 'Event 8', PASTEL_COLORS.orange);

  // December 27
  addEvent(27, 'Christma...', PASTEL_COLORS.green);
  addEvent(27, 'Sleep', PASTEL_COLORS.yellow);

  // December 28
  addEvent(28, 'Ruth Eva...', PASTEL_COLORS.green);
  addEvent(28, 'Christma...', PASTEL_COLORS.green);
  addEvent(28, "Dias' for...", PASTEL_COLORS.green);
  addEvent(28, 'Sleep', PASTEL_COLORS.yellow);
  addEvent(28, 'Test', PASTEL_COLORS.green);

  // December 29
  addEvent(29, 'T - Time...', PASTEL_COLORS.orange);
  addEvent(29, 'Christma...', PASTEL_COLORS.orange);
  addEvent(29, 'Sleep', PASTEL_COLORS.yellow);
  addEvent(29, 'With Gra...', PASTEL_COLORS.orange);
  addEvent(29, 'Private E...', PASTEL_COLORS.orange);

  // December 30
  addEvent(30, 'T - Time...', PASTEL_COLORS.orange);
  addEvent(30, 'Christma...', PASTEL_COLORS.orange);
  addEvent(30, 'Play date...', PASTEL_COLORS.orange);
  addEvent(30, 'Play date...', PASTEL_COLORS.orange);
  addEvent(30, 'Private E...', PASTEL_COLORS.orange);
  addEvent(30, 'Manc...', PASTEL_COLORS.orange);

  // December 31
  addEvent(31, 'New Year...', PASTEL_COLORS.orange);
  addEvent(31, 'T - Time...', PASTEL_COLORS.orange);
  addEvent(31, 'Christma...', PASTEL_COLORS.orange);
  addEvent(31, 'Occupati...', PASTEL_COLORS.orange);
  addEvent(31, 'Sleep', PASTEL_COLORS.yellow);
  addEvent(31, 'Private E...', PASTEL_COLORS.orange);
  addEvent(31, 'Event 7', PASTEL_COLORS.orange);

  return events;
}

// Family View Event Interface
export interface FamilyEvent {
  id: string;
  person: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  color: string; // Single color for backward compatibility
  gradientColors?: string[]; // Array of colors for gradient (left to right)
  participantNames?: string[]; // All participant names for multi-participant events (for filtering)
  participantNameToColor?: { [name: string]: string }; // Map of participant name to their color (for filter pill colors)
  isRecurring?: boolean;
  isAllDay?: boolean; // Whether this is an all-day event
  originalEventId?: string; // For events expanded per participant, this is the actual event ID
}

// Generate current events for today (matching the image)
export function generateCurrentEvents(): FamilyEvent[] {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  // Set times for today's events (matching image: 18:00, 16:30)
  const events: FamilyEvent[] = [
    {
      id: 'current-1',
      person: 'Annabelle',
      title: 'Jacobsons For New...',
      startTime: new Date(year, month, day, 18, 0),
      endTime: new Date(year, month, day + 1, 0, 0), // Next day midnight
      location: '12 Linkside, London N...',
      color: PASTEL_COLORS.green,
    },
    {
      id: 'current-2',
      person: 'Coral',
      title: 'Jacobsons For New...',
      startTime: new Date(year, month, day, 18, 0),
      endTime: new Date(year, month, day + 1, 0, 0),
      location: '12 Linkside, London N...',
      color: PASTEL_COLORS.green,
    },
    {
      id: 'current-3',
      person: 'Mark',
      title: 'Private Event',
      startTime: new Date(year, month, day, 16, 30),
      endTime: new Date(year, month, day, 18, 0),
      color: PASTEL_COLORS.orange,
      isRecurring: true,
    },
    {
      id: 'current-4',
      person: 'Verity',
      title: 'Jacobsons For New...',
      startTime: new Date(year, month, day, 18, 0),
      endTime: new Date(year, month, day + 1, 0, 0),
      location: '12 Linkside, London N...',
      color: PASTEL_COLORS.green,
    },
  ];

  return events;
}

// Generate upcoming events grouped by person (matching the image)
export function generateUpcomingEvents(): FamilyEvent[] {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  const events: FamilyEvent[] = [
    // Annabelle's events
    {
      id: 'upcoming-annabelle-1',
      person: 'Annabelle',
      title: 'The Semps',
      startTime: new Date(year, month, day + 1, 14, 0), // Sun 4
      endTime: new Date(year, month, day + 1, 16, 0),
      color: PASTEL_COLORS.green,
    },
    {
      id: 'upcoming-annabelle-2',
      person: 'Annabelle',
      title: 'School',
      startTime: new Date(year, month, day + 3, 8, 45), // Tue 6
      endTime: new Date(year, month, day + 3, 15, 30),
      color: PASTEL_COLORS.purple,
      isRecurring: true,
    },
    {
      id: 'upcoming-annabelle-3',
      person: 'Annabelle',
      title: 'School',
      startTime: new Date(year, month, day + 4, 8, 45), // Wed 7
      endTime: new Date(year, month, day + 4, 15, 30),
      color: PASTEL_COLORS.purple,
      isRecurring: true,
    },
    // Coral's events
    {
      id: 'upcoming-coral-1',
      person: 'Coral',
      title: 'The Semps',
      startTime: new Date(year, month, day + 1, 14, 0), // Sun 4
      endTime: new Date(year, month, day + 1, 16, 0),
      color: PASTEL_COLORS.green,
    },
    {
      id: 'upcoming-coral-2',
      person: 'Coral',
      title: 'School Drop Off',
      startTime: new Date(year, month, day + 3, 8, 30), // Tue 6
      endTime: new Date(year, month, day + 3, 8, 45),
      color: PASTEL_COLORS.purple,
      isRecurring: true,
    },
    {
      id: 'upcoming-coral-3',
      person: 'Coral',
      title: 'School Pickup',
      startTime: new Date(year, month, day + 3, 14, 50), // Tue 6
      endTime: new Date(year, month, day + 3, 15, 0),
      color: PASTEL_COLORS.purple,
      isRecurring: true,
    },
  ];

  return events;
}

// Helper function to calculate countdown
export function getCountdownText(startTime: Date): string {
  const now = new Date();
  let diff = startTime.getTime() - now.getTime();

  if (diff < 0) {
    return 'Started';
  }

  // Time constants in milliseconds
  const MINUTE_MS = 60 * 1000;
  const HOUR_MS = 60 * MINUTE_MS;
  const DAY_MS = 24 * HOUR_MS;
  const WEEK_MS = 7 * DAY_MS;
  // Approximation for year/month to avoid complex calendar math without libraries
  const YEAR_MS = 365.25 * DAY_MS;
  const MONTH_MS = YEAR_MS / 12;

  const years = Math.floor(diff / YEAR_MS);
  diff -= years * YEAR_MS;

  const months = Math.floor(diff / MONTH_MS);
  diff -= months * MONTH_MS;

  const weeks = Math.floor(diff / WEEK_MS);
  diff -= weeks * WEEK_MS;

  const days = Math.floor(diff / DAY_MS);
  diff -= days * DAY_MS;

  const hours = Math.floor(diff / HOUR_MS);
  diff -= hours * HOUR_MS;

  const minutes = Math.floor(diff / MINUTE_MS);

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}mo`);
  if (weeks > 0) parts.push(`${weeks}w`);
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  if (parts.length === 0) return 'Starts in < 1m';

  return `Starts in ${parts.join(' ')}`;
}

// Helper function to format time range
export function formatTimeRange(startTime: Date, endTime: Date): string {
  const startHours = startTime.getHours();
  const startMinutes = startTime.getMinutes();
  const endHours = endTime.getHours();
  const endMinutes = endTime.getMinutes();

  const formatTime = (h: number, m: number) => {
    const hourStr = h.toString().padStart(2, '0');
    const minStr = m.toString().padStart(2, '0');
    return `${hourStr}:${minStr}`;
  };

  // Handle next day (endTime at 00:00 means it goes to midnight next day)
  if (endHours === 0 && endMinutes === 0 && endTime.getDate() !== startTime.getDate()) {
    return `${formatTime(startHours, startMinutes)} - 00:00`;
  }

  return `${formatTime(startHours, startMinutes)} - ${formatTime(endHours, endMinutes)}`;
}
