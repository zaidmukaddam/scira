export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { patchGlobalWebStreams } = await import('experimental-fast-webstreams');
    patchGlobalWebStreams();
  }
}
