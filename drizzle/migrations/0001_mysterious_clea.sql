ALTER TABLE "stream" RENAME COLUMN "chat_id" TO "chatId";--> statement-breakpoint
ALTER TABLE "stream" RENAME COLUMN "created_at" TO "createdAt";--> statement-breakpoint
ALTER TABLE "stream" DROP CONSTRAINT "stream_chat_id_chat_id_fk";
--> statement-breakpoint
ALTER TABLE "stream" ADD CONSTRAINT "stream_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;