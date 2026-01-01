import { FamilyMember } from '../types/models';
import { COLORS } from '../styles/theme';

/**
 * Returns the color for an event based on its attendees.
 * - Everyone attending: Coral Red
 * - Specific member(s): First attendee's color
 * - No attendees: Gray
 */
export function getEventColor(attendeeIds: string[], allMembers: FamilyMember[]): string {
  if (attendeeIds.length === allMembers.length && allMembers.length > 0) {
    return COLORS.primary; // Coral Red (#FF6B6B) for "Everyone" events
  } else if (attendeeIds.length > 0) {
    const firstAttendeeId = attendeeIds[0];
    const member = allMembers.find((m) => m.id === firstAttendeeId);
    return member ? member.color : '#808080';
  } else {
    return '#808080'; // Gray fallback
  }
}
