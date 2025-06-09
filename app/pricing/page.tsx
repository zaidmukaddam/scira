// Force dynamic rendering to access headers
export const dynamic = 'force-dynamic';

import { getSubscriptionDetails } from "@/lib/subscription";
import PricingTable from "./_component/pricing-table";

export default async function PricingPage() {
  const subscriptionDetails = await getSubscriptionDetails();

  return (
    <div className="w-full">
      <PricingTable subscriptionDetails={subscriptionDetails} />
    </div>
  );
}