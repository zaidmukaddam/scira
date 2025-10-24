import { tool } from 'ai';
import { z } from 'zod';
import { Valyu } from 'valyu-js';
import { serverEnv } from '@/env/server';

export const currencyConverterTool = tool({
  description: 'Convert currency amounts using public FX rates',
  inputSchema: z.object({ from: z.string(), to: z.string(), amount: z.number() }),
  execute: async ({ from, to, amount }: { from: string; to: string; amount: number }) => {
    const safeFrom = from.toUpperCase();
    const safeTo = to.toUpperCase();

    if (!Number.isFinite(amount) || amount < 0) {
      return { error: 'invalid_amount' };
    }

    if (safeFrom === safeTo) {
      return {
        amount,
        from: safeFrom,
        to: safeTo,
        forwardRate: 1,
        reverseRate: 1,
        convertedAmount: amount,
        provider: 'identity',
      };
    }

    const fetchExchangerateHost = async () => {
      const url = `https://api.exchangerate.host/convert?from=${encodeURIComponent(safeFrom)}&to=${encodeURIComponent(safeTo)}&amount=${encodeURIComponent(amount)}`;
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error('exchangerate_host_error');
      const data = await res.json();
      const rate = data?.info?.rate;
      const result = data?.result;
      if (!rate || !Number.isFinite(rate) || !Number.isFinite(result)) throw new Error('exchangerate_host_invalid');
      return { rate: Number(rate), converted: Number(result), date: data?.date };
    };

    const fetchFrankfurter = async () => {
      const url = `https://api.frankfurter.app/latest?amount=${encodeURIComponent(amount)}&from=${encodeURIComponent(safeFrom)}&to=${encodeURIComponent(safeTo)}`;
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error('frankfurter_error');
      const data = await res.json();
      const converted = data?.rates?.[safeTo];
      if (!Number.isFinite(converted)) throw new Error('frankfurter_invalid');
      const rate = Number(converted) / amount;
      return { rate, converted: Number(converted), date: data?.date };
    };

    try {
      const { rate, converted, date } = await fetchExchangerateHost();
      return {
        amount,
        from: safeFrom,
        to: safeTo,
        forwardRate: rate,
        reverseRate: 1 / rate,
        convertedAmount: converted,
        provider: 'exchangerate.host',
        date,
      };
    } catch (_) {
      try {
        const { rate, converted, date } = await fetchFrankfurter();
        return {
          amount,
          from: safeFrom,
          to: safeTo,
          forwardRate: rate,
          reverseRate: 1 / rate,
          convertedAmount: converted,
          provider: 'frankfurter.app',
          date,
        };
      } catch (e) {
        return { disabled: false, error: 'service_unavailable' };
      }
    }
  },
});
