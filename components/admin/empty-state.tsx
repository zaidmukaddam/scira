"use client";

import { motion } from "framer-motion";
import { LucideIcon, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8" : "py-12",
        className
      )}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className={cn(
          "rounded-full bg-muted/50 flex items-center justify-center mb-4",
          compact ? "size-16" : "size-20"
        )}
      >
        <Icon
          className={cn(
            "text-muted-foreground",
            compact ? "size-8" : "size-10"
          )}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2 max-w-sm"
      >
        <h3
          className={cn(
            "font-semibold tracking-tight",
            compact ? "text-base" : "text-lg"
          )}
        >
          {title}
        </h3>
        {description && (
          <p
            className={cn(
              "text-muted-foreground",
              compact ? "text-xs" : "text-sm"
            )}
          >
            {description}
          </p>
        )}
      </motion.div>

      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={compact ? "mt-4" : "mt-6"}
        >
          <Button onClick={action.onClick} size={compact ? "sm" : "default"}>
            {action.label}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
