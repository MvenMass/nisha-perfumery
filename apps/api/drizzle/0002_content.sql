CREATE TYPE "public"."consultation_status" AS ENUM('new', 'contacted', 'done');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"slug" text NOT NULL,
	"tag" text NOT NULL,
	"title" text NOT NULL,
	"lead" text NOT NULL,
	"body" text NOT NULL,
	"cover_url" text,
	"cover_alt" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "articles_published_has_date" CHECK (NOT "articles"."is_published" OR "articles"."published_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "consultation_requests" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"preferred_time" text,
	"comment" text,
	"status" "consultation_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_slides" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	"title" text NOT NULL,
	"text" text NOT NULL,
	"cta_label" text NOT NULL,
	"cta_href" text NOT NULL,
	"image_url" text,
	"image_alt" text NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hero_slides_position_non_negative" CHECK ("hero_slides"."position" >= 0),
	CONSTRAINT "hero_slides_internal_link" CHECK ("hero_slides"."cta_href" LIKE '/%' AND "hero_slides"."cta_href" NOT LIKE '//%')
);
--> statement-breakpoint
CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at" DESC NULLS LAST) WHERE "articles"."is_published";--> statement-breakpoint
CREATE INDEX "consultation_requests_status_idx" ON "consultation_requests" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "hero_slides_position_idx" ON "hero_slides" USING btree ("position");