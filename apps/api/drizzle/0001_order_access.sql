ALTER TABLE "orders" ADD COLUMN "access_token_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_access_token_hash_unique" ON "orders" USING btree ("access_token_hash");