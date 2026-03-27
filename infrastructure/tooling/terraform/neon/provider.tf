terraform {
  required_providers {
    neon = {
      source = "kislerdm/neon"
    }
  }
}

provider "neon" {
  # Authentication is handled via the NEON_API_KEY environment variable.
}
