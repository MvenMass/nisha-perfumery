CREATE TYPE "public"."delivery_method" AS ENUM('courier', 'pickup_point', 'boutique');--> statement-breakpoint
CREATE TYPE "public"."density" AS ENUM('light', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."note_level" AS ENUM('top', 'heart', 'base');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'shipped', 'ready_for_pickup', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'succeeded', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"city" text NOT NULL,
	"street" text NOT NULL,
	"apartment" text,
	"comment" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"cart_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_items_cart_id_variant_id_pk" PRIMARY KEY("cart_id","variant_id"),
	CONSTRAINT "cart_items_quantity_positive" CHECK ("cart_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carts_userId_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_product_id_pk" PRIMARY KEY("user_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "fragrance_notes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "fragrance_notes_name_unique" UNIQUE("name"),
	CONSTRAINT "fragrance_notes_name_lowercase" CHECK ("fragrance_notes"."name" = lower("fragrance_notes"."name"))
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"swatch_color" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "materials_slug_unique" UNIQUE("slug"),
	CONSTRAINT "materials_swatch_color_hex" CHECK ("materials"."swatch_color" ~ '^#[0-9A-F]{6}$')
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"order_id" uuid NOT NULL,
	"variant_id" uuid,
	"product_slug" text NOT NULL,
	"product_name" text NOT NULL,
	"specimen_number" integer NOT NULL,
	"volume_ml" integer NOT NULL,
	"price_kopecks" integer NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "order_items_price_positive" CHECK ("order_items"."price_kopecks" > 0),
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" "order_status" NOT NULL,
	"changed_by" uuid,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "orders_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"contact_email" text NOT NULL,
	"delivery_method" "delivery_method" NOT NULL,
	"delivery_address" jsonb,
	"delivery_comment" text,
	"items_total_kopecks" integer NOT NULL,
	"delivery_price_kopecks" integer NOT NULL,
	"total_kopecks" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"payment_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_number_unique" UNIQUE("number"),
	CONSTRAINT "orders_user_idempotency_unique" UNIQUE("user_id","idempotency_key"),
	CONSTRAINT "orders_items_total_positive" CHECK ("orders"."items_total_kopecks" > 0),
	CONSTRAINT "orders_delivery_price_non_negative" CHECK ("orders"."delivery_price_kopecks" >= 0),
	CONSTRAINT "orders_total_matches" CHECK ("orders"."total_kopecks" = "orders"."items_total_kopecks" + "orders"."delivery_price_kopecks"),
	CONSTRAINT "orders_address_required" CHECK ("orders"."delivery_method" = 'boutique' OR "orders"."delivery_address" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "password_tokens" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_id" text,
	"amount_kopecks" integer NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_externalId_unique" UNIQUE("external_id"),
	CONSTRAINT "payments_amount_positive" CHECK ("payments"."amount_kopecks" > 0)
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "product_categories_product_id_category_id_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"product_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "product_images_product_position_unique" UNIQUE("product_id","position"),
	CONSTRAINT "product_images_position_non_negative" CHECK ("product_images"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_notes" (
	"product_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"level" "note_level" NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "product_notes_product_id_level_position_pk" PRIMARY KEY("product_id","level","position"),
	CONSTRAINT "product_notes_product_note_unique" UNIQUE("product_id","note_id"),
	CONSTRAINT "product_notes_position_non_negative" CHECK ("product_notes"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"product_id" uuid NOT NULL,
	"volume_ml" integer NOT NULL,
	"sku" text NOT NULL,
	"price_kopecks" integer NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku"),
	CONSTRAINT "product_variants_product_volume_unique" UNIQUE("product_id","volume_ml"),
	CONSTRAINT "product_variants_volume_positive" CHECK ("product_variants"."volume_ml" > 0),
	CONSTRAINT "product_variants_price_positive" CHECK ("product_variants"."price_kopecks" > 0),
	CONSTRAINT "product_variants_stock_non_negative" CHECK ("product_variants"."stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"slug" text NOT NULL,
	"specimen_number" integer NOT NULL,
	"name" text NOT NULL,
	"collection_id" uuid,
	"material_id" uuid NOT NULL,
	"origin" text NOT NULL,
	"density" "density" NOT NULL,
	"concentration" text NOT NULL,
	"longevity_hours" integer,
	"description" text NOT NULL,
	"story" text,
	"top_minutes" integer NOT NULL,
	"heart_minutes" integer NOT NULL,
	"base_minutes" integer NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"is_bestseller" boolean DEFAULT false NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"popularity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_specimenNumber_unique" UNIQUE("specimen_number"),
	CONSTRAINT "products_specimen_number_positive" CHECK ("products"."specimen_number" > 0),
	CONSTRAINT "products_longevity_positive" CHECK ("products"."longevity_hours" IS NULL OR "products"."longevity_hours" > 0),
	CONSTRAINT "products_layer_minutes_positive" CHECK ("products"."top_minutes" > 0 AND "products"."heart_minutes" > 0 AND "products"."base_minutes" > 0),
	CONSTRAINT "products_popularity_non_negative" CHECK ("products"."popularity" >= 0),
	CONSTRAINT "products_published_has_date" CHECK (NOT "products"."is_published" OR "products"."published_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_notifications" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"product_id" uuid NOT NULL,
	"email" text NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_at" timestamp with time zone,
	CONSTRAINT "stock_notifications_email_lowercase" CHECK ("stock_notifications"."email" = lower("stock_notifications"."email"))
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"free_delivery_threshold_kopecks" integer NOT NULL,
	"courier_price_kopecks" integer NOT NULL,
	"pickup_point_price_kopecks" integer NOT NULL,
	"courier_days" text NOT NULL,
	"pickup_point_days" text NOT NULL,
	"low_stock_threshold" integer NOT NULL,
	"boutique_address" text NOT NULL,
	"boutique_hours" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_settings_single_row" CHECK ("store_settings"."id" = 1),
	CONSTRAINT "store_settings_prices_non_negative" CHECK ("store_settings"."free_delivery_threshold_kopecks" >= 0 AND "store_settings"."courier_price_kopecks" >= 0 AND "store_settings"."pickup_point_price_kopecks" >= 0),
	CONSTRAINT "store_settings_low_stock_positive" CHECK ("store_settings"."low_stock_threshold" > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"password_hash" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_lowercase" CHECK ("users"."email" = lower("users"."email"))
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_tokens" ADD CONSTRAINT "password_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_notes" ADD CONSTRAINT "product_notes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_notes" ADD CONSTRAINT "product_notes_note_id_fragrance_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."fragrance_notes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_notifications" ADD CONSTRAINT "stock_notifications_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_notifications" ADD CONSTRAINT "stock_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addresses_user_id_idx" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "addresses_one_default_per_user" ON "addresses" USING btree ("user_id") WHERE "addresses"."is_default";--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_status_history_order_idx" ON "order_status_history" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_user_created_idx" ON "orders" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_payment_expires_idx" ON "orders" USING btree ("payment_expires_at") WHERE "orders"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "password_tokens_token_hash_unique" ON "password_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "password_tokens_user_id_idx" ON "password_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "product_categories_category_idx" ON "product_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "product_notes_note_idx" ON "product_notes" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "product_variants_filter_idx" ON "product_variants" USING btree ("volume_ml","price_kopecks","product_id") WHERE "product_variants"."is_active";--> statement-breakpoint
CREATE INDEX "product_variants_product_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_one_featured" ON "products" USING btree ("is_featured") WHERE "products"."is_featured";--> statement-breakpoint
CREATE INDEX "products_material_idx" ON "products" USING btree ("material_id") WHERE "products"."is_published";--> statement-breakpoint
CREATE INDEX "products_collection_idx" ON "products" USING btree ("collection_id") WHERE "products"."is_published";--> statement-breakpoint
CREATE INDEX "products_published_at_idx" ON "products" USING btree ("published_at" DESC NULLS LAST) WHERE "products"."is_published";--> statement-breakpoint
CREATE INDEX "products_popularity_idx" ON "products" USING btree ("popularity" DESC NULLS LAST) WHERE "products"."is_published";--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_notifications_active_unique" ON "stock_notifications" USING btree ("product_id","email") WHERE "stock_notifications"."notified_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");