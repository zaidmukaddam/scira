interface BetterAllOptions {
  debug?: boolean;
}

function isBetterAllDebugEnabled() {
  if (process.env.BETTER_ALL_DEBUG === 'true') return true;
  return process.env.NODE_ENV === 'development';
}

const betterAllOptions: BetterAllOptions | undefined =
  isBetterAllDebugEnabled() ? { debug: true } : undefined;

export function getBetterAllOptions() {
  return betterAllOptions;
}
