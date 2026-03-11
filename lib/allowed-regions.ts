/**
 * Allowed regions configuration for SCX.ai
 *
 * - Free users: Australia and New Zealand only
 * - Pro users: AU, NZ + USA, Canada, UK, EU countries, Singapore
 */

// Countries always allowed (for all users including free)
export const BASE_ALLOWED_COUNTRIES = ['AU', 'NZ'] as const;

// Additional countries allowed for Pro users only
export const PRO_ONLY_COUNTRIES = [
  // North America
  'US', // United States
  'CA', // Canada

  // United Kingdom
  'GB', // United Kingdom

  // Singapore
  'SG', // Singapore

  // EU Member States
  'AT', // Austria
  'BE', // Belgium
  'BG', // Bulgaria
  'HR', // Croatia
  'CY', // Cyprus
  'CZ', // Czech Republic (Czechia)
  'DK', // Denmark
  'EE', // Estonia
  'FI', // Finland
  'FR', // France
  'DE', // Germany
  'GR', // Greece
  'HU', // Hungary
  'IE', // Ireland
  'IT', // Italy
  'LV', // Latvia
  'LT', // Lithuania
  'LU', // Luxembourg
  'MT', // Malta
  'NL', // Netherlands
  'PL', // Poland
  'PT', // Portugal
  'RO', // Romania
  'SK', // Slovakia
  'SI', // Slovenia
  'ES', // Spain
  'SE', // Sweden
] as const;

// All countries allowed for Pro users
export const PRO_ALLOWED_COUNTRIES = [...BASE_ALLOWED_COUNTRIES, ...PRO_ONLY_COUNTRIES] as const;

/**
 * Check if a country code is in the base allowed list (AU/NZ)
 */
export function isBaseAllowedCountry(countryCode: string): boolean {
  return BASE_ALLOWED_COUNTRIES.includes(countryCode.toUpperCase() as (typeof BASE_ALLOWED_COUNTRIES)[number]);
}

/**
 * Check if a country code is in the Pro-only allowed list
 */
export function isProOnlyAllowedCountry(countryCode: string): boolean {
  return PRO_ONLY_COUNTRIES.includes(countryCode.toUpperCase() as (typeof PRO_ONLY_COUNTRIES)[number]);
}

/**
 * Check if a country code is allowed for Pro users (includes base + Pro-only countries)
 */
export function isProAllowedCountry(countryCode: string): boolean {
  return PRO_ALLOWED_COUNTRIES.includes(countryCode.toUpperCase() as (typeof PRO_ALLOWED_COUNTRIES)[number]);
}

/**
 * Check if user is allowed based on their Pro status and country
 * @param countryCode The user's country code
 * @param isProUser Whether the user has a Pro subscription
 * @returns true if the user is allowed to access the site
 */
export function isUserAllowedInRegion(countryCode: string, isProUser: boolean): boolean {
  if (!countryCode) return false;

  const upperCode = countryCode.toUpperCase();

  // AU/NZ always allowed
  if (isBaseAllowedCountry(upperCode)) {
    return true;
  }

  // Pro users allowed in expanded regions
  if (isProUser && isProOnlyAllowedCountry(upperCode)) {
    return true;
  }

  return false;
}

/**
 * Get a human-readable description of allowed regions
 */
export function getAllowedRegionsDescription(isProUser: boolean): string {
  if (isProUser) {
    return 'Australia, New Zealand, USA, Canada, UK, EU countries, and Singapore';
  }
  return 'Australia and New Zealand';
}
