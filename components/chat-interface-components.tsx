'use client';

/**
 * Pure and Memoized components extracted from chat-interface.tsx
 *
 * Pattern:
 * - Pure* components are the base implementations without memoization
 * - Memoized versions are exported for use in the parent component
 */

import React, { memo } from 'react';

// ============================================================================
// Example Prompt Button Component
// ============================================================================

interface ExamplePromptButtonProps {
  text: string;
  onClick: () => void;
}

function PureExamplePromptButton({ text, onClick }: ExamplePromptButtonProps) {
  return (
    <button
      onClick={onClick}
      className="text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors text-sm text-foreground"
    >
      {text}
    </button>
  );
}

export const ExamplePromptButton = memo(PureExamplePromptButton);
ExamplePromptButton.displayName = 'ExamplePromptButton';

// ============================================================================
// Example Prompts Component
// ============================================================================

interface ExamplePromptsProps {
  selectedModel: string;
  isProUser: boolean;
  onPromptSelect: (prompt: string) => void;
  /** Dynamic suggestions from suggestions service; overrides static prompts when set */
  suggestions?: { text: string; category?: string }[] | null;
  /** When true, show loading skeleton instead of prompts */
  suggestionsLoading?: boolean;
}

// Static per-model prompts — shown immediately while cache hydrates.
// Each set showcases the available tools and model strengths.

// GPT-OSS: broad capability — mix of tool-calling and general queries
const GPT_PROMPTS = [
  "What's the current share price of CBA?",
  'Find Italian restaurants near Sydney CBD',
  'Show me trending movies this week',
  "What's happening in Australian tech news today?",
  'Translate "Good morning, how are you?" into French',
  'Draw a flowchart of the software development lifecycle',
];

// Magpie: Australian-context reasoning model — no tool calling
const MAGPIE_PROMPTS = [
  'Explain step-by-step how Australia\'s federal budget process works',
  'Think through the pros and cons of nuclear energy for Australia',
  'Reason through Australia\'s housing affordability crisis and possible solutions',
  'Write a detailed analysis of the Great Barrier Reef\'s ecological importance',
  "Compare Australia's healthcare system (Medicare) with the UK's NHS",
  'Create a persuasive essay arguing for Australia becoming a republic',
];

// Llama 3.3: general knowledge, coding, writing — no tool calling
const LLAMA_PROMPTS = [
  'Write a Python script to fetch and display live stock prices',
  'Explain the difference between machine learning and deep learning',
  'Help me write a professional email declining a job offer',
  'Summarise the key events of World War II in 300 words',
  'Create a SQL query to find the top 10 customers by revenue',
  'Write a short story set in the Australian outback',
];

// Default fallback prompts — covers major tools
const DEFAULT_PROMPTS = [
  "What's the current share price of BHP?",
  'Show me trending movies this week',
  'Find cafes near Melbourne CBD',
  "What's happening in Australian news today?",
  'Translate "Thank you very much" into Mandarin',
  'Draw a diagram of how the internet works',
];

const SUGGESTION_SKELETON_COUNT = 6;

function PureExamplePrompts({
  selectedModel,
  isProUser,
  onPromptSelect,
  suggestions = null,
  suggestionsLoading = false,
}: ExamplePromptsProps) {
  const staticPrompts = React.useMemo(() => {
    if (selectedModel === 'magpie' || selectedModel === 'scira-magpie') {
      return MAGPIE_PROMPTS;
    }
    if (selectedModel === 'llama-3.3' || selectedModel === 'scira-default') {
      return LLAMA_PROMPTS;
    }
    if (selectedModel === 'gpt-oss-120b' || selectedModel === 'gpt-oss') {
      return GPT_PROMPTS;
    }
    return DEFAULT_PROMPTS;
  }, [selectedModel, isProUser]);

  const prompts = React.useMemo(() => {
    if (suggestions && suggestions.length > 0) {
      return suggestions.map((s) => s.text);
    }
    return staticPrompts;
  }, [suggestions, staticPrompts]);

  return (
    <div className="w-full max-w-[95%] sm:max-w-2xl mx-auto px-2 sm:px-0 pb-8">
      <div className="mt-6 sm:mt-8">
        <p className="text-sm font-normal text-muted-foreground mb-3 text-center">Things you can try</p>
        {suggestionsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: SUGGESTION_SKELETON_COUNT }).map((_, i) => (
              <div
                key={i}
                className="h-[52px] rounded-lg border border-border bg-muted/30 animate-pulse"
                aria-hidden
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {prompts.map((prompt) => (
              <ExamplePromptButton
                key={prompt}
                text={prompt}
                onClick={() => onPromptSelect(prompt)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const ExamplePrompts = memo(PureExamplePrompts);
ExamplePrompts.displayName = 'ExamplePrompts';
