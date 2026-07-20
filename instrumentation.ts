export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.AGENTPOND_ENABLED === 'true') {
      const { registerAgentPond } = await import('./lib/agentpond');
      registerAgentPond();
    }

    const { patchGlobalWebStreams } = await import('experimental-fast-webstreams');
    patchGlobalWebStreams();
  }
}
