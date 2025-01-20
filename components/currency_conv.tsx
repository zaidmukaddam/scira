import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input"; 
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CurrencyConverterProps {
  toolInvocation: any;
  result: any;
}

export const CurrencyConverter = ({ toolInvocation, result }: CurrencyConverterProps) => {
  const [amount, setAmount] = useState<string>(toolInvocation.args.amount || "1");
  const [error, setError] = useState<string | null>(null);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);
    } else {
      setError("Please enter a valid number");
    }
  };

  const convertedAmount = result ? parseFloat(result.rate) * parseFloat(amount) : null;
  const rate = result ? parseFloat(result.rate) : null;

  return (
    <Card className="w-full bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">
          Convert {toolInvocation.args.from} to {toolInvocation.args.to}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amount Input */}
        <div className="space-y-4">
          <div className="relative">
            <Input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              className="pl-12 h-12 text-lg"
              placeholder="Amount"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-500">
              {toolInvocation.args.from}
            </span>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm text-red-500"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Result Display */}
        <div className="space-y-2">
          {!result ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-neutral-500"
            >
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Getting latest rates...</span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              <div className="text-2xl font-semibold">
                {convertedAmount?.toFixed(2)} {toolInvocation.args.to}
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span>1 {toolInvocation.args.from} = {rate?.toFixed(4)} {toolInvocation.args.to}</span>
                {rate && rate > 1 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};