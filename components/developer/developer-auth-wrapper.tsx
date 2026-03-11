import { getUser } from '@/lib/auth-utils';
import { isUserSubscribed } from '@/lib/subscription';
import { DeveloperEarlyAccessInfo } from '@/components/developer/early-access-info';

interface DeveloperAuthWrapperProps {
  children: React.ReactNode;
}

export async function DeveloperAuthWrapper({ children }: DeveloperAuthWrapperProps) {
  const user = await getUser();

  if (!user) {
    return <DeveloperEarlyAccessInfo />;
  }

  const isPro = await isUserSubscribed();

  if (!isPro) {
    return <DeveloperEarlyAccessInfo />;
  }

  return <>{children}</>;
}
