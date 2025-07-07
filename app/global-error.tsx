'use client';

import { useEffect } from 'react';
import { GTProvider, T } from "gt-next";

export default function GlobalError({ error, reset }: {error: Error & {digest?: string;};reset: () => void;}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
  <html>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}><GTProvider>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
            backgroundColor: '#ffffff',
            color: '#000000'
          }}>

          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div
              style={{
                fontSize: '64px',
                marginBottom: '24px'
              }}>

              ⚠️
            </div>

            <T>
              <h1
                style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  marginBottom: '16px',
                  color: '#dc2626'
                }}>

                Critical Error
              </h1>
            </T>

            <T>
              <p
                style={{
                  fontSize: '16px',
                  marginBottom: '32px',
                  color: '#666666',
                  lineHeight: '1.5'
                }}>

                A critical error occurred. Please try refreshing the page.
              </p>
            </T>

            <button
              onClick={reset}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}>

              <span>🔄</span>
              <T>Refresh page</T>
            </button>
          </div>
        </div>
      </GTProvider></body>
    </html>
  );
}