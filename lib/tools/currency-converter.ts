import { tool } from 'ai';
import { z } from 'zod';
import { Daytona } from '@daytonaio/sdk';
import { serverEnv } from '@/env/server';
import { SNAPSHOT_NAME } from '@/lib/constants';

export const currencyConverterTool = tool({
  description: 'Convert currency from one to another using yfinance',
  parameters: z.object({
    from: z.string().describe('The source currency code.'),
    to: z.string().describe('The target currency code.'),
    amount: z.number().describe('The amount to convert. Default is 1.'),
  }),
  execute: async ({ from, to, amount }: { from: string; to: string; amount: number }) => {
    const code = `
import yfinance as yf

# Get exchange rates for both directions
from_currency = '${from}'
to_currency = '${to}'
amount = ${amount}

# Forward conversion (from -> to)
currency_pair_forward = f'{from_currency}{to_currency}=X'
data_forward = yf.Ticker(currency_pair_forward).history(period='1d')
rate_forward = data_forward['Close'].iloc[-1]
converted_amount = rate_forward * amount

# Reverse conversion (to -> from)
currency_pair_reverse = f'{to_currency}{from_currency}=X'
data_reverse = yf.Ticker(currency_pair_reverse).history(period='1d')
rate_reverse = data_reverse['Close'].iloc[-1]

print(f"Forward rate: {rate_forward}")
print(f"Reverse rate: {rate_reverse}")
print(f"Converted amount: {converted_amount}")
`;
    console.log('Currency pair:', from, to);

    const daytona = new Daytona({
      apiKey: serverEnv.DAYTONA_API_KEY,
      target: 'us',
    });
    const sandbox = await daytona.create(
      {
        snapshot: SNAPSHOT_NAME,
      }
    );

    const execution = await sandbox.process.codeRun(code);
    let message = '';

    if (execution.result === execution.artifacts?.stdout) {
      message += execution.result;
    } else if (execution.result && execution.result !== execution.artifacts?.stdout) {
      message += execution.result;
    } else if (execution.artifacts?.stdout && execution.artifacts?.stdout !== execution.result) {
      message += execution.artifacts.stdout;
    } else {
      message += execution.result;
    }

    await sandbox.delete();

    const lines = message.split('\n');
    let forwardRate = null;
    let reverseRate = null;
    let convertedAmount = null;

    for (const line of lines) {
      if (line.includes('Forward rate:')) {
        forwardRate = parseFloat(line.split(': ')[1]);
      }
      if (line.includes('Reverse rate:')) {
        reverseRate = parseFloat(line.split(': ')[1]);
      }
      if (line.includes('Converted amount:')) {
        convertedAmount = parseFloat(line.split(': ')[1]);
      }
    }

    return {
      rate: convertedAmount || message.trim(),
      forwardRate: forwardRate,
      reverseRate: reverseRate,
      fromCurrency: from,
      toCurrency: to,
      amount: amount,
      convertedAmount: convertedAmount,
    };
  },
}); 