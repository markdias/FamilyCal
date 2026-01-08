// Member color palette aligned with iOS Calendar system colors
export const MEMBER_COLORS = [
  '#FF3B30', // Red
  '#FF9500', // Orange
  '#FFCC00', // Yellow
  '#34C759', // Green
  '#5AC8FA', // Teal Blue
  '#007AFF', // Blue
  '#5856D6', // Indigo
  '#AF52DE', // Purple
  '#FF2D55', // Pink
  '#A2845E', // Brown
  '#8E8E93', // Gray
] as const;

// Special color for events with multiple family members (overridable via settings)
export const FAMILY_EVENT_COLOR = '#334155';

// Get the next available color from the palette
export function getNextAvailableColor(usedColors: (string | null)[]): string {
  const usedSet = new Set(usedColors.filter(Boolean));
  
  // Find first unused color from the palette
  for (const color of MEMBER_COLORS) {
    if (!usedSet.has(color)) {
      return color;
    }
  }
  
  // If all colors are used, return a random one from the palette
  return MEMBER_COLORS[Math.floor(Math.random() * MEMBER_COLORS.length)];
}

// Get the color for an event based on its participants
export function getEventColor(
  participantColors: (string | null)[],
  fallbackColor?: string,
  familyColor: string = FAMILY_EVENT_COLOR
): string {
  const validColors = participantColors.filter((c): c is string => c !== null);
  
  if (validColors.length === 0) {
    return normalizeColorForDisplay(fallbackColor || MEMBER_COLORS[0]);
  }
  
  if (validColors.length === 1) {
    return normalizeColorForDisplay(validColors[0]);
  }
  
  // Multiple participants - use the family event color
  return normalizeColorForDisplay(familyColor);
}

// Blend multiple hex colors by averaging RGB channels
export function blendColors(colors: string[]): string {
  if (!colors.length) return FAMILY_EVENT_COLOR;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  colors.forEach((hex) => {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    rSum += r;
    gSum += g;
    bSum += b;
  });
  const n = colors.length;
  const r = Math.round(rSum / n);
  const g = Math.round(gSum / n);
  const b = Math.round(bSum / n);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Get a slightly darker version of a color (for better contrast)
export function darkenColor(hex: string, percent: number = 15): string {
  // Remove # if present
  const color = hex.replace('#', '');
  
  const num = parseInt(color, 16);
  const r = Math.max(0, (num >> 16) - Math.round(255 * (percent / 100)));
  const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * (percent / 100)));
  const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * (percent / 100)));
  
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Ensure a color is dark enough for UI surfaces; darkens light colors
export function normalizeColorForDisplay(hex: string, percent: number = 22): string {
  if (!hex) return FAMILY_EVENT_COLOR;
  const color = hex.startsWith('#') ? hex : `#${hex}`;
  if (!/^#?[0-9A-Fa-f]{6}$/.test(color)) return FAMILY_EVENT_COLOR;
  return isLightColor(color) ? darkenColor(color, percent) : color;
}

// Get a more vibrant version of a pastel color
export function getVibrantColor(hex: string): string {
  // Remove # if present
  const color = hex.replace('#', '');
  
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  
  // Increase saturation by moving away from gray
  const avg = (r + g + b) / 3;
  const factor = 1.3;
  
  const newR = Math.min(255, Math.max(0, Math.round(avg + (r - avg) * factor)));
  const newG = Math.min(255, Math.max(0, Math.round(avg + (g - avg) * factor)));
  const newB = Math.min(255, Math.max(0, Math.round(avg + (b - avg) * factor)));
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// Check if a color is light (for determining text color)
export function isLightColor(hex: string): boolean {
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// Get contrasting text color (black or white) for a background
export function getContrastingTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#1D1D1F' : '#FFFFFF';
}

// Format display name - only show last name if different from family name
export function formatDisplayName(
  firstName: string,
  lastName?: string | null,
  familyName?: string | null
): string {
  if (!lastName) return firstName;
  
  // Only show last name if it's different from the family name
  if (familyName) {
    const normalizedLastName = lastName.toLowerCase().trim();
    const normalizedFamilyName = familyName.toLowerCase().trim();
    
    // Check if family name contains the last name or vice versa
    if (normalizedLastName === normalizedFamilyName ||
        normalizedFamilyName.includes(normalizedLastName) ||
        normalizedFamilyName.startsWith(normalizedLastName)) {
      return firstName;
    }
  }
  
  return `${firstName} ${lastName}`;
}
