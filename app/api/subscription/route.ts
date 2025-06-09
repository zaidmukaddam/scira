import { auth } from "@/lib/auth";
import { getSubscriptionDetails } from "@/lib/subscription";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await auth.api.getSession({
      headers: await headers(),
    });

    if (!result?.session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriptionDetails = await getSubscriptionDetails();
    return NextResponse.json(subscriptionDetails);
  } catch (error) {
    console.error("Error fetching subscription details:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription details" },
      { status: 500 }
    );
  }
}