import { addDays, setHours, setMinutes, startOfDay, formatISO, subDays } from 'date-fns';
import { FamilyMember, CalendarEvent } from '../types/models';
import { COLORS } from '../styles/theme';

export const MOCK_MEMBERS: FamilyMember[] = [
  { id: '1', name: 'John', color: '#4A90E2', avatarInitials: 'JO' },
  { id: '2', name: 'Jane', color: '#E74C3C', avatarInitials: 'JA' },
  { id: '3', name: 'Mike', color: '#2ECC71', avatarInitials: 'MI' },
  { id: '4', name: 'Sarah', color: '#F39C12', avatarInitials: 'SA' },
];

const generateEvents = (): CalendarEvent[] => {
  const events: CalendarEvent[] = [];
  const today = startOfDay(new Date());

  // Everyone event (Coral Red)
  events.push({
    id: 'e1',
    title: 'Family Dinner',
    startDate: formatISO(setMinutes(setHours(today, 18), 30)),
    endDate: formatISO(setMinutes(setHours(today, 20), 0)),
    attendeeIds: ['1', '2', '3', '4'],
    isAllDay: false,
    location: 'Home',
    notes: 'Weekly family dinner tradition',
  });

  // Member specific events
  events.push({
    id: 'e2',
    title: 'Dentist Appointment',
    startDate: formatISO(setMinutes(setHours(addDays(today, 1), 10), 0)),
    endDate: formatISO(setMinutes(setHours(addDays(today, 1), 11), 0)),
    attendeeIds: ['2'],
    isAllDay: false,
    location: 'Bright Smiles Dental',
  });

  events.push({
    id: 'e3',
    title: 'Soccer Practice',
    startDate: formatISO(setMinutes(setHours(addDays(today, 1), 16), 0)),
    endDate: formatISO(setMinutes(setHours(addDays(today, 1), 17), 30)),
    attendeeIds: ['1', '3'],
    isAllDay: false,
    location: 'Community Park',
  });

  events.push({
    id: 'e4',
    title: 'Mike\'s Birthday',
    startDate: formatISO(addDays(today, 5)),
    endDate: formatISO(addDays(today, 5)),
    attendeeIds: ['3'],
    isAllDay: true,
  });

  // Generate more random events over 90 days
  const titles = ['Work Meeting', 'Gym', 'Grocery Shopping', 'Piano Lesson', 'Coffee with Friends', 'School Project', 'Date Night', 'Movie Night'];
  
  for (let i = -10; i < 80; i++) {
    if (i === 0 || i === 1 || i === 5) continue; // Skip days already handled
    
    const day = addDays(today, i);
    const numEvents = Math.floor(Math.random() * 3);
    
    for (let j = 0; j < numEvents; j++) {
      const attendeesCount = Math.floor(Math.random() * 4) + 1;
      const attendees = MOCK_MEMBERS.slice(0, attendeesCount).map(m => m.id);
      
      events.push({
        id: `e-random-${i}-${j}`,
        title: titles[Math.floor(Math.random() * titles.length)],
        startDate: formatISO(setMinutes(setHours(day, 9 + Math.floor(Math.random() * 10)), 0)),
        endDate: formatISO(setMinutes(setHours(day, 11 + Math.floor(Math.random() * 8)), 0)),
        attendeeIds: attendees,
        isAllDay: Math.random() > 0.9,
      });
    }
  }

  return events;
};

export const MOCK_EVENTS = generateEvents();
