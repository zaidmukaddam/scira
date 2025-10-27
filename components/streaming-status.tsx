'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface StreamingStatusProps {
  isStreaming: boolean;
  isPolling: boolean;
  statusMessage?: string;
}

export const StreamingStatus: React.FC<StreamingStatusProps> = ({
  isStreaming,
  isPolling,
  statusMessage,
}) => {
  // Hidden by default - streaming and polling work silently in the background
  // If you want to show the status badge, change the return statement below to show the UI
  return null;

  // Uncomment below to show the badge:
  /*
  if (!isStreaming && !isPolling) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
      >
        <div className="bg-blue-500/90 backdrop-blur-sm text-white rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-medium">
            {isStreaming
              ? 'Streaming response...'
              : isPolling
                ? 'Fetching updates in background...'
                : statusMessage || 'Processing...'}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
  */
};
