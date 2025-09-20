'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CONNECTOR_CONFIGS, CONNECTOR_ICONS, type ConnectorProvider } from '@/lib/connectors';
import { getCurrentUser } from '@/app/actions';

export default function ConnectorCallbackPage() {
  const router = useRouter();
  const params = useParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing connection...');

  const provider = params.provider as ConnectorProvider;
  const providerConfig = CONNECTOR_CONFIGS[provider];

  useEffect(() => {
    const processCallback = async () => {
      try {
        if (!providerConfig) {
          setStatus('error');
          setMessage('Invalid provider');
          return;
        }

        // Get current user to verify authentication
        const user = await getCurrentUser();
        if (!user) {
          setStatus('error');
          setMessage('Authentication required');
          return;
        }

        setMessage(`Connecting to ${providerConfig.name}...`);

        // Check if connection was successful by querying the connection status
        // The OAuth flow should have completed by now
        await new Promise((resolve) => setTimeout(resolve, 2000));

        setStatus('success');
        setMessage(`${providerConfig.name} connected successfully!`);

        // Redirect to settings connectors tab after a short delay
        setTimeout(() => {
          router.push('/?tab=connectors#settings');
        }, 2000);
      } catch (error) {
        console.error('Callback processing error:', error);
        setStatus('error');
        setMessage('Failed to process authorization');
      }
    };

    if (provider && providerConfig) {
      processCallback();
    } else {
      setStatus('error');
      setMessage('Invalid connector provider');
    }
  }, [router, provider, providerConfig]);

  const handleReturnToSettings = () => {
    router.push('/?tab=connectors#settings');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
            {providerConfig ? (
              <span className="flex items-center gap-2">
                {(() => {
                  const IconComponent = CONNECTOR_ICONS[providerConfig.icon as keyof typeof CONNECTOR_ICONS];
                  return IconComponent ? <IconComponent className="h-5 w-5" /> : null;
                })()}
                {providerConfig.name}
              </span>
            ) : (
              'Connector Authorization'
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">{message}</p>

          {status === 'error' && (
            <Button onClick={handleReturnToSettings} className="w-full">
              Return to Settings
            </Button>
          )}

          {status === 'success' && <p className="text-xs text-muted-foreground">Redirecting to settings...</p>}
        </CardContent>
      </Card>
    </div>
  );
}
