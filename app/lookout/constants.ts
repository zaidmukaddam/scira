import {
  AtomicPowerIcon,
  GlobalSearchIcon,
  MicroscopeIcon,
  YoutubeIcon,
  RedditIcon,
  Github01Icon,
  AppleStocksIcon,
  NewTwitterIcon,
} from '@hugeicons/core-free-icons';

// Search modes available for lookouts (non-auth-required modes only)
export const LOOKOUT_SEARCH_MODES = [
  { value: 'extreme', label: 'Extreme', icon: AtomicPowerIcon, description: 'Deep research with multiple sources' },
  { value: 'web', label: 'Web', icon: GlobalSearchIcon, description: 'Search across the web' },
  { value: 'academic', label: 'Academic', icon: MicroscopeIcon, description: 'Search academic papers' },
  { value: 'youtube', label: 'YouTube', icon: YoutubeIcon, description: 'Search YouTube videos' },
  { value: 'reddit', label: 'Reddit', icon: RedditIcon, description: 'Search Reddit posts' },
  { value: 'github', label: 'GitHub', icon: Github01Icon, description: 'Search GitHub repositories' },
  { value: 'stocks', label: 'Stocks', icon: AppleStocksIcon, description: 'Stock information' },
  { value: 'x', label: 'X', icon: NewTwitterIcon, description: 'Search X posts' },
] as const;

export type LookoutSearchMode = (typeof LOOKOUT_SEARCH_MODES)[number]['value'];

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
  // EXTREME MODE EXAMPLES (deep multi-source research)
  {
    title: 'Daily AI News Digest',
    prompt:
      'Summarize the most important AI & Tech developments from the past 24 hours, including new product launches, funding rounds, and breakthrough research papers. Focus on practical applications and industry impact. Include any major announcements from OpenAI, Google, Microsoft, Meta, and emerging AI startups.',
    frequency: 'daily',
    time: '09:00',
    timezone: 'America/New_York',
    searchMode: 'extreme',
  },
  {
    title: 'Weekly Startup Funding Roundup',
    prompt:
      'Compile a detailed report of all significant startup funding rounds from the past week. Include Series A, B, C rounds and notable seed funding. Focus on emerging sectors like AI, fintech, healthtech, and climate tech. Provide insights on funding trends and investor sentiment.',
    frequency: 'weekly',
    time: '11:00',
    timezone: 'America/Los_Angeles',
    dayOfWeek: '1', // Monday
    searchMode: 'extreme',
  },
  {
    title: 'Monthly Climate Tech Report',
    prompt:
      'Research and summarize the latest developments in climate technology and sustainability. Cover new renewable energy projects, carbon capture innovations, green tech funding rounds, and policy changes affecting the climate tech sector. Include updates on clean energy adoption rates and breakthrough technologies.',
    frequency: 'monthly',
    time: '10:00',
    timezone: 'Europe/London',
    searchMode: 'extreme',
  },

  // WEB MODE EXAMPLES (general web search)
  {
    title: 'Daily Tech Acquisitions & Mergers',
    prompt:
      'Monitor and report on any technology company acquisitions, mergers, or strategic partnerships announced in the past 24 hours. Include deal values, strategic rationale, and potential market impact. Cover both public companies and notable private transactions.',
    frequency: 'daily',
    time: '14:00',
    timezone: 'Europe/Berlin',
    searchMode: 'web',
  },
  {
    title: 'Daily Regulatory & Policy Updates',
    prompt:
      'Track and summarize important regulatory and policy changes affecting the technology sector from the past 24 hours. Include updates on data privacy laws, antitrust investigations, AI regulations, and international trade policies impacting tech companies.',
    frequency: 'daily',
    time: '07:00',
    timezone: 'America/New_York',
    searchMode: 'web',
  },
  {
    title: 'Weekly Cybersecurity Incidents',
    prompt:
      'Compile a comprehensive report of significant cybersecurity incidents, breaches, and vulnerabilities discovered in the past week. Include impact assessment, affected companies, attack vectors, and recommended security measures. Focus on lessons learned and prevention strategies.',
    frequency: 'weekly',
    time: '15:30',
    timezone: 'UTC',
    dayOfWeek: '3', // Wednesday
    searchMode: 'web',
  },

  // ACADEMIC MODE EXAMPLES (scholarly papers and research)
  {
    title: 'Weekly Machine Learning Research',
    prompt:
      'Find and summarize the most impactful machine learning papers published this week. Cover topics like large language models, computer vision, reinforcement learning, and AI safety. Include key findings, methodologies, and potential real-world applications.',
    frequency: 'weekly',
    time: '10:00',
    timezone: 'America/New_York',
    dayOfWeek: '1', // Monday
    searchMode: 'academic',
  },
  {
    title: 'Monthly Biotech Research Digest',
    prompt:
      'Compile a summary of groundbreaking biotechnology research papers from the past month. Focus on gene therapy, CRISPR developments, drug discovery, and personalized medicine. Highlight papers with potential clinical applications.',
    frequency: 'monthly',
    time: '09:00',
    timezone: 'Europe/London',
    searchMode: 'academic',
  },
  {
    title: 'Weekly Quantum Computing Papers',
    prompt:
      'Search for and summarize recent academic papers on quantum computing. Include advances in quantum algorithms, error correction, hardware developments, and practical applications. Focus on breakthrough results and their implications.',
    frequency: 'weekly',
    time: '14:00',
    timezone: 'America/Los_Angeles',
    dayOfWeek: '5', // Friday
    searchMode: 'academic',
  },

  // YOUTUBE MODE EXAMPLES (video content)
  {
    title: 'Weekly Tech YouTube Roundup',
    prompt:
      'Find the most popular and informative tech YouTube videos from the past week. Include product reviews, tutorials, and tech news coverage from channels like MKBHD, Linus Tech Tips, and similar creators. Summarize key takeaways and notable opinions.',
    frequency: 'weekly',
    time: '18:00',
    timezone: 'America/New_York',
    dayOfWeek: '6', // Saturday
    searchMode: 'youtube',
  },
  {
    title: 'Daily Programming Tutorial Discoveries',
    prompt:
      'Search for new programming tutorials and coding content uploaded in the last 24 hours. Focus on web development, Python, JavaScript, and system design. Highlight tutorials from popular educators and emerging creators.',
    frequency: 'daily',
    time: '20:00',
    timezone: 'UTC',
    searchMode: 'youtube',
  },
  {
    title: 'Weekly AI/ML Video Content',
    prompt:
      'Find educational YouTube videos about artificial intelligence and machine learning from the past week. Include lectures, tutorials, paper explanations, and industry talks. Focus on content suitable for both beginners and advanced practitioners.',
    frequency: 'weekly',
    time: '11:00',
    timezone: 'Asia/Tokyo',
    dayOfWeek: '0', // Sunday
    searchMode: 'youtube',
  },

  // REDDIT MODE EXAMPLES (community discussions)
  {
    title: 'Daily Reddit Tech Discussions',
    prompt:
      'Monitor top discussions from r/technology, r/programming, and r/startups from the past 24 hours. Summarize trending topics, popular opinions, and any viral tech stories. Include notable AMAs or insider perspectives.',
    frequency: 'daily',
    time: '21:00',
    timezone: 'America/Los_Angeles',
    searchMode: 'reddit',
  },
  {
    title: 'Weekly Developer Community Insights',
    prompt:
      'Compile the most upvoted posts and discussions from r/webdev, r/javascript, r/python, and r/devops over the past week. Focus on tool recommendations, career advice, and industry trends shared by the community.',
    frequency: 'weekly',
    time: '17:00',
    timezone: 'America/New_York',
    dayOfWeek: '5', // Friday
    searchMode: 'reddit',
  },
  {
    title: 'Daily Startup & Entrepreneur Buzz',
    prompt:
      'Track trending discussions from r/startups, r/entrepreneur, and r/SaaS. Summarize popular advice, success stories, failure post-mortems, and hot takes on startup culture and business strategies.',
    frequency: 'daily',
    time: '08:00',
    timezone: 'Europe/London',
    searchMode: 'reddit',
  },

  // GITHUB MODE EXAMPLES (repositories and code)
  {
    title: 'Weekly Trending GitHub Repos',
    prompt:
      'Find the most starred and trending GitHub repositories from the past week. Include new developer tools, open source projects, and interesting libraries across languages. Provide brief descriptions of what each project does and why it is gaining traction.',
    frequency: 'weekly',
    time: '10:00',
    timezone: 'UTC',
    dayOfWeek: '1', // Monday
    searchMode: 'github',
  },
  {
    title: 'Daily AI/ML Open Source Updates',
    prompt:
      'Search for new and updated AI/ML repositories on GitHub from the past 24 hours. Focus on model implementations, training frameworks, and research code releases. Highlight repos from major AI labs and notable researchers.',
    frequency: 'daily',
    time: '09:00',
    timezone: 'America/Los_Angeles',
    searchMode: 'github',
  },
  {
    title: 'Weekly DevOps Tools Discovery',
    prompt:
      'Find new DevOps, infrastructure, and platform engineering tools on GitHub. Include Kubernetes operators, CI/CD tools, monitoring solutions, and cloud-native projects. Focus on production-ready and actively maintained repositories.',
    frequency: 'weekly',
    time: '14:00',
    timezone: 'Europe/Berlin',
    dayOfWeek: '3', // Wednesday
    searchMode: 'github',
  },

  // STOCKS MODE EXAMPLES (market data)
  {
    title: 'Daily Stock Market Summary',
    prompt:
      "Provide a comprehensive summary of today's stock market performance. Include major index movements (S&P 500, NASDAQ, DOW), notable earnings announcements, significant corporate news, and any economic indicators that moved markets. Focus on actionable insights for investors.",
    frequency: 'daily',
    time: '16:30',
    timezone: 'America/New_York',
    searchMode: 'stocks',
  },
  {
    title: 'Weekly Tech Stock Analysis',
    prompt:
      'Analyze the performance of major tech stocks (AAPL, GOOGL, MSFT, AMZN, NVDA, META, TSLA) over the past week. Include price changes, trading volume, analyst ratings, and any news affecting these companies. Provide a technical outlook.',
    frequency: 'weekly',
    time: '18:00',
    timezone: 'America/New_York',
    dayOfWeek: '5', // Friday
    searchMode: 'stocks',
  },
  {
    title: 'Daily Pre-Market Earnings Watch',
    prompt:
      'List all companies reporting earnings today, both pre-market and after-hours. Include expected EPS, revenue estimates, and key metrics to watch. Highlight any stocks with significant implied moves based on options pricing.',
    frequency: 'daily',
    time: '06:00',
    timezone: 'America/New_York',
    searchMode: 'stocks',
  },

  // X (TWITTER) MODE EXAMPLES (social media insights)
  {
    title: 'Daily Tech Twitter Highlights',
    prompt:
      'Curate the most engaging and informative posts from Tech Twitter/X in the past 24 hours. Include viral threads, hot takes from industry leaders, product announcements, and tech debates. Focus on posts from founders, engineers, and VCs.',
    frequency: 'daily',
    time: '19:00',
    timezone: 'America/Los_Angeles',
    searchMode: 'x',
  },
  {
    title: 'Weekly AI Twitter Discourse',
    prompt:
      'Summarize the major AI-related conversations happening on X/Twitter this week. Include debates about AI safety, new model releases, demos going viral, and opinions from researchers and entrepreneurs. Track sentiment around major AI companies.',
    frequency: 'weekly',
    time: '17:00',
    timezone: 'America/New_York',
    dayOfWeek: '6', // Saturday
    searchMode: 'x',
  },
  {
    title: 'Daily Startup Announcements on X',
    prompt:
      'Track product launches, funding announcements, and major updates shared by startups on X/Twitter in the past 24 hours. Focus on posts from YC companies, notable founders, and emerging tech startups. Include engagement metrics and community reactions.',
    frequency: 'daily',
    time: '18:00',
    timezone: 'America/Los_Angeles',
    searchMode: 'x',
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
  TOTAL_LOOKOUTS: 30,
  DAILY_LOOKOUTS: 20,
} as const;

export const DEFAULT_FORM_VALUES = {
  FREQUENCY: 'daily',
  TIME: '09:00',
  TIMEZONE: 'UTC',
  DAY_OF_WEEK: '0', // Sunday
  SEARCH_MODE: 'extreme', // Default to extreme search
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
