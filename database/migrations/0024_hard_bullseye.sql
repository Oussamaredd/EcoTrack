CREATE INDEX "citizen_reports_container_reported_at_idx" ON "incident"."citizen_reports" USING btree ("container_id","reported_at");--> statement-breakpoint
CREATE INDEX "citizen_reports_reporter_status_reported_at_idx" ON "incident"."citizen_reports" USING btree ("reporter_user_id","status","reported_at");--> statement-breakpoint
CREATE INDEX "notification_deliveries_notification_created_idx" ON "notify"."notification_deliveries" USING btree ("notification_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notify"."notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "zone_current_state_updated_at_idx" ON "analytics"."zone_current_state" USING btree ("updated_at");