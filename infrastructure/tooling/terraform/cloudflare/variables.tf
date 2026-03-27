variable "cloudflare_account_id" {
  description = "The Cloudflare account ID that owns the Pages project."
  type        = string
}

variable "cloudflare_pages_project_name" {
  description = "The existing Cloudflare Pages project name."
  type        = string
}

variable "cloudflare_production_branch" {
  description = "The Git branch that Cloudflare should treat as production."
  type        = string
  default     = "main"
}
