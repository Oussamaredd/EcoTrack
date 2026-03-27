variable "render_service_name" {
  description = "The Render web service name."
  type        = string
}

variable "render_repo_url" {
  description = "The Git repository URL that Render builds from."
  type        = string
}

variable "render_branch" {
  description = "The Git branch Render should deploy."
  type        = string
  default     = "main"
}

variable "render_build_command" {
  description = "The build command Render should run."
  type        = string
}

variable "render_start_command" {
  description = "The runtime start command Render should run."
  type        = string
}

variable "render_health_check_path" {
  description = "The readiness path Render should probe."
  type        = string
  default     = "/api/health/ready"
}

variable "render_plan" {
  description = "The Render plan name accepted by the active provider."
  type        = string
}

variable "render_region" {
  description = "The Render deployment region accepted by the active provider."
  type        = string
}

variable "render_runtime" {
  description = "The Render native runtime."
  type        = string
  default     = "node"
}

variable "render_auto_deploy" {
  description = "Whether Render should auto-deploy on new commits."
  type        = bool
  default     = true
}

variable "render_root_directory" {
  description = "Optional monorepo root directory relative to the repository root."
  type        = string
  default     = null
}

variable "render_env_vars" {
  description = "Non-secret plain-text environment variables to manage on the service."
  type        = map(string)
  default     = {}
}
