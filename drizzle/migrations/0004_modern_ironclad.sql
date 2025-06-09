CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp NOT NULL,
	"modifiedAt" timestamp,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"recurringInterval" text NOT NULL,
	"status" text NOT NULL,
	"currentPeriodStart" timestamp NOT NULL,
	"currentPeriodEnd" timestamp NOT NULL,
	"cancelAtPeriodEnd" boolean DEFAULT false NOT NULL,
	"canceledAt" timestamp,
	"startedAt" timestamp NOT NULL,
	"endsAt" timestamp,
	"endedAt" timestamp,
	"customerId" text NOT NULL,
	"productId" text NOT NULL,
	"discountId" text,
	"checkoutId" text NOT NULL,
	"customerCancellationReason" text,
	"customerCancellationComment" text,
	"metadata" text,
	"customFieldData" text,
	"userId" text
);
--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;