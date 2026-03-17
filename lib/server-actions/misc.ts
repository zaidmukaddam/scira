'use server';

import { get } from '@vercel/edge-config';

export async function getStudentDomainsAction() {
  try {
    const studentDomainsConfig = await get('student_domains');
    if (studentDomainsConfig && typeof studentDomainsConfig === 'string') {
      const domains = studentDomainsConfig
        .split(',')
        .map((domain) => domain.trim())
        .filter((domain) => domain.length > 0)
        .sort();

      return { success: true, domains, count: domains.length };
    }

    const fallbackDomains = ['.edu', '.ac.in'].sort();
    return { success: true, domains: fallbackDomains, count: fallbackDomains.length, fallback: true };
  } catch (error) {
    console.error('Failed to fetch student domains from Edge Config:', error);

    const fallbackDomains = ['.edu', '.ac.in'].sort();
    return {
      success: false,
      domains: fallbackDomains,
      count: fallbackDomains.length,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
