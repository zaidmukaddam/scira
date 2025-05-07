import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { T, Var } from "gt-next";

interface CurrencyConverterProps {
	toolInvocation: any;
	result: any;
}

export const CurrencyConverter = ({
	toolInvocation,
	result,
}: CurrencyConverterProps) => {
	const [amount, setAmount] = useState<string>(
		toolInvocation.args.amount || "1",
	);
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

	const convertedAmount = result
		? parseFloat(result.rate) * parseFloat(amount)
		: null;
	const rate = result ? parseFloat(result.rate) : null;

	return (
		<T id="components.currency_conv.2">
			<Card className="w-full bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
				<CardHeader className="pb-2">
					<CardTitle className="text-lg font-medium">
						Convert <Var>{toolInvocation.args.from}</Var> to{" "}
						<Var>{toolInvocation.args.to}</Var>
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
								<Var>{toolInvocation.args.from}</Var>
							</span>
						</div>

						<AnimatePresence>
							<Var>
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
							</Var>
						</AnimatePresence>
					</div>

					{/* Result Display */}
					<div className="space-y-2">
						<Var>
							{!result ? (
								<T id="components.currency_conv.0">
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										className="flex items-center gap-2 text-neutral-500"
									>
										<Loader2 className="h-5 w-5 animate-spin" />
										<span>Getting latest rates...</span>
									</motion.div>
								</T>
							) : (
								<T id="components.currency_conv.1">
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										className="space-y-2"
									>
										<div className="text-2xl font-semibold">
											<Var>{convertedAmount?.toFixed(2)}</Var>{" "}
											<Var>{toolInvocation.args.to}</Var>
										</div>
										<div className="flex items-center gap-2 text-sm text-neutral-500">
											<span>
												1 <Var>{toolInvocation.args.from}</Var> ={" "}
												<Var>{rate?.toFixed(4)}</Var>{" "}
												<Var>{toolInvocation.args.to}</Var>
											</span>
											<Var>
												{rate && rate > 1 ? (
													<TrendingUp className="h-4 w-4 text-green-500" />
												) : (
													<TrendingDown className="h-4 w-4 text-red-500" />
												)}
											</Var>
										</div>
									</motion.div>
								</T>
							)}
						</Var>
					</div>
				</CardContent>
			</Card>
		</T>
	);
};
