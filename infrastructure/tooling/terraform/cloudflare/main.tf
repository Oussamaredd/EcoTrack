resource "cloudflare_pages_project" "this" {
  account_id        = var.cloudflare_account_id
  name              = var.cloudflare_pages_project_name
  production_branch = var.cloudflare_production_branch

  # Add source/build/deployment settings after the base import if you want
  # Terraform to own the rest of the Pages configuration surface.
}
