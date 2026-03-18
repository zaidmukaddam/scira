import { PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { and, eq, sql } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '@/lib/r2';
import { db } from '@/lib/db';
import { chat, message } from '@/lib/db/schema';
import { unauthenticatedRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { all } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';
import { del as blobDel, head as blobHead } from '@vercel/blob';

// Image types (5MB limit)
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

// Document types (50MB limit)
const DOCUMENT_TYPES = [
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];

const VALID_TYPES = [...IMAGE_TYPES, ...DOCUMENT_TYPES];

// File size limits
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB for images
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB for documents

function isImageType(contentType: string): boolean {
  return IMAGE_TYPES.includes(contentType);
}

function getMaxSizeForType(contentType: string): number {
  return isImageType(contentType) ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;
}

// Request validation schema for getting presigned URL
const UploadRequestSchema = z
  .object({
    filename: z.string().min(1),
    contentType: z.string().refine((type) => VALID_TYPES.includes(type), {
      message: 'File type should be JPEG, PNG, GIF, PDF, CSV, DOCX, or XLSX',
    }),
    size: z.number(),
  })
  .superRefine((data, ctx) => {
    const maxSize = getMaxSizeForType(data.contentType);
    if (data.size > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      const fileType = isImageType(data.contentType) ? 'Image' : 'Document';
      ctx.addIssue({
        code: 'custom',
        message: `${fileType} size should be less than ${maxMB}MB`,
        path: ['size'],
      });
    }
  });

// Delete request validation
const DeleteRequestSchema = z.object({
  url: z.string().url(),
});

// Only allow alphanumeric + a few safe chars as file extension to prevent key injection
function sanitizeExtension(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 10);
  return cleaned || 'bin';
}

// Compare origins to prevent prefix-bypass attacks (e.g. https://cdn.x.com.evil.com)
function isOwnR2Url(url: string): boolean {
  try {
    const target = new URL(url);
    const base = new URL(R2_PUBLIC_URL);
    return target.origin === base.origin;
  } catch {
    return false;
  }
}

// Safe integer parsing with bounds
function parseLimit(raw: string | null, defaultVal: number, max: number): number {
  const n = parseInt(raw ?? String(defaultVal), 10);
  if (!Number.isFinite(n) || n < 1) return defaultVal;
  return Math.min(n, max);
}

interface UploadedFile {
  key: string;
  url: string;
  size: number;
  lastModified: string | null;
  filename: string;
  mediaType: string | null;
  chatId: string | null;
  source: 'r2' | 'legacy' | 'vercel-blob';
}

const VERCEL_BLOB_PATTERN = '.public.blob.vercel-storage.com';

function isVercelBlobUrl(url: string): boolean {
  return url.includes(VERCEL_BLOB_PATTERN);
}

// Flat row returned by the LATERAL jsonb query
type DbFileRow = {
  url: string;
  name: string | null;
  mediaType: string | null;
  chatId: string;
  [key: string]: unknown;
};

export async function GET(request: NextRequest) {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    session = await auth.api.getSession({ headers: request.headers });
  } catch (error) {
    console.warn('Error checking authentication:', error);
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const prefix = `scira/users/${userId}/`;

  const { searchParams } = new URL(request.url);
  const continuationToken = searchParams.get('cursor') ?? undefined;
  const maxKeys = parseLimit(searchParams.get('limit'), 50, 200);

  // Use better-all's `all()` with explicit this.$ dependencies so the library
  // can automatically maximise parallelism across the four tasks.
  // Errors in r2List / dbQuery are caught internally so dependent tasks always
  // receive a safe fallback — the overall `all()` never rejects.
  const { r2Res, r2Files, legacyFiles } = await all({
    // ── Independent sources ── start immediately in parallel ──────────────
    async r2List() {
      try {
        return await r2Client.send(new ListObjectsV2Command({
          Bucket: R2_BUCKET_NAME,
          Prefix: prefix,
          MaxKeys: maxKeys,
          ContinuationToken: continuationToken,
        }));
      } catch (e) {
        console.error('R2 list error:', e);
        return null;
      }
    },

    async dbQuery() {
      try {
        if (continuationToken) return [] as DbFileRow[];
        return await db.execute<DbFileRow>(sql`
            SELECT DISTINCT ON (elem->>'url')
              m.chat_id          AS "chatId",
              elem->>'url'       AS url,
              elem->>'name'      AS name,
              elem->>'mediaType' AS "mediaType"
            FROM message m
            JOIN chat c ON m.chat_id = c.id
            CROSS JOIN LATERAL jsonb_array_elements(m.parts::jsonb) AS elem
            WHERE c."userId"      = ${userId}
              AND m.role          = 'user'
              AND elem->>'type'   = 'file'
              AND (
              elem->>'url' LIKE ${R2_PUBLIC_URL + '%'}
              OR elem->>'url' LIKE ${'%' + VERCEL_BLOB_PATTERN + '%'}
            )
            ORDER BY elem->>'url', m.created_at DESC
            LIMIT 200
          `).then((r) => r.rows);
      } catch (e) {
        console.error('DB file query error:', e);
        return [] as DbFileRow[];
      }
    },

    // ── r2Res ── alias so callers can read pagination metadata ────────────
    async r2Res() {
      return await this.$.r2List;
    },

    // ── r2Files ── waits for r2List + dbQuery to enrich with metadata ──────
    async r2Files() {
      const r2Result = await this.$.r2List;
      const dbRows   = await this.$.dbQuery;

      const dbMeta = new Map<string, DbFileRow>();
      for (const row of dbRows) dbMeta.set(row.url, row);

      return (r2Result?.Contents ?? []).map((obj) => {
        const url  = `${R2_PUBLIC_URL}/${obj.Key}`;
        const meta = dbMeta.get(url);
        return {
          key:          obj.Key!,
          url,
          size:         obj.Size ?? 0,
          lastModified: obj.LastModified?.toISOString() ?? null,
          filename:     meta?.name || (obj.Key!.split('/').pop() ?? obj.Key!),
          mediaType:    meta?.mediaType ?? null,
          chatId:       meta?.chatId ?? null,
          source:       'r2' as const,
        } satisfies UploadedFile;
      });
    },

    // ── legacyFiles ── waits for r2Files + dbQuery, then fires HeadObjects ─
    async legacyFiles() {
      const r2Built    = await this.$.r2Files;
      const dbRows     = await this.$.dbQuery;

      const r2Urls     = new Set(r2Built.map((f) => f.url));
      const legacyRows = dbRows.filter((r) => !r2Urls.has(r.url));

      const r2LegacyRows   = legacyRows.filter((r) => !isVercelBlobUrl(r.url)).slice(0, 20);
      const blobLegacyRows = legacyRows.filter((r) => isVercelBlobUrl(r.url)).slice(0, 20);

      // Fetch metadata for both storage types in parallel
      const metaMap = Object.keys({ ...r2LegacyRows, ...blobLegacyRows }).length > 0
        ? await all(
            {
              ...Object.fromEntries(
                r2LegacyRows.map((r, i) => [
                  `r2:${i}`,
                  async () => r2Client.send(new HeadObjectCommand({
                    Bucket: R2_BUCKET_NAME,
                    Key: new URL(r.url).pathname.slice(1),
                  })).catch(() => null),
                ]),
              ),
              ...Object.fromEntries(
                blobLegacyRows.map((r, i) => [
                  `blob:${i}`,
                  async () => blobHead(r.url).catch(() => null),
                ]),
              ),
            },
            getBetterAllOptions(),
          )
        : {} as Record<string, null>;

      return legacyRows.map((r) => {
        const isBlob = isVercelBlobUrl(r.url);
        let size = 0;
        let lastModified: string | null = null;

        if (isBlob) {
          const idx  = blobLegacyRows.findIndex((lr) => lr.url === r.url);
          const meta = idx >= 0 ? metaMap[`blob:${idx}`] : null;
          size         = (meta as any)?.size ?? 0;
          lastModified = (meta as any)?.uploadedAt ? new Date((meta as any).uploadedAt).toISOString() : null;
        } else {
          const idx  = r2LegacyRows.findIndex((lr) => lr.url === r.url);
          const meta = idx >= 0 ? metaMap[`r2:${idx}`] : null;
          size         = (meta as any)?.ContentLength ?? 0;
          lastModified = (meta as any)?.LastModified ? new Date((meta as any).LastModified).toISOString() : null;
        }

        const key = isBlob ? r.url : r.url.replace(`${R2_PUBLIC_URL}/`, '');
        return {
          key,
          url:          r.url,
          size,
          lastModified,
          filename:     r.name ?? key.split('/').pop() ?? key,
          mediaType:    r.mediaType ?? null,
          chatId:       r.chatId,
          source:       (isBlob ? 'vercel-blob' : 'legacy') as UploadedFile['source'],
        } satisfies UploadedFile;
      });
    },
  }, getBetterAllOptions());

  const nextCursor  = r2Res?.NextContinuationToken ?? null;
  const isTruncated = r2Res?.IsTruncated ?? false;
  const files       = [...r2Files, ...legacyFiles];

  return NextResponse.json(
    { files, nextCursor, isTruncated },
    { headers: { 'Cache-Control': 'private, max-age=0, stale-while-revalidate=60' } },
  );
}

export async function POST(request: NextRequest) {
  // Check for authentication but don't require it
  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    session = await auth.api.getSession({
      headers: request.headers,
    });
  } catch (error) {
    console.warn('Error checking authentication:', error);
  }

  const isAuthenticated = !!session?.user?.id;

  try {
    const body = await request.json();
    const validated = UploadRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const { filename, contentType, size } = validated.data;

    // Rate-limit unauthenticated uploads by IP
    if (!isAuthenticated) {
      const identifier = getClientIdentifier(request);
      const { success } = await unauthenticatedRateLimit.limit(identifier);
      if (!success) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
    }

    // Sanitize extension to prevent path injection in the R2 key
    const rawExt = filename.split('.').pop() ?? '';
    const ext = sanitizeExtension(rawExt);

    const key = isAuthenticated
      ? `scira/users/${session!.user.id}/${nanoid()}.${ext}`
      : `scira/public-${nanoid()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      // Store owner so individual files can be attributed even if the key format changes
      Metadata: isAuthenticated ? { 'user-id': session!.user.id } : undefined,
    });

    const presignedUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600, // 1 hour
    });

    // Construct the final public URL
    const publicUrl = `${R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({
      presignedUrl,
      url: publicUrl,
      key,
      authenticated: isAuthenticated,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    session = await auth.api.getSession({ headers: request.headers });
  } catch (error) {
    console.warn('Error checking authentication:', error);
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const validated = DeleteRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: 'Invalid URL provided' }, { status: 400 });
    }

    const { url } = validated.data;

    const isBlob = isVercelBlobUrl(url);

    // Verify URL belongs to one of our storage backends
    if (!isBlob && !isOwnR2Url(url)) {
      return NextResponse.json({ error: 'Invalid storage URL' }, { status: 400 });
    }

    // Ownership check via DB for all non-new-format files
    const r2Key       = isBlob ? '' : new URL(url).pathname.slice(1);
    const isOwnR2Key  = !isBlob && r2Key.startsWith(`scira/users/${userId}/`);

    if (!isOwnR2Key) {
      const rows = await db
        .select({ parts: message.parts })
        .from(message)
        .innerJoin(chat, eq(message.chatId, chat.id))
        .where(
          and(
            eq(chat.userId, userId),
            eq(message.role, 'user'),
            sql`${message.parts}::text LIKE ${'%' + url + '%'}`,
          ),
        )
        .limit(1);

      if (rows.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (isBlob) {
      await blobDel(url);
    } else {
      await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: r2Key }));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
