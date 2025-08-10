import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CurrencyConverterProps {
  toolInvocation: any;
  result: any;
}

export const CurrencyConverter = ({ toolInvocation, result }: CurrencyConverterProps) => {
  const [amount, setAmount] = useState<string>(toolInvocation.input.amount || '1');
  const [error, setError] = useState<string | null>(null);
  const [isSwapped, setIsSwapped] = useState(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);
    } else {
      setError('Please enter a valid number');
    }
  };

  const handleSwap = () => {
    setIsSwapped(!isSwapped);
  };

  const fromCurrency = isSwapped ? toolInvocation.input.to : toolInvocation.input.from;
  const toCurrency = isSwapped ? toolInvocation.input.from : toolInvocation.input.to;

  const convertedAmount = result?.convertedAmount
    ? isSwapped
      ? parseFloat(amount) / result.forwardRate
      : (result.convertedAmount / result.amount) * parseFloat(amount)
    : null;

  const exchangeRate = isSwapped ? result?.reverseRate : result?.forwardRate;

  return (
    <div className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 sm:p-4">
      {/* Currency Converter - Responsive Layout */}
      <div className="flex items-center gap-3 sm:flex-row">
        {/* Mobile: Side Layout, Desktop: Horizontal Layout */}

        {/* Currency Inputs Container - Mobile Stacked */}
        <div className="flex-1 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
          {/* From Currency Input */}
          <div className="relative sm:flex-1">
            <Input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              className="h-11 sm:h-12 text-base pl-12 sm:pl-14 pr-3 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 focus:bg-white dark:focus:bg-neutral-950 transition-colors font-medium"
              placeholder="0"
            />
            <div className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2">
              <span className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                {fromCurrency}
              </span>
            </div>
          </div>

          {/* Swap Button - Desktop Only (Hidden on Mobile) */}
          <div className="hidden sm:flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSwap}
              className="h-8 w-8 p-0 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-neutral-500" />
            </Button>
          </div>

          {/* To Currency Output */}
          <div className="h-11 sm:h-12 px-2.5 sm:px-3 border border-neutral-200 dark:border-neutral-800 rounded-md bg-neutral-50 dark:bg-neutral-900 flex items-center sm:flex-1">
            <span className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400 mr-2 sm:mr-3 shrink-0">
              {toCurrency}
            </span>
            {!result ? (
              <div className="flex items-center gap-1.5 text-neutral-500 min-w-0">
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                <span className="text-sm">...</span>
              </div>
            ) : (
              <span className="text-sm sm:text-base font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {convertedAmount?.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}
              </span>
            )}
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-red-500 sm:absolute sm:mt-1"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Swap Button - Mobile Only (Hidden on Desktop) */}
        <div className="flex items-center sm:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSwap}
            className="h-10 w-10 p-0 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors touch-manipulation"
          >
            <ArrowUpDown className="h-4 w-4 text-neutral-500" />
          </Button>
        </div>
      </div>

      {/* Exchange Rate - Mobile Friendly */}
      {result && exchangeRate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-xs text-neutral-500 dark:text-neutral-400 text-center px-2"
        >
          <span className="inline-block">
            1 {fromCurrency} ={' '}
            {exchangeRate?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })}{' '}
            {toCurrency}
          </span>
        </motion.div>
      )}
    </div>
  );
};
