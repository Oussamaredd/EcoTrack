output "render_service_id" {
  description = "The ID of the Render web service."
  value       = render_web_service.this.id
}

output "render_service_url" {
  description = "The public URL of the Render web service."
  value       = render_web_service.this.url
}
