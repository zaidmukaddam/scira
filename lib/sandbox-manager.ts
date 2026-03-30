import 'server-only';
import { Daytona } from '@daytonaio/sdk';
import { serverEnv } from '@/env/server';
import { SNAPSHOT_NAME } from '@/lib/constants';

type SandboxInstance = Awaited<ReturnType<Daytona['create']>>;

interface ManagedSandbox {
  sandbox: SandboxInstance;
  createdAt: number;
  httpServerPort: number | null;
}

const sandboxes = new Map<string, ManagedSandbox>();

const DEFAULT_PREVIEW_PORT = 3000;
const AUTO_STOP_MINUTES = 15;
const AUTO_DELETE_MINUTES = 30;

function getDaytona(): Daytona {
  return new Daytona({
    apiKey: serverEnv.DAYTONA_API_KEY,
    target: 'us',
  });
}

export async function getOrCreateSandbox(chatId: string): Promise<SandboxInstance> {
  const existing = sandboxes.get(chatId);
  if (existing) {
    try {
      await existing.sandbox.refreshData();
      if (existing.sandbox.state === 'started') {
        return existing.sandbox;
      }
      if (existing.sandbox.state === 'stopped') {
        await existing.sandbox.start(60);
        return existing.sandbox;
      }
    } catch {
      sandboxes.delete(chatId);
    }
  }

  const daytona = getDaytona();
  const sandbox = await daytona.create({
    snapshot: SNAPSHOT_NAME,
    public: true,
    autoStopInterval: AUTO_STOP_MINUTES,
    autoDeleteInterval: AUTO_DELETE_MINUTES,
  });

  sandboxes.set(chatId, {
    sandbox,
    createdAt: Date.now(),
    httpServerPort: null,
  });

  return sandbox;
}

export async function ensureHttpServer(chatId: string): Promise<void> {
  const managed = sandboxes.get(chatId);
  if (!managed || managed.httpServerPort === DEFAULT_PREVIEW_PORT) return;

  try {
    await managed.sandbox.process.executeCommand(
      `cd /home/daytona/preview && python3 -m http.server ${DEFAULT_PREVIEW_PORT} &`,
    );
  } catch {
    await managed.sandbox.process.executeCommand(
      `mkdir -p /home/daytona/preview && cd /home/daytona/preview && python3 -m http.server ${DEFAULT_PREVIEW_PORT} &`,
    );
  }

  managed.httpServerPort = DEFAULT_PREVIEW_PORT;
}

/**
 * Get a public Daytona preview URL for any port running inside the sandbox.
 * Daytona tunnels any TCP port to a public HTTPS URL automatically.
 */
export async function getPreviewUrl(
  chatId: string,
  port: number = DEFAULT_PREVIEW_PORT,
): Promise<{ url: string; token: string } | null> {
  const managed = sandboxes.get(chatId);
  if (!managed) return null;

  try {
    const preview = await managed.sandbox.getPreviewLink(port);
    return { url: preview.url, token: preview.token ?? '' };
  } catch {
    return null;
  }
}

/**
 * Upload arbitrary text content directly to a path in the sandbox using the
 * Daytona filesystem API (reliable, no shell escaping issues).
 */
export async function uploadFileToSandbox(
  chatId: string,
  remotePath: string,
  content: string,
): Promise<void> {
  const managed = sandboxes.get(chatId);
  if (!managed) throw new Error('No sandbox for chat ' + chatId);

  // Ensure parent directory exists
  const dir = remotePath.substring(0, remotePath.lastIndexOf('/'));
  if (dir) {
    await managed.sandbox.process.executeCommand(`mkdir -p ${dir}`);
  }

  await managed.sandbox.fs.uploadFile(
    Buffer.from(content, 'utf-8'),
    remotePath,
  );
}

/**
 * Run a long-running server command in the background using nohup so it
 * survives after the parent shell exits.  Logs are written to /tmp/scx_<port>.log.
 * Returns the PID of the background process.
 */
export async function runServerBackground(
  chatId: string,
  command: string,
  port: number,
  cwd?: string,
): Promise<string> {
  const managed = sandboxes.get(chatId);
  if (!managed) throw new Error('No sandbox for chat ' + chatId);

  const logFile = `/tmp/scx_server_${port}.log`;
  // nohup keeps the process alive after the shell exits; setsid makes it a
  // session leader so it won't receive SIGHUP.
  const bgCommand = `nohup bash -c ${JSON.stringify(command)} > ${logFile} 2>&1 & echo $!`;
  const result = await managed.sandbox.process.executeCommand(bgCommand, cwd);
  return (result.result ?? '').trim();
}

/**
 * Wait for a TCP port to become reachable inside the sandbox.
 * Polls every 500 ms up to `timeoutMs` (default 15 s).
 * Returns true if the port opened, false on timeout.
 */
export async function waitForPort(
  chatId: string,
  port: number,
  timeoutMs = 15000,
): Promise<boolean> {
  const managed = sandboxes.get(chatId);
  if (!managed) return false;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      // `nc -z` exits 0 if the port is open, non-zero otherwise
      const result = await managed.sandbox.process.executeCommand(
        `nc -z -w1 localhost ${port} && echo ok || echo fail`,
      );
      if ((result.result ?? '').includes('ok')) return true;
    } catch {
      // ignore transient errors — just keep polling
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

/**
 * Read the last N lines of a log file from the sandbox (for error reporting).
 */
export async function readSandboxLog(
  chatId: string,
  logPath: string,
  lines = 30,
): Promise<string> {
  const managed = sandboxes.get(chatId);
  if (!managed) return '';

  try {
    const result = await managed.sandbox.process.executeCommand(`tail -n ${lines} ${logPath} 2>/dev/null || true`);
    return result.result ?? '';
  } catch {
    return '';
  }
}

export async function writeFileToSandbox(
  chatId: string,
  filePath: string,
  content: string,
): Promise<void> {
  const managed = sandboxes.get(chatId);
  if (!managed) throw new Error('No sandbox for chat ' + chatId);

  const fullPath = `/home/daytona/preview/${filePath}`;
  const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));

  await managed.sandbox.process.executeCommand(`mkdir -p ${dir}`);
  await managed.sandbox.fs.uploadFile(
    Buffer.from(content, 'utf-8'),
    fullPath,
  );
}

export async function executeInSandbox(
  chatId: string,
  code: string,
): Promise<{ stdout: string; result: string }> {
  const managed = sandboxes.get(chatId);
  if (!managed) throw new Error('No sandbox for chat ' + chatId);

  const execution = await managed.sandbox.process.codeRun(code);

  return {
    stdout: execution.artifacts?.stdout ?? '',
    result: execution.result ?? '',
  };
}

export async function runCommandInSandbox(
  chatId: string,
  command: string,
  cwd?: string,
): Promise<string> {
  const managed = sandboxes.get(chatId);
  if (!managed) throw new Error('No sandbox for chat ' + chatId);

  const result = await managed.sandbox.process.executeCommand(command, cwd);
  return result.result ?? '';
}

export async function deleteSandbox(chatId: string): Promise<void> {
  const managed = sandboxes.get(chatId);
  if (!managed) return;

  try {
    await managed.sandbox.delete();
  } catch {
    // sandbox may already be deleted
  }

  sandboxes.delete(chatId);
}

export function hasSandbox(chatId: string): boolean {
  return sandboxes.has(chatId);
}
