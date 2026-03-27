# EcoTrack Terraform Platform Scaffolding

This directory contains the Terraform layout for the current EcoTrack hosted
platform baseline:

- Cloudflare Pages for the frontend SPA
- Neon for the managed PostgreSQL baseline
- Render for the hosted NestJS API

The layout replaces the previous Docker-only stub. Each provider stack is
standalone and keeps its own state.

What this Terraform owns:

- platform resource definitions
- baseline project, service, branch, role, database, and endpoint metadata

What this Terraform does not own:

- application code
- Drizzle migrations or seed execution
- runtime secrets
- remote state backends
- multi-environment workspaces
- multi-cloud AWS or Azure modules

## Directory structure

```text
infrastructure/tooling/terraform/
|-- README.md
|-- cloudflare/
|   |-- provider.tf
|   |-- variables.tf
|   |-- main.tf
|   `-- outputs.tf
|-- neon/
|   |-- provider.tf
|   |-- variables.tf
|   |-- main.tf
|   `-- outputs.tf
`-- render/
    |-- provider.tf
    |-- variables.tf
    |-- main.tf
    `-- outputs.tf
```

## Authentication

Use provider environment variables instead of tracked Terraform variable files
for credentials:

- Cloudflare: `CLOUDFLARE_API_TOKEN`
- Neon: `NEON_API_KEY`
- Render: `RENDER_API_KEY` and `RENDER_OWNER_ID`

Keep secrets out of committed `terraform.tfvars` files. If you need local tfvars,
keep them untracked.

## Usage

Run Terraform per provider directory:

```bash
cd infrastructure/tooling/terraform/cloudflare
terraform init
terraform plan
```

Repeat the same pattern in `neon` and `render`.

Set non-secret inputs with `TF_VAR_*` variables or local `terraform.tfvars`
files. Examples:

- `TF_VAR_cloudflare_account_id`
- `TF_VAR_cloudflare_pages_project_name`
- `TF_VAR_neon_project_name`
- `TF_VAR_neon_role_name`
- `TF_VAR_neon_db_name`
- `TF_VAR_render_service_name`
- `TF_VAR_render_repo_url`
- `TF_VAR_render_region`
- `TF_VAR_render_plan`

## Import first

These stacks are intended to model the already-provisioned EcoTrack baseline.
Import the existing resources before the first apply.

Cloudflare Pages example:

```bash
terraform import cloudflare_pages_project.this "<account_id>/<project_name>"
```

Neon examples:

```bash
terraform import neon_project.this "<project_id>"
terraform import neon_branch.this "<project_id>/<branch_id>"
terraform import neon_role.db_owner "<project_id>/<branch_id>/<role_name>"
terraform import neon_database.this "<project_id>/<branch_id>/<database_name>"
terraform import neon_endpoint.primary "<project_id>/<endpoint_id>"
```

Render example:

```bash
terraform import render_web_service.this "<service_id>"
```

## Validation

When Terraform is installed locally, run:

```bash
terraform fmt -check -recursive infrastructure/tooling/terraform
```

Then validate each stack after `terraform init`:

```bash
terraform validate
```

## Notes

- The Cloudflare stack keeps the Pages project definition minimal on purpose.
  Add source-control, build, and deployment settings only after the base import
  is stable.
- The Neon stack models the canonical `ticketdb` database baseline but still
  expects imports for already-created hosted resources.
- The Render stack uses the current official `render_web_service` resource
  shape, so plan values such as `render_plan` and `render_region` should match
  the values accepted by the active Render provider for the imported service.
- The supported deployment path remains the hosted Cloudflare Pages + Render +
  Neon baseline documented in
  `docs/runbooks/DEPLOYMENT_PLATFORM_ROLLOUT_PLAN.md`.
