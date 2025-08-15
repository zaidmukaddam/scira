/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og';
import { getChatWithUserById } from '@/lib/db/queries';
import { format } from 'date-fns';
import fs from 'fs';
import path from 'path';
import { SciraLogo } from '@/components/logos/scira-logo';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Get chat data with user information
    const id = (await params).id;
    const chatWithUser = await getChatWithUserById({ id });

    // Read the background image
    const bgImagePath = path.join(process.cwd(), 'public', 'og-bg.png');
    const bgImageData = await fs.promises.readFile(bgImagePath);
    const bgImageBase64 = `data:image/png;base64,${bgImageData.toString('base64')}`;

    // Load custom fonts
    const interFontPath = path.join(process.cwd(), 'app/api/og/chat/[id]/fonts', 'Inter-Regular.ttf');
    const beVietnamProFontPath = path.join(process.cwd(), 'app/api/og/chat/[id]/fonts', 'BeVietnamPro-Medium.ttf');

    const interFontData = await fs.promises.readFile(interFontPath);
    const beVietnamProFontData = await fs.promises.readFile(beVietnamProFontPath);

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
              <SciraLogo width={120} height={120} color="#ffffff" />
              <div
                style={{
                  fontSize: 56,
                  color: '#ffffff',
                  letterSpacing: '-0.03em',
                  fontFamily: 'BeVietnamPro',
                  fontWeight: 900,
                  marginBottom: 16,
                  textShadow: '0 3px 10px rgba(0,0,0,0.45)',
                }}
              >
                Scira AI
              </div>
              <div
                style={{
                  fontSize: 26,
                  color: '#e5e7eb',
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  textShadow: '0 2px 8px rgba(0,0,0,0.35)',
                }}
              >
                Minimalistic AI Search engine
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
    }

    // Format the creation date
    const formattedDate = format(new Date(chatWithUser.createdAt), 'MMMM d, yyyy');
    const authorInitial = (chatWithUser.userName || 'S').slice(0, 1).toUpperCase();

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
            position: 'relative',
            fontFamily: 'Inter',
          }}
        >
          {/* Dark overlay with gradient */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 1,
            }}
          />

          {/* Main content */}
          <div
            style={{
              position: 'relative',
              zIndex: 3,
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              height: '100%',
              padding: '56px 72px',
            }}
          >
            {/* Main title section - left aligned, vertically centered */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                maxWidth: 900,
                flex: 1,
                justifyContent: 'center',
              }}
            >
              {/* Large title with creative typography */}
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  color: '#fafafa',
                  lineHeight: 0.95,
                  letterSpacing: '-0.04em',
                  fontFamily: 'BeVietnamPro',
                  marginBottom: 24,
                  textShadow: '0 6px 24px rgba(0,0,0,0.45)',
                }}
              >
                {chatWithUser.title}
              </div>
            </div>

            {/* Bottom bar: brand + tagline (left) and author + date (right) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 48,
              }}
            >
              {/* Left: brand and tagline */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <SciraLogo width={28} height={28} color="#ffffff" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 18, color: '#ffffff', fontFamily: 'BeVietnamPro', fontWeight: 800 }}>Scira AI</div>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.5)' }} />
                  <div style={{ fontSize: 16, color: '#e5e7eb', fontFamily: 'Inter', fontWeight: 600 }}>Minimalistic AI Search engine</div>
                </div>
              </div>

              {/* Right: author and date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {chatWithUser.userImage ? (
                  <img
                    src={chatWithUser.userImage}
                    width={36}
                    height={36}
                    alt={chatWithUser.userName || 'User'}
                    style={{
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1px solid rgba(255,255,255,0.35)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontFamily: 'BeVietnamPro',
                      fontSize: 16,
                      border: '1px solid rgba(255,255,255,0.25)',
                    }}
                  >
                    {authorInitial}
                  </div>
                )}
                <div style={{ fontSize: 16, color: '#e4e4e7', fontFamily: 'Inter', fontWeight: 600 }}>{chatWithUser.userName}</div>
                <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.45)' }} />
                <div style={{ fontSize: 16, color: '#a1a1aa', fontFamily: 'Inter', fontWeight: 500 }}>{formattedDate}</div>
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
