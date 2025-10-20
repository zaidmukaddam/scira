"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsHeaderProps {
  title: string;
  stats?: Array<{
    label: string;
    value: string | number;
    variant?: "default" | "success" | "warning" | "danger";
  }>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  showDateTime?: boolean;
  className?: string;
}

export function StatsHeader({
  title,
  stats,
  onRefresh,
  isRefreshing = false,
  showDateTime = true,
  className,
}: StatsHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    if (!showDateTime) return;
    
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [showDateTime]);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b transition-all duration-300",
        isSticky ? "shadow-md" : "",
        className
      )}
    >
      <div className="flex flex-col gap-4 p-4 lg:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
              {title}
            </h1>
            
            {showDateTime && (
              <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="size-4" />
                <div className="flex flex-col">
                  <span className="capitalize">{formatDate(currentTime)}</span>
                  <motion.span
                    key={currentTime.toISOString()}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-mono"
                  >
                    {formatTime(currentTime)}
                  </motion.span>
                </div>
              </div>
            )}
          </div>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="gap-2 self-start sm:self-auto"
            >
              <RefreshCw
                className={cn(
                  "size-4",
                  isRefreshing && "animate-spin"
                )}
              />
              Actualiser
            </Button>
          )}
        </div>

        <AnimatePresence>
          {stats && stats.length > 0 && !isSticky && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-wrap gap-2"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Badge
                    variant={stat.variant === "success" ? "green" : "default"}
                    className="px-3 py-1.5 text-xs font-medium"
                  >
                    <span className="text-muted-foreground mr-1">
                      {stat.label}:
                    </span>
                    <span className="font-semibold">{stat.value}</span>
                  </Badge>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
