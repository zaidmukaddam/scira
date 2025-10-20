"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface UserAvatarProps {
  username: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getColorFromString = (str: string): string => {
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-orange-500",
    "bg-red-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-cyan-500",
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export function UserAvatar({
  username,
  className,
  size = "md",
}: UserAvatarProps) {
  const initials = getInitials(username);
  const colorClass = getColorFromString(username);

  return (
    <Avatar className={cn(sizeStyles[size], className)}>
      <AvatarFallback className={cn(colorClass, "text-white font-semibold")}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
