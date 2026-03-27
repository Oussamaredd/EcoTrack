variable "neon_project_name" {
  description = "The human-readable name of the Neon project."
  type        = string
}

variable "neon_region_id" {
  description = "The Neon region ID, for example aws-eu-central-1."
  type        = string
  default     = "aws-eu-central-1"
}

variable "neon_branch_name" {
  description = "The Neon branch name."
  type        = string
  default     = "main"
}

variable "neon_role_name" {
  description = "The Neon role that owns the application database."
  type        = string
}

variable "neon_db_name" {
  description = "The application database name."
  type        = string
}
