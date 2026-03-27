output "neon_project_id" {
  description = "The ID of the Neon project."
  value       = neon_project.this.id
}

output "neon_branch_id" {
  description = "The ID of the Neon branch."
  value       = neon_branch.this.id
}

output "neon_database_id" {
  description = "The ID of the Neon database."
  value       = neon_database.this.id
}

output "neon_role_id" {
  description = "The ID of the Neon role."
  value       = neon_role.db_owner.id
}

output "neon_endpoint_id" {
  description = "The ID of the Neon endpoint."
  value       = neon_endpoint.primary.id
}
