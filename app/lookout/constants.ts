export const frequencyOptions = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export const timezoneOptions = [
  // UTC
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },

  // North America
  { value: 'America/New_York', label: 'Eastern Time (New York)' },
  { value: 'America/Chicago', label: 'Central Time (Chicago)' },
  { value: 'America/Denver', label: 'Mountain Time (Denver)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
  { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)' },
  { value: 'America/Toronto', label: 'Eastern Time (Toronto)' },
  { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },
  { value: 'America/Mexico_City', label: 'Central Time (Mexico City)' },

  // Europe
  { value: 'Europe/London', label: 'Greenwich Mean Time (London)' },
  { value: 'Europe/Paris', label: 'Central European Time (Paris)' },
  { value: 'Europe/Berlin', label: 'Central European Time (Berlin)' },
  { value: 'Europe/Rome', label: 'Central European Time (Rome)' },
  { value: 'Europe/Madrid', label: 'Central European Time (Madrid)' },
  { value: 'Europe/Amsterdam', label: 'Central European Time (Amsterdam)' },
  { value: 'Europe/Brussels', label: 'Central European Time (Brussels)' },
  { value: 'Europe/Vienna', label: 'Central European Time (Vienna)' },
  { value: 'Europe/Zurich', label: 'Central European Time (Zurich)' },
  { value: 'Europe/Stockholm', label: 'Central European Time (Stockholm)' },
  { value: 'Europe/Helsinki', label: 'Eastern European Time (Helsinki)' },
  { value: 'Europe/Moscow', label: 'Moscow Standard Time (Moscow)' },
  { value: 'Europe/Istanbul', label: 'Turkey Time (Istanbul)' },
  { value: 'Europe/Athens', label: 'Eastern European Time (Athens)' },

  // Asia
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (Tokyo)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (Shanghai)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong Time (Hong Kong)' },
  { value: 'Asia/Singapore', label: 'Singapore Standard Time (Singapore)' },
  { value: 'Asia/Seoul', label: 'Korea Standard Time (Seoul)' },
  { value: 'Asia/Bangkok', label: 'Indochina Time (Bangkok)' },
  { value: 'Asia/Jakarta', label: 'Western Indonesia Time (Jakarta)' },
  { value: 'Asia/Manila', label: 'Philippine Standard Time (Manila)' },
  { value: 'Asia/Kuala_Lumpur', label: 'Malaysia Time (Kuala Lumpur)' },
  { value: 'Asia/Taipei', label: 'Taipei Standard Time (Taipei)' },
  { value: 'Asia/Kolkata', label: 'India Standard Time (Kolkata/Mumbai)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (Dubai)' },
  { value: 'Asia/Riyadh', label: 'Arabia Standard Time (Riyadh)' },
  { value: 'Asia/Tehran', label: 'Iran Standard Time (Tehran)' },
  { value: 'Asia/Jerusalem', label: 'Israel Standard Time (Jerusalem)' },

  // Australia & Oceania
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (Sydney)' },
  { value: 'Australia/Melbourne', label: 'Australian Eastern Time (Melbourne)' },
  { value: 'Australia/Brisbane', label: 'Australian Eastern Time (Brisbane)' },
  { value: 'Australia/Perth', label: 'Australian Western Time (Perth)' },
  { value: 'Australia/Adelaide', label: 'Australian Central Time (Adelaide)' },
  { value: 'Australia/Darwin', label: 'Australian Central Time (Darwin)' },
  { value: 'Pacific/Auckland', label: 'New Zealand Time (Auckland)' },
  { value: 'Pacific/Fiji', label: 'Fiji Time (Fiji)' },

  // Africa
  { value: 'Africa/Cairo', label: 'Eastern European Time (Cairo)' },
  { value: 'Africa/Johannesburg', label: 'South Africa Standard Time (Johannesburg)' },
  { value: 'Africa/Lagos', label: 'West Africa Time (Lagos)' },
  { value: 'Africa/Nairobi', label: 'East Africa Time (Nairobi)' },
  { value: 'Africa/Casablanca', label: 'Western European Time (Casablanca)' },

  // South America
  { value: 'America/Sao_Paulo', label: 'Brasilia Time (São Paulo)' },
  { value: 'America/Buenos_Aires', label: 'Argentina Time (Buenos Aires)' },
  { value: 'America/Santiago', label: 'Chile Time (Santiago)' },
  { value: 'America/Lima', label: 'Peru Time (Lima)' },
  { value: 'America/Bogota', label: 'Colombia Time (Bogotá)' },
  { value: 'America/Caracas', label: 'Venezuela Time (Caracas)' },
];

export const allExampleLookouts = [
  {
    title: 'Daily AI News Digest',
    prompt:
      'Summarize the most important AI & Tech developments from the past 24 hours, including new product launches, funding rounds, and breakthrough research papers. Focus on practical applications and industry impact. Include any major announcements from OpenAI, Google, Microsoft, Meta, and emerging AI startups.',
    frequency: 'daily',
    time: '09:00',
    timezone: 'America/New_York',
  },
  {
    title: 'Weekly Crypto Market Analysis',
    prompt:
      'Provide a comprehensive analysis of the cryptocurrency market over the past week. Include price movements for major coins (BTC, ETH, SOL), significant news events, regulatory updates, and emerging trends in DeFi and NFTs. Highlight any major institutional adoptions, regulatory changes, or market-moving events.',
    frequency: 'weekly',
    time: '18:00',
    timezone: 'UTC',
    dayOfWeek: '0', // Sunday
  },
  {
    title: 'Monthly Climate Tech Report',
    prompt:
      'Research and summarize the latest developments in climate technology and sustainability. Cover new renewable energy projects, carbon capture innovations, green tech funding rounds, and policy changes affecting the climate tech sector. Include updates on clean energy adoption rates and breakthrough technologies.',
    frequency: 'monthly',
    time: '10:00',
    timezone: 'Europe/London',
  },
  {
    title: 'Daily Stock Market Summary',
    prompt:
      "Provide a comprehensive summary of today's stock market performance. Include major index movements (S&P 500, NASDAQ, DOW), notable earnings announcements, significant corporate news, and any economic indicators that moved markets. Focus on actionable insights for investors.",
    frequency: 'daily',
    time: '16:30',
    timezone: 'America/New_York',
  },
  {
    title: 'Weekly Startup Funding Roundup',
    prompt:
      'Compile a detailed report of all significant startup funding rounds from the past week. Include Series A, B, C rounds and notable seed funding. Focus on emerging sectors like AI, fintech, healthtech, and climate tech. Provide insights on funding trends and investor sentiment.',
    frequency: 'weekly',
    time: '11:00',
    timezone: 'America/Los_Angeles',
    dayOfWeek: '1', // Monday
  },
  {
    title: 'Daily Tech Acquisitions & Mergers',
    prompt:
      'Monitor and report on any technology company acquisitions, mergers, or strategic partnerships announced in the past 24 hours. Include deal values, strategic rationale, and potential market impact. Cover both public companies and notable private transactions.',
    frequency: 'daily',
    time: '14:00',
    timezone: 'Europe/Berlin',
  },
  {
    title: 'Weekly Gaming Industry News',
    prompt:
      'Summarize the most important developments in the gaming industry over the past week. Include new game releases, studio acquisitions, platform updates, esports news, and emerging gaming technologies like VR/AR. Focus on industry trends and major business developments.',
    frequency: 'weekly',
    time: '20:00',
    timezone: 'Asia/Tokyo',
    dayOfWeek: '5', // Friday
  },
  {
    title: 'Monthly SaaS Market Analysis',
    prompt:
      'Provide an in-depth analysis of the SaaS market trends over the past month. Include new product launches, pricing changes, market consolidation, and emerging SaaS categories. Analyze growth metrics, customer acquisition trends, and competitive landscape shifts.',
    frequency: 'monthly',
    time: '08:00',
    timezone: 'America/Chicago',
  },
  {
    title: 'Daily Regulatory & Policy Updates',
    prompt:
      'Track and summarize important regulatory and policy changes affecting the technology sector from the past 24 hours. Include updates on data privacy laws, antitrust investigations, AI regulations, and international trade policies impacting tech companies.',
    frequency: 'daily',
    time: '07:00',
    timezone: 'America/New_York',
  },
  {
    title: 'Weekly Cybersecurity Incidents',
    prompt:
      'Compile a comprehensive report of significant cybersecurity incidents, breaches, and vulnerabilities discovered in the past week. Include impact assessment, affected companies, attack vectors, and recommended security measures. Focus on lessons learned and prevention strategies.',
    frequency: 'weekly',
    time: '15:30',
    timezone: 'UTC',
    dayOfWeek: '3', // Wednesday
  },
  {
    title: 'Monthly Real Estate Tech Trends',
    prompt:
      'Analyze the latest trends in real estate technology over the past month. Cover PropTech innovations, virtual tour technologies, blockchain applications in real estate, and market digitization trends. Include funding activities and major platform launches.',
    frequency: 'monthly',
    time: '12:00',
    timezone: 'America/Los_Angeles',
  },
  {
    title: 'Daily Healthcare Innovation News',
    prompt:
      'Monitor and report on breakthrough healthcare innovations, medical device approvals, telemedicine developments, and digital health funding from the past 24 hours. Include regulatory approvals, clinical trial results, and emerging healthtech trends.',
    frequency: 'daily',
    time: '11:30',
    timezone: 'America/New_York',
  },
];

// Function to get 3 random examples using Fisher-Yates shuffle
export function getRandomExamples(count: number = 3) {
  const shuffled = [...allExampleLookouts];

  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

// For backward compatibility, export a default set of examples
export const exampleLookouts = getRandomExamples(3);

export const LOOKOUT_LIMITS = {
  TOTAL_LOOKOUTS: 10,
  DAILY_LOOKOUTS: 5,
} as const;

export const DEFAULT_FORM_VALUES = {
  FREQUENCY: 'daily',
  TIME: '09:00',
  TIMEZONE: 'UTC',
  DAY_OF_WEEK: '0', // Sunday
} as const;

export const dayOfWeekOptions = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];
