import { NextRequest, NextResponse } from 'next/server';
import {
  getOrCreateSandbox,
  writeFileToSandbox,
  ensureHttpServer,
  getPreviewUrl,
  executeInSandbox,
  deleteSandbox,
  runCommandInSandbox,
} from '@/lib/sandbox-manager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, chatId } = body;

    if (!chatId || typeof chatId !== 'string') {
      return NextResponse.json({ error: 'chatId required' }, { status: 400 });
    }

    switch (action) {
      case 'create': {
        const sandbox = await getOrCreateSandbox(chatId);
        return NextResponse.json({ sandboxId: sandbox.id, state: sandbox.state });
      }

      case 'execute': {
        const { code } = body;
        if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 });

        await getOrCreateSandbox(chatId);
        const result = await executeInSandbox(chatId, code);
        return NextResponse.json(result);
      }

      case 'write-and-preview': {
        const { files } = body as { files: { path: string; content: string }[] };
        if (!files?.length) {
          return NextResponse.json({ error: 'files required' }, { status: 400 });
        }

        await getOrCreateSandbox(chatId);

        for (const file of files) {
          await writeFileToSandbox(chatId, file.path, file.content);
        }

        await ensureHttpServer(chatId);

        await new Promise((r) => setTimeout(r, 1000));

        const preview = await getPreviewUrl(chatId);
        if (!preview) {
          return NextResponse.json({ error: 'Failed to get preview URL' }, { status: 500 });
        }

        return NextResponse.json({ previewUrl: preview.url, token: preview.token });
      }

      case 'run-command': {
        const { command, timeout } = body;
        if (!command) return NextResponse.json({ error: 'command required' }, { status: 400 });

        await getOrCreateSandbox(chatId);
        const output = await runCommandInSandbox(chatId, command, timeout || 60);
        return NextResponse.json({ output });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err) {
    console.error('[sandbox API]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');
    if (!chatId) {
      return NextResponse.json({ error: 'chatId required' }, { status: 400 });
    }

    await deleteSandbox(chatId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[sandbox DELETE]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
