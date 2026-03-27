terraform {
  required_providers {
    render = {
      source = "render-oss/render"
    }
  }
}

provider "render" {
  # Authentication is handled via the RENDER_API_KEY and RENDER_OWNER_ID
  # environment variables.
}
