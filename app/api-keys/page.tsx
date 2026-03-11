import { DeveloperAuthWrapper } from '@/components/developer/developer-auth-wrapper';
import { ApiKeysClient } from '@/components/developer/api-keys-client';

export default function ApiKeysPage() {
  return (
    <DeveloperAuthWrapper>
      <ApiKeysClient />
    </DeveloperAuthWrapper>
  );
}
