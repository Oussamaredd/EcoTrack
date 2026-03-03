CREATE TABLE "tour_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" uuid NOT NULL,
	"geometry" jsonb NOT NULL,
	"distance_meters" integer,
	"duration_minutes" integer,
	"source" text DEFAULT 'fallback' NOT NULL,
	"provider" text DEFAULT 'internal' NOT NULL,
	"resolved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_routes_tour_id_unique" UNIQUE("tour_id")
);
--> statement-breakpoint
ALTER TABLE "tour_routes" ADD CONSTRAINT "tour_routes_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;