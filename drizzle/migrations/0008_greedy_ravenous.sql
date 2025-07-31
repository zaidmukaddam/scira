CREATE TABLE "file_folder" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" text,
	"color" text,
	"icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_library" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"folder_id" text,
	"tags" json,
	"description" text,
	"metadata" json,
	"is_public" boolean DEFAULT false NOT NULL,
	"public_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "file_library_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "file_share" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"shared_by_user_id" text NOT NULL,
	"shared_with_user_id" text,
	"share_token" text,
	"permissions" text DEFAULT 'read' NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "file_share_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "file_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"message_id" text NOT NULL,
	"chat_id" text NOT NULL,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"brand_id" text,
	"business_id" text,
	"card_issuing_country" text,
	"card_last_four" text,
	"card_network" text,
	"card_type" text,
	"currency" text NOT NULL,
	"digital_products_delivered" boolean DEFAULT false,
	"discount_id" text,
	"error_code" text,
	"error_message" text,
	"payment_link" text,
	"payment_method" text,
	"payment_method_type" text,
	"settlement_amount" integer,
	"settlement_currency" text,
	"settlement_tax" integer,
	"status" text,
	"subscription_id" text,
	"tax" integer,
	"total_amount" integer NOT NULL,
	"billing" json,
	"customer" json,
	"disputes" json,
	"metadata" json,
	"product_cart" json,
	"refunds" json,
	"user_id" text
);
--> statement-breakpoint
ALTER TABLE "file_folder" ADD CONSTRAINT "file_folder_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_library" ADD CONSTRAINT "file_library_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_library" ADD CONSTRAINT "file_library_folder_id_file_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."file_folder"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_share" ADD CONSTRAINT "file_share_file_id_file_library_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_library"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_share" ADD CONSTRAINT "file_share_shared_by_user_id_user_id_fk" FOREIGN KEY ("shared_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_share" ADD CONSTRAINT "file_share_shared_with_user_id_user_id_fk" FOREIGN KEY ("shared_with_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_usage" ADD CONSTRAINT "file_usage_file_id_file_library_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_library"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_usage" ADD CONSTRAINT "file_usage_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_usage" ADD CONSTRAINT "file_usage_chat_id_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;