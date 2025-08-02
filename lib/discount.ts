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
        inrPrice: Number((edgeDiscountConfig as any).inrPrice) || undefined,
        isFirstMonthOnly: Boolean((edgeDiscountConfig as any).isFirstMonthOnly),
        startsAt: (edgeDiscountConfig as any).startsAt ? new Date((edgeDiscountConfig as any).startsAt) : undefined,
        expiresAt: (edgeDiscountConfig as any).expiresAt ? new Date((edgeDiscountConfig as any).expiresAt) : undefined,
        buttonText: (edgeDiscountConfig as any).buttonText,
        variant: (edgeDiscountConfig as any).variant || 'default',
        discountAvail: (edgeDiscountConfig as any).discountAvail,
        dev: Boolean((edgeDiscountConfig as any).dev),
      };

      const now = new Date();

      // In dev mode or development environment, bypass timing checks
      if (!config.dev && process.env.NODE_ENV !== 'development') {
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
      const isDevMode = config.dev || process.env.NODE_ENV === 'development';
      const shouldShow = isDevMode ? config.code && config.message : config.enabled && config.code && config.message;

      if (shouldShow) {
        return config;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch discount config from Edge Config:', error);
  }

  return defaultConfig;
}
