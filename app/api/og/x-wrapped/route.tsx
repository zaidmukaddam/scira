/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the background image
    const bgImagePath = path.join(process.cwd(), 'public', 'og-bg.png');
    const bgImageData = await fs.promises.readFile(bgImagePath);
    const bgImageBase64 = `data:image/png;base64,${bgImageData.toString('base64')}`;

    // Load custom fonts
    const interFontPath = path.join(process.cwd(), 'app/api/og/chat/[id]/fonts', 'Inter-Regular.ttf');
    const beVietnamProFontPath = path.join(process.cwd(), 'app/api/og/chat/[id]/fonts', 'BeVietnamPro-Medium.ttf');

    const interFontData = await fs.promises.readFile(interFontPath);
    const beVietnamProFontData = await fs.promises.readFile(beVietnamProFontPath);

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
            backgroundImage: `url(${bgImageBase64})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            fontFamily: 'Inter',
          }}
        >
          {/* Clean overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.35)',
              zIndex: 1,
            }}
          />
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                fontSize: 72,
                color: '#ffffff',
                letterSpacing: '-0.03em',
                fontFamily: 'BeVietnamPro',
                fontWeight: 900,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  fontSize: 100,
                  fontWeight: 700,
                  bottom: -2,
                }}
              >
                𝕏
              </span>
              <span>Wrapped</span>
            </div>
            <div
              style={{
                fontSize: 28,
                color: '#e5e7eb',
                fontFamily: 'Inter',
                fontWeight: 600,
              }}
            >
              Your year on X, analyzed by AI
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Inter',
            data: interFontData,
            style: 'normal',
          },
          {
            name: 'BeVietnamPro',
            data: beVietnamProFontData,
            style: 'normal',
          },
        ],
      },
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Error generating OG image', { status: 500 });
  }
}
