/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og';
import { getChatWithUserById, getMessagesByChatId } from '@/lib/db/queries';
import fs from 'fs';
import path from 'path';
import { SciraLogo } from '@/components/logos/scira-logo';

interface TextPart {
  type: 'text';
  text: string;
}

interface MessagePart {
  type: string;
  text?: string;
}

// Extract text content from message parts
function getTextFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) return '';
  const textPart = parts.find((p: MessagePart) => p.type === 'text') as TextPart | undefined;
  return textPart?.text || '';
}

// Strip markdown formatting for plain text display
function stripMarkdown(text: string): string {
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/___(.+?)___/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove file references (e.g., filename.pdf, document.docx)
    .replace(/\s*\S+\.(pdf|docx?|xlsx?|csv|txt|png|jpg|jpeg|gif)\b/gi, '')
    // Remove citation-like patterns
    .replace(/\[\d+\]/g, '')
    .replace(/\(\d+\)/g, '')
    // Clean up extra whitespace
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{2,}/g, ' ')
    .trim();
}

// Truncate text with ellipsis
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

// Theme colors (from globals.css dark theme)
// --background: oklch(0.1776 0 0) → #141414
// --foreground: oklch(0.9491 0 0) → #f0f0f0
// --accent: oklch(0.285 0 0) → #2a2a2a (user message bubble uses bg-accent/80)
// --muted-foreground: oklch(0.7699 0 0) → #b5b5b5
const colors = {
  background: '#141414',
  foreground: '#f0f0f0',
  mutedForeground: '#b5b5b5',
  accent: '#2a2a2a', // user message bubble
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    const chatWithUser = await getChatWithUserById({ id });

    // Load fonts
    const geistFontPath = path.join(process.cwd(), 'app/api/og/chat/[id]/fonts', 'Geist-Regular.ttf');
    const interFontPath = path.join(process.cwd(), 'app/api/og/chat/[id]/fonts', 'Inter-Regular.ttf');
    const beVietnamProFontPath = path.join(process.cwd(), 'app/api/og/chat/[id]/fonts', 'BeVietnamPro-Medium.ttf');
    const geistFontData = await fs.promises.readFile(geistFontPath);
    const interFontData = await fs.promises.readFile(interFontPath);
    const beVietnamProFontData = await fs.promises.readFile(beVietnamProFontPath);

    const fonts = [
      { name: 'Geist', data: geistFontData, style: 'normal' as const },
      { name: 'Inter', data: interFontData, style: 'normal' as const },
      { name: 'BeVietnamPro', data: beVietnamProFontData, style: 'normal' as const },
    ];

    // Default OG image for non-public or missing chats
    if (!chatWithUser || chatWithUser.visibility !== 'public') {
      return new ImageResponse(
        (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%',
              backgroundColor: colors.background,
              fontFamily: 'Geist',
            }}
          >
            <SciraLogo width={72} height={72} color={colors.foreground} />
            <div
              style={{
                fontSize: 48,
                color: colors.foreground,
                letterSpacing: '-0.02em',
                fontFamily: 'BeVietnamPro',
                fontWeight: 600,
                marginTop: 24,
              }}
            >
              Scira
            </div>
            <div
              style={{
                fontSize: 22,
                color: colors.mutedForeground,
                fontFamily: 'Inter',
                fontWeight: 400,
                marginTop: 12,
              }}
            >
              Minimalistic AI Search Engine
            </div>
          </div>
        ),
        { width: 1200, height: 630, fonts },
      );
    }

    // Fetch messages for the chat preview
    const messages = await getMessagesByChatId({ id, limit: 10 });
    const userMessage = messages.find((m) => m.role === 'user');
    const assistantMessage = messages.find((m) => m.role === 'assistant');

    const userText = truncateText(getTextFromParts(userMessage?.parts), 120);
    const rawAssistantText = getTextFromParts(assistantMessage?.parts);
    const assistantText = truncateText(stripMarkdown(rawAssistantText), 700);

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            backgroundColor: colors.background,
            fontFamily: 'Inter',
            padding: '40px 56px',
            position: 'relative',
          }}
        >
          {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <SciraLogo width={56} height={56} color={colors.foreground} />
            <div
              style={{
                fontSize: 40,
                color: colors.foreground,
                fontFamily: 'BeVietnamPro',
                fontWeight: 600,
              }}
            >
              Scira AI
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              marginTop: 24,
              justifyContent: 'center',
              gap: 48,
            }}
          >
            {/* User message */}
            {userText && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    display: 'flex',
                    padding: '18px 28px',
                    borderRadius: 24,
                    backgroundColor: colors.accent,
                    fontSize: 28,
                    color: colors.foreground,
                    fontFamily: 'Geist',
                    fontWeight: 400,
                    lineHeight: 1.4,
                    maxWidth: '90%',
                  }}
                >
                  {userText}
                </div>
              </div>
            )}

            {/* Assistant message */}
            {assistantText && (
              <div
                style={{
                  display: 'flex',
                  fontSize: 24,
                  color: colors.foreground,
                  fontFamily: 'Geist',
                  fontWeight: 400,
                  lineHeight: 1.7,
                  letterSpacing: '-0.01em',
                  maxWidth: '100%',
                  textWrap: 'balance',
                }}
              >
                {assistantText}
              </div>
            )}
          </div>

          {/* Bottom blur/fade effect */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 200,
              background: `linear-gradient(180deg, rgba(12, 12, 12, 0) 0%, rgba(12, 12, 12, 0.12) 20%, rgba(12, 12, 12, 0.35) 45%, rgba(12, 12, 12, 0.7) 70%, rgba(12, 12, 12, 0.92) 88%, rgba(12, 12, 12, 1) 100%)`,
              filter: 'blur(16px)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              transform: 'translateY(6px)',
            }}
          />
        </div>
      ),
      { width: 1200, height: 630, fonts },
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Error generating OG image', { status: 500 });
  }
}
