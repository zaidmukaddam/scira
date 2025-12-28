import { get } from '@vercel/edge-config';

export interface DiscountConfig {
  enabled: boolean;
  message?: string;
  finalPrice?: number; // USD price for students
  inrPrice?: number; // INR price for students
  isStudentDiscount: boolean;
  dodoDiscountId?: string; // Dodo Payments discount ID for Indian users
  discountId?: string; // Polar discount ID for non-Indian users
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
 * Fetches student discount configuration
 * Returns enabled config only for verified student emails
 */
export async function getDiscountConfig(userEmail?: string, isIndianUser?: boolean): Promise<DiscountConfig> {
  const defaultConfig: DiscountConfig = {
    enabled: false,
    isStudentDiscount: false,
  };

  // No email provided
  if (!userEmail) {
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
    studentDomains = ['.edu', '.ac.in', '.edu.in'];
  }

  // Check if user is a student
  const isStudent = isStudentEmail(userEmail, studentDomains);

  // If not a student, return default config
  if (!isStudent) {
    return defaultConfig;
  }

  // Student discount available - DodoPayments for all countries
  const dodoStudentDiscountId = process.env.DODO_STUD_DISC_ID;

  if (!dodoStudentDiscountId) {
    return defaultConfig;
  }

  return {
    enabled: true,
    message: '🎓 Student discount applied',
    finalPrice: 5, // $5/month for students (USD)
    inrPrice: 450, // ₹450/month for students (INR)
    isStudentDiscount: true,
    dodoDiscountId: dodoStudentDiscountId,
    discountId: dodoStudentDiscountId, // Use same ID for all
  };
}
