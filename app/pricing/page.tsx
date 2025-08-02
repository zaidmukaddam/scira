// Force dynamic rendering to access headers
export const dynamic = 'force-dynamic';

import { getCurrentUser } from '@/app/actions';
import PricingTable from './_component/pricing-table';

export default async function PricingPage() {
  const user = await getCurrentUser();

  // Extract subscription details from unified user data
  const subscriptionDetails = user?.polarSubscription
    ? {
        hasSubscription: true,
        subscription: {
          ...user.polarSubscription,
          organizationId: null, // Add missing field for compatibility
        },
      }
    : { hasSubscription: false };

  return (
    <div className="w-full">
      <PricingTable subscriptionDetails={subscriptionDetails} user={user} />
    </div>
  );
}
