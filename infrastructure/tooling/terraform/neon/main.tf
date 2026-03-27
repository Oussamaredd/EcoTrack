resource "neon_project" "this" {
  name      = var.neon_project_name
  region_id = var.neon_region_id
}

resource "neon_branch" "this" {
  project_id = neon_project.this.id
  name       = var.neon_branch_name
}

resource "neon_role" "db_owner" {
  project_id = neon_project.this.id
  branch_id  = neon_branch.this.id
  name       = var.neon_role_name
}

resource "neon_database" "this" {
  project_id = neon_project.this.id
  branch_id  = neon_branch.this.id
  name       = var.neon_db_name
  owner_name = neon_role.db_owner.name
}

resource "neon_endpoint" "primary" {
  project_id = neon_project.this.id
  branch_id  = neon_branch.this.id
  type       = "read_write"
}
