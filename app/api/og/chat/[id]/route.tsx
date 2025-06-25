/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og';
import { getChatWithUserById } from '@/lib/db/queries';
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Get chat data with user information
    const id = (await params).id;
    const chatWithUser = await getChatWithUserById({ id });

    // Read the background image
    const bgImagePath = path.join(process.cwd(), 'public', 'og-bg.png');
    const bgImageData = await fs.promises.readFile(bgImagePath);
    const bgImageBase64 = `data:image/png;base64,${bgImageData.toString('base64')}`;

    // Read the Scira logo
    const logoPath = path.join(process.cwd(), 'public', 'scira.png');
    const logoData = await fs.promises.readFile(logoPath);
    const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;

    // Load custom fonts
    const geistFontPath = path.join(process.cwd(), 'app/api/og/chat/[id]/fonts', 'Geist-Regular.ttf');
    const syneFontPath = path.join(process.cwd(), 'app/api/og/chat/[id]/fonts', 'Syne-Bold.ttf');

    const geistFontData = await fs.promises.readFile(geistFontPath);
    const syneFontData = await fs.promises.readFile(syneFontPath);

    // If chat doesn't exist or isn't public, return a default OG image
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
              backgroundImage: `url(${bgImageBase64})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              fontFamily: 'Syne',
            }}
          >
            {/* Clean overlay for contrast */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(120deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.10) 100%)',
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
              }}
            >
              <img
                src={logoBase64}
                width={140}
                height={140}
                alt="Scira AI"
                style={{
                  objectFit: 'contain',
                  marginBottom: 28,
                }}
              />
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 700,
                  color: 'white',
                  letterSpacing: '-0.01em',
                  fontFamily: 'Syne',
                }}
              >
                Scira AI
              </div>
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
          fonts: [
            {
              name: 'Geist',
              data: geistFontData,
              style: 'normal',
            },
            {
              name: 'Syne',
              data: syneFontData,
              style: 'normal',
            },
          ],
        },
      );
    }

    // Format the creation date
    const formattedDate = format(new Date(chatWithUser.createdAt), 'MMMM d, yyyy');

    // Generate the image
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            backgroundImage: `url(${bgImageBase64})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            padding: 0,
            position: 'relative',
            fontFamily: 'Geist',
          }}
        >
          {/* Light overlay for subtle text enhancement */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 100%)',
              zIndex: 1,
            }}
          />

          {/* Content container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              height: '100%',
              padding: '60px 80px',
              position: 'relative',
              zIndex: 2,
              justifyContent: 'space-between',
            }}
          >
            {/* Header section - Company branding */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              <img
                src={logoBase64}
                width={80}
                height={80}
                alt="Scira AI"
                style={{
                  objectFit: 'contain',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 800,
                    color: 'white',
                    letterSpacing: '-0.02em',
                    fontFamily: 'Syne',
                    lineHeight: 1,
                  }}
                >
                  Scira AI
                </div>
                <div
                  style={{
                    fontSize: 18,
                    color: 'rgba(255,255,255,0.85)',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    fontFamily: 'Geist',
                    marginTop: '4px',
                  }}
                >
                  Minimalistic AI Search Engine
                </div>
              </div>
            </div>

            {/* Article title section */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                justifyContent: 'center',
                maxWidth: '900px',
                margin: '0 auto',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 52,
                  fontWeight: 800,
                  color: 'white',
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                  fontFamily: 'Syne',
                  marginBottom: '24px',
                  textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                {chatWithUser.title}
              </div>

              {/* Article metadata */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '32px',
                  fontSize: 20,
                  color: 'rgba(255,255,255,0.9)',
                  fontWeight: 500,
                  fontFamily: 'Geist',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ opacity: 0.7 }}>By</span>
                  <span style={{ fontWeight: 600 }}>{chatWithUser.userName}</span>
                </div>
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    backgroundColor: 'rgba(255,255,255,0.6)',
                    borderRadius: '50%',
                  }}
                />
                <div>{formattedDate}</div>
              </div>
            </div>

            {/* Footer section */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  color: 'rgba(255,255,255,0.95)',
                  fontWeight: 600,
                  letterSpacing: '0.01em',
                  textAlign: 'center',
                  fontFamily: 'Syne',
                }}
              >
                Start your search at scira.ai
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Geist',
            data: geistFontData,
            style: 'normal',
          },
          {
            name: 'Syne',
            data: syneFontData,
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
