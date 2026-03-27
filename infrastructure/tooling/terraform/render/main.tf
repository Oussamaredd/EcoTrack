resource "render_web_service" "this" {
  name              = var.render_service_name
  plan              = var.render_plan
  region            = var.render_region
  start_command     = var.render_start_command
  health_check_path = var.render_health_check_path
  root_directory    = var.render_root_directory

  runtime_source = {
    native_runtime = {
      auto_deploy   = var.render_auto_deploy
      branch        = var.render_branch
      build_command = var.render_build_command
      repo_url      = var.render_repo_url
      runtime       = var.render_runtime
    }
  }

  env_vars = {
    for key, value in var.render_env_vars :
    key => {
      value = value
    }
  }
}
