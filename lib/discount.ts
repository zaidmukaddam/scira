import { get } from '@vercel/edge-config';

export interface DiscountConfig {
  enabled: boolean;
  code?: string;
  message?: string;
  percentage?: number;
  originalPrice?: number;
  finalPrice?: number;
  firstMonthPrice?: number;
  inrPrice?: number;
  isFirstMonthOnly?: boolean;
  startsAt?: Date;
  expiresAt?: Date;
  buttonText?: string;
  variant?: 'default' | 'urgent' | 'success';
  discountAvail?: string;
  dev?: boolean;
  discountId?: string;
  isStudentDiscount?: boolean;
  showPrice?: boolean;
}

/**
 * Detects if an email is a student email based on domain
 */
export function isStudentEmail(email: string, studentDomains: string[]): boolean {
  if (!email || typeof email !== 'string') return false;
  if (!studentDomains || studentDomains.length === 0) return false;

  const lowerEmail = email.toLowerCase();
  const emailParts = lowerEmail.split('@');
  if (emailParts.length !== 2) return false;

  const domain = emailParts[1];

  return studentDomains.some((pattern) => {
    const lowerPattern = pattern.toLowerCase();

    // Special case for .edu - match both .edu and .edu.xx variants
    if (lowerPattern === '.edu') {
      return domain.endsWith('.edu') || /\.edu\.[a-z]{2,3}$/.test(domain);
    }

    // For other patterns, use exact matching
    return domain.endsWith(lowerPattern);
  });
}

/**
 * Fetches discount configuration from Edge Config only
 * Returns disabled config if no Edge Config or no discount found
 */
export async function getDiscountConfig(userEmail?: string): Promise<DiscountConfig> {
  const defaultConfig: DiscountConfig = {
    enabled: false,
  };

  // Allow complete disable via environment variable
  if (process.env.DISABLE_DISCOUNTS === 'true') {
    return defaultConfig;
  }

  // Fetch student domains from Edge Config
  let studentDomains: string[] = [];
  try {
    const studentDomainsConfig = await get('student_domains');
    if (studentDomainsConfig && typeof studentDomainsConfig === 'string') {
      // Parse CSV string to array, trim whitespace
      studentDomains = studentDomainsConfig
        .split(',')
        .map((domain) => domain.trim())
        .filter((domain) => domain.length > 0);
    }
  } catch (error) {
    console.warn('Failed to fetch student domains from Edge Config:', error);
    // Fallback to hardcoded domains
    studentDomains = ['.edu', '.ac.in'];
  }

  // Check if user is a student
  const isStudent = userEmail ? isStudentEmail(userEmail, studentDomains) : false;

  try {
    const edgeDiscountConfig = await get('discount');

    if (edgeDiscountConfig && typeof edgeDiscountConfig === 'object') {
      const config = {
        enabled: Boolean((edgeDiscountConfig as any).enabled),
        code: (edgeDiscountConfig as any).code,
        message: (edgeDiscountConfig as any).message,
        percentage: Number((edgeDiscountConfig as any).percentage) || undefined,
        originalPrice: Number((edgeDiscountConfig as any).originalPrice) || undefined,
        finalPrice: Number((edgeDiscountConfig as any).finalPrice) || undefined,
        firstMonthPrice: Number((edgeDiscountConfig as any).firstMonthPrice) || undefined,
        inrPrice: Number((edgeDiscountConfig as any).inrPrice) || undefined,
        isFirstMonthOnly: Boolean((edgeDiscountConfig as any).isFirstMonthOnly),
        startsAt: (edgeDiscountConfig as any).startsAt ? new Date((edgeDiscountConfig as any).startsAt) : undefined,
        expiresAt: (edgeDiscountConfig as any).expiresAt ? new Date((edgeDiscountConfig as any).expiresAt) : undefined,
        buttonText: (edgeDiscountConfig as any).buttonText,
        variant: (edgeDiscountConfig as any).variant || 'default',
        discountAvail: (edgeDiscountConfig as any).discountAvail,
        dev: Boolean((edgeDiscountConfig as any).dev),
        discountId: (edgeDiscountConfig as any).discountId,
        isStudentDiscount: false,
        showPrice: Boolean((edgeDiscountConfig as any).showPrice),
      };

      // If user is a student, apply student discount logic
      if (isStudent) {
        const studentDiscountId = process.env.NEXT_PUBLIC_STUDENT_DISCOUNT_ID_USD;
        if (studentDiscountId) {
          return {
            ...config,
            enabled: true,
            code: 'STUDENT',
            message: '🎓 Student discount applied automatically',
            finalPrice: 5, // Flat $5 price for students
            discountId: studentDiscountId,
            isStudentDiscount: true,
            variant: 'success',
            buttonText: 'Get Student Pro',
            discountAvail: 'Student discount automatically applied',
            showPrice: true,
          };
        }
      }

      const now = new Date();

      // In dev mode or development environment, bypass timing checks
      const isDevMode = config.dev || process.env.NODE_ENV === 'development';

      if (!isDevMode) {
        // Check if discount has not started yet
        if (config.startsAt && config.startsAt > now) {
          return defaultConfig;
        }

        // Check if discount has expired
        if (config.expiresAt && config.expiresAt < now) {
          return defaultConfig;
        }
      }

      // In dev mode, ignore enabled flag; otherwise check if enabled and has required fields
      // Allow force disable with a special flag
      const forceDisabled = config.enabled === false && !isDevMode;
      const shouldShow = forceDisabled
        ? false
        : isDevMode
          ? config.code && config.message
          : config.enabled && config.code && config.message;

      if (shouldShow) {
        return {
          ...config,
          // Add discount ID from environment if available and not already set
          discountId: config.discountId || process.env.NEXT_PUBLIC_DISCOUNT_ID_USD,
        };
      }
    }
  } catch (error) {
    console.warn('Failed to fetch discount config from Edge Config:', error);
  }

  return defaultConfig;
}
