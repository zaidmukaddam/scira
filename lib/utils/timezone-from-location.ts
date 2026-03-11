// Utility to estimate timezone from coordinates
// This is a simple approximation - for production, consider using a proper timezone library

export function getTimezoneFromCoordinates(
  latitude: number,
  longitude: number,
): { timezone?: string; utcOffset: number } {
  // Simple longitude-based UTC offset calculation
  // 15 degrees of longitude = 1 hour offset
  const baseOffset = Math.round(longitude / 15);

  // Common timezone mappings based on approximate coordinates
  // This is a simplified approach - real timezone boundaries are complex
  const timezoneMap: Array<{
    name: string;
    latRange: [number, number];
    lonRange: [number, number];
    timezone: string;
    offset: number; // UTC offset in hours (can vary with DST)
  }> = [
    // Australia
    { name: 'Sydney/Melbourne', latRange: [-40, -25], lonRange: [140, 155], timezone: 'Australia/Sydney', offset: 11 },
    { name: 'Brisbane', latRange: [-30, -20], lonRange: [150, 155], timezone: 'Australia/Brisbane', offset: 10 },
    { name: 'Adelaide', latRange: [-40, -30], lonRange: [135, 142], timezone: 'Australia/Adelaide', offset: 10.5 },
    { name: 'Perth', latRange: [-35, -25], lonRange: [110, 125], timezone: 'Australia/Perth', offset: 8 },
    { name: 'Darwin', latRange: [-20, -10], lonRange: [125, 135], timezone: 'Australia/Darwin', offset: 9.5 },

    // New Zealand
    { name: 'Auckland', latRange: [-47, -34], lonRange: [165, 180], timezone: 'Pacific/Auckland', offset: 13 },

    // Asia
    { name: 'Tokyo', latRange: [30, 45], lonRange: [130, 145], timezone: 'Asia/Tokyo', offset: 9 },
    { name: 'Singapore', latRange: [-10, 10], lonRange: [95, 115], timezone: 'Asia/Singapore', offset: 8 },
    { name: 'Hong Kong', latRange: [15, 30], lonRange: [110, 125], timezone: 'Asia/Hong_Kong', offset: 8 },

    // Europe
    { name: 'London', latRange: [45, 60], lonRange: [-10, 5], timezone: 'Europe/London', offset: 0 },
    { name: 'Paris', latRange: [40, 55], lonRange: [-5, 10], timezone: 'Europe/Paris', offset: 1 },
    { name: 'Berlin', latRange: [45, 55], lonRange: [5, 20], timezone: 'Europe/Berlin', offset: 1 },

    // Americas
    { name: 'New York', latRange: [35, 45], lonRange: [-80, -70], timezone: 'America/New_York', offset: -5 },
    { name: 'Los Angeles', latRange: [30, 40], lonRange: [-125, -115], timezone: 'America/Los_Angeles', offset: -8 },
    { name: 'Chicago', latRange: [35, 45], lonRange: [-95, -85], timezone: 'America/Chicago', offset: -6 },
    { name: 'Toronto', latRange: [40, 50], lonRange: [-85, -75], timezone: 'America/Toronto', offset: -5 },
    { name: 'Vancouver', latRange: [45, 55], lonRange: [-130, -120], timezone: 'America/Vancouver', offset: -8 },
  ];

  // Try to find a matching timezone
  for (const zone of timezoneMap) {
    if (
      latitude >= zone.latRange[0] &&
      latitude <= zone.latRange[1] &&
      longitude >= zone.lonRange[0] &&
      longitude <= zone.lonRange[1]
    ) {
      return { timezone: zone.timezone, utcOffset: zone.offset };
    }
  }

  // Fallback to simple offset calculation
  return { utcOffset: baseOffset };
}

// Helper to get user's timezone from browser (client-side only)
export function getBrowserTimezone(): string | null {
  if (typeof window !== 'undefined' && Intl?.DateTimeFormat) {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return null;
    }
  }
  return null;
}
