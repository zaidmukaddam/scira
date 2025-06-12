import { get } from '@vercel/edge-config';

export interface DiscountConfig {
  enabled: boolean;
  code?: string;
  message?: string;
  percentage?: number;
  originalPrice?: number;
  finalPrice?: number;
  firstMonthPrice?: number;
  isFirstMonthOnly?: boolean;
  expiresAt?: Date;
  buttonText?: string;
  variant?: 'default' | 'urgent' | 'success';
}

/**
 * Fetches discount configuration from Edge Config only
 * Returns disabled config if no Edge Config or no discount found
 */
export async function getDiscountConfig(): Promise<DiscountConfig> {
  const defaultConfig: DiscountConfig = {
    enabled: false,
  };

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
        isFirstMonthOnly: Boolean((edgeDiscountConfig as any).isFirstMonthOnly),
        expiresAt: (edgeDiscountConfig as any).expiresAt ? new Date((edgeDiscountConfig as any).expiresAt) : undefined,
        buttonText: (edgeDiscountConfig as any).buttonText,
        variant: (edgeDiscountConfig as any).variant || 'default',
      };
      
      // Check if discount has expired
      if (config.expiresAt && config.expiresAt < new Date()) {
        return defaultConfig;
      }
      
      // Only return if enabled and has required fields
      if (config.enabled && config.code && config.message) {
        return config;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch discount config from Edge Config:', error);
  }

  return defaultConfig;
}

/**
 * Server action to get discount configuration
 */
export async function getDiscountConfigAction(): Promise<DiscountConfig> {
  'use server';
  return await getDiscountConfig();
} 