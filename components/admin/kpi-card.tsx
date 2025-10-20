"use client";

import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  variant?: "default" | "success" | "warning" | "danger";
  isLoading?: boolean;
  tooltip?: string;
  className?: string;
}

const variantStyles = {
  default: {
    gradient: "from-primary/10 to-primary/5",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  success: {
    gradient: "from-green-500/10 to-green-500/5",
    iconBg: "bg-green-500/10",
    iconColor: "text-green-600 dark:text-green-500",
  },
  warning: {
    gradient: "from-amber-500/10 to-amber-500/5",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-500",
  },
  danger: {
    gradient: "from-red-500/10 to-red-500/5",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-600 dark:text-red-500",
  },
};

export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = "default",
  isLoading = false,
  tooltip,
  className,
}: KpiCardProps) {
  const styles = variantStyles[variant];

  if (isLoading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="size-12 rounded-lg" />
        </div>
        <Skeleton className="h-3 w-20 mt-3" />
      </Card>
    );
  }

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={cn(
          "p-6 relative overflow-hidden transition-all duration-300",
          "hover:shadow-md cursor-pointer group",
          className
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
            styles.gradient
          )}
        />
        
        <div className="relative flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <motion.p
              className="text-3xl font-bold tracking-tight"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              {value}
            </motion.p>
          </div>

          <motion.div
            className={cn(
              "size-12 rounded-lg flex items-center justify-center",
              styles.iconBg
            )}
            whileHover={{ rotate: 5, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Icon className={cn("size-6", styles.iconColor)} />
          </motion.div>
        </div>

        {trend && (
          <motion.div
            className="flex items-center gap-1 mt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="size-4 text-green-600 dark:text-green-500" />
            ) : (
              <TrendingDown className="size-4 text-red-600 dark:text-red-500" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                trend.direction === "up"
                  ? "text-green-600 dark:text-green-500"
                  : "text-red-600 dark:text-red-500"
              )}
            >
              {trend.value > 0 ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">
              vs période précédente
            </span>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}
